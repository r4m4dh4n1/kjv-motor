-- MANUAL MIGRATION: Add estimasi_tanggal_selesai to qc_report
-- Jalankan script ini di Supabase Dashboard > SQL Editor

-- Add estimasi_tanggal_selesai column
ALTER TABLE public.qc_report
ADD COLUMN IF NOT EXISTS estimasi_tanggal_selesai DATE;

-- Add comment for documentation
COMMENT ON COLUMN public.qc_report.estimasi_tanggal_selesai IS 'Perkiraan tanggal QC selesai';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_qc_report_estimasi_tanggal ON public.qc_report(estimasi_tanggal_selesai);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'qc_report' 
  AND column_name = 'estimasi_tanggal_selesai'
ORDER BY ordinal_position;
