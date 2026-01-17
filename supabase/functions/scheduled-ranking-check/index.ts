import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Calculate credits needed for a check
function calculateCreditsNeeded(topResults: number, keywordCount: number): number {
  const creditsPerKeyword = Math.ceil(topResults / 10)
  return creditsPerKeyword * keywordCount
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

    // Process each class
    const results = await Promise.allSettled(
      classesToCheck.map(async (cls) => {
        try {
          const keywordCount = cls.project_keywords?.[0]?.count || 0
          if (keywordCount === 0) {
            console.log(`[INFO] Skipping class ${cls.id} - no keywords`)
            return { classId: cls.id, success: true, skipped: true, reason: 'no_keywords' }
          }

          // Check user's credit balance
          const { data: userCredits, error: creditsError } = await supabase
            .from('user_credits')
            .select('balance')
            .eq('user_id', cls.user_id)
            .maybeSingle()

          if (creditsError) {
            console.error(`[ERROR] Failed to fetch credits for user ${cls.user_id}:`, creditsError)
            return { classId: cls.id, success: false, reason: 'credits_error' }
          }

          const creditsNeeded = calculateCreditsNeeded(cls.top_results || 100, keywordCount)
          const currentBalance = userCredits?.balance || 0

          if (currentBalance < creditsNeeded) {
            console.log(`[INFO] Skipping class ${cls.id} - insufficient credits (need ${creditsNeeded}, have ${currentBalance})`)
            // Still update last_checked_at to prevent repeated attempts
            await supabase
              .from('project_classes')
              .update({ last_checked_at: now.toISOString() })
              .eq('id', cls.id)
            return { classId: cls.id, success: false, reason: 'insufficient_credits', needed: creditsNeeded, available: currentBalance }
          }

          // Call the check-project-keywords function directly via HTTP
          // Using internal Supabase function URL
          const functionUrl = `${supabaseUrl}/functions/v1/check-project-keywords`
          
          const checkResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ classId: cls.id }),
          })

          if (!checkResponse.ok) {
            const errorText = await checkResponse.text()
            console.error(`[ERROR] Check failed for class ${cls.id}:`, errorText)
            return { classId: cls.id, success: false, reason: 'check_failed', error: errorText }
          }

          const checkResult = await checkResponse.json()
          console.log(`[INFO] Successfully checked class ${cls.id}:`, checkResult)

          return { classId: cls.id, success: true, result: checkResult }
        } catch (err) {
          console.error(`[ERROR] Failed to process class ${cls.id}:`, err)
          return { classId: cls.id, success: false, reason: 'exception', error: String(err) }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
    const skipped = results.filter(r => r.status === 'fulfilled' && (r.value as any).skipped).length
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as any).success && !(r.value as any).skipped)).length

    console.log(`[INFO] Scheduled check completed: ${successful} successful, ${skipped} skipped, ${failed} failed`)

    return new Response(
      JSON.stringify({
        message: 'Scheduled check completed',
        totalClasses: classesToCheck.length,
        successful,
        skipped,
        failed,
        currentTime,
        details: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason })
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
