import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SepayWebhookPayload {
  timestamp: number
  notification_type: string
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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse webhook payload
    const payload: SepayWebhookPayload = await req.json()
    
    console.log(`[INFO] Received Sepay webhook: ${payload.notification_type}`)
    console.log(`[INFO] Order: ${payload.order?.order_invoice_number}`)

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

    if (!orderInvoiceNumber) {
      console.error('[ERROR] Missing order_invoice_number in webhook')
      return new Response(
        JSON.stringify({ error: 'Missing order_invoice_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the order
    const { data: order, error: orderError } = await supabase
      .from('billing_orders')
      .select('*')
      .eq('order_invoice_number', orderInvoiceNumber)
      .single()

    if (orderError || !order) {
      console.error(`[ERROR] Order not found: ${orderInvoiceNumber}`)
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for duplicate processing
    if (order.sepay_transaction_id === sepayTransactionId) {
      console.log(`[INFO] Duplicate webhook for transaction ${sepayTransactionId}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if order is already paid
    if (order.status === 'paid') {
      console.log(`[INFO] Order ${orderInvoiceNumber} already paid`)
      return new Response(
        JSON.stringify({ success: true, message: 'Order already paid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[INFO] Processing payment for order ${orderInvoiceNumber}, credits: ${order.credits}`)

    // Update order status
    const { error: updateOrderError } = await supabase
      .from('billing_orders')
      .update({
        status: 'paid',
        sepay_order_id: sepayOrderId,
        sepay_transaction_id: sepayTransactionId,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateOrderError) {
      console.error('[ERROR] Failed to update order:', updateOrderError)
      throw new Error('Failed to update order')
    }

    // Get current user credits
    const { data: existingCredits } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', order.user_id)
      .single()

    const currentBalance = existingCredits?.balance || 0
    const currentTotalPurchased = existingCredits?.total_purchased || 0
    const newBalance = currentBalance + order.credits
    const newTotalPurchased = currentTotalPurchased + order.credits

    // Upsert user credits
    const { error: creditsError } = await supabase
      .from('user_credits')
      .upsert({
        user_id: order.user_id,
        balance: newBalance,
        total_purchased: newTotalPurchased,
        total_used: existingCredits?.total_used || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (creditsError) {
      console.error('[ERROR] Failed to update credits:', creditsError)
      throw new Error('Failed to update credits')
    }

    // Insert credit transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: order.user_id,
        amount: order.credits,
        type: 'purchase',
        description: `Purchased ${order.credits} credits (${order.package_id} package)`,
        reference_id: order.id,
        balance_after: newBalance,
      })

    if (transactionError) {
      console.error('[ERROR] Failed to insert transaction:', transactionError)
      // Non-critical, continue
    }

    console.log(`[INFO] Successfully processed payment for order ${orderInvoiceNumber}`)
    console.log(`[INFO] User ${order.user_id} credited with ${order.credits} credits, new balance: ${newBalance}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err as Error
    console.error('[ERROR] Webhook processing error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
