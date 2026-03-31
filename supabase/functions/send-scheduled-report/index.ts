import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = 'https://serpaiseo.lovable.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find jobs that need reports sent
    // report_at <= now AND (completed OR failed) AND report_sent = false
    const { data: jobs, error: jobsError } = await supabase
      .from('ranking_check_queue')
      .select('id, class_id, user_id, status, total_keywords, processed_keywords, error_message, report_at')
      .eq('report_sent', false)
      .not('report_at', 'is', null)
      .lte('report_at', new Date().toISOString())
      .in('status', ['completed', 'failed'])
      .limit(10)

    if (jobsError) {
      console.error('[ERROR] Failed to fetch jobs for report:', jobsError)
      return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!jobs || jobs.length === 0) {
      // Also check for jobs that are still processing but past report_at (partial report)
      const { data: pendingJobs } = await supabase
        .from('ranking_check_queue')
        .select('id, class_id, user_id, status, total_keywords, processed_keywords, error_message, report_at')
        .eq('report_sent', false)
        .not('report_at', 'is', null)
        .lte('report_at', new Date().toISOString())
        .in('status', ['pending', 'processing'])
        .limit(10)

      if (!pendingJobs || pendingJobs.length === 0) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Send partial reports for jobs still processing past their report_at
      let sent = 0
      for (const job of pendingJobs) {
        const success = await sendReport(supabase, job, true)
        if (success) sent++
      }

      return new Response(JSON.stringify({ processed: sent, partial: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let sent = 0
    for (const job of jobs) {
      const success = await sendReport(supabase, job, false)
      if (success) sent++
    }

    console.log(`[INFO] Sent ${sent} ranking reports`)

    return new Response(JSON.stringify({ processed: sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('[ERROR] Send scheduled report failed:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function sendReport(
  supabase: any,
  job: any,
  isPartial: boolean
): Promise<boolean> {
  try {
    // Get class info
    const { data: cls } = await supabase
      .from('project_classes')
      .select('id, name, domain, project_id')
      .eq('id', job.class_id)
      .single()

    if (!cls) {
      console.error(`[ERROR] Class not found for job ${job.id}`)
      await markReportSent(supabase, job.id)
      return false
    }

    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(job.user_id)
    if (!userData?.user?.email) {
      console.error(`[ERROR] User email not found for job ${job.id}`)
      await markReportSent(supabase, job.id)
      return false
    }

    const userEmail = userData.user.email

    // Get ranking data for this class
    const { data: keywords } = await supabase
      .from('project_keywords')
      .select('keyword, ranking_position, previous_position, found_url')
      .eq('class_id', job.class_id)

    if (!keywords) {
      await markReportSent(supabase, job.id)
      return false
    }

    // Calculate stats
    const totalKeywords = keywords.length
    const foundKeywords = keywords.filter((k: any) => k.ranking_position !== null).length
    const improved = keywords.filter((k: any) =>
      k.ranking_position !== null && k.previous_position !== null && k.ranking_position < k.previous_position
    )
    const declined = keywords.filter((k: any) =>
      k.ranking_position !== null && k.previous_position !== null && k.ranking_position > k.previous_position
    )

    // Top movers: biggest position changes (±5 or more)
    const allChanges = keywords
      .filter((k: any) => k.ranking_position !== null && k.previous_position !== null)
      .map((k: any) => ({
        keyword: k.keyword,
        from: k.previous_position,
        to: k.ranking_position,
        change: k.ranking_position - k.previous_position, // negative = improved
      }))
      .sort((a: any, b: any) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5)

    const classUrl = `${APP_URL}/dashboard/projects/${cls.project_id}/classes/${cls.id}`

    // Format check time from report_at
    const reportAt = new Date(job.report_at)
    const checkedAt = reportAt.toLocaleString('en-US', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })

    const templateData: any = {
      className: cls.name,
      domain: cls.domain,
      checkedAt,
      totalKeywords,
      foundKeywords,
      improvedCount: improved.length,
      declinedCount: declined.length,
      topMovers: allChanges,
      classUrl,
      isPartial,
      processedCount: job.processed_keywords,
    }

    if (job.status === 'failed') {
      templateData.errorMessage = job.error_message || 'Check failed due to an unexpected error'
    }

    // Enqueue email via supabase client (service role handles auth)
    const { error: invokeError } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'ranking-report',
        recipientEmail: userEmail,
        idempotencyKey: `ranking-report-${job.id}`,
        templateData,
      },
    })

    if (invokeError) {
      console.error(`[ERROR] Failed to send report email for job ${job.id}:`, invokeError)
      return false
    }

    await markReportSent(supabase, job.id)
    console.log(`[INFO] Report sent for job ${job.id} to ${userEmail}`)
    return true
  } catch (err) {
    console.error(`[ERROR] Failed to send report for job ${job.id}:`, err)
    return false
  }
}

async function markReportSent(supabase: any, jobId: string) {
  await supabase
    .from('ranking_check_queue')
    .update({ report_sent: true })
    .eq('id', jobId)
}
