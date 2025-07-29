-- Create table for purchase price history
CREATE TABLE public.price_histories_pembelian (
  id BIGSERIAL PRIMARY KEY,
  pembelian_id BIGINT NOT NULL,
  harga_beli_lama NUMERIC NOT NULL DEFAULT 0,
  harga_beli_baru NUMERIC NOT NULL,
  biaya_pajak NUMERIC DEFAULT 0,
  biaya_qc NUMERIC DEFAULT 0,
  biaya_lain_lain NUMERIC DEFAULT 0,
  keterangan_biaya_lain TEXT,
  reason TEXT,
  user_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  FOREIGN KEY (pembelian_id) REFERENCES public.pembelian(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.price_histories_pembelian ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" 
ON public.price_histories_pembelian 
FOR SELECT 
USING (true);

CREATE POLICY "Enable insert access for all users" 
ON public.price_histories_pembelian 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update access for all users" 
ON public.price_histories_pembelian 
FOR UPDATE 
USING (true);

CREATE POLICY "Enable delete access for all users" 
ON public.price_histories_pembelian 
FOR DELETE 
USING (true);