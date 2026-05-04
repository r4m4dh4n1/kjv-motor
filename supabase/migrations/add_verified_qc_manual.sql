-- MANUAL MIGRATION: Add verified columns to qc_report
-- Jalankan script ini di Supabase Dashboard > SQL Editor jika migration otomatis belum berjalan

-- Add verified columns
ALTER TABLE public.qc_report
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_by TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_qc_report_verified ON public.qc_report(verified);

-- Add comments for documentation
COMMENT ON COLUMN public.qc_report.verified IS 'Status verifikasi QC report';
COMMENT ON COLUMN public.qc_report.verified_by IS 'Nama user yang memverifikasi';
COMMENT ON COLUMN public.qc_report.verified_at IS 'Waktu verifikasi dilakukan';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'qc_report' 
  AND column_name IN ('verified', 'verified_by', 'verified_at')
ORDER BY ordinal_position;
