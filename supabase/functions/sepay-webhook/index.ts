import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS not strictly needed for webhook but kept for OPTIONS handling
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SepayWebhookPayload {
  timestamp: number
  notification_type: string
  signature?: string
  order: {
    id: string
    order_id: string
    order_status: string
    order_currency: string
    order_amount: string
    order_invoice_number: string
    custom_data: any[]
    user_agent: string
    ip_address: string
    order_description: string
  }
  transaction: {
    id: string
    payment_method: string
    transaction_id: string
    transaction_type: string
    transaction_date: string
    transaction_status: string
    transaction_amount: string
    transaction_currency: string
    authentication_status: string
    card_number: string | null
    card_holder_name: string | null
    card_expiry: string | null
    card_funding_method: string | null
    card_brand: string | null
  }
  customer: any | null
  agreement: any | null
}

// Verify HMAC-SHA256 signature
async function verifySignature(payload: SepayWebhookPayload, secretKey: string): Promise<boolean> {
  try {
    if (!payload.signature) {
      console.log('[WARN] No signature in webhook payload')
      return false
    }

    // Build signed string from payload fields (order matters)
    const signedFields = [
      `notification_type=${payload.notification_type}`,
      `order_id=${payload.order?.order_id || ''}`,
      `order_invoice_number=${payload.order?.order_invoice_number || ''}`,
      `order_amount=${payload.order?.order_amount || ''}`,
      `order_status=${payload.order?.order_status || ''}`,
      `transaction_id=${payload.transaction?.transaction_id || ''}`,
      `timestamp=${payload.timestamp || ''}`
    ]
    const signedString = signedFields.join(',')

    const encoder = new TextEncoder()
    const keyData = encoder.encode(secretKey)
    const messageData = encoder.encode(signedString)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const expectedSignature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)))

    const isValid = payload.signature === expectedBase64
    if (!isValid) {
      console.log('[WARN] Signature mismatch')
    }
    return isValid
  } catch (err) {
    console.error('[ERROR] Signature verification failed:', err)
    return false
  }
}

// Validate order invoice number format
function isValidOrderInvoiceNumber(str: string): boolean {
  // Format: ORD-XXXXXXXX-TIMESTAMP (where X is hex)
  const orderRegex = /^ORD-[A-F0-9]{8}-\d{13}$/
  return orderRegex.test(str)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sepaySecretKey = Deno.env.get('SEPAY_SECRET_KEY')
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    let payload: SepayWebhookPayload
    try {
      payload = await req.json()
    } catch {
      console.error('[ERROR] Invalid JSON payload')
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`[INFO] Received webhook: ${payload.notification_type}`)
    console.log(`[INFO] Order: ${payload.order?.order_invoice_number}`)

    // Verify webhook signature if secret key is configured
    if (sepaySecretKey) {
      const isValidSignature = await verifySignature(payload, sepaySecretKey)
      if (!isValidSignature) {
        console.error('[ERROR] Invalid webhook signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('[INFO] Webhook signature verified')
    } else {
      console.log('[WARN] SEPAY_SECRET_KEY not configured, skipping signature verification')
    }

    // Only process ORDER_PAID notifications
    if (payload.notification_type !== 'ORDER_PAID') {
      console.log(`[INFO] Ignoring notification type: ${payload.notification_type}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Notification ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderInvoiceNumber = payload.order?.order_invoice_number
    const sepayOrderId = payload.order?.id
    const sepayTransactionId = payload.transaction?.id

    // Validate order invoice number format
    if (!orderInvoiceNumber || !isValidOrderInvoiceNumber(orderInvoiceNumber)) {
      console.error('[ERROR] Invalid or missing order_invoice_number')
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Processing payment atomically for order ${orderInvoiceNumber}`)

    // Call atomic RPC function - all operations happen in single transaction
    const { data: result, error: rpcError } = await supabase.rpc('process_payment_webhook', {
      p_order_invoice_number: orderInvoiceNumber,
      p_sepay_order_id: sepayOrderId || null,
      p_sepay_transaction_id: sepayTransactionId || null
    })

    if (rpcError) {
      console.error('[ERROR] RPC error:', rpcError.message)
      return new Response(
        JSON.stringify({ error: 'Processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!result.success) {
      console.error('[ERROR] Payment processing failed:', result.error)
      
      // Map error codes to HTTP status
      const statusMap: Record<string, number> = {
        'order_not_found': 404,
        'invalid_invoice_number': 400,
      }
      const status = statusMap[result.error] || 500
      
      return new Response(
        JSON.stringify({ error: result.error }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for idempotent responses
    if (result.message === 'already_processed' || result.message === 'already_paid') {
      console.log(`[INFO] Order ${orderInvoiceNumber}: ${result.message}`)
      return new Response(
        JSON.stringify({ success: true, message: result.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Successfully processed payment for order ${orderInvoiceNumber}`)
    console.log(`[INFO] Credits added: ${result.credits_added}, New balance: ${result.new_balance}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[ERROR] Webhook processing error:', err)
    return new Response(
      JSON.stringify({ error: 'An error occurred processing the request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
