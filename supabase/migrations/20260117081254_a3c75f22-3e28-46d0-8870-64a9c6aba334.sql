-- Add schedule_time column (HH:MM format, e.g., "09:00", "14:30")
ALTER TABLE project_classes 
ADD COLUMN IF NOT EXISTS schedule_time text DEFAULT '08:00';

-- Add schedule_timezone column for accurate scheduling
ALTER TABLE project_classes 
ADD COLUMN IF NOT EXISTS schedule_timezone text DEFAULT 'Asia/Ho_Chi_Minh';