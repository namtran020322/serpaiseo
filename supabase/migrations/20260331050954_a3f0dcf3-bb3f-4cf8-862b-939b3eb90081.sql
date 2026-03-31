
-- Step 1: Add priority column to ranking_check_queue
ALTER TABLE public.ranking_check_queue ADD COLUMN priority integer NOT NULL DEFAULT 0;

-- Step 2: Update claim_next_queue_job() to sort by priority DESC, updated_at ASC
CREATE OR REPLACE FUNCTION public.claim_next_queue_job()
 RETURNS SETOF ranking_check_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job public.ranking_check_queue;
BEGIN
  SELECT * INTO v_job
  FROM public.ranking_check_queue
  WHERE (status = 'pending')
     OR (status = 'processing' AND updated_at < now() - interval '2 minutes')
  ORDER BY 
    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
    priority DESC,
    updated_at ASC
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
$function$;
