
-- Update brands table policies to allow public access
DROP POLICY IF EXISTS "insert_brands" ON brands;
DROP POLICY IF EXISTS "update_brands" ON brands;
DROP POLICY IF EXISTS "delete_brands" ON brands;
DROP POLICY IF EXISTS "select_brands" ON brands;

-- Create new policies that allow public access
CREATE POLICY "select_brands" ON brands FOR SELECT TO public USING (true);
CREATE POLICY "insert_brands" ON brands FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "update_brands" ON brands FOR UPDATE TO public USING (true);
CREATE POLICY "delete_brands" ON brands FOR DELETE TO public USING (true);

-- Also update other tables to use public access for now
DROP POLICY IF EXISTS "select_companies" ON companies;
DROP POLICY IF EXISTS "insert_companies" ON companies;
DROP POLICY IF EXISTS "update_companies" ON companies;
DROP POLICY IF EXISTS "delete_companies" ON companies;

CREATE POLICY "select_companies" ON companies FOR SELECT TO public USING (true);
CREATE POLICY "insert_companies" ON companies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "update_companies" ON companies FOR UPDATE TO public USING (true);
CREATE POLICY "delete_companies" ON companies FOR DELETE TO public USING (true);

-- Update modal_history policies
DROP POLICY IF EXISTS "select_modal_history" ON modal_history;
DROP POLICY IF EXISTS "insert_modal_history" ON modal_history;

CREATE POLICY "select_modal_history" ON modal_history FOR SELECT TO public USING (true);
CREATE POLICY "insert_modal_history" ON modal_history FOR INSERT TO public WITH CHECK (true);

-- Add missing policies for jenis_motor
CREATE POLICY "insert_jenis_motor" ON jenis_motor FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "update_jenis_motor" ON jenis_motor FOR UPDATE TO public USING (true);
CREATE POLICY "delete_jenis_motor" ON jenis_motor FOR DELETE TO public USING (true);

-- Add missing policies for assets
CREATE POLICY "insert_assets" ON assets FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "update_assets" ON assets FOR UPDATE TO public USING (true);
CREATE POLICY "delete_assets" ON assets FOR DELETE TO public USING (true);
