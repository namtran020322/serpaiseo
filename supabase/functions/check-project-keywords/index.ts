import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SerpResult {
  position: number
  title: string
  url: string
  description: string
  breadcrumbs: string
}

interface RequestBody {
  classId?: string
  projectId?: string
  keywordIds?: string[]
}

// SERP API error messages mapping
const SERP_API_ERRORS: Record<string, string> = {
  '2': 'Empty keyword',
  '15': 'No results for this keyword',
  '31': 'API user not registered',
  '42': 'Invalid API key',
  '45': 'IP address blocked',
  '101': 'Service under maintenance, please try again later',
  '102': 'Invalid groupby parameter'
}

// Check for API errors in response
function checkApiError(xmlText: string): void {
  const errorMatch = xmlText.match(/<error\s+code="(\d+)"[^>]*>([\s\S]*?)<\/error>/i)
  if (errorMatch) {
    const errorCode = errorMatch[1]
    const errorMessage = SERP_API_ERRORS[errorCode] || `API error ${errorCode}: ${errorMatch[2].trim()}`
    throw new Error(errorMessage)
  }
  
  const simpleErrorMatch = xmlText.match(/<error>([\s\S]*?)<\/error>/i)
  if (simpleErrorMatch) {
    throw new Error(`API error: ${simpleErrorMatch[1].trim()}`)
  }
}

// Clean text by stripping CDATA wrapper and HTML tags
function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<\/?hlword>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

// Parse XML results from SERP API
function parseXmlResults(xmlText: string, startPosition: number): SerpResult[] {
  const results: SerpResult[] = []
  
  checkApiError(xmlText)
  
  const docRegex = /<doc>([\s\S]*?)<\/doc>/gi
  let docMatch
  let position = startPosition
  
  while ((docMatch = docRegex.exec(xmlText)) !== null) {
    const docContent = docMatch[1]
    
    const contenttypeMatch = docContent.match(/<contenttype>\s*([\s\S]*?)\s*<\/contenttype>/i)
    const contenttype = contenttypeMatch ? contenttypeMatch[1].trim().toLowerCase() : ''
    
    if (contenttype !== 'organic') {
      continue
    }
    
    const urlMatch = docContent.match(/<url>\s*([\s\S]*?)\s*<\/url>/i)
    if (!urlMatch) continue
    const url = urlMatch[1].trim()
    
    const titleMatch = docContent.match(/<title>\s*([\s\S]*?)\s*<\/title>/i)
    const title = cleanText(titleMatch ? titleMatch[1] : '')
    
    const passageMatch = docContent.match(/<passage>\s*([\s\S]*?)\s*<\/passage>/i)
    const description = cleanText(passageMatch ? passageMatch[1] : '')
    
    const breadcrumbMatch = docContent.match(/<breadcrumbs>\s*([\s\S]*?)\s*<\/breadcrumbs>/i)
    const breadcrumbs = breadcrumbMatch ? breadcrumbMatch[1].trim() : ''
    
    results.push({
      position: position,
      title,
      url,
      description,
      breadcrumbs
    })
    
    position++
  }
  
  return results
}

// Normalize URL/domain for comparison
function normalizeForComparison(input: string): string {
  try {
    const urlString = input.startsWith('http') ? input : `https://${input}`
    const parsed = new URL(urlString)
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return input
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
  }
}

// Find ranking position of target URL/domain in results
function findTargetRanking(results: SerpResult[], targetUrl: string): { position: number | null, foundUrl: string | null } {
  if (!targetUrl || targetUrl.trim() === '') {
    return { position: null, foundUrl: null }
  }
  
  const targetDomain = normalizeForComparison(targetUrl)
  
  for (const result of results) {
    const resultDomain = normalizeForComparison(result.url)
    
    if (resultDomain === targetDomain || 
        resultDomain.includes(targetDomain) || 
        targetDomain.includes(resultDomain)) {
      return { position: result.position, foundUrl: result.url }
    }
  }
  
  return { position: null, foundUrl: null }
}

// Fetch with timeout
async function fetchWithTimeout(url: string, timeoutMs: number = 90000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (err) {
    clearTimeout(timeoutId)
    const error = err as Error
    if (error.name === 'AbortError') {
      throw new Error('API timeout - please try again later')
    }
    throw error
  }
}

// Fetch SERP results for a keyword
async function fetchSerpResults(
  keyword: string,
  countryId: string,
  languageCode: string,
  device: string,
  topResults: number,
  locationId: string | null,
  serpApiUserId: string,
  serpApiKey: string
): Promise<SerpResult[]> {
  const resultsPerPage = 10
  const totalPages = Math.ceil(topResults / resultsPerPage)
  let allResults: SerpResult[] = []

  for (let page = 1; page <= totalPages; page++) {
    const apiUrl = new URL('https://xmlriver.com/search/xml')
    apiUrl.searchParams.set('user', serpApiUserId)
    apiUrl.searchParams.set('key', serpApiKey)
    apiUrl.searchParams.set('query', keyword)
    apiUrl.searchParams.set('country', countryId)
    apiUrl.searchParams.set('lr', languageCode)
    apiUrl.searchParams.set('device', device)
    apiUrl.searchParams.set('groupby', '10')
    apiUrl.searchParams.set('page', page.toString())
    apiUrl.searchParams.set('domain', '37')

    if (locationId) {
      apiUrl.searchParams.set('loc', locationId)
    }

    try {
      const response = await fetchWithTimeout(apiUrl.toString(), 90000)
      
      if (!response.ok) {
        throw new Error(`SERP API error: HTTP ${response.status}`)
      }

      const xmlText = await response.text()
      const startPosition = (page - 1) * resultsPerPage + 1
      const pageResults = parseXmlResults(xmlText, startPosition)
      allResults = allResults.concat(pageResults)

      if (allResults.length >= topResults) {
        break
      }

      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (err) {
      if (page === 1) {
        throw err
      }
      break
    }
  }

  return allResults.slice(0, topResults)
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
    
    // Client for auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    // Service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser()
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userId = claimsData.user.id

    const body: RequestBody = await req.json()
    const { classId, projectId, keywordIds } = body

    if (!classId && !projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: classId or projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serpApiUserId = Deno.env.get('XMLRIVER_USER_ID')
    const serpApiKey = Deno.env.get('XMLRIVER_API_KEY')

    if (!serpApiUserId || !serpApiKey) {
      return new Response(
        JSON.stringify({ error: 'SERP API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch class(es) to process
    let classesToProcess: any[] = []
    
    if (classId) {
      const { data: cls, error: clsError } = await supabase
        .from('project_classes')
        .select('*')
        .eq('id', classId)
        .eq('user_id', userId)
        .single()
      
      if (clsError || !cls) {
        return new Response(
          JSON.stringify({ error: 'Class not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      classesToProcess = [cls]
    } else if (projectId) {
      const { data: classes, error: classesError } = await supabase
        .from('project_classes')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
      
      if (classesError) {
        throw classesError
      }
      classesToProcess = classes || []
    }

    console.log(`[INFO] Processing ${classesToProcess.length} class(es)`)

    let totalProcessed = 0
    let totalFound = 0
    let totalNotFound = 0

    for (const cls of classesToProcess) {
      // Fetch keywords for this class
      let keywordsQuery = supabase
        .from('project_keywords')
        .select('*')
        .eq('class_id', cls.id)
        .eq('user_id', userId)
      
      if (keywordIds && keywordIds.length > 0) {
        keywordsQuery = keywordsQuery.in('id', keywordIds)
      }

      const { data: keywords, error: kwError } = await keywordsQuery
      
      if (kwError) {
        console.error(`[ERROR] Failed to fetch keywords for class ${cls.id}:`, kwError)
        continue
      }

      const competitorDomains = (cls.competitor_domains as string[]) || []
      
      console.log(`[INFO] Class ${cls.name}: Processing ${keywords?.length || 0} keywords`)

      for (const kw of keywords || []) {
        try {
          console.log(`[INFO] Checking keyword: "${kw.keyword}"`)
          
          // Fetch SERP results
          const results = await fetchSerpResults(
            kw.keyword,
            cls.country_id,
            cls.language_code,
            cls.device,
            cls.top_results,
            cls.location_id,
            serpApiUserId,
            serpApiKey
          )

          // Find user domain ranking
          const { position: userPosition, foundUrl } = findTargetRanking(results, cls.domain)

          // Find competitor rankings
          const competitorRankings: Record<string, number | null> = {}
          for (const compDomain of competitorDomains) {
            const { position: compPosition } = findTargetRanking(results, compDomain)
            competitorRankings[compDomain] = compPosition
          }

          // Update keyword record
          const previousPosition = kw.ranking_position
          const firstPosition = kw.first_position ?? userPosition
          const bestPosition = userPosition !== null
            ? (kw.best_position !== null ? Math.min(kw.best_position, userPosition) : userPosition)
            : kw.best_position

          const { error: updateError } = await supabase
            .from('project_keywords')
            .update({
              ranking_position: userPosition,
              first_position: firstPosition,
              best_position: bestPosition,
              previous_position: previousPosition,
              found_url: foundUrl,
              competitor_rankings: competitorRankings,
              serp_results: results,
              last_checked_at: new Date().toISOString()
            })
            .eq('id', kw.id)

          if (updateError) {
            console.error(`[ERROR] Failed to update keyword ${kw.id}:`, updateError)
          }

          // Insert history record
          const { error: historyError } = await supabase
            .from('keyword_ranking_history')
            .insert({
              keyword_id: kw.id,
              user_id: userId,
              ranking_position: userPosition,
              found_url: foundUrl,
              competitor_rankings: competitorRankings,
              checked_at: new Date().toISOString()
            })

          if (historyError) {
            console.error(`[ERROR] Failed to insert history for keyword ${kw.id}:`, historyError)
          }

          totalProcessed++
          if (userPosition !== null) {
            totalFound++
          } else {
            totalNotFound++
          }

          // Small delay between keywords to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (err) {
          const error = err as Error
          console.error(`[ERROR] Failed to check keyword "${kw.keyword}":`, error.message)
        }
      }

      // Update class last_checked_at
      await supabase
        .from('project_classes')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', cls.id)
    }

    console.log(`[INFO] Completed: ${totalProcessed} keywords processed, ${totalFound} found, ${totalNotFound} not found`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        found: totalFound,
        notFound: totalNotFound
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[ERROR] Edge function error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
