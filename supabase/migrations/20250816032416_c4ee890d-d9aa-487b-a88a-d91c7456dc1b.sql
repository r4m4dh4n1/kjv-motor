-- Security Fix: Implement proper RLS policies for exposed financial data
-- This addresses the critical security vulnerability where sensitive business data was publicly accessible

-- Enable RLS on tables that don't have it enabled yet (skip views)
-- Note: *_combined tables appear to be views, so we cannot enable RLS on them directly
-- The underlying tables should have proper RLS policies instead

-- Drop existing overly permissive policies that allow public access
DROP POLICY IF EXISTS "Allow read access to assets_history" ON public.assets_history;
DROP POLICY IF EXISTS "Allow read access to cicilan_history" ON public.cicilan_history;
DROP POLICY IF EXISTS "Allow read access to fee_penjualan_history" ON public.fee_penjualan_history;
DROP POLICY IF EXISTS "Allow read access to operational_history" ON public.operational_history;
DROP POLICY IF EXISTS "Allow read access to pembelian_history" ON public.pembelian_history;
DROP POLICY IF EXISTS "Allow read access to pembukuan_history" ON public.pembukuan_history;
DROP POLICY IF EXISTS "Allow read access to pencatatan_asset_history" ON public.pencatatan_asset_history;
DROP POLICY IF EXISTS "Allow all access to monthly_closures" ON public.monthly_closures;
DROP POLICY IF EXISTS "select_modal_history" ON public.modal_history;
DROP POLICY IF EXISTS "insert_modal_history" ON public.modal_history;

-- Create secure RLS policies for history tables (authenticated users only)
CREATE POLICY "authenticated_users_can_select_assets_history" 
ON public.assets_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_select_cicilan_history" 
ON public.cicilan_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_select_fee_penjualan_history" 
ON public.fee_penjualan_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_select_operational_history" 
ON public.operational_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_select_pembelian_history" 
ON public.pembelian_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_select_pembukuan_history" 
ON public.pembukuan_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_select_pencatatan_asset_history" 
ON public.pencatatan_asset_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

-- Secure modal_history table
CREATE POLICY "authenticated_users_can_select_modal_history" 
ON public.modal_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_insert_modal_history" 
ON public.modal_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

-- Secure monthly_closures table
CREATE POLICY "authenticated_users_can_access_monthly_closures" 
ON public.monthly_closures 
FOR ALL 
USING (auth.role() = 'authenticated'::text);

-- Enable RLS on biro_jasa_history table and create policy
ALTER TABLE public.biro_jasa_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_select_biro_jasa_history" 
ON public.biro_jasa_history 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);