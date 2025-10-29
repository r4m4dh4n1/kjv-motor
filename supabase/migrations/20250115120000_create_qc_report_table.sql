-- Create table for QC Report data
CREATE TABLE public.qc_report (
  id BIGSERIAL PRIMARY KEY,
  pembelian_id BIGINT NOT NULL REFERENCES pembelian(id) ON DELETE CASCADE,
  estimasi_nominal_qc NUMERIC NOT NULL DEFAULT 0,
  real_nominal_qc NUMERIC NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id BIGINT
);

-- Enable RLS
ALTER TABLE public.qc_report ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all qc_report records" 
ON public.qc_report 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert qc_report records" 
ON public.qc_report 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update qc_report records" 
ON public.qc_report 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete qc_report records" 
ON public.qc_report 
FOR DELETE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_qc_report_pembelian_id ON public.qc_report(pembelian_id);
CREATE INDEX idx_qc_report_created_at ON public.qc_report(created_at);

-- Add comment
COMMENT ON TABLE public.qc_report IS 'Tabel untuk menyimpan data report QC perbandingan estimasi vs real';
COMMENT ON COLUMN public.qc_report.pembelian_id IS 'ID pembelian yang direport';
COMMENT ON COLUMN public.qc_report.estimasi_nominal_qc IS 'Estimasi nominal QC yang diinput user';
COMMENT ON COLUMN public.qc_report.real_nominal_qc IS 'Real nominal QC dari qc_history + price_histories_pembelian';
COMMENT ON COLUMN public.qc_report.keterangan IS 'Keterangan perbandingan (lebih besar/kurang/sama)';
