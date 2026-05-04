-- Create RLS policies for cicilan table
CREATE POLICY "select_cicilan" ON public.cicilan
  FOR SELECT USING (true);

CREATE POLICY "insert_cicilan" ON public.cicilan
  FOR INSERT WITH CHECK (true);

CREATE POLICY "update_cicilan" ON public.cicilan
  FOR UPDATE USING (true);

CREATE POLICY "delete_cicilan" ON public.cicilan
  FOR DELETE USING (true);