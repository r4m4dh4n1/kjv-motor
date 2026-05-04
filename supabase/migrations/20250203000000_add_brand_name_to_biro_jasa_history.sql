-- Add missing brand_name column to biro_jasa_history table
-- This fixes the error: column "brand_name" of relation "biro_jasa_history" does not exist

ALTER TABLE public.biro_jasa_history 
ADD COLUMN brand_name text;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN public.biro_jasa_history.brand_name IS 'Brand name copied from biro_jasa table when closing month';