-- Update handle_new_user function to add input validation for full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (
        NEW.id, 
        -- Sanitize and limit full_name to 255 characters
        SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 1, 255)
    );
    RETURN NEW;
END;
$function$;

-- Add a check constraint on profiles.full_name for max length
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_full_name_length_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_full_name_length_check 
CHECK (full_name IS NULL OR LENGTH(full_name) <= 255);
