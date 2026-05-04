-- Update RLS policy for assets table to allow public access like other tables
DROP POLICY IF EXISTS "select_assets" ON public.assets;

CREATE POLICY "select_assets" 
ON public.assets 
FOR SELECT 
USING (true);