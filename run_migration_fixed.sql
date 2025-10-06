-- Update operational_combined view to include original_month field (FIXED VERSION)
-- This fixes the issue where special categories can't be filtered properly for historical periods

-- Check if columns exist in operational table
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'operational' 
AND column_name IN ('is_retroactive', 'original_month');

-- Check if columns exist in operational_history table  
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'operational_history' 
AND column_name IN ('is_retroactive', 'original_month');

-- Drop existing view
DROP VIEW IF EXISTS public.operational_combined;

-- Create updated view with only available columns
-- operational table has: is_retroactive, original_month
-- operational_history table has: closed_month, closed_year, closed_at (but NOT is_retroactive, original_month)
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
  false as is_retroactive,  -- Default to false since column doesn't exist in history
  NULL as original_month    -- Default to NULL since column doesn't exist in history
FROM operational_history;

-- Grant access to authenticated users
GRANT SELECT ON public.operational_combined TO authenticated;
GRANT SELECT ON public.operational_combined TO anon;

-- Note: RLS policies cannot be applied to views, only to tables
-- The underlying tables (operational and operational_history) already have their own RLS policies
-- Views inherit security from their underlying tables

-- Add comment to document the change
COMMENT ON VIEW public.operational_combined IS 'Combined view of operational and operational_history tables with original_month field for retroactive filtering (history records have NULL original_month)';

-- Test the view
SELECT 
  data_source,
  COUNT(*) as total_records,
  COUNT(original_month) as records_with_original_month,
  COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_records
FROM public.operational_combined 
GROUP BY data_source;

-- Test query to verify the view works
SELECT * FROM public.operational_combined LIMIT 5;