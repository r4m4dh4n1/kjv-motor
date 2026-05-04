-- Add tujuan_pembayaran_id to cicilan table
ALTER TABLE public.cicilan 
ADD COLUMN tujuan_pembayaran_id integer REFERENCES public.companies(id);

-- Create sequence for biro_jasa_cicilan first
CREATE SEQUENCE public.biro_jasa_cicilan_id_seq;

-- Create biro_jasa_cicilan table for biro jasa payment history
CREATE TABLE public.biro_jasa_cicilan (
  id integer NOT NULL DEFAULT nextval('public.biro_jasa_cicilan_id_seq'::regclass) PRIMARY KEY,
  biro_jasa_id integer NOT NULL REFERENCES public.biro_jasa(id) ON DELETE CASCADE,
  jumlah_bayar numeric NOT NULL DEFAULT 0,
  tanggal_bayar date NOT NULL DEFAULT CURRENT_DATE,
  tujuan_pembayaran_id integer REFERENCES public.companies(id),
  keterangan text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on biro_jasa_cicilan table
ALTER TABLE public.biro_jasa_cicilan ENABLE ROW LEVEL SECURITY;

-- Create policies for biro_jasa_cicilan
CREATE POLICY "select_biro_jasa_cicilan" 
ON public.biro_jasa_cicilan 
FOR SELECT 
USING (true);

CREATE POLICY "insert_biro_jasa_cicilan" 
ON public.biro_jasa_cicilan 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "update_biro_jasa_cicilan" 
ON public.biro_jasa_cicilan 
FOR UPDATE 
USING (true);

CREATE POLICY "delete_biro_jasa_cicilan" 
ON public.biro_jasa_cicilan 
FOR DELETE 
USING (true);