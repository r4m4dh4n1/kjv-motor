-- Add verified columns to qc_report table
-- Migration created: 2025-10-30

ALTER TABLE public.qc_report
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_by TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for verified column for better performance
CREATE INDEX IF NOT EXISTS idx_qc_report_verified ON public.qc_report(verified);

-- Add comments
COMMENT ON COLUMN public.qc_report.verified IS 'Status verifikasi QC report';
COMMENT ON COLUMN public.qc_report.verified_by IS 'Nama user yang memverifikasi';
COMMENT ON COLUMN public.qc_report.verified_at IS 'Waktu verifikasi dilakukan';
