-- Fix RLS policies for history tables to allow close_month function to work properly

-- Update cicilan_history policies
DROP POLICY IF EXISTS "Allow authenticated users to insert cicilan_history" ON cicilan_history;
CREATE POLICY "Allow authenticated users to insert cicilan_history" 
ON cicilan_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR current_setting('role') = 'postgres');

-- Update fee_penjualan_history policies
DROP POLICY IF EXISTS "Allow authenticated users to insert fee_penjualan_history" ON fee_penjualan_history;
CREATE POLICY "Allow authenticated users to insert fee_penjualan_history" 
ON fee_penjualan_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR current_setting('role') = 'postgres');

-- Update pembukuan_history policies
DROP POLICY IF EXISTS "Allow authenticated users to insert pembukuan_history" ON pembukuan_history;
CREATE POLICY "Allow authenticated users to insert pembukuan_history" 
ON pembukuan_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR current_setting('role') = 'postgres');

-- Update penjualans_history policies
DROP POLICY IF EXISTS "Allow authenticated users to insert penjualans_history" ON penjualans_history;
CREATE POLICY "Allow authenticated users to insert penjualans_history" 
ON penjualans_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR current_setting('role') = 'postgres');

-- Update pembelian_history policies
DROP POLICY IF EXISTS "Allow authenticated users to insert pembelian_history" ON pembelian_history;
CREATE POLICY "Allow authenticated users to insert pembelian_history" 
ON pembelian_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR current_setting('role') = 'postgres');

-- Update operational_history policies
DROP POLICY IF EXISTS "Allow authenticated users to insert operational_history" ON operational_history;
CREATE POLICY "Allow authenticated users to insert operational_history" 
ON operational_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR current_setting('role') = 'postgres');

-- Update biro_jasa_history policies
DROP POLICY IF EXISTS "Allow authenticated users to insert biro_jasa_history" ON biro_jasa_history;
CREATE POLICY "Allow authenticated users to insert biro_jasa_history" 
ON biro_jasa_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR current_setting('role') = 'postgres');

-- Update assets_history policies
DROP POLICY IF EXISTS "Allow authenticated users to insert assets_history" ON assets_history;
CREATE POLICY "Allow authenticated users to insert assets_history" 
ON assets_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text OR current_setting('role') = 'postgres');