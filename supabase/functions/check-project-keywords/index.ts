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
}

interface RequestBody {
  classId?: string
  projectId?: string
  keywordIds?: string[]
  userId?: string
}

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUUID(str: unknown): str is string {
  return typeof str === 'string' && UUID_REGEX.test(str)
}
function isValidUUIDArray(arr: unknown): arr is string[] {
  if (!Array.isArray(arr)) return false
  if (arr.length > 1000) return false
  return arr.every(item => isValidUUID(item))
}

// Country ID → ISO code mapping
const COUNTRY_ID_TO_CODE: Record<string, string> = {
  '2704': 'VN', '2840': 'US', '2826': 'GB', '2036': 'AU', '2124': 'CA',
  '2276': 'DE', '2250': 'FR', '2392': 'JP', '2410': 'KR', '2158': 'TW',
  '2344': 'HK', '2156': 'CN', '2356': 'IN', '2702': 'SG', '2458': 'MY',
  '2764': 'TH', '2360': 'ID', '2608': 'PH', '2076': 'BR', '2484': 'MX',
  '2724': 'ES', '2380': 'IT', '2528': 'NL', '2752': 'SE', '2578': 'NO',
  '2208': 'DK', '2246': 'FI', '2616': 'PL', '2643': 'RU', '2804': 'UA',
  '2040': 'AT', '2756': 'CH', '2056': 'BE', '2620': 'PT', '2300': 'GR',
  '2203': 'CZ', '2348': 'HU', '2642': 'RO', '2100': 'BG', '2191': 'HR',
  '2703': 'SK', '2705': 'SI', '2440': 'LT', '2428': 'LV', '2233': 'EE',
  '2196': 'CY', '2470': 'MT', '2442': 'LU', '2372': 'IE', '2554': 'NZ',
  '2032': 'AR', '2152': 'CL', '2170': 'CO', '2604': 'PE', '2862': 'VE',
  '2218': 'EC', '2858': 'UY', '2600': 'PY', '2068': 'BO', '2188': 'CR',
  '2591': 'PA', '2214': 'DO', '2320': 'GT', '2340': 'HN', '2222': 'SV',
  '2558': 'NI', '2192': 'CU', '2630': 'PR', '2388': 'JM', '2780': 'TT',
  '2818': 'EG', '2566': 'NG', '2710': 'ZA', '2404': 'KE', '2288': 'GH',
  '2834': 'TZ', '2800': 'UG', '2504': 'MA', '2012': 'DZ', '2788': 'TN',
  '2682': 'SA', '2784': 'AE', '2634': 'QA', '2414': 'KW', '2512': 'OM',
  '2048': 'BH', '2376': 'IL', '2792': 'TR', '2586': 'PK', '2050': 'BD',
  '2144': 'LK', '2104': 'MM', '2116': 'KH', '2418': 'LA', '2496': 'MN',
}

// Language code mapping (lang param like "vi" → hl param)
// The RapidAPI uses hl parameter directly with ISO 639-1 codes
function getLanguageHl(languageCode: string): string {
  // languageCode from our DB is already ISO 639-1 (e.g., "vi", "en", "ja")
  return languageCode
}

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Fetch a single SERP page with retry logic
async function fetchSerpPage(
  keyword: string,
  countryCode: string,
  languageCode: string,
  page: number,
  rapidApiKey: string
): Promise<{ results: SerpResult[]; hasNextPage: boolean }> {
  const MAX_RETRIES = 3

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const url = new URL('https://google-search116.p.rapidapi.com/')
      url.searchParams.set('query', keyword)
      url.searchParams.set('country', countryCode)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('gl', countryCode)
      url.searchParams.set('hl', getLanguageHl(languageCode))

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'google-search116.p.rapidapi.com',
          'x-rapidapi-key': rapidApiKey,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      let json: any
      try {
        json = await response.json()
      } catch {
        throw new Error('Invalid JSON response')
      }

      // Check for API error field
      if (json.error) {
        const errorMsg = String(json.error)
        // Only non-retryable if it's a known validation error
        const isValidationError = errorMsg.includes('Invalid country') || 
          errorMsg.includes('Invalid language') ||
          errorMsg.includes('Use ISO')
        if (isValidationError) {
          throw new ApiError(errorMsg)
        }
        // Server-side API errors (e.g. "parseHTMLtoJSON is not a function") are retryable
        throw new Error(`API error: ${errorMsg}`)
      }

      // Valid response must have results array
      if (!Array.isArray(json.results)) {
        throw new Error('Invalid response format - missing results')
      }

      // Parse results
      const results: SerpResult[] = json.results.map((item: any, idx: number) => ({
        position: 0, // Will be assigned later with global position
        title: item.title || '',
        url: item.url || '',
        description: item.description || '',
      }))

      const hasNextPage = !!json.next_page

      return { results, hasNextPage }
    } catch (err) {
      if (err instanceof ApiError) {
        // Non-retryable API errors
        throw err
      }

      if (attempt === MAX_RETRIES) {
        throw err
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt - 1) * 1000
      console.log(`[WARN] Page ${page} attempt ${attempt} failed, retrying in ${backoffMs}ms...`)
      await delay(backoffMs)
    }
  }

  throw new Error('Request failed after retries')
}

// Custom error class for non-retryable API errors
class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// Fetch all SERP results for a keyword (up to 10 pages = ~100 results)
async function fetchAllSerpResults(
  keyword: string,
  countryCode: string,
  languageCode: string,
  device: string,
  rapidApiKey: string
): Promise<SerpResult[]> {
  const MAX_PAGES = 10
  const allResults: SerpResult[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    // Rate limit: 1 request per second (skip delay for first page)
    if (page > 1) {
      await delay(1000)
    }

    const { results, hasNextPage } = await fetchSerpPage(
      keyword, countryCode, languageCode, page, rapidApiKey
    )

    // Stop if no results on this page
    if (results.length === 0) {
      break
    }

    // Assign global positions
    for (const result of results) {
      result.position = allResults.length + 1
      allResults.push(result)
    }

    // Stop conditions
    if (!hasNextPage) break
    if (allResults.length >= 100) break
  }

  // For mobile device: check canonical URLs (smart check)
  if (device === 'mobile' && allResults.length > 0) {
    await applyMobileCanonical(allResults)
  }

  return allResults.slice(0, 100)
}

// Fetch canonical URL from a page
async function fetchCanonicalUrl(pageUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      redirect: 'follow',
    })

    clearTimeout(timeoutId)

    if (!response.ok) return null

    const html = await response.text()
    // Only read first 50KB to find canonical
    const head = html.substring(0, 50000)
    const canonicalMatch = head.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    if (canonicalMatch) {
      return canonicalMatch[1]
    }

    // Also check alternate pattern
    const altMatch = head.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
    if (altMatch) {
      return altMatch[1]
    }

    return null
  } catch {
    return null
  }
}

// Normalize URL for canonical comparison (strip protocol, www, trailing slash)
function normalizeUrlForComparison(url: string): string {
  try {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '')
      .toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

// Smart mobile canonical check
async function applyMobileCanonical(results: SerpResult[]): Promise<void> {
  // Check page 1 results (first 10) for canonical differences
  const page1Results = results.slice(0, Math.min(10, results.length))
  const CONCURRENT_CANONICAL = 5

  let hasCanonicalDiff = false
  const canonicalMap = new Map<number, string>()

  // Batch fetch canonicals for page 1
  for (let i = 0; i < page1Results.length; i += CONCURRENT_CANONICAL) {
    const batch = page1Results.slice(i, i + CONCURRENT_CANONICAL)
    const promises = batch.map(async (result) => {
      const canonical = await fetchCanonicalUrl(result.url)
      if (canonical && normalizeUrlForComparison(canonical) !== normalizeUrlForComparison(result.url)) {
        canonicalMap.set(result.position, canonical)
        hasCanonicalDiff = true
      }
    })
    await Promise.allSettled(promises)
  }

  // Apply page 1 canonicals
  for (const [position, canonical] of canonicalMap) {
    const result = results.find(r => r.position === position)
    if (result) {
      result.url = canonical
    }
  }

  // If page 1 had differences, check remaining pages too
  if (hasCanonicalDiff && results.length > 10) {
    const remainingResults = results.slice(10)
    for (let i = 0; i < remainingResults.length; i += CONCURRENT_CANONICAL) {
      const batch = remainingResults.slice(i, i + CONCURRENT_CANONICAL)
      const promises = batch.map(async (result) => {
        const canonical = await fetchCanonicalUrl(result.url)
        if (canonical && normalizeUrlForComparison(canonical) !== normalizeUrlForComparison(result.url)) {
          result.url = canonical
        }
      })
      await Promise.allSettled(promises)
    }
  }
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

// Process keywords sequentially with 1s delay between keywords (rate limit compliance)
async function processKeywordsSequentially<T>(
  items: T[],
  processor: (item: T) => Promise<any>
): Promise<any[]> {
  const results: any[] = []
  for (let i = 0; i < items.length; i++) {
    // Add 1s delay between keywords (not before the first one)
    if (i > 0) {
      await delay(1000)
    }
    try {
      const result = await processor(items[i])
      results.push(result)
    } catch (err) {
      console.error(`[ERROR] Keyword processing failed`)
      results.push(null)
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let userId: string

    // Check if internal call (service role) or user JWT
    if (token === supabaseServiceKey) {
      const body = await req.json() as RequestBody
      if (!body.userId || !isValidUUID(body.userId)) {
        return new Response(
          JSON.stringify({ error: 'userId required for internal calls' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      userId = body.userId
      ;(req as any)._parsedBody = body
    } else {
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

    // Parse request body
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

    if (!classId && !projectId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: classId or projectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
    if (!rapidApiKey) {
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
        return new Response(
          JSON.stringify({ error: 'Failed to fetch classes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      classesToProcess = classes || []
    }

    // Calculate total credits needed: 1 credit per keyword
    let totalKeywordsCount = 0

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
      totalKeywordsCount += count || 0
    }

    const totalCreditsNeeded = totalKeywordsCount // 1 credit per keyword

    // Check user credits
    const { data: userCredits } = await supabase
      .from('user_credits')
      .select('balance, total_used')
      .eq('user_id', userId)
      .single()

    const currentBalance = userCredits?.balance || 0
    const currentTotalUsed = userCredits?.total_used || 0

    if (currentBalance < totalCreditsNeeded) {
      return new Response(
        JSON.stringify({
          error: 'insufficient_credits',
          message: `Insufficient credits. Need ${totalCreditsNeeded}, have ${currentBalance}.`,
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
      return new Response(
        JSON.stringify({ error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upsert daily usage summary
    const { error: upsertError } = await supabase.rpc('upsert_daily_usage', {
      p_user_id: userId,
      p_keywords_count: totalKeywordsCount,
      p_credits_used: totalCreditsNeeded,
      p_balance_after: newBalance,
    })

    if (upsertError) {
      console.error('[WARN] Failed to upsert daily usage:', upsertError)
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: -totalCreditsNeeded,
        type: 'usage',
        description: `Check ${totalKeywordsCount} keywords`,
        balance_after: newBalance,
      })
    }

    console.log(`[INFO] Deducted ${totalCreditsNeeded} credits, new balance: ${newBalance}`)

    let totalProcessed = 0
    let totalFound = 0
    let totalNotFound = 0

    for (const cls of classesToProcess) {
      // Resolve country code from country_id
      const countryCode = COUNTRY_ID_TO_CODE[cls.country_id] || 'US'

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

      // Process each keyword (sequential due to 1 req/s rate limit)
      const processKeyword = async (kw: any): Promise<{ found: boolean; processed: boolean }> => {
        try {
          console.log(`[INFO] Checking keyword: "${kw.keyword}"`)

          const results = await fetchAllSerpResults(
            kw.keyword,
            countryCode,
            cls.language_code,
            cls.device,
            rapidApiKey
          )

          // Find user domain ranking
          const { position: userPosition, foundUrl } = findTargetRanking(results, cls.domain)

          // Find competitor rankings
          const existingCompRankings = (kw.competitor_rankings as Record<string, any>) || {}
          const competitorRankings: Record<string, {
            position: number | null
            url: string | null
            first_position: number | null
            best_position: number | null
            previous_position: number | null
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

          await supabase
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

          // Insert history record
          await supabase
            .from('keyword_ranking_history')
            .insert({
              keyword_id: kw.id,
              user_id: userId,
              ranking_position: userPosition,
              found_url: foundUrl,
              competitor_rankings: competitorRankings,
              checked_at: new Date().toISOString()
            })

          return { processed: true, found: userPosition !== null }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error'
          console.error(`[ERROR] Failed to check keyword "${kw.keyword}": ${errMsg}`)
          return { processed: false, found: false }
        }
      }

      // Process keywords sequentially (rate-limited API)
      const results = await processKeywordsSequentially(keywords || [], processKeyword)

      for (const result of results) {
        if (result?.processed) {
          totalProcessed++
          if (result.found) totalFound++
          else totalNotFound++
        }
      }

      // Update class last_checked_at
      await supabase
        .from('project_classes')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', cls.id)
    }

    console.log(`[INFO] Completed: ${totalProcessed} processed, ${totalFound} found, ${totalNotFound} not found`)

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
