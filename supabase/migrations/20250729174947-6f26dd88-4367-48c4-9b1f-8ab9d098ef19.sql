-- Create table for profit distribution
CREATE TABLE public.profit_distribution (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  divisi VARCHAR NOT NULL,
  bulan INTEGER NOT NULL,
  tahun INTEGER NOT NULL,
  tipe_keuntungan VARCHAR NOT NULL, -- 'kotor' atau 'bersih'
  total_keuntungan NUMERIC NOT NULL DEFAULT 0,
  jumlah_diambil NUMERIC NOT NULL DEFAULT 0,
  jumlah_ke_perusahaan NUMERIC NOT NULL DEFAULT 0,
  company_id INTEGER REFERENCES public.companies(id),
  keterangan TEXT,
  status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profit_distribution ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for profit_distribution" 
ON public.profit_distribution 
FOR ALL 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_profit_distribution_updated_at
BEFORE UPDATE ON public.profit_distribution
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();