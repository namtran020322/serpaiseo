import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 1 credit per keyword
function calculateCreditsNeeded(keywordCount: number): number {
  return keywordCount
}

// Estimate minutes needed to process keywords
// Pipeline throughput: ~10 keywords/minute, +30% buffer
function estimateMinutes(totalKeywords: number): number {
  const raw = Math.ceil(totalKeywords * 6 / 60 * 1.3)
  return Math.max(raw, 5) // minimum 5 minutes
}

// Parse schedule_time (e.g. "08:00", "10:30") into minutes since midnight
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

// Get current minutes since midnight in a given timezone
function getCurrentMinutes(timezone: string): number {
  const now = new Date()
  const timeStr = now.toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false })
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()

    // Get ALL classes with schedules and their keyword counts
    const { data: classes, error: classesError } = await supabase
      .from('project_classes')
      .select(`
        id, 
        user_id, 
        schedule, 
        schedule_time, 
        schedule_timezone,
        last_checked_at,
        top_results,
        project_id,
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

    if (!classes || classes.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No scheduled classes found', totalClasses: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Group classes by schedule_time + timezone to estimate total workload per time slot
    const timeGroups = new Map<string, { classes: any[], totalKeywords: number }>()
    
    for (const cls of classes) {
      const scheduleTime = cls.schedule_time || '08:00'
      const timezone = cls.schedule_timezone || 'Asia/Ho_Chi_Minh'
      const key = `${scheduleTime}|${timezone}`
      
      if (!timeGroups.has(key)) {
        timeGroups.set(key, { classes: [], totalKeywords: 0 })
      }
      const group = timeGroups.get(key)!
      const keywordCount = cls.project_keywords?.[0]?.count || 0
      group.classes.push({ ...cls, keywordCount })
      group.totalKeywords += keywordCount
    }

    const classesToCheck: any[] = []

    for (const [key, group] of timeGroups) {
      const [scheduleTime, timezone] = key.split('|')
      const scheduleMinutes = parseTimeToMinutes(scheduleTime)
      const currentMinutes = getCurrentMinutes(timezone)
      const startBefore = estimateMinutes(group.totalKeywords)

      // Calculate the window: [scheduleMinutes - startBefore, scheduleMinutes]
      const windowStart = scheduleMinutes - startBefore
      
      // Check if current time falls within the pre-check window OR past schedule time (fallback)
      const inPreCheckWindow = currentMinutes >= windowStart && currentMinutes < scheduleMinutes
      const isPastSchedule = currentMinutes >= scheduleMinutes && currentMinutes < scheduleMinutes + 15 // 15min grace

      if (!inPreCheckWindow && !isPastSchedule) continue

      console.log(`[INFO] Time slot ${scheduleTime} (${timezone}): ${group.totalKeywords} keywords, start ${startBefore}min before, current=${currentMinutes}min, schedule=${scheduleMinutes}min`)

      for (const cls of group.classes) {
        // Check schedule frequency (daily/weekly/monthly)
        const lastChecked = cls.last_checked_at ? new Date(cls.last_checked_at) : null
        const hoursSinceLastCheck = lastChecked 
          ? (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60) 
          : Infinity

        // Get current day/date in the class's timezone
        const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
        const currentDay = vietnamTime.getDay()
        const currentDate = vietnamTime.getDate()

        let shouldCheck = false
        switch (cls.schedule) {
          case 'daily':
            shouldCheck = hoursSinceLastCheck >= 20 // buffer for pre-check
            break
          case 'weekly':
            shouldCheck = hoursSinceLastCheck >= 164 && currentDay === 1
            break
          case 'monthly':
            shouldCheck = hoursSinceLastCheck >= 716 && currentDate === 1
            break
        }

        if (shouldCheck && cls.keywordCount > 0) {
          classesToCheck.push({ ...cls, scheduleTime, timezone })
        }
      }
    }

    console.log(`[INFO] Found ${classesToCheck.length} classes to check`)

    // Process each class — insert into queue
    const results: { classId: string; success: boolean; skipped?: boolean; reason?: string; jobId?: string }[] = []

    for (const cls of classesToCheck) {
      try {
        // Check user's credit balance
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

        const creditsNeeded = calculateCreditsNeeded(cls.keywordCount)
        const currentBalance = userCredits?.balance || 0

        if (currentBalance < creditsNeeded) {
          console.log(`[INFO] Skipping class ${cls.id} - insufficient credits (need ${creditsNeeded}, have ${currentBalance})`)
          await supabase
            .from('project_classes')
            .update({ last_checked_at: now.toISOString() })
            .eq('id', cls.id)
          results.push({ classId: cls.id, success: false, reason: 'insufficient_credits' })
          continue
        }

        // Check for existing pending/processing job
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

        // Calculate report_at: the exact schedule_time in the class's timezone for today
        const todayStr = new Date(now.toLocaleString('en-US', { timeZone: cls.timezone }))
          .toISOString().split('T')[0]
        const reportAtLocal = `${todayStr}T${cls.scheduleTime}:00`
        // Convert to UTC by creating date in timezone context
        const reportAtDate = new Date(new Date(reportAtLocal).toLocaleString('en-US', { timeZone: 'UTC' }))
        // Simpler approach: use the timezone offset
        const reportAtUtc = getUtcFromTimezone(cls.scheduleTime, cls.timezone, now)

        // Insert job into queue with report_at
        const { data: job, error: insertError } = await supabase
          .from('ranking_check_queue')
          .insert({
            class_id: cls.id,
            user_id: cls.user_id,
            keyword_ids: [],
            total_keywords: cls.keywordCount,
            processed_keywords: 0,
            status: 'pending',
            report_at: reportAtUtc.toISOString(),
          })
          .select('id')
          .single()

        if (insertError) {
          console.error(`[ERROR] Failed to create job for class ${cls.id}:`, insertError)
          results.push({ classId: cls.id, success: false, reason: 'insert_error' })
          continue
        }

        console.log(`[INFO] Created queue job ${job.id} for class ${cls.id} (report_at: ${reportAtUtc.toISOString()})`)
        results.push({ classId: cls.id, success: true, jobId: job.id })
      } catch (err) {
        console.error(`[ERROR] Failed to process class ${cls.id}:`, err)
        results.push({ classId: cls.id, success: false, reason: 'exception' })
      }
    }

    // Trigger process-ranking-queue
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

// Convert a local time (HH:MM) in a timezone to a UTC Date for today
function getUtcFromTimezone(timeStr: string, timezone: string, referenceDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  
  // Get today's date in the target timezone
  const localDateStr = referenceDate.toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD format
  
  // Create a date string and parse it
  const dateTimeStr = `${localDateStr}T${String(hours).padStart(2, '0')}:${String(minutes || 0).padStart(2, '0')}:00`
  
  // Get the timezone offset by comparing local and UTC representations
  const tempDate = new Date(dateTimeStr + 'Z') // treat as UTC first
  const localStr = tempDate.toLocaleString('en-US', { timeZone: timezone })
  const localParsed = new Date(localStr)
  const utcParsed = new Date(tempDate)
  const offsetMs = localParsed.getTime() - utcParsed.getTime()
  
  // The actual UTC time = local time - offset
  const targetLocal = new Date(`${dateTimeStr}Z`)
  return new Date(targetLocal.getTime() - offsetMs)
}
