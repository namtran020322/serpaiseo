-- ==========================================
-- 1. FIX RLS: Drop dangerous UPDATE policy on user_credits
-- ==========================================
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;

-- ==========================================
-- 2. ATOMIC PAYMENT PROCESSING: Create RPC function
-- ==========================================
CREATE OR REPLACE FUNCTION process_payment_webhook(
  p_order_invoice_number TEXT,
  p_sepay_order_id TEXT,
  p_sepay_transaction_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_current_balance INTEGER;
  v_current_purchased INTEGER;
  v_current_used INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Validate inputs
  IF p_order_invoice_number IS NULL OR LENGTH(p_order_invoice_number) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_invoice_number');
  END IF;

  -- 1. Lock and fetch order (FOR UPDATE ensures atomicity)
  SELECT * INTO v_order
  FROM billing_orders
  WHERE order_invoice_number = p_order_invoice_number
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;
  
  -- 2. Check duplicate (idempotent - same transaction already processed)
  IF v_order.sepay_transaction_id IS NOT NULL AND v_order.sepay_transaction_id = p_sepay_transaction_id THEN
    RETURN jsonb_build_object('success', true, 'message', 'already_processed', 'order_id', v_order.id);
  END IF;
  
  -- 3. Check if order is already paid
  IF v_order.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'message', 'already_paid', 'order_id', v_order.id);
  END IF;
  
  -- 4. Update order status (within transaction)
  UPDATE billing_orders SET
    status = 'paid',
    sepay_order_id = p_sepay_order_id,
    sepay_transaction_id = p_sepay_transaction_id,
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = v_order.id;
  
  -- 5. Get or initialize user credits (with lock)
  SELECT balance, total_purchased, total_used 
  INTO v_current_balance, v_current_purchased, v_current_used
  FROM user_credits 
  WHERE user_id = v_order.user_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    v_current_balance := 0;
    v_current_purchased := 0;
    v_current_used := 0;
  END IF;
  
  v_new_balance := v_current_balance + v_order.credits;
  
  -- 6. Upsert user credits (within same transaction)
  INSERT INTO user_credits (user_id, balance, total_purchased, total_used)
  VALUES (v_order.user_id, v_new_balance, v_current_purchased + v_order.credits, v_current_used)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = v_new_balance,
    total_purchased = user_credits.total_purchased + v_order.credits,
    updated_at = NOW();
  
  -- 7. Log credit transaction (within same transaction)
  INSERT INTO credit_transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (
    v_order.user_id,
    v_order.credits,
    'purchase',
    'Purchased ' || v_order.credits || ' credits (' || v_order.package_id || ' package)',
    v_order.id,
    v_new_balance
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'credits_added', v_order.credits,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  -- If any error occurs, the entire transaction will rollback
  RAISE;
END;
$$;

-- ==========================================
-- 3. SERVER-SIDE PAGINATION: Create stats RPC function
-- ==========================================
CREATE OR REPLACE FUNCTION get_class_ranking_stats(p_class_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'total', COUNT(*)::INTEGER,
  'top3', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position <= 3)::INTEGER,
  'top10', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 3 AND ranking_position <= 10)::INTEGER,
  'top30', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 10 AND ranking_position <= 30)::INTEGER,
  'top100', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 30 AND ranking_position <= 100)::INTEGER,
  'notFound', COUNT(*) FILTER (WHERE ranking_position IS NULL OR ranking_position > 100)::INTEGER
)
FROM project_keywords 
WHERE class_id = p_class_id;
$$;

-- ==========================================
-- 4. DATABASE OPTIMIZATION: Composite indexes
-- ==========================================
-- Index for chart queries: "Get history for keyword X in time range Y, ordered by date"
CREATE INDEX IF NOT EXISTS idx_ranking_history_keyword_checked 
ON keyword_ranking_history (keyword_id, checked_at DESC);

-- Index for cleanup job
CREATE INDEX IF NOT EXISTS idx_ranking_history_checked_at 
ON keyword_ranking_history (checked_at DESC);

-- Index for pagination queries on keywords
CREATE INDEX IF NOT EXISTS idx_project_keywords_class_created 
ON project_keywords (class_id, created_at ASC);

-- ==========================================
-- 5. DATA RETENTION: Cleanup function
-- ==========================================
CREATE OR REPLACE FUNCTION cleanup_old_ranking_history(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM keyword_ranking_history
  WHERE checked_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % old ranking history records', deleted_count;
  RETURN deleted_count;
END;
$$;