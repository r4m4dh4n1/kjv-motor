-- Add department field to employees table and make last_name optional
ALTER TABLE public.employees 
ADD COLUMN departemen VARCHAR(255);

-- Make last_name nullable
ALTER TABLE public.employees 
ALTER COLUMN last_name DROP NOT NULL;