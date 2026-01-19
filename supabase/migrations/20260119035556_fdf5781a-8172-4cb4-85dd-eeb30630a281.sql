-- Create cleanup function for expired pending orders
CREATE OR REPLACE FUNCTION cleanup_pending_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM billing_orders
  WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '1 day';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % expired pending orders', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Schedule daily cleanup at midnight UTC
SELECT cron.schedule(
  'cleanup-pending-orders',
  '0 0 * * *',
  'SELECT cleanup_pending_orders()'
);