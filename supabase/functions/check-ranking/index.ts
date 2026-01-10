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
  keyword: string
  targetUrl?: string
  countryId: string
  countryName: string
  locationId?: string
  locationName?: string
  languageCode: string
  languageName: string
  device: string
  topResults: number
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
  // API returns errors like: <error code="42">Invalid API key</error>
  const errorMatch = xmlText.match(/<error\s+code="(\d+)"[^>]*>([\s\S]*?)<\/error>/i)
  if (errorMatch) {
    const errorCode = errorMatch[1]
    const errorMessage = SERP_API_ERRORS[errorCode] || `API error ${errorCode}: ${errorMatch[2].trim()}`
    throw new Error(errorMessage)
  }
  
  // Also check for simple error format
  const simpleErrorMatch = xmlText.match(/<error>([\s\S]*?)<\/error>/i)
  if (simpleErrorMatch) {
    throw new Error(`API error: ${simpleErrorMatch[1].trim()}`)
  }
}

// Clean text by stripping CDATA wrapper and HTML tags
function cleanText(text: string): string {
  return text
    // Strip CDATA wrapper
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    // Strip <hlword> tags (keep content)
    .replace(/<\/?hlword>/g, '')
    // Decode HTML entities
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
  
  console.log(`[DEBUG] Parsing XML, length: ${xmlText.length}`)
  console.log(`[DEBUG] First 1000 chars: ${xmlText.substring(0, 1000)}`)
  
  // Check for API errors first
  checkApiError(xmlText)
  
  // Match all <doc>...</doc> blocks within <group> elements
  const docRegex = /<doc>([\s\S]*?)<\/doc>/gi
  let docMatch
  let position = startPosition
  
  while ((docMatch = docRegex.exec(xmlText)) !== null) {
    const docContent = docMatch[1]
    
    // Extract contenttype to filter organic results only
    const contenttypeMatch = docContent.match(/<contenttype>\s*([\s\S]*?)\s*<\/contenttype>/i)
    const contenttype = contenttypeMatch ? contenttypeMatch[1].trim().toLowerCase() : ''
    
    // Only include organic results
    if (contenttype !== 'organic') {
      continue
    }
    
    // Extract URL - required field
    const urlMatch = docContent.match(/<url>\s*([\s\S]*?)\s*<\/url>/i)
    if (!urlMatch) continue
    const url = urlMatch[1].trim()
    
    // Extract title and clean it
    const titleMatch = docContent.match(/<title>\s*([\s\S]*?)\s*<\/title>/i)
    const title = cleanText(titleMatch ? titleMatch[1] : '')
    
    // Extract description from passage and clean it
    const passageMatch = docContent.match(/<passage>\s*([\s\S]*?)\s*<\/passage>/i)
    const description = cleanText(passageMatch ? passageMatch[1] : '')
    
    // Extract breadcrumbs
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
  
  console.log(`[DEBUG] Parsed ${results.length} organic results starting from position ${startPosition}`)
  if (results.length > 0) {
    console.log(`[DEBUG] First result: ${JSON.stringify(results[0])}`)
  }
  
  return results
}

// Normalize URL/domain for comparison
function normalizeForComparison(input: string): string {
  try {
    // Add protocol if missing
    const urlString = input.startsWith('http') ? input : `https://${input}`
    const parsed = new URL(urlString)
    // Return hostname without www, lowercase
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    // If URL parsing fails, clean up manually
    return input
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0] // Get just the domain part
  }
}

// Find ranking position of target URL/domain in results
function findTargetRanking(results: SerpResult[], targetUrl: string): { position: number | null, foundUrl: string | null } {
  if (!targetUrl || targetUrl.trim() === '') {
    return { position: null, foundUrl: null }
  }
  
  const targetDomain = normalizeForComparison(targetUrl)
  console.log(`[DEBUG] Looking for target domain: ${targetDomain}`)
  
  for (const result of results) {
    const resultDomain = normalizeForComparison(result.url)
    
    // Check if domains match (either contains the other)
    if (resultDomain === targetDomain || 
        resultDomain.includes(targetDomain) || 
        targetDomain.includes(resultDomain)) {
      console.log(`[DEBUG] Found match at position ${result.position}: ${result.url}`)
      return { position: result.position, foundUrl: result.url }
    }
  }
  
  console.log(`[DEBUG] Target domain not found in ${results.length} results`)
  return { position: null, foundUrl: null }
}

// Fetch with timeout - API can take up to 1 minute
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userId = claimsData.claims.sub

    // Parse request body
    const body: RequestBody = await req.json()
    const { 
      keyword, 
      targetUrl, 
      countryId, 
      countryName,
      locationId, 
      locationName,
      languageCode,
      languageName,
      device, 
      topResults 
    } = body

    // Validate required fields
    if (!keyword || !countryId || !languageCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: keyword, countryId, languageCode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get SERP API credentials
    const serpApiUserId = Deno.env.get('XMLRIVER_USER_ID')
    const serpApiKey = Deno.env.get('XMLRIVER_API_KEY')

    if (!serpApiUserId || !serpApiKey) {
      return new Response(
        JSON.stringify({ error: 'SERP API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Starting rank check for keyword: "${keyword}", topResults: ${topResults}`)

    // Calculate number of pages needed (10 results per page)
    const resultsPerPage = 10
    const totalPages = Math.ceil(topResults / resultsPerPage)
    
    let allResults: SerpResult[] = []

    // Fetch results from SERP API - page by page (1-based indexing)
    for (let page = 1; page <= totalPages; page++) {
      // Build API URL
      const apiUrl = new URL('https://xmlriver.com/search/xml')
      apiUrl.searchParams.set('user', serpApiUserId)
      apiUrl.searchParams.set('key', serpApiKey)
      apiUrl.searchParams.set('query', keyword)
      apiUrl.searchParams.set('country', countryId)
      apiUrl.searchParams.set('lr', languageCode)
      apiUrl.searchParams.set('device', device)
      apiUrl.searchParams.set('groupby', '10')
      apiUrl.searchParams.set('page', page.toString())
      apiUrl.searchParams.set('domain', '37') // google.com domain

      // Add location if specified
      if (locationId) {
        apiUrl.searchParams.set('loc', locationId)
      }

      console.log(`[INFO] Fetching page ${page}/${totalPages} from SERP API...`)
      console.log(`[DEBUG] API URL: ${apiUrl.toString().replace(serpApiKey, '***')}`)

      try {
        // Fetch with 90 second timeout
        const response = await fetchWithTimeout(apiUrl.toString(), 90000)
        
        if (!response.ok) {
          console.error(`[ERROR] SERP API returned status ${response.status}`)
          throw new Error(`SERP API error: HTTP ${response.status}`)
        }

        const xmlText = await response.text()
        
        // Parse results from this page (calculate start position based on 1-based page)
        const startPosition = (page - 1) * resultsPerPage + 1
        const pageResults = parseXmlResults(xmlText, startPosition)
        allResults = allResults.concat(pageResults)

        console.log(`[INFO] Page ${page}: Got ${pageResults.length} results, total: ${allResults.length}`)

        // Stop if we have enough results
        if (allResults.length >= topResults) {
          break
        }

        // Small delay between pages to avoid rate limiting
        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (err) {
        const error = err as Error
        console.error(`[ERROR] Failed to fetch page ${page}:`, error.message)
        // If first page fails, throw error. Otherwise return what we have
        if (page === 1) {
          throw error
        }
        break
      }
    }

    // Trim results to requested amount
    allResults = allResults.slice(0, topResults)

    console.log(`[INFO] Final results count: ${allResults.length}`)

    // Find target ranking if URL provided
    const { position: rankingPosition, foundUrl } = findTargetRanking(allResults, targetUrl || '')

    // Save to database
    const { data: checkData, error: dbError } = await supabase
      .from('ranking_checks')
      .insert({
        user_id: userId,
        keyword,
        target_url: targetUrl || null,
        country_id: countryId,
        country_name: countryName,
        location_id: locationId || null,
        location_name: locationName || null,
        language_code: languageCode,
        language_name: languageName,
        device,
        top_results: topResults,
        ranking_position: rankingPosition,
        found_url: foundUrl,
        serp_results: allResults
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[ERROR] Database insert failed:', dbError)
      throw new Error('Failed to save ranking check')
    }

    console.log(`[INFO] Saved to database with ID: ${checkData.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        results: allResults,
        targetRanking: rankingPosition,
        foundUrl: foundUrl,
        totalResults: allResults.length,
        checkId: checkData.id
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
