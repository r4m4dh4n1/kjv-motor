-- Add new columns to biro_jasa table for cost tracking and profit calculation
ALTER TABLE public.biro_jasa 
ADD COLUMN biaya_modal numeric DEFAULT 0,
ADD COLUMN keuntungan numeric DEFAULT 0,
ADD COLUMN total_bayar numeric DEFAULT 0;

-- Create table for biro jasa payments tracking
CREATE TABLE public.biro_jasa_payments (
  id SERIAL PRIMARY KEY,
  biro_jasa_id INTEGER NOT NULL REFERENCES public.biro_jasa(id) ON DELETE CASCADE,
  tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
  jumlah_bayar numeric NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on biro_jasa_payments
ALTER TABLE public.biro_jasa_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for biro_jasa_payments
CREATE POLICY "select_biro_jasa_payments" ON public.biro_jasa_payments FOR SELECT USING (true);
CREATE POLICY "insert_biro_jasa_payments" ON public.biro_jasa_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "update_biro_jasa_payments" ON public.biro_jasa_payments FOR UPDATE USING (true);
CREATE POLICY "delete_biro_jasa_payments" ON public.biro_jasa_payments FOR DELETE USING (true);

-- Create function to update updated_at timestamp for biro_jasa_payments
CREATE TRIGGER update_biro_jasa_payments_updated_at
  BEFORE UPDATE ON public.biro_jasa_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();