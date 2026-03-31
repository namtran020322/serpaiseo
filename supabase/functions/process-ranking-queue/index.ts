import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Process max 10 keywords per invocation to stay within timeout
const BATCH_SIZE = 1

// Safety limit to prevent infinite self-invoke loops
const MAX_CONTINUATIONS = 100

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

    // Parse optional continuation counter from request body
    let continuation = 0
    try {
      const body = await req.json()
      continuation = body.continuation || 0
    } catch {
      // No body is fine for initial invocation
    }

    // Safety check: prevent infinite continuation loops
    if (continuation >= MAX_CONTINUATIONS) {
      console.log(`[INFO] Max continuations (${MAX_CONTINUATIONS}) reached, stopping`)
      return new Response(
        JSON.stringify({ message: 'Max continuations reached' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reset any stale jobs (stuck in processing for >10 minutes)
    const { data: resetCount } = await supabase.rpc('reset_stale_queue_jobs')
    if (resetCount && resetCount > 0) {
      console.log(`[INFO] Reset ${resetCount} stale jobs`)
    }

    // Atomically claim the next job (round-robin by updated_at)
    const { data: claimedJobs, error: claimError } = await supabase.rpc('claim_next_queue_job')

    if (claimError) {
      console.error('[ERROR] Failed to claim job:', claimError)
      return new Response(
        JSON.stringify({ error: 'Failed to claim job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // RPC with RETURNS SETOF returns an array
    const job = claimedJobs?.[0] || null

    if (!job) {
      console.log('[INFO] No jobs in queue')
      return new Response(
        JSON.stringify({ message: 'No jobs to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Processing job ${job.id} for class ${job.class_id} (continuation: ${continuation})`)

    // Get class details
    const { data: classData, error: classError } = await supabase
      .from('project_classes')
      .select('*')
      .eq('id', job.class_id)
      .single()

    if (classError || !classData) {
      console.error('[ERROR] Class not found:', job.class_id)
      await supabase
        .from('ranking_check_queue')
        .update({
          status: 'failed',
          error_message: 'Class not found',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
      return new Response(
        JSON.stringify({ error: 'Class not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get keywords to process
    let keywordsQuery = supabase
      .from('project_keywords')
      .select('id, keyword')
      .eq('class_id', job.class_id)

    // If specific keyword IDs provided, filter by them
    if (job.keyword_ids && job.keyword_ids.length > 0) {
      keywordsQuery = keywordsQuery.in('id', job.keyword_ids)
    }

    const { data: allKeywords, error: kwError } = await keywordsQuery

    if (kwError || !allKeywords || allKeywords.length === 0) {
      console.log('[INFO] No keywords to process')
      await supabase
        .from('ranking_check_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
      return new Response(
        JSON.stringify({ message: 'No keywords to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get keywords not yet processed (skip already done ones)
    const processedCount = job.processed_keywords || 0
    const remainingKeywords = allKeywords.slice(processedCount, processedCount + BATCH_SIZE)

    if (remainingKeywords.length === 0) {
      // All done
      await supabase
        .from('ranking_check_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      // Update class last_checked_at
      await supabase
        .from('project_classes')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', job.class_id)

      console.log(`[INFO] Job ${job.id} completed`)

      // Self-invoke to pick up the next pending job (if any)
      await selfInvoke(supabaseUrl, supabaseServiceKey, continuation)

      return new Response(
        JSON.stringify({ message: 'Job completed', job_id: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user credits
    const creditsNeeded = calculateCreditsNeeded(remainingKeywords.length)
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', job.user_id)
      .single()

    const currentBalance = userCredits?.balance || 0
    if (currentBalance < creditsNeeded) {
      console.log(`[INFO] Insufficient credits for job ${job.id}`)
      await supabase
        .from('ranking_check_queue')
        .update({
          status: 'failed',
          error_message: `Insufficient credits (need ${creditsNeeded}, have ${currentBalance})`,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      // Self-invoke to pick up the next job (other users may have credits)
      await selfInvoke(supabaseUrl, supabaseServiceKey, continuation)

      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call check-project-keywords for this batch
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
      // Update updated_at to prevent stale detection while waiting for retry
      await supabase
        .from('ranking_check_queue')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', job.id)
      // Self-invoke with longer delay (5s) to retry and process other pending jobs
      // The claim function will pick a different job first (round-robin by updated_at)
      await selfInvoke(supabaseUrl, supabaseServiceKey, continuation, 5000)
      return new Response(
        JSON.stringify({ error: 'Check failed, will retry' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update progress
    const newProcessed = processedCount + remainingKeywords.length
    const isComplete = newProcessed >= allKeywords.length

    await supabase
      .from('ranking_check_queue')
      .update({
        processed_keywords: newProcessed,
        status: isComplete ? 'completed' : 'processing',
        completed_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    if (isComplete) {
      // Update class last_checked_at
      await supabase
        .from('project_classes')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', job.class_id)

      console.log(`[INFO] Job ${job.id} completed`)
    } else {
      console.log(`[INFO] Job ${job.id} progress: ${newProcessed}/${allKeywords.length}`)
    }

    // Self-invoke to continue (next batch of same job or next job via round-robin)
    selfInvoke(supabaseUrl, supabaseServiceKey, continuation)

    return new Response(
      JSON.stringify({
        job_id: job.id,
        processed: newProcessed,
        total: allKeywords.length,
        status: isComplete ? 'completed' : 'processing',
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

/**
 * Self-invoke with short timeout: ensures the request reaches the server
 * without waiting for the full response (which would create infinite chain).
 * The server processes the request regardless of client-side abort.
 */
async function selfInvoke(supabaseUrl: string, supabaseServiceKey: string, continuation: number, delayMs = 1000) {
  // Delay before next invocation to respect rate limits
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  
  try {
    // 5s timeout — enough for the request to reach the server
    // The server will continue processing even if we abort
    await fetch(`${supabaseUrl}/functions/v1/process-ranking-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ continuation: continuation + 1 }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Timeout/abort is expected — the request was already received by the server
  }
}
