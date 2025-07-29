-- Create RLS policies for penjualans table
CREATE POLICY "Enable all operations for penjualans" ON public.penjualans
FOR ALL USING (true) WITH CHECK (true);

-- Also create individual policies for better granularity
DROP POLICY IF EXISTS "Enable all operations for penjualans" ON public.penjualans;

CREATE POLICY "select_penjualans" ON public.penjualans FOR SELECT USING (true);
CREATE POLICY "insert_penjualans" ON public.penjualans FOR INSERT WITH CHECK (true);
CREATE POLICY "update_penjualans" ON public.penjualans FOR UPDATE USING (true);
CREATE POLICY "delete_penjualans" ON public.penjualans FOR DELETE USING (true);