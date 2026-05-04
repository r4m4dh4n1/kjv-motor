-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create pembukuan table for accounting entries
CREATE TABLE public.pembukuan (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL,
  divisi VARCHAR NOT NULL,
  cabang_id INTEGER NOT NULL REFERENCES public.cabang(id),
  keterangan TEXT NOT NULL,
  debit NUMERIC DEFAULT 0,
  kredit NUMERIC DEFAULT 0,
  saldo NUMERIC DEFAULT 0,
  pembelian_id INTEGER REFERENCES public.pembelian(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pembukuan ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "select_pembukuan" ON public.pembukuan FOR SELECT USING (true);
CREATE POLICY "insert_pembukuan" ON public.pembukuan FOR INSERT WITH CHECK (true);
CREATE POLICY "update_pembukuan" ON public.pembukuan FOR UPDATE USING (true);
CREATE POLICY "delete_pembukuan" ON public.pembukuan FOR DELETE USING (true);

-- Create trigger for timestamps
CREATE TRIGGER update_pembukuan_updated_at
  BEFORE UPDATE ON public.pembukuan
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();