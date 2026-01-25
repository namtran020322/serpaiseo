-- Update get_projects_paginated to include weekly ranking changes
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
  v_7days_ago timestamp with time zone := NOW() - INTERVAL '7 days';
BEGIN
  -- Count total matching projects
  SELECT COUNT(*) INTO v_total
  FROM projects
  WHERE user_id = p_user_id
    AND (p_search IS NULL OR name ILIKE '%' || p_search || '%');
  
  -- Get paginated projects with aggregated counts including top ranking stats and weekly changes
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
      -- Current counts
      (SELECT COUNT(*)::integer FROM project_keywords pk 
       JOIN project_classes pc ON pk.class_id = pc.id 
       WHERE pc.project_id = pr.id 
         AND pk.ranking_position IS NOT NULL 
         AND pk.ranking_position <= 3) as top3_count,
      (SELECT COUNT(*)::integer FROM project_keywords pk 
       JOIN project_classes pc ON pk.class_id = pc.id 
       WHERE pc.project_id = pr.id 
         AND pk.ranking_position IS NOT NULL 
         AND pk.ranking_position > 3 
         AND pk.ranking_position <= 10) as top10_count,
      (SELECT COUNT(*)::integer FROM project_keywords pk 
       JOIN project_classes pc ON pk.class_id = pc.id 
       WHERE pc.project_id = pr.id 
         AND pk.ranking_position IS NOT NULL 
         AND pk.ranking_position > 10 
         AND pk.ranking_position <= 30) as top30_count,
      -- Weekly changes: current count minus count from 7 days ago
      (
        (SELECT COUNT(*)::integer FROM project_keywords pk 
         JOIN project_classes pc ON pk.class_id = pc.id 
         WHERE pc.project_id = pr.id 
           AND pk.ranking_position IS NOT NULL 
           AND pk.ranking_position <= 3)
        -
        (SELECT COUNT(*)::integer FROM (
          SELECT DISTINCT ON (pk.id) pk.id, krh.ranking_position
          FROM project_keywords pk 
          JOIN project_classes pc ON pk.class_id = pc.id 
          LEFT JOIN keyword_ranking_history krh ON krh.keyword_id = pk.id 
            AND krh.checked_at < v_7days_ago
          WHERE pc.project_id = pr.id
          ORDER BY pk.id, krh.checked_at DESC
        ) hist WHERE hist.ranking_position IS NOT NULL AND hist.ranking_position <= 3)
      ) as top3_change,
      (
        (SELECT COUNT(*)::integer FROM project_keywords pk 
         JOIN project_classes pc ON pk.class_id = pc.id 
         WHERE pc.project_id = pr.id 
           AND pk.ranking_position IS NOT NULL 
           AND pk.ranking_position > 3 
           AND pk.ranking_position <= 10)
        -
        (SELECT COUNT(*)::integer FROM (
          SELECT DISTINCT ON (pk.id) pk.id, krh.ranking_position
          FROM project_keywords pk 
          JOIN project_classes pc ON pk.class_id = pc.id 
          LEFT JOIN keyword_ranking_history krh ON krh.keyword_id = pk.id 
            AND krh.checked_at < v_7days_ago
          WHERE pc.project_id = pr.id
          ORDER BY pk.id, krh.checked_at DESC
        ) hist WHERE hist.ranking_position IS NOT NULL AND hist.ranking_position > 3 AND hist.ranking_position <= 10)
      ) as top10_change,
      (
        (SELECT COUNT(*)::integer FROM project_keywords pk 
         JOIN project_classes pc ON pk.class_id = pc.id 
         WHERE pc.project_id = pr.id 
           AND pk.ranking_position IS NOT NULL 
           AND pk.ranking_position > 10 
           AND pk.ranking_position <= 30)
        -
        (SELECT COUNT(*)::integer FROM (
          SELECT DISTINCT ON (pk.id) pk.id, krh.ranking_position
          FROM project_keywords pk 
          JOIN project_classes pc ON pk.class_id = pc.id 
          LEFT JOIN keyword_ranking_history krh ON krh.keyword_id = pk.id 
            AND krh.checked_at < v_7days_ago
          WHERE pc.project_id = pr.id
          ORDER BY pk.id, krh.checked_at DESC
        ) hist WHERE hist.ranking_position IS NOT NULL AND hist.ranking_position > 10 AND hist.ranking_position <= 30)
      ) as top30_change
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