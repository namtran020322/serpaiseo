import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 1 credit per keyword
function calculateCreditsNeeded(keywordCount: number): number {
  return keywordCount
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time in Vietnam timezone
    const now = new Date()
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
    const currentHour = vietnamTime.getHours().toString().padStart(2, '0')
    const currentTime = `${currentHour}:00`
    const currentDay = vietnamTime.getDay() // 0 = Sunday, 1 = Monday
    const currentDate = vietnamTime.getDate()

    console.log(`[INFO] Scheduled check running at ${currentTime} Vietnam time`)

    // Find classes that need to be checked with their keyword count
    const { data: classes, error: classesError } = await supabase
      .from('project_classes')
      .select(`
        id, 
        user_id, 
        schedule, 
        schedule_time, 
        last_checked_at,
        top_results,
        project_keywords(count)
      `)
      .not('schedule', 'is', null)
      .neq('schedule', 'none')

    if (classesError) {
      console.error('[ERROR] Failed to fetch classes:', classesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch classes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const classesToCheck: any[] = []

    for (const cls of classes || []) {
      const scheduleTime = cls.schedule_time || '08:00'
      
      // Check if it's the right time
      if (scheduleTime !== currentTime) continue

      const lastChecked = cls.last_checked_at ? new Date(cls.last_checked_at) : null
      const hoursSinceLastCheck = lastChecked 
        ? (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60) 
        : Infinity

      let shouldCheck = false

      switch (cls.schedule) {
        case 'daily':
          shouldCheck = hoursSinceLastCheck >= 23 // At least 23 hours since last check
          break
        case 'weekly':
          shouldCheck = hoursSinceLastCheck >= 167 && currentDay === 1 // Monday, 7 days
          break
        case 'monthly':
          shouldCheck = hoursSinceLastCheck >= 719 && currentDate === 1 // 1st of month, 30 days
          break
      }

      if (shouldCheck) {
        classesToCheck.push(cls)
      }
    }

    console.log(`[INFO] Found ${classesToCheck.length} classes to check`)

    // Process each class — insert into queue instead of calling check-project-keywords directly
    const results: { classId: string; success: boolean; skipped?: boolean; reason?: string; jobId?: string }[] = []

    for (const cls of classesToCheck) {
      try {
        const keywordCount = cls.project_keywords?.[0]?.count || 0
        if (keywordCount === 0) {
          console.log(`[INFO] Skipping class ${cls.id} - no keywords`)
          results.push({ classId: cls.id, success: true, skipped: true, reason: 'no_keywords' })
          continue
        }

        // Check user's credit balance (pre-filter before creating queue job)
        const { data: userCredits, error: creditsError } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', cls.user_id)
          .maybeSingle()

        if (creditsError) {
          console.error(`[ERROR] Failed to fetch credits for user ${cls.user_id}:`, creditsError)
          results.push({ classId: cls.id, success: false, reason: 'credits_error' })
          continue
        }

        const creditsNeeded = calculateCreditsNeeded(keywordCount)
        const currentBalance = userCredits?.balance || 0

        if (currentBalance < creditsNeeded) {
          console.log(`[INFO] Skipping class ${cls.id} - insufficient credits (need ${creditsNeeded}, have ${currentBalance})`)
          // Still update last_checked_at to prevent repeated attempts
          await supabase
            .from('project_classes')
            .update({ last_checked_at: now.toISOString() })
            .eq('id', cls.id)
          results.push({ classId: cls.id, success: false, reason: 'insufficient_credits' })
          continue
        }

        // Check for existing pending/processing job (prevent duplicates)
        const { data: existingJob } = await supabase
          .from('ranking_check_queue')
          .select('id, status')
          .eq('class_id', cls.id)
          .in('status', ['pending', 'processing'])
          .maybeSingle()

        if (existingJob) {
          console.log(`[INFO] Skipping class ${cls.id} - job already ${existingJob.status}`)
          results.push({ classId: cls.id, success: true, skipped: true, reason: 'already_queued' })
          continue
        }

        // Insert job into queue (service role bypasses RLS)
        const { data: job, error: insertError } = await supabase
          .from('ranking_check_queue')
          .insert({
            class_id: cls.id,
            user_id: cls.user_id,
            keyword_ids: [],
            total_keywords: keywordCount,
            processed_keywords: 0,
            status: 'pending',
          })
          .select('id')
          .single()

        if (insertError) {
          console.error(`[ERROR] Failed to create job for class ${cls.id}:`, insertError)
          results.push({ classId: cls.id, success: false, reason: 'insert_error' })
          continue
        }

        console.log(`[INFO] Created queue job ${job.id} for class ${cls.id}`)
        results.push({ classId: cls.id, success: true, jobId: job.id })
      } catch (err) {
        console.error(`[ERROR] Failed to process class ${cls.id}:`, err)
        results.push({ classId: cls.id, success: false, reason: 'exception' })
      }
    }

    // Trigger process-ranking-queue once — auto-continuation handles the rest
    const jobsCreated = results.filter(r => r.success && r.jobId).length
    if (jobsCreated > 0) {
      console.log(`[INFO] Triggering queue processing for ${jobsCreated} new jobs`)
      fetch(`${supabaseUrl}/functions/v1/process-ranking-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({}),
      }).catch(err => console.error('[ERROR] Failed to trigger queue processing:', err))
    }

    const successful = jobsCreated
    const skipped = results.filter(r => r.skipped).length
    const failed = results.filter(r => !r.success).length

    console.log(`[INFO] Scheduled check completed: ${successful} jobs created, ${skipped} skipped, ${failed} failed`)

    return new Response(
      JSON.stringify({
        message: 'Scheduled check completed',
        totalClasses: classesToCheck.length,
        successful,
        skipped,
        failed,
        currentTime,
        details: results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ERROR] Scheduled check failed:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
