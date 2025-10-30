-- Add estimasi_tanggal_selesai to qc_report table
ALTER TABLE public.qc_report
ADD COLUMN IF NOT EXISTS estimasi_tanggal_selesai DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.qc_report.estimasi_tanggal_selesai IS 'Perkiraan tanggal QC selesai';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_qc_report_estimasi_tanggal ON public.qc_report(estimasi_tanggal_selesai);
