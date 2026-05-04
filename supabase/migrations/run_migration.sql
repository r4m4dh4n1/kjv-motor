-- Manual migration to update operational_combined view
-- Run this in Supabase SQL Editor

-- First, check if operational_history table has the required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'operational_history' 
  AND column_name IN ('is_retroactive', 'original_month');

-- Check if operational table has the required columns  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'operational' 
  AND column_name IN ('is_retroactive', 'original_month');

-- Update operational_combined view to include original_month field
DROP VIEW IF EXISTS public.operational_combined;

CREATE OR REPLACE VIEW public.operational_combined AS
SELECT 
  id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
  created_at, updated_at,
  'active' as data_source,
  NULL as closed_month,
  NULL as closed_year,
  NULL as closed_at,
  COALESCE(is_retroactive, false) as is_retroactive,
  original_month
FROM operational
UNION ALL
SELECT 
  id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
  created_at, updated_at,
  'history' as data_source,
  closed_month,
  closed_year,
  closed_at,
  COALESCE(is_retroactive, false) as is_retroactive,
  original_month
FROM operational_history;

-- Grant access to authenticated users
GRANT SELECT ON public.operational_combined TO authenticated;
GRANT SELECT ON public.operational_combined TO anon;

-- Recreate RLS policy for operational_combined view
DROP POLICY IF EXISTS "authenticated_users_can_select_operational_combined" ON public.operational_combined;
CREATE POLICY "authenticated_users_can_select_operational_combined" 
ON public.operational_combined 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Add comment to document the change
COMMENT ON VIEW public.operational_combined IS 'Combined view of operational and operational_history tables with original_month field for retroactive filtering';

-- Test the view
SELECT 
  data_source,
  COUNT(*) as total_records,
  COUNT(original_month) as records_with_original_month
FROM operational_combined 
GROUP BY data_source;