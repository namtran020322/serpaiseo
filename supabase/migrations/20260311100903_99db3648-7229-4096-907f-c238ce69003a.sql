
CREATE EXTENSION IF NOT EXISTS pgmq;

SELECT pgmq.create('email_queue');

CREATE OR REPLACE FUNCTION public.enqueue_email(payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  msg_id bigint;
BEGIN
  SELECT pgmq.send('email_queue', payload) INTO msg_id;
  RETURN msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dequeue_email(batch_size integer DEFAULT 10)
RETURNS SETOF pgmq.message_record
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM pgmq.read('email_queue', 30, batch_size);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email_message(msg_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN pgmq.delete('email_queue', msg_id);
END;
$$;
