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
  breadcrumbs?: string
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
  device: 'desktop' | 'mobile' | 'tablet'
  topResults: number
}

function parseXmlResults(xmlText: string, startPosition: number): SerpResult[] {
  const results: SerpResult[] = []
  
  // Match all <group> elements containing organic results
  const groupRegex = /<group[^>]*>([\s\S]*?)<\/group>/g
  let groupMatch
  let position = startPosition
  
  while ((groupMatch = groupRegex.exec(xmlText)) !== null) {
    const groupContent = groupMatch[1]
    
    // Check if this is an organic result (not ads, featured snippets, etc.)
    if (!groupContent.includes('<feature>')) {
      // Extract title
      const titleMatch = groupContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)
      const title = titleMatch ? titleMatch[1].trim() : ''
      
      // Extract URL
      const urlMatch = groupContent.match(/<url><!\[CDATA\[([\s\S]*?)\]\]><\/url>/)
      const url = urlMatch ? urlMatch[1].trim() : ''
      
      // Extract description (passage/text)
      const passageMatch = groupContent.match(/<passage><!\[CDATA\[([\s\S]*?)\]\]><\/passage>/)
      const textMatch = groupContent.match(/<text><!\[CDATA\[([\s\S]*?)\]\]><\/text>/)
      const description = passageMatch ? passageMatch[1].trim() : (textMatch ? textMatch[1].trim() : '')
      
      // Extract breadcrumbs if available
      const breadcrumbMatch = groupContent.match(/<breadcrumb><!\[CDATA\[([\s\S]*?)\]\]><\/breadcrumb>/)
      const breadcrumbs = breadcrumbMatch ? breadcrumbMatch[1].trim() : undefined
      
      if (url && title) {
        results.push({
          position: position++,
          title,
          url,
          description,
          breadcrumbs
        })
      }
    }
  }
  
  return results
}

function findTargetRanking(results: SerpResult[], targetUrl: string): number | null {
  if (!targetUrl) return null
  
  // Normalize target URL for comparison
  const normalizeUrl = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      return parsed.hostname.replace('www.', '') + parsed.pathname.replace(/\/$/, '')
    } catch {
      return url.toLowerCase().replace('www.', '').replace(/\/$/, '')
    }
  }
  
  const normalizedTarget = normalizeUrl(targetUrl)
  
  for (const result of results) {
    const normalizedResult = normalizeUrl(result.url)
    if (normalizedResult.includes(normalizedTarget) || normalizedTarget.includes(normalizedResult)) {
      return result.position
    }
  }
  
  return null
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub as string

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

    // Get XMLRiver credentials
    const xmlRiverUserId = Deno.env.get('XMLRIVER_USER_ID')
    const xmlRiverApiKey = Deno.env.get('XMLRIVER_API_KEY')

    if (!xmlRiverUserId || !xmlRiverApiKey) {
      return new Response(
        JSON.stringify({ error: 'XMLRiver API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate number of pages needed
    const resultsPerPage = 10
    const pages = Math.ceil(topResults / resultsPerPage)
    
    // Collect all results
    let allResults: SerpResult[] = []
    
    // Map device to XMLRiver format
    const deviceMap: Record<string, string> = {
      'desktop': 'desktop',
      'mobile': 'phone',
      'tablet': 'tablet'
    }
    const xmlRiverDevice = deviceMap[device] || 'desktop'

    // Call XMLRiver API for each page
    for (let page = 1; page <= pages; page++) {
      // Build API URL
      let apiUrl = `http://xmlriver.com/search/xml?query=${encodeURIComponent(keyword)}&user=${xmlRiverUserId}&key=${xmlRiverApiKey}&groupby=10&country=${countryId}&lr=${languageCode}&domain=37&device=${xmlRiverDevice}&page=${page}`
      
      // Add location if provided
      if (locationId) {
        apiUrl += `&loc=${locationId}`
      }

      console.log(`Fetching page ${page}/${pages} from XMLRiver...`)

      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        console.error(`XMLRiver API error: ${response.status} ${response.statusText}`)
        throw new Error(`XMLRiver API returned status ${response.status}`)
      }

      const xmlText = await response.text()
      
      // Check for API errors in response
      if (xmlText.includes('<error>')) {
        const errorMatch = xmlText.match(/<error><!\[CDATA\[([\s\S]*?)\]\]><\/error>/)
        const errorMessage = errorMatch ? errorMatch[1] : 'Unknown XMLRiver API error'
        throw new Error(errorMessage)
      }

      // Parse results from this page
      const startPosition = (page - 1) * resultsPerPage + 1
      const pageResults = parseXmlResults(xmlText, startPosition)
      allResults = allResults.concat(pageResults)

      // Add delay between requests to avoid rate limiting
      if (page < pages) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Limit to requested number of results
    allResults = allResults.slice(0, topResults)

    // Find target URL ranking
    const targetRanking = targetUrl ? findTargetRanking(allResults, targetUrl) : null
    const foundUrl = targetRanking ? allResults.find(r => r.position === targetRanking)?.url : null

    // Save to database
    const { data: savedCheck, error: saveError } = await supabase
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
        ranking_position: targetRanking,
        found_url: foundUrl,
        serp_results: allResults
      })
      .select('id')
      .single()

    if (saveError) {
      console.error('Error saving to database:', saveError)
      // Continue anyway, just log the error
    }

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        results: allResults,
        targetRanking,
        foundUrl,
        totalResults: allResults.length,
        checkId: savedCheck?.id || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
