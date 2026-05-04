-- Create fee_penjualan table for recording sales fees
CREATE TABLE public.fee_penjualan (
  id SERIAL PRIMARY KEY,
  penjualan_id BIGINT NOT NULL,
  tanggal_fee DATE NOT NULL DEFAULT CURRENT_DATE,
  jumlah_fee NUMERIC NOT NULL DEFAULT 0,
  keterangan TEXT,
  divisi VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (penjualan_id) REFERENCES penjualans(id) ON DELETE CASCADE
);

-- Enable RLS on fee_penjualan
ALTER TABLE public.fee_penjualan ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for fee_penjualan
CREATE POLICY "Enable read access for all users" ON public.fee_penjualan FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.fee_penjualan FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.fee_penjualan FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.fee_penjualan FOR DELETE USING (true);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_fee_penjualan_updated_at
  BEFORE UPDATE ON public.fee_penjualan
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();