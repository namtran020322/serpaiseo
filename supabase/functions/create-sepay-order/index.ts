import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'
import { encode as hexEncode } from 'https://deno.land/std@0.177.0/encoding/hex.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Generate MD5 hash
async function md5Hash(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('MD5', data)
  const decoder = new TextDecoder()
  return decoder.decode(hexEncode(new Uint8Array(hashBuffer)))
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sepayMerchantId = Deno.env.get('SEPAY_MERCHANT_ID')
    const sepaySecretKey = Deno.env.get('SEPAY_SECRET_KEY')

    if (!sepayMerchantId || !sepaySecretKey) {
      console.error('[ERROR] Sepay credentials not configured')
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const userId = userData.user.id

    // Parse request
    const { package_id } = await req.json()
    
    if (!package_id) {
      return new Response(
        JSON.stringify({ error: 'Missing package_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find package
    const pkg = PRICING_PACKAGES.find(p => p.id === package_id)
    if (!pkg) {
      return new Response(
        JSON.stringify({ error: 'Invalid package' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate order invoice number
    const timestamp = Date.now()
    const orderInvoiceNumber = `ORD-${userId.slice(0, 8).toUpperCase()}-${timestamp}`

    // Create order in database
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
      throw new Error('Failed to create order')
    }

    console.log(`[INFO] Created order ${orderInvoiceNumber} for user ${userId}`)

    // Get origin from referer or use default
    const referer = req.headers.get('referer') || req.headers.get('origin')
    let origin = 'https://serpaiseo.lovable.app'
    if (referer) {
      try {
        const url = new URL(referer)
        origin = url.origin
      } catch {}
    }

    // Generate signature for Sepay
    // Signature = MD5(merchant_id + order_invoice_number + order_amount + secret_key)
    const signatureString = `${sepayMerchantId}${orderInvoiceNumber}${pkg.price}${sepaySecretKey}`
    const signature = await md5Hash(signatureString)

    // Build Sepay checkout URL with query params
    const checkoutUrl = new URL('https://pay.sepay.vn/v1/checkout/init')
    checkoutUrl.searchParams.set('merchant_id', sepayMerchantId)
    checkoutUrl.searchParams.set('order_invoice_number', orderInvoiceNumber)
    checkoutUrl.searchParams.set('order_amount', pkg.price.toString())
    checkoutUrl.searchParams.set('order_currency', 'VND')
    checkoutUrl.searchParams.set('operation', 'PURCHASE')
    checkoutUrl.searchParams.set('order_description', `Purchase ${pkg.credits} credits - ${pkg.name} package`)
    checkoutUrl.searchParams.set('success_url', `${origin}/dashboard/billing?payment=success`)
    checkoutUrl.searchParams.set('error_url', `${origin}/dashboard/billing?payment=error`)
    checkoutUrl.searchParams.set('cancel_url', `${origin}/dashboard/billing?payment=cancel`)
    checkoutUrl.searchParams.set('signature', signature)

    console.log(`[INFO] Generated checkout URL for order ${orderInvoiceNumber}`)

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        order_invoice_number: orderInvoiceNumber,
        checkout_url: checkoutUrl.toString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[ERROR] Create order error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
