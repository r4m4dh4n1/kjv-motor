-- Update operational_combined view to include original_month field
-- This fixes the issue where special categories can't be filtered properly for historical periods

DROP VIEW IF EXISTS public.operational_combined;

CREATE OR REPLACE VIEW public.operational_combined AS
SELECT 
  id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
  created_at, updated_at,
  'active' as data_source,
  NULL as closed_month,
  NULL as closed_year,
  NULL as closed_at,
  is_retroactive,
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
  is_retroactive,
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