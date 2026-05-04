-- Create operational_combined view to combine active and history data
CREATE OR REPLACE VIEW public.operational_combined AS
SELECT 
  id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
  created_at, updated_at,
  'active' as data_source,
  NULL as closed_month,
  NULL as closed_year,
  NULL as closed_at
FROM operational
UNION ALL
SELECT 
  id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
  created_at, updated_at,
  'history' as data_source,
  closed_month,
  closed_year,
  closed_at
FROM operational_history;

-- Grant access to authenticated users
GRANT SELECT ON public.operational_combined TO authenticated;
GRANT SELECT ON public.operational_combined TO anon;

-- Create RLS policy for operational_combined view
CREATE POLICY "authenticated_users_can_select_operational_combined" 
ON public.operational_combined 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);