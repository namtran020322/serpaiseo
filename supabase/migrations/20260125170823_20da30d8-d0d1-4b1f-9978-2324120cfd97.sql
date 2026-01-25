-- ========================================
-- 1. Thêm Cron Job để cleanup usage transactions cũ hơn 7 ngày
-- ========================================
SELECT cron.schedule(
  'cleanup-old-usage-transactions',
  '0 3 * * *',
  $$SELECT cleanup_old_usage_transactions()$$
);

-- ========================================
-- 2. Update RPC get_projects_paginated để thêm 3 cột top ranking
-- ========================================
CREATE OR REPLACE FUNCTION public.get_projects_paginated(
  p_user_id uuid, 
  p_offset integer DEFAULT 0, 
  p_limit integer DEFAULT 20, 
  p_search text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total integer;
  v_projects jsonb;
BEGIN
  -- Count total matching projects
  SELECT COUNT(*) INTO v_total
  FROM projects
  WHERE user_id = p_user_id
    AND (p_search IS NULL OR name ILIKE '%' || p_search || '%');
  
  -- Get paginated projects with aggregated counts including top ranking stats
  SELECT jsonb_agg(row_to_json(p))
  INTO v_projects
  FROM (
    SELECT 
      pr.id,
      pr.name,
      pr.domain,
      pr.created_at,
      pr.updated_at,
      (SELECT COUNT(*)::integer FROM project_classes WHERE project_id = pr.id) as class_count,
      (SELECT COUNT(*)::integer FROM project_keywords pk 
       JOIN project_classes pc ON pk.class_id = pc.id 
       WHERE pc.project_id = pr.id) as keyword_count,
      -- Top 1-3 count
      (SELECT COUNT(*)::integer FROM project_keywords pk 
       JOIN project_classes pc ON pk.class_id = pc.id 
       WHERE pc.project_id = pr.id 
         AND pk.ranking_position IS NOT NULL 
         AND pk.ranking_position <= 3) as top3_count,
      -- Top 4-10 count
      (SELECT COUNT(*)::integer FROM project_keywords pk 
       JOIN project_classes pc ON pk.class_id = pc.id 
       WHERE pc.project_id = pr.id 
         AND pk.ranking_position IS NOT NULL 
         AND pk.ranking_position > 3 
         AND pk.ranking_position <= 10) as top10_count,
      -- Top 11-30 count
      (SELECT COUNT(*)::integer FROM project_keywords pk 
       JOIN project_classes pc ON pk.class_id = pc.id 
       WHERE pc.project_id = pr.id 
         AND pk.ranking_position IS NOT NULL 
         AND pk.ranking_position > 10 
         AND pk.ranking_position <= 30) as top30_count
    FROM projects pr
    WHERE pr.user_id = p_user_id
      AND (p_search IS NULL OR pr.name ILIKE '%' || p_search || '%')
    ORDER BY pr.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) p;
  
  RETURN jsonb_build_object(
    'total', v_total,
    'projects', COALESCE(v_projects, '[]'::jsonb)
  );
END;
$function$;