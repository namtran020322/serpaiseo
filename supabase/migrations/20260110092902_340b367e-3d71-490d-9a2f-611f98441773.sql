-- Add domain column to projects table
ALTER TABLE public.projects ADD COLUMN domain TEXT;

-- Update domain to NOT NULL after we allow existing data to be updated
-- For now, we'll add a default empty string for any existing projects
UPDATE public.projects SET domain = '' WHERE domain IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.projects ALTER COLUMN domain SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN domain SET DEFAULT '';