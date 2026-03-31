ALTER TABLE ranking_check_queue 
  ADD COLUMN IF NOT EXISTS report_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_sent boolean DEFAULT false;