-- 1. Tạo bảng daily_usage_summary để lưu trữ tổng hợp usage theo ngày
CREATE TABLE public.daily_usage_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usage_date DATE NOT NULL,
  total_keywords INTEGER NOT NULL DEFAULT 0,
  total_credits INTEGER NOT NULL DEFAULT 0,
  check_count INTEGER NOT NULL DEFAULT 0,
  balance_end INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: mỗi user chỉ có 1 record per ngày
  CONSTRAINT daily_usage_summary_user_date_unique UNIQUE (user_id, usage_date)
);

-- 2. Enable RLS
ALTER TABLE public.daily_usage_summary ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own daily summary"
ON public.daily_usage_summary
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily summary"
ON public.daily_usage_summary
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily summary"
ON public.daily_usage_summary
FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Tạo RPC upsert_daily_usage để atomic upsert từ edge function
CREATE OR REPLACE FUNCTION public.upsert_daily_usage(
  p_user_id UUID,
  p_keywords_count INTEGER,
  p_credits_used INTEGER,
  p_balance_after INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO daily_usage_summary (
    user_id, usage_date, total_keywords, total_credits, 
    check_count, balance_end, created_at, updated_at
  )
  VALUES (
    p_user_id, v_today, p_keywords_count, p_credits_used, 
    1, p_balance_after, NOW(), NOW()
  )
  ON CONFLICT (user_id, usage_date) DO UPDATE SET
    total_keywords = daily_usage_summary.total_keywords + EXCLUDED.total_keywords,
    total_credits = daily_usage_summary.total_credits + EXCLUDED.total_credits,
    check_count = daily_usage_summary.check_count + 1,
    balance_end = EXCLUDED.balance_end,
    updated_at = NOW();
END;
$$;

-- 5. Migrate dữ liệu cũ từ credit_transactions sang daily_usage_summary
-- Sử dụng CTE để tính toán chính xác
WITH daily_aggregates AS (
  SELECT 
    user_id,
    DATE(created_at) as usage_date,
    SUM(
      CASE 
        WHEN description ~ 'Check (\d+) keywords?' THEN 
          (regexp_match(description, 'Check (\d+) keywords?'))[1]::INTEGER
        ELSE 0
      END
    ) as total_keywords,
    SUM(ABS(amount)) as total_credits,
    COUNT(*) as check_count
  FROM credit_transactions
  WHERE type = 'usage'
  GROUP BY user_id, DATE(created_at)
),
last_balance AS (
  SELECT DISTINCT ON (user_id, DATE(created_at))
    user_id,
    DATE(created_at) as usage_date,
    balance_after
  FROM credit_transactions
  WHERE type = 'usage'
  ORDER BY user_id, DATE(created_at), created_at DESC
)
INSERT INTO daily_usage_summary (user_id, usage_date, total_keywords, total_credits, check_count, balance_end)
SELECT 
  da.user_id,
  da.usage_date,
  da.total_keywords,
  da.total_credits,
  da.check_count,
  COALESCE(lb.balance_after, 0) as balance_end
FROM daily_aggregates da
LEFT JOIN last_balance lb ON da.user_id = lb.user_id AND da.usage_date = lb.usage_date
ON CONFLICT (user_id, usage_date) DO NOTHING;

-- 6. Index cho performance
CREATE INDEX idx_daily_usage_summary_user_date ON public.daily_usage_summary(user_id, usage_date DESC);

-- 7. Cập nhật function cleanup để xóa usage transactions cũ (giữ lại 7 ngày)
CREATE OR REPLACE FUNCTION public.cleanup_old_usage_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM credit_transactions
  WHERE type = 'usage' 
    AND created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % old usage transactions', deleted_count;
  RETURN deleted_count;
END;
$$;