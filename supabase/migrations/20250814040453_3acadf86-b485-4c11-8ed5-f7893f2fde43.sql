-- Fix critical security vulnerability: Restrict access to customer data and business financial data
-- These tables contain sensitive customer and business information that should only be accessible to authenticated users

-- Drop existing overly permissive policies and create proper ones

-- PENJUALANS TABLE (Sales/Customer Data)
DROP POLICY IF EXISTS "delete_penjualans" ON public.penjualans;
DROP POLICY IF EXISTS "insert_penjualans" ON public.penjualans;
DROP POLICY IF EXISTS "select_penjualans" ON public.penjualans;
DROP POLICY IF EXISTS "update_penjualans" ON public.penjualans;

CREATE POLICY "authenticated_users_can_select_penjualans" ON public.penjualans
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_penjualans" ON public.penjualans
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_penjualans" ON public.penjualans
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_penjualans" ON public.penjualans
FOR DELETE USING (auth.role() = 'authenticated');

-- PEMBELIAN TABLE (Purchase Data)
DROP POLICY IF EXISTS "delete_pembelian" ON public.pembelian;
DROP POLICY IF EXISTS "insert_pembelian" ON public.pembelian;
DROP POLICY IF EXISTS "select_pembelian" ON public.pembelian;
DROP POLICY IF EXISTS "update_pembelian" ON public.pembelian;

CREATE POLICY "authenticated_users_can_select_pembelian" ON public.pembelian
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_pembelian" ON public.pembelian
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_pembelian" ON public.pembelian
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_pembelian" ON public.pembelian
FOR DELETE USING (auth.role() = 'authenticated');

-- CICILAN TABLE (Payment Installments)
DROP POLICY IF EXISTS "delete_cicilan" ON public.cicilan;
DROP POLICY IF EXISTS "insert_cicilan" ON public.cicilan;
DROP POLICY IF EXISTS "select_cicilan" ON public.cicilan;
DROP POLICY IF EXISTS "update_cicilan" ON public.cicilan;

CREATE POLICY "authenticated_users_can_select_cicilan" ON public.cicilan
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_cicilan" ON public.cicilan
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_cicilan" ON public.cicilan
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_cicilan" ON public.cicilan
FOR DELETE USING (auth.role() = 'authenticated');

-- PEMBUKUAN TABLE (Accounting Records)
DROP POLICY IF EXISTS "delete_pembukuan" ON public.pembukuan;
DROP POLICY IF EXISTS "insert_pembukuan" ON public.pembukuan;
DROP POLICY IF EXISTS "select_pembukuan" ON public.pembukuan;
DROP POLICY IF EXISTS "update_pembukuan" ON public.pembukuan;

CREATE POLICY "authenticated_users_can_select_pembukuan" ON public.pembukuan
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_pembukuan" ON public.pembukuan
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_pembukuan" ON public.pembukuan
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_pembukuan" ON public.pembukuan
FOR DELETE USING (auth.role() = 'authenticated');

-- COMPANIES TABLE (Business Financial Data)
DROP POLICY IF EXISTS "delete_companies" ON public.companies;
DROP POLICY IF EXISTS "insert_companies" ON public.companies;
DROP POLICY IF EXISTS "select_companies" ON public.companies;
DROP POLICY IF EXISTS "update_companies" ON public.companies;

CREATE POLICY "authenticated_users_can_select_companies" ON public.companies
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_companies" ON public.companies
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_companies" ON public.companies
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_companies" ON public.companies
FOR DELETE USING (auth.role() = 'authenticated');

-- OPERATIONAL TABLE (Operational Expenses)
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.operational;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.operational;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.operational;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.operational;

CREATE POLICY "authenticated_users_can_select_operational" ON public.operational
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_operational" ON public.operational
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_operational" ON public.operational
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_operational" ON public.operational
FOR DELETE USING (auth.role() = 'authenticated');

-- FEE_PENJUALAN TABLE (Sales Fees)
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.fee_penjualan;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.fee_penjualan;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.fee_penjualan;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.fee_penjualan;

CREATE POLICY "authenticated_users_can_select_fee_penjualan" ON public.fee_penjualan
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_fee_penjualan" ON public.fee_penjualan
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_fee_penjualan" ON public.fee_penjualan
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_fee_penjualan" ON public.fee_penjualan
FOR DELETE USING (auth.role() = 'authenticated');

-- BIRO_JASA TABLE (Service Agency Data)
DROP POLICY IF EXISTS "delete_biro_jasa" ON public.biro_jasa;
DROP POLICY IF EXISTS "insert_biro_jasa" ON public.biro_jasa;
DROP POLICY IF EXISTS "select_biro_jasa" ON public.biro_jasa;
DROP POLICY IF EXISTS "update_biro_jasa" ON public.biro_jasa;

CREATE POLICY "authenticated_users_can_select_biro_jasa" ON public.biro_jasa
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_biro_jasa" ON public.biro_jasa
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_biro_jasa" ON public.biro_jasa
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_biro_jasa" ON public.biro_jasa
FOR DELETE USING (auth.role() = 'authenticated');

-- ASSETS TABLE (Asset Management)
DROP POLICY IF EXISTS "delete_assets" ON public.assets;
DROP POLICY IF EXISTS "insert_assets" ON public.assets;
DROP POLICY IF EXISTS "select_assets" ON public.assets;
DROP POLICY IF EXISTS "update_assets" ON public.assets;

CREATE POLICY "authenticated_users_can_select_assets" ON public.assets
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_assets" ON public.assets
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_assets" ON public.assets
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_assets" ON public.assets
FOR DELETE USING (auth.role() = 'authenticated');

-- BRANDS TABLE (Brand Information)
DROP POLICY IF EXISTS "delete_brands" ON public.brands;
DROP POLICY IF EXISTS "insert_brands" ON public.brands;
DROP POLICY IF EXISTS "select_brands" ON public.brands;
DROP POLICY IF EXISTS "update_brands" ON public.brands;

CREATE POLICY "authenticated_users_can_select_brands" ON public.brands
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_brands" ON public.brands
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_brands" ON public.brands
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_brands" ON public.brands
FOR DELETE USING (auth.role() = 'authenticated');

-- JENIS_MOTOR TABLE (Motorcycle Types with Inventory)
DROP POLICY IF EXISTS "delete_jenis_motor" ON public.jenis_motor;
DROP POLICY IF EXISTS "insert_jenis_motor" ON public.jenis_motor;
DROP POLICY IF EXISTS "select_policy" ON public.jenis_motor;
DROP POLICY IF EXISTS "update_jenis_motor" ON public.jenis_motor;

CREATE POLICY "authenticated_users_can_select_jenis_motor" ON public.jenis_motor
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_jenis_motor" ON public.jenis_motor
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_jenis_motor" ON public.jenis_motor
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_jenis_motor" ON public.jenis_motor
FOR DELETE USING (auth.role() = 'authenticated');

-- CABANG TABLE (Branch Information)
DROP POLICY IF EXISTS "delete_cabang" ON public.cabang;
DROP POLICY IF EXISTS "insert_cabang" ON public.cabang;
DROP POLICY IF EXISTS "select_cabang" ON public.cabang;
DROP POLICY IF EXISTS "update_cabang" ON public.cabang;

CREATE POLICY "authenticated_users_can_select_cabang" ON public.cabang
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_cabang" ON public.cabang
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_cabang" ON public.cabang
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_cabang" ON public.cabang
FOR DELETE USING (auth.role() = 'authenticated');

-- PENCATATAN_ASSET TABLE (Asset Recording)
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.pencatatan_asset;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.pencatatan_asset;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.pencatatan_asset;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.pencatatan_asset;

CREATE POLICY "authenticated_users_can_select_pencatatan_asset" ON public.pencatatan_asset
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_pencatatan_asset" ON public.pencatatan_asset
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_pencatatan_asset" ON public.pencatatan_asset
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_pencatatan_asset" ON public.pencatatan_asset
FOR DELETE USING (auth.role() = 'authenticated');

-- BIRO_JASA_CICILAN TABLE
DROP POLICY IF EXISTS "delete_biro_jasa_cicilan" ON public.biro_jasa_cicilan;
DROP POLICY IF EXISTS "insert_biro_jasa_cicilan" ON public.biro_jasa_cicilan;
DROP POLICY IF EXISTS "select_biro_jasa_cicilan" ON public.biro_jasa_cicilan;
DROP POLICY IF EXISTS "update_biro_jasa_cicilan" ON public.biro_jasa_cicilan;

CREATE POLICY "authenticated_users_can_select_biro_jasa_cicilan" ON public.biro_jasa_cicilan
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_biro_jasa_cicilan" ON public.biro_jasa_cicilan
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_biro_jasa_cicilan" ON public.biro_jasa_cicilan
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_biro_jasa_cicilan" ON public.biro_jasa_cicilan
FOR DELETE USING (auth.role() = 'authenticated');

-- BIRO_JASA_PAYMENTS TABLE
DROP POLICY IF EXISTS "delete_biro_jasa_payments" ON public.biro_jasa_payments;
DROP POLICY IF EXISTS "insert_biro_jasa_payments" ON public.biro_jasa_payments;
DROP POLICY IF EXISTS "select_biro_jasa_payments" ON public.biro_jasa_payments;
DROP POLICY IF EXISTS "update_biro_jasa_payments" ON public.biro_jasa_payments;

CREATE POLICY "authenticated_users_can_select_biro_jasa_payments" ON public.biro_jasa_payments
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_biro_jasa_payments" ON public.biro_jasa_payments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_biro_jasa_payments" ON public.biro_jasa_payments
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_biro_jasa_payments" ON public.biro_jasa_payments
FOR DELETE USING (auth.role() = 'authenticated');

-- EMPLOYEES TABLE
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.employees;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.employees;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.employees;

CREATE POLICY "authenticated_users_can_select_employees" ON public.employees
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_employees" ON public.employees
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_employees" ON public.employees
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_employees" ON public.employees
FOR DELETE USING (auth.role() = 'authenticated');