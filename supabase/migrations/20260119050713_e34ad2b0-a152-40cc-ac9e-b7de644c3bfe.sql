-- =====================================================
-- 1. Create ranking_check_queue table for Queue System
-- =====================================================
CREATE TABLE public.ranking_check_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES project_classes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    keyword_ids UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_keywords INTEGER DEFAULT 0,
    processed_keywords INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.ranking_check_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own queue" ON public.ranking_check_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue" ON public.ranking_check_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue" ON public.ranking_check_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue" ON public.ranking_check_queue
  FOR DELETE USING (auth.uid() = user_id);

-- Enable Supabase Realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.ranking_check_queue;

-- =====================================================
-- 2. Add performance indexes
-- =====================================================

-- Billing orders queries
CREATE INDEX IF NOT EXISTS idx_billing_orders_user_status ON billing_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_orders_created_at ON billing_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_orders_user_created ON billing_orders(user_id, created_at DESC);

-- Credit transactions queries
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);

-- Announcements queries (for active announcements lookup)
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, starts_at, expires_at) WHERE is_active = true;

-- Projects queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Project classes queries
CREATE INDEX IF NOT EXISTS idx_project_classes_user_id ON project_classes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_classes_project_id ON project_classes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_classes_schedule ON project_classes(schedule, schedule_time) WHERE schedule IS NOT NULL;

-- Keywords queries (important for search - use text_pattern_ops for LIKE queries)
CREATE INDEX IF NOT EXISTS idx_project_keywords_class_id ON project_keywords(class_id);
CREATE INDEX IF NOT EXISTS idx_project_keywords_keyword ON project_keywords(keyword text_pattern_ops);

-- Ranking history queries
CREATE INDEX IF NOT EXISTS idx_keyword_ranking_history_keyword_checked ON keyword_ranking_history(keyword_id, checked_at DESC);

-- Queue status queries
CREATE INDEX IF NOT EXISTS idx_ranking_queue_status ON ranking_check_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ranking_queue_user ON ranking_check_queue(user_id, status);