-- Create biro jasa table
CREATE TABLE public.biro_jasa (
  id SERIAL PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jenis_motor VARCHAR(50) NOT NULL, -- 'motor_eksisting' or 'motor_baru'
  brand_id INTEGER REFERENCES brands(id),
  jenis_motor_id INTEGER REFERENCES jenis_motor(id),
  warna VARCHAR(50),
  plat_nomor VARCHAR(20),
  tahun INTEGER CHECK (tahun >= 2005 AND tahun <= 2025),
  jenis_pengurusan VARCHAR(50) NOT NULL, -- 'Perpanjangan STNK', 'Balik Nama', 'Mutasi', 'Lainnya'
  keterangan TEXT,
  estimasi_biaya NUMERIC DEFAULT 0,
  estimasi_tanggal_selesai DATE NOT NULL DEFAULT CURRENT_DATE,
  dp NUMERIC DEFAULT 0,
  sisa NUMERIC DEFAULT 0,
  rekening_tujuan_id INTEGER REFERENCES companies(id),
  status VARCHAR(30) NOT NULL DEFAULT 'Dalam Proses', -- 'Dalam Proses', 'Selesai', 'Batal'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.biro_jasa ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "select_biro_jasa" ON public.biro_jasa FOR SELECT USING (true);
CREATE POLICY "insert_biro_jasa" ON public.biro_jasa FOR INSERT WITH CHECK (true);
CREATE POLICY "update_biro_jasa" ON public.biro_jasa FOR UPDATE USING (true);
CREATE POLICY "delete_biro_jasa" ON public.biro_jasa FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_biro_jasa_updated_at
  BEFORE UPDATE ON public.biro_jasa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();