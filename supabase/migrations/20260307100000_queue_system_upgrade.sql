-- =====================================================
-- Queue System Upgrade: Atomic claim, stale recovery,
-- round-robin scheduling, and cleanup
-- =====================================================

-- 1. Add updated_at column for tracking last activity on a job
ALTER TABLE ranking_check_queue
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for efficient job claim (round-robin by updated_at)
CREATE INDEX IF NOT EXISTS idx_ranking_queue_processing_updated
  ON ranking_check_queue(updated_at)
  WHERE status IN ('pending', 'processing');

-- =====================================================
-- 2. Atomic job claim with round-robin scheduling
-- Picks the job with the oldest updated_at (pending or processing).
-- After each batch updates updated_at to NOW(), the next claim
-- naturally picks a different user's job if one exists.
-- FOR UPDATE SKIP LOCKED prevents duplicate pickup.
-- =====================================================
CREATE OR REPLACE FUNCTION public.claim_next_queue_job()
RETURNS SETOF ranking_check_queue
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE ranking_check_queue
  SET
    status = 'processing',
    started_at = CASE WHEN status = 'pending' THEN NOW() ELSE started_at END,
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM ranking_check_queue
    WHERE status IN ('pending', 'processing')
    ORDER BY COALESCE(updated_at, created_at) ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

-- =====================================================
-- 3. Reset stale processing jobs (stuck for >10 minutes)
-- Safety net for when self-invoke fails or edge function crashes.
-- Called both by process-ranking-queue and by pg_cron every 5 minutes.
-- =====================================================
CREATE OR REPLACE FUNCTION public.reset_stale_queue_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  UPDATE ranking_check_queue
  SET status = 'pending', started_at = NULL, updated_at = NOW()
  WHERE status = 'processing'
    AND COALESCE(updated_at, started_at, created_at) < NOW() - INTERVAL '10 minutes';

  GET DIAGNOSTICS reset_count = ROW_COUNT;

  IF reset_count > 0 THEN
    RAISE LOG '[INFO] Reset % stale queue jobs', reset_count;
  END IF;

  RETURN reset_count;
END;
$$;

-- =====================================================
-- 4. Cleanup completed/failed jobs older than 24 hours
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ranking_check_queue
  WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 5. Schedule cron jobs
-- =====================================================

-- Cleanup old completed/failed jobs daily at 4 AM UTC
SELECT cron.schedule(
  'cleanup-old-queue-jobs',
  '0 4 * * *',
  $$SELECT cleanup_old_queue_jobs()$$
);

-- Reset stale processing jobs every 5 minutes
SELECT cron.schedule(
  'reset-stale-queue-jobs',
  '*/5 * * * *',
  $$SELECT reset_stale_queue_jobs()$$
);
