import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://serpaiseo.lovable.app',
  'https://id-preview--466d3968-bedc-40b5-9be4-10fb57a12051.lovable.app',
  'https://466d3968-bedc-40b5-9be4-10fb57a12051.lovableproject.com',
  'https://serp.aiseocore.com',
  'http://localhost:5173',
  'http://localhost:8080'
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Accept any lovable.app, lovableproject.com subdomain, or custom domain
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  )
  
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0]
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true'
  }
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
  userId?: string // For internal calls from process-ranking-queue
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Validate UUID format
function isValidUUID(str: unknown): str is string {
  return typeof str === 'string' && UUID_REGEX.test(str)
}

// Validate array of UUIDs
function isValidUUIDArray(arr: unknown): arr is string[] {
  if (!Array.isArray(arr)) return false
  if (arr.length > 1000) return false // Max 1000 keywords per request
  return arr.every(item => isValidUUID(item))
}

// Validate top_results is within reasonable range
function isValidTopResults(value: number): boolean {
  return value >= 10 && value <= 100
}

// SERP API error messages mapping with retry info
const SERP_API_ERRORS: Record<string, { message: string; retryable: boolean }> = {
  '2': { message: 'Empty keyword provided', retryable: false },
  '15': { message: 'No search results for this keyword', retryable: false },
  '20': { message: 'Internal error - please contact support', retryable: false },
  '21': { message: 'Internal error - please contact support', retryable: false },
  '22': { message: 'Internal error - please contact support', retryable: false },
  '23': { message: 'Internal error - please contact support', retryable: false },
  '24': { message: 'Internal error - please contact support', retryable: false },
  '31': { message: 'API user not registered', retryable: false },
  '42': { message: 'Invalid API key - please check configuration', retryable: false },
  '45': { message: 'IP address is blocked - check access settings', retryable: false },
  '101': { message: 'Service under maintenance - please try again later', retryable: true },
  '102': { message: 'Invalid groupby parameter', retryable: false },
  '103': { message: 'Invalid language parameter (lr)', retryable: false },
  '104': { message: 'Invalid location parameter (loc)', retryable: false },
  '105': { message: 'Invalid country parameter', retryable: false },
  '106': { message: 'Invalid domain parameter', retryable: false },
  '107': { message: 'Invalid top results value for Yandex (only 10 allowed)', retryable: false },
  '108': { message: 'Missing zoom or coords for Google Maps search', retryable: false },
  '110': { message: 'All available channels are busy - please try again later', retryable: true },
  '111': { message: 'No free data collection channels - please try again later', retryable: true },
  '115': { message: 'Too many parallel requests - temporarily blocked', retryable: true },
  '120': { message: 'Invalid characters or operators in search query', retryable: false },
  '121': { message: 'Invalid request ID', retryable: false },
  '200': { message: 'Account balance is empty - please top up', retryable: false },
  '201': { message: 'Responses not being collected - collection paused for 20 minutes', retryable: true },
  '202': { message: 'Request not yet processed - retrying', retryable: true },
  '203': { message: 'Please retry after delay', retryable: true },
  '204': { message: 'Invalid task ID or task failed', retryable: true },
  '500': { message: 'Network error - please retry', retryable: true },
}

// Concurrent processing limit (XMLRiver allows 10 threads for standard accounts)
const CONCURRENT_LIMIT = 10

// Check for API errors in response and return error info if found
function checkApiError(xmlText: string): { code: string; message: string; retryable: boolean } | null {
  const errorMatch = xmlText.match(/<error\s+code="(\d+)"[^>]*>([\s\S]*?)<\/error>/i)
  if (errorMatch) {
    const errorCode = errorMatch[1]
    const errorInfo = SERP_API_ERRORS[errorCode]
    return {
      code: errorCode,
      message: errorInfo?.message || `API error ${errorCode}`,
      retryable: errorInfo?.retryable ?? false
    }
  }
  
  const simpleErrorMatch = xmlText.match(/<error>([\s\S]*?)<\/error>/i)
  if (simpleErrorMatch) {
    return {
      code: 'unknown',
      message: 'API error occurred',
      retryable: false
    }
  }
  
  return null
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
  
  const errorInfo = checkApiError(xmlText)
  if (errorInfo) {
    throw new Error(errorInfo.message)
  }
  
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

// Fetch with retry for retryable errors
async function fetchWithRetry(
  url: string, 
  maxRetries: number = 3, 
  baseDelay: number = 1000
): Promise<{ response: Response; text: string }> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, 90000)
      
      if (!response.ok) {
        throw new Error(`API error: HTTP ${response.status}`)
      }
      
      const text = await response.text()
      
      // Check for API error in response
      const errorInfo = checkApiError(text)
      if (errorInfo) {
        if (errorInfo.retryable && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          console.log(`[WARN] Retryable error, retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        throw new Error(errorInfo.message)
      }
      
      return { response, text }
    } catch (err) {
      lastError = err as Error
      
      // Network errors are retryable
      if (attempt < maxRetries - 1 && !lastError.message.includes('API')) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[WARN] Network error, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries')
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
  // Enforce reasonable bounds
  const validTopResults = Math.max(10, Math.min(100, topResults))
  const resultsPerPage = 10
  const totalPages = Math.ceil(validTopResults / resultsPerPage)
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
      const { text: xmlText } = await fetchWithRetry(apiUrl.toString(), 3, 1000)
      const startPosition = (page - 1) * resultsPerPage + 1
      const pageResults = parseXmlResults(xmlText, startPosition)
      allResults = allResults.concat(pageResults)

      if (allResults.length >= validTopResults) {
        break
      }

      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    } catch (err) {
      if (page === 1) {
        throw err
      }
      break
    }
  }

  return allResults.slice(0, validTopResults)
}

// Process a batch of items with concurrency limit
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<(R | null)[]> {
  const results: (R | null)[] = []
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(item => processor(item))
    )
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push(null)
        console.error(`[ERROR] Batch item failed`)
      }
    }
    
    // Delay between batches to avoid rate limiting
    if (i + concurrency < items.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  return results
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

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
    
    const token = authHeader.replace('Bearer ', '')
    
    // Service client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    let userId: string
    
    // Check if this is a service role call (internal from process-ranking-queue)
    if (token === supabaseServiceKey) {
      // Internal call - userId must be provided in body
      const body = await req.json() as RequestBody
      if (!body.userId || !isValidUUID(body.userId)) {
        return new Response(
          JSON.stringify({ error: 'userId required for internal calls' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      userId = body.userId
      // Restore request body for later parsing
      ;(req as any)._parsedBody = body
    } else {
      // User JWT call - validate token
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token)
      if (claimsError || !claimsData?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      userId = claimsData.user.id
    }

    // Parse and validate request body (may already be parsed for internal calls)
    let body: RequestBody
    try {
      body = (req as any)._parsedBody || await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { classId, projectId, keywordIds } = body

    // Validate required fields
    if (!classId && !projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: classId or projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID formats
    if (classId && !isValidUUID(classId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid classId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (projectId && !isValidUUID(projectId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid projectId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (keywordIds !== undefined && !isValidUUIDArray(keywordIds)) {
      return new Response(
        JSON.stringify({ error: 'Invalid keywordIds format or too many keywords (max 1000)' }),
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

      // Validate top_results
      if (!isValidTopResults(cls.top_results)) {
        console.log(`[WARN] Invalid top_results ${cls.top_results}, clamping to valid range`)
        cls.top_results = Math.max(10, Math.min(100, cls.top_results))
      }

      classesToProcess = [cls]
    } else if (projectId) {
      const { data: classes, error: classesError } = await supabase
        .from('project_classes')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
      
      if (classesError) {
        console.error('[ERROR] Failed to fetch classes')
        return new Response(
          JSON.stringify({ error: 'Failed to fetch classes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate and clamp top_results for all classes
      classesToProcess = (classes || []).map(cls => ({
        ...cls,
        top_results: Math.max(10, Math.min(100, cls.top_results))
      }))
    }

    // Calculate total credits needed
    let totalKeywordsCount = 0
    let totalCreditsNeeded = 0
    
    for (const cls of classesToProcess) {
      let keywordsQuery = supabase
        .from('project_keywords')
        .select('id', { count: 'exact' })
        .eq('class_id', cls.id)
        .eq('user_id', userId)
      
      if (keywordIds && keywordIds.length > 0) {
        keywordsQuery = keywordsQuery.in('id', keywordIds)
      }
      
      const { count } = await keywordsQuery
      const keywordCount = count || 0
      const creditsPerKeyword = Math.ceil(cls.top_results / 10)
      
      totalKeywordsCount += keywordCount
      totalCreditsNeeded += keywordCount * creditsPerKeyword
    }

    // Check user credits
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('balance, total_used')
      .eq('user_id', userId)
      .single()

    const currentBalance = userCredits?.balance || 0
    const currentTotalUsed = userCredits?.total_used || 0

    if (currentBalance < totalCreditsNeeded) {
      console.log(`[WARN] Insufficient credits: need ${totalCreditsNeeded}, have ${currentBalance}`)
      return new Response(
        JSON.stringify({
          error: 'insufficient_credits',
          message: `Không đủ credit. Cần ${totalCreditsNeeded} credits, bạn có ${currentBalance} credits.`,
          credits_needed: totalCreditsNeeded,
          credits_available: currentBalance,
          keywords_count: totalKeywordsCount
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduct credits before processing
    const newBalance = currentBalance - totalCreditsNeeded
    const newTotalUsed = currentTotalUsed + totalCreditsNeeded

    const { error: deductError } = await supabase
      .from('user_credits')
      .upsert({
        user_id: userId,
        balance: newBalance,
        total_used: newTotalUsed,
      }, { onConflict: 'user_id' })

    if (deductError) {
      console.error('[ERROR] Failed to deduct credits')
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log credit transaction
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -totalCreditsNeeded,
      type: 'usage',
      description: `Check ${totalKeywordsCount} keywords`,
      balance_after: newBalance,
    })

    console.log(`[INFO] Deducted ${totalCreditsNeeded} credits from user, new balance: ${newBalance}`)
    console.log(`[INFO] Processing ${classesToProcess.length} class(es) with ${CONCURRENT_LIMIT} concurrent threads`)

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
        console.error(`[ERROR] Failed to fetch keywords for class ${cls.id}`)
        continue
      }

      const competitorDomains = (cls.competitor_domains as string[]) || []
      
      console.log(`[INFO] Class ${cls.name}: Processing ${keywords?.length || 0} keywords`)

      // Process keywords in batches with concurrent limit
      const processKeyword = async (kw: any): Promise<{ found: boolean; processed: boolean }> => {
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

          // Find competitor rankings with full data
          const existingCompRankings = (kw.competitor_rankings as Record<string, any>) || {}
          const competitorRankings: Record<string, {
            position: number | null;
            url: string | null;
            first_position: number | null;
            best_position: number | null;
            previous_position: number | null;
          }> = {}
          
          for (const compDomain of competitorDomains) {
            const { position: compPosition, foundUrl: compUrl } = findTargetRanking(results, compDomain)
            
            const existingData = existingCompRankings[compDomain]
            const existingPos = typeof existingData === 'object' ? existingData?.position : existingData
            const existingFirst = typeof existingData === 'object' ? existingData?.first_position : null
            const existingBest = typeof existingData === 'object' ? existingData?.best_position : null
            
            competitorRankings[compDomain] = {
              position: compPosition,
              url: compUrl,
              first_position: existingFirst ?? compPosition,
              best_position: compPosition !== null 
                ? (existingBest !== null ? Math.min(existingBest, compPosition) : compPosition)
                : existingBest,
              previous_position: existingPos ?? null
            }
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
            console.error(`[ERROR] Failed to update keyword ${kw.id}`)
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
            console.error(`[ERROR] Failed to insert history for keyword ${kw.id}`)
          }

          return { processed: true, found: userPosition !== null }
        } catch (err) {
          console.error(`[ERROR] Failed to check keyword "${kw.keyword}"`)
          return { processed: false, found: false }
        }
      }

      // Process keywords with concurrent limit
      const results = await processBatch(keywords || [], processKeyword, CONCURRENT_LIMIT)
      
      for (const result of results) {
        if (result?.processed) {
          totalProcessed++
          if (result.found) {
            totalFound++
          } else {
            totalNotFound++
          }
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
    console.error('[ERROR] Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'An error occurred processing the request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
