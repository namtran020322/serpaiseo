import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Process max 10 keywords per invocation to stay within timeout
const BATCH_SIZE = 10

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

    // Get next pending or processing job
    const { data: job, error: jobError } = await supabase
      .from('ranking_check_queue')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (jobError || !job) {
      console.log('[INFO] No jobs in queue')
      return new Response(
        JSON.stringify({ message: 'No jobs to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Processing job ${job.id} for class ${job.class_id}`)

    // If pending, mark as processing
    if (job.status === 'pending') {
      await supabase
        .from('ranking_check_queue')
        .update({ 
          status: 'processing', 
          started_at: new Date().toISOString() 
        })
        .eq('id', job.id)
    }

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
          completed_at: new Date().toISOString()
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
          completed_at: new Date().toISOString()
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
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id)

      // Update class last_checked_at
      await supabase
        .from('project_classes')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', job.class_id)

      console.log(`[INFO] Job ${job.id} completed`)
      return new Response(
        JSON.stringify({ message: 'Job completed', job_id: job.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user credits
    const creditsNeeded = calculateCreditsNeeded(classData.top_results || 100, remainingKeywords.length)
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
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id)
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call check-project-keywords for this batch
    // Include userId for internal service-role auth
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
        userId: job.user_id  // Pass userId for service role auth
      }),
    })

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text()
      console.error(`[ERROR] Check failed:`, errorText)
      // Don't fail job, let it retry
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
        completed_at: isComplete ? new Date().toISOString() : null
      })
      .eq('id', job.id)

    if (isComplete) {
      // Update class last_checked_at
      await supabase
        .from('project_classes')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', job.class_id)
    }

    console.log(`[INFO] Job ${job.id} progress: ${newProcessed}/${allKeywords.length}`)

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
