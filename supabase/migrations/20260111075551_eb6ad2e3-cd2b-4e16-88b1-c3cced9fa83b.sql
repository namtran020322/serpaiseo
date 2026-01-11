-- Insert 7 days of mock ranking history data for class 9692f6af-05a1-4ecb-8fe0-677cfbb97665
-- Keywords: iphone 17, iphone 16, iphone 15, iphone 12 pro max
-- User domain: thegioididong.com (positions 1-5)
-- Competitors with varied positions

INSERT INTO keyword_ranking_history 
(id, keyword_id, user_id, ranking_position, found_url, competitor_rankings, checked_at)
SELECT 
  gen_random_uuid(),
  pk.id,
  pk.user_id,
  -- User domain position varies between 1-8 with some pattern
  CASE 
    WHEN day_offset = 0 THEN floor(random() * 3 + 1)::int
    WHEN day_offset = 1 THEN floor(random() * 4 + 1)::int  
    WHEN day_offset = 2 THEN floor(random() * 3 + 2)::int
    WHEN day_offset = 3 THEN floor(random() * 4 + 2)::int
    WHEN day_offset = 4 THEN floor(random() * 3 + 3)::int
    WHEN day_offset = 5 THEN floor(random() * 4 + 2)::int
    ELSE floor(random() * 3 + 1)::int
  END,
  'https://www.thegioididong.com/dtdd/iphone',
  -- Competitor rankings with timestamps
  jsonb_build_object(
    'cellphones.com.vn', jsonb_build_object(
      'position', floor(random() * 8 + 2)::int,
      'url', 'https://cellphones.com.vn/iphone',
      'timestamp', extract(epoch from (NOW() - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval)) * 1000
    ),
    'hoanghamobile.com', jsonb_build_object(
      'position', floor(random() * 12 + 4)::int,
      'url', 'https://hoanghamobile.com/iphone',
      'timestamp', extract(epoch from (NOW() - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval)) * 1000
    ),
    'fptshop.com.vn', jsonb_build_object(
      'position', floor(random() * 10 + 3)::int,
      'url', 'https://fptshop.com.vn/iphone',
      'timestamp', extract(epoch from (NOW() - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval)) * 1000
    ),
    'apple.com', jsonb_build_object(
      'position', floor(random() * 15 + 5)::int,
      'url', 'https://apple.com/iphone',
      'timestamp', extract(epoch from (NOW() - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval)) * 1000
    ),
    'topzone.vn', jsonb_build_object(
      'position', floor(random() * 20 + 8)::int,
      'url', 'https://topzone.vn/iphone',
      'timestamp', extract(epoch from (NOW() - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval)) * 1000
    ),
    'shopdunk.com', jsonb_build_object(
      'position', floor(random() * 25 + 10)::int,
      'url', 'https://shopdunk.com/iphone',
      'timestamp', extract(epoch from (NOW() - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval)) * 1000
    ),
    'dienmayxanh.com', jsonb_build_object(
      'position', floor(random() * 18 + 6)::int,
      'url', 'https://dienmayxanh.com/iphone',
      'timestamp', extract(epoch from (NOW() - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval)) * 1000
    )
  ),
  -- Create records for each day, multiple times per day
  NOW() - (day_offset || ' days')::interval + (hour_offset || ' hours')::interval
FROM project_keywords pk
CROSS JOIN generate_series(0, 6) AS day_offset
CROSS JOIN generate_series(9, 18, 3) AS hour_offset
WHERE pk.class_id = '9692f6af-05a1-4ecb-8fe0-677cfbb97665';