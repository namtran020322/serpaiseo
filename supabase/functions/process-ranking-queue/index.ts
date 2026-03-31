import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Process up to 10 keywords per invocation (pipeline handles 1 req/s internally)
const BATCH_SIZE = 10

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

    // Reset any stale jobs (stuck in processing for >3 minutes)
    const { data: resetCount } = await supabase.rpc('reset_stale_queue_jobs')
    if (resetCount && resetCount > 0) {
      console.log(`[INFO] Reset ${resetCount} stale jobs`)
    }

    // Atomically claim the next job (round-robin by updated_at, WFQ by priority)
    const { data: claimedJobs, error: claimError } = await supabase.rpc('claim_next_queue_job')

    if (claimError) {
      console.error('[ERROR] Failed to claim job:', claimError)
      return new Response(
        JSON.stringify({ error: 'Failed to claim job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const job = claimedJobs?.[0] || null

    if (!job) {
      console.log('[INFO] No jobs in queue')
      return new Response(
        JSON.stringify({ message: 'No jobs to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Processing job ${job.id} for class ${job.class_id}`)

    // Get class details
    const { data: classData, error: classError } = await supabase
      .from('project_classes').select('*').eq('id', job.class_id).single()

    if (classError || !classData) {
      console.error('[ERROR] Class not found:', job.class_id)
      await supabase.from('ranking_check_queue').update({
        status: 'failed', error_message: 'Class not found',
        completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', job.id)
      return new Response(
        JSON.stringify({ error: 'Class not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get keywords to process
    let keywordsQuery = supabase
      .from('project_keywords').select('id, keyword').eq('class_id', job.class_id)
    if (job.keyword_ids && job.keyword_ids.length > 0) {
      keywordsQuery = keywordsQuery.in('id', job.keyword_ids)
    }
    const { data: allKeywords, error: kwError } = await keywordsQuery

    if (kwError || !allKeywords || allKeywords.length === 0) {
      console.log('[INFO] No keywords to process')
      await supabase.from('ranking_check_queue').update({
        status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', job.id)
      return new Response(
        JSON.stringify({ message: 'No keywords to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get batch of keywords not yet processed
    const processedCount = job.processed_keywords || 0
    const remainingKeywords = allKeywords.slice(processedCount, processedCount + BATCH_SIZE)

    if (remainingKeywords.length === 0) {
      // All done
      await supabase.from('ranking_check_queue').update({
        status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', job.id)
      await supabase.from('project_classes')
        .update({ last_checked_at: new Date().toISOString() }).eq('id', job.class_id)
      console.log(`[INFO] Job ${job.id} completed`)
      return new Response(
        JSON.stringify({ message: 'Job completed', job_id: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user credits
    const creditsNeeded = calculateCreditsNeeded(remainingKeywords.length)
    const { data: userCredits } = await supabase
      .from('user_credits').select('balance').eq('user_id', job.user_id).single()
    const currentBalance = userCredits?.balance || 0

    if (currentBalance < creditsNeeded) {
      console.log(`[INFO] Insufficient credits for job ${job.id}`)
      await supabase.from('ranking_check_queue').update({
        status: 'failed',
        error_message: `Insufficient credits (need ${creditsNeeded}, have ${currentBalance})`,
        completed_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', job.id)
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call check-project-keywords for this batch (pipeline handles 1 req/s internally)
    const functionUrl = `${supabaseUrl}/functions/v1/check-project-keywords`
    const checkResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        classId: job.class_id,
        keywordIds: remainingKeywords.map(k => k.id),
        userId: job.user_id
      }),
    })

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text()
      console.error(`[ERROR] Check failed:`, errorText)
      // Don't fail the job — just update timestamp so it can be retried next cron tick
      await supabase.from('ranking_check_queue')
        .update({ updated_at: new Date().toISOString() }).eq('id', job.id)
      return new Response(
        JSON.stringify({ error: 'Check failed, will retry on next cron' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update progress
    const newProcessed = processedCount + remainingKeywords.length
    const isComplete = newProcessed >= allKeywords.length

    await supabase.from('ranking_check_queue').update({
      processed_keywords: newProcessed,
      status: isComplete ? 'completed' : 'pending',
      completed_at: isComplete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }).eq('id', job.id)

    if (isComplete) {
      await supabase.from('project_classes')
        .update({ last_checked_at: new Date().toISOString() }).eq('id', job.class_id)
      console.log(`[INFO] Job ${job.id} completed`)
    } else {
      console.log(`[INFO] Job ${job.id} progress: ${newProcessed}/${allKeywords.length}`)
    }

    return new Response(
      JSON.stringify({
        job_id: job.id, processed: newProcessed,
        total: allKeywords.length, status: isComplete ? 'completed' : 'processing',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ERROR] process-ranking-queue failed:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
