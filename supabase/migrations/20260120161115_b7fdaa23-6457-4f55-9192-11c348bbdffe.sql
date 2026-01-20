-- Drop existing function and recreate with enhanced stats
DROP FUNCTION IF EXISTS public.get_class_ranking_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_class_ranking_stats(p_class_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
SELECT jsonb_build_object(
  'total', COUNT(*)::INTEGER,
  'top3', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position <= 3)::INTEGER,
  'top3_improved', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position <= 3 AND previous_position IS NOT NULL AND previous_position > ranking_position)::INTEGER,
  'top3_declined', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position <= 3 AND previous_position IS NOT NULL AND previous_position < ranking_position)::INTEGER,
  'top10', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 3 AND ranking_position <= 10)::INTEGER,
  'top10_improved', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 3 AND ranking_position <= 10 AND previous_position IS NOT NULL AND previous_position > ranking_position)::INTEGER,
  'top10_declined', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 3 AND ranking_position <= 10 AND previous_position IS NOT NULL AND previous_position < ranking_position)::INTEGER,
  'top30', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 10 AND ranking_position <= 30)::INTEGER,
  'top30_improved', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 10 AND ranking_position <= 30 AND previous_position IS NOT NULL AND previous_position > ranking_position)::INTEGER,
  'top30_declined', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 10 AND ranking_position <= 30 AND previous_position IS NOT NULL AND previous_position < ranking_position)::INTEGER,
  'top100', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 30 AND ranking_position <= 100)::INTEGER,
  'top100_improved', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 30 AND ranking_position <= 100 AND previous_position IS NOT NULL AND previous_position > ranking_position)::INTEGER,
  'top100_declined', COUNT(*) FILTER (WHERE ranking_position IS NOT NULL AND ranking_position > 30 AND ranking_position <= 100 AND previous_position IS NOT NULL AND previous_position < ranking_position)::INTEGER,
  'notFound', COUNT(*) FILTER (WHERE ranking_position IS NULL OR ranking_position > 100)::INTEGER,
  'notFound_improved', COUNT(*) FILTER (WHERE (ranking_position IS NULL OR ranking_position > 100) AND previous_position IS NOT NULL AND (previous_position > COALESCE(ranking_position, 101)))::INTEGER,
  'notFound_declined', COUNT(*) FILTER (WHERE (ranking_position IS NULL OR ranking_position > 100) AND previous_position IS NOT NULL AND previous_position < COALESCE(ranking_position, 101))::INTEGER
)
FROM project_keywords 
WHERE class_id = p_class_id;
$function$;