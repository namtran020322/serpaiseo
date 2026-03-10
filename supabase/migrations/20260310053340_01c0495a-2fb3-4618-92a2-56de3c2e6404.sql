
-- Create trial_credits table
CREATE TABLE public.trial_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  credits_granted integer NOT NULL DEFAULT 0,
  max_projects integer NOT NULL DEFAULT 1,
  max_classes_per_project integer NOT NULL DEFAULT 2,
  expires_at timestamp with time zone NOT NULL,
  granted_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_credits ENABLE ROW LEVEL SECURITY;

-- Users can view their own trial
CREATE POLICY "Users can view own trial" ON public.trial_credits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all trials
CREATE POLICY "Admins can manage trials" ON public.trial_credits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
