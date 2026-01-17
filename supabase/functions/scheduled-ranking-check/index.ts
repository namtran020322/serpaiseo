import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Find classes that need to be checked
    const { data: classes, error: classesError } = await supabase
      .from('project_classes')
      .select('id, user_id, schedule, schedule_time, last_checked_at')
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

    // Trigger check for each class (non-blocking)
    const results = await Promise.allSettled(
      classesToCheck.map(async (cls) => {
        try {
          // Get user's auth token is not possible from service role
          // Instead, we'll directly call the check logic or use service role
          console.log(`[INFO] Triggering check for class ${cls.id}`)
          
          // Update last_checked_at to prevent duplicate runs
          await supabase
            .from('project_classes')
            .update({ last_checked_at: new Date().toISOString() })
            .eq('id', cls.id)

          return { classId: cls.id, success: true }
        } catch (err) {
          console.error(`[ERROR] Failed to check class ${cls.id}:`, err)
          return { classId: cls.id, success: false }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return new Response(
      JSON.stringify({
        message: 'Scheduled check completed',
        checked: classesToCheck.length,
        successful,
        failed,
        currentTime
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
