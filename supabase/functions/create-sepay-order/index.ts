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

interface PricingPackage {
  id: string
  name: string
  price: number
  credits: number
}

const PRICING_PACKAGES: PricingPackage[] = [
  { id: 'basic', name: 'Basic', price: 200000, credits: 10000 },
  { id: 'pro', name: 'Pro', price: 500000, credits: 28000 },
  { id: 'enterprise', name: 'Enterprise', price: 2000000, credits: 135000 },
]

function isValidPackageId(packageId: unknown): packageId is string {
  if (typeof packageId !== 'string') return false
  return PRICING_PACKAGES.some(p => p.id === packageId)
}

async function hmacSha256(message: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secretKey)
  const messageData = encoder.encode(message)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sepayMerchantId = Deno.env.get('SEPAY_MERCHANT_ID')
    const sepaySecretKey = Deno.env.get('SEPAY_SECRET_KEY')

    if (!sepayMerchantId || !sepaySecretKey) {
      console.error('[ERROR] Payment gateway credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token)
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const userId = claimsData.user.id

    let body: { package_id?: unknown }
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { package_id } = body
    
    if (!isValidPackageId(package_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid package' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pkg = PRICING_PACKAGES.find(p => p.id === package_id)!
    const timestamp = Date.now()
    const orderInvoiceNumber = `ORD-${userId.slice(0, 8).toUpperCase()}-${timestamp}`

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: order, error: orderError } = await supabase
      .from('billing_orders')
      .insert({
        user_id: userId,
        order_invoice_number: orderInvoiceNumber,
        package_id: pkg.id,
        amount: pkg.price,
        credits: pkg.credits,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError) {
      console.error('[ERROR] Failed to create order:', orderError)
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Created order ${orderInvoiceNumber} for user ${userId}`)

    // Get base origin for callback URLs
    const referer = req.headers.get('referer') || req.headers.get('origin')
    let baseOrigin = 'https://serpaiseo.lovable.app'
    if (referer) {
      try {
        const url = new URL(referer)
        if (ALLOWED_ORIGINS.some(o => url.origin.startsWith(o.replace(/:\d+$/, '')))) {
          baseOrigin = url.origin
        }
      } catch {
        // Keep default
      }
    }

    const description = `Purchase ${pkg.credits} credits - ${pkg.name} package`
    const successUrl = `${baseOrigin}/dashboard/billing?payment=success`
    const errorUrl = `${baseOrigin}/dashboard/billing?payment=error`
    const cancelUrl = `${baseOrigin}/dashboard/billing?payment=cancel`
    
    // Expire in 30 minutes
    const expireDate = new Date(Date.now() + 30 * 60 * 1000)
    const expireOn = expireDate.toISOString().replace('T', ' ').slice(0, 19)

    // Build signature according to SePay documentation
    // Order: merchant,operation,payment_method,order_amount,currency,order_invoice_number,order_description,customer_id,success_url,error_url,cancel_url
    // Only include fields that have values
    const signedFields = [
      `merchant=${sepayMerchantId}`,
      `operation=PURCHASE`,
      `order_amount=${pkg.price}`,
      `currency=VND`,
      `order_invoice_number=${orderInvoiceNumber}`,
      `order_description=${description}`,
      `success_url=${successUrl}`,
      `error_url=${errorUrl}`,
      `cancel_url=${cancelUrl}`
    ]
    const signedString = signedFields.join(',')
    const signature = await hmacSha256(signedString, sepaySecretKey)

    // Build checkout URL for iframe
    const checkoutParams = new URLSearchParams()
    checkoutParams.set('merchant', sepayMerchantId)
    checkoutParams.set('currency', 'VND')
    checkoutParams.set('operation', 'PURCHASE')
    checkoutParams.set('order_amount', pkg.price.toString())
    checkoutParams.set('order_description', description)
    checkoutParams.set('order_invoice_number', orderInvoiceNumber)
    checkoutParams.set('expire_on', expireOn)
    checkoutParams.set('success_url', successUrl)
    checkoutParams.set('error_url', errorUrl)
    checkoutParams.set('cancel_url', cancelUrl)
    checkoutParams.set('signature', signature)

    const checkoutUrl = `https://pay.sepay.vn/v1/checkout/init?${checkoutParams.toString()}`

    console.log(`[INFO] Generated checkout URL for order ${orderInvoiceNumber}`)

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_invoice_number: orderInvoiceNumber,
        checkout_url: checkoutUrl,
        expire_on: expireDate.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[ERROR] Create order error:', err)
    return new Response(
      JSON.stringify({ error: 'An error occurred processing the request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
