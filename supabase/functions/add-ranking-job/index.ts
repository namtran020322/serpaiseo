import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  classId: string
  keywordIds?: string[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Auth client
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userId = userData.user.id

    // Parse request
    let body: RequestBody
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { classId, keywordIds } = body

    if (!classId) {
      return new Response(
        JSON.stringify({ error: 'classId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Service client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify class ownership
    const { data: classData, error: classError } = await supabase
      .from('project_classes')
      .select('id, name, user_id')
      .eq('id', classId)
      .eq('user_id', userId)
      .single()

    if (classError || !classData) {
      return new Response(
        JSON.stringify({ error: 'Class not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing pending/processing job for this class
    const { data: existingJob } = await supabase
      .from('ranking_check_queue')
      .select('id, status')
      .eq('class_id', classId)
      .in('status', ['pending', 'processing'])
      .single()

    if (existingJob) {
      return new Response(
        JSON.stringify({ 
          error: 'A ranking check is already in progress for this class',
          job_id: existingJob.id,
          status: existingJob.status
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Count keywords
    let totalKeywords = 0
    if (keywordIds && keywordIds.length > 0) {
      totalKeywords = keywordIds.length
    } else {
      const { count } = await supabase
        .from('project_keywords')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
      totalKeywords = count || 0
    }

    if (totalKeywords === 0) {
      return new Response(
        JSON.stringify({ error: 'No keywords to check' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create job in queue
    const { data: job, error: insertError } = await supabase
      .from('ranking_check_queue')
      .insert({
        class_id: classId,
        user_id: userId,
        keyword_ids: keywordIds || [],
        total_keywords: totalKeywords,
        processed_keywords: 0,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError || !job) {
      console.error('Failed to create job:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create ranking check job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Created ranking job ${job.id} for class ${classId} with ${totalKeywords} keywords`)

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        class_id: classId,
        total_keywords: totalKeywords,
        status: 'pending',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in add-ranking-job:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
