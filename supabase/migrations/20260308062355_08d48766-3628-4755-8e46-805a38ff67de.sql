
-- 1. Add updated_at column to ranking_check_queue
ALTER TABLE public.ranking_check_queue 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Update existing rows
UPDATE public.ranking_check_queue SET updated_at = COALESCE(started_at, created_at, now()) WHERE updated_at IS NULL;

-- 2. Partial index for pending/processing jobs (used by claim function)
CREATE INDEX IF NOT EXISTS idx_ranking_queue_active 
ON public.ranking_check_queue (updated_at ASC) 
WHERE status IN ('pending', 'processing');

-- 3. claim_next_queue_job: atomic claim with round-robin
CREATE OR REPLACE FUNCTION public.claim_next_queue_job()
RETURNS SETOF public.ranking_check_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_job public.ranking_check_queue;
BEGIN
  SELECT * INTO v_job
  FROM public.ranking_check_queue
  WHERE status IN ('pending', 'processing')
  ORDER BY updated_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.ranking_check_queue
  SET status = 'processing',
      started_at = COALESCE(started_at, now()),
      updated_at = now()
  WHERE id = v_job.id;

  v_job.status := 'processing';
  v_job.started_at := COALESCE(v_job.started_at, now());
  v_job.updated_at := now();

  RETURN NEXT v_job;
END;
$$;

-- 4. reset_stale_queue_jobs: reset jobs stuck >10 min
CREATE OR REPLACE FUNCTION public.reset_stale_queue_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.ranking_check_queue
  SET status = 'pending',
      updated_at = now()
  WHERE status = 'processing'
    AND updated_at < now() - interval '10 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. cleanup_old_queue_jobs: delete completed/failed jobs >24h
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.ranking_check_queue
  WHERE status IN ('completed', 'failed')
    AND completed_at < now() - interval '24 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
