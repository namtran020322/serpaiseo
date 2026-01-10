-- Create projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create project_classes table
CREATE TABLE public.project_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  domain text NOT NULL,
  competitor_domains jsonb DEFAULT '[]'::jsonb,
  country_id text NOT NULL,
  country_name text NOT NULL,
  location_id text,
  location_name text,
  language_code text NOT NULL,
  language_name text NOT NULL,
  device text NOT NULL DEFAULT 'desktop',
  top_results integer NOT NULL DEFAULT 100,
  schedule text, -- null, 'daily', 'weekly', 'monthly'
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on project_classes
ALTER TABLE public.project_classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_classes
CREATE POLICY "Users can view own classes" ON public.project_classes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own classes" ON public.project_classes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own classes" ON public.project_classes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own classes" ON public.project_classes FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on project_classes
CREATE TRIGGER update_project_classes_updated_at BEFORE UPDATE ON public.project_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for project lookup
CREATE INDEX idx_project_classes_project_id ON public.project_classes(project_id);

-- Create project_keywords table
CREATE TABLE public.project_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.project_classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  keyword text NOT NULL,
  ranking_position integer, -- Current position (null = not found)
  first_position integer, -- First ranking ever checked
  best_position integer, -- Best ranking achieved
  previous_position integer, -- For calculating change
  found_url text,
  competitor_rankings jsonb DEFAULT '{}'::jsonb,
  serp_results jsonb,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(class_id, keyword) -- Prevent duplicate keywords in same class
);

-- Enable RLS on project_keywords
ALTER TABLE public.project_keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_keywords
CREATE POLICY "Users can view own keywords" ON public.project_keywords FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keywords" ON public.project_keywords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keywords" ON public.project_keywords FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keywords" ON public.project_keywords FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on project_keywords
CREATE TRIGGER update_project_keywords_updated_at BEFORE UPDATE ON public.project_keywords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for project_keywords
CREATE INDEX idx_project_keywords_class_id ON public.project_keywords(class_id);

-- Create keyword_ranking_history table for trend charts
CREATE TABLE public.keyword_ranking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid NOT NULL REFERENCES public.project_keywords(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ranking_position integer, -- null if not found
  found_url text,
  competitor_rankings jsonb DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on keyword_ranking_history
ALTER TABLE public.keyword_ranking_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keyword_ranking_history
CREATE POLICY "Users can view own history" ON public.keyword_ranking_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.keyword_ranking_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for efficient querying
CREATE INDEX idx_keyword_ranking_history_keyword_id ON public.keyword_ranking_history(keyword_id);
CREATE INDEX idx_keyword_ranking_history_checked_at ON public.keyword_ranking_history(checked_at);