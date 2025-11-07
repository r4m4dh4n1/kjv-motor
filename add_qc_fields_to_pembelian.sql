-- Add QC fields to pembelian table
-- These fields track Quality Control inspection details

ALTER TABLE public.pembelian
ADD COLUMN IF NOT EXISTS real_nominal_qc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimasi_nominal_qc NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tanggal_qc TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS keterangan_qc TEXT,
ADD COLUMN IF NOT EXISTS verified_qc BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_qc_by TEXT,
ADD COLUMN IF NOT EXISTS verified_qc_at TIMESTAMP WITH TIME ZONE;

-- Add comments to document the fields
COMMENT ON COLUMN public.pembelian.real_nominal_qc IS 'Actual QC cost after inspection';
COMMENT ON COLUMN public.pembelian.estimasi_nominal_qc IS 'Estimated QC cost before inspection';
COMMENT ON COLUMN public.pembelian.tanggal_qc IS 'Date when QC was performed';
COMMENT ON COLUMN public.pembelian.keterangan_qc IS 'QC notes and findings';
COMMENT ON COLUMN public.pembelian.verified_qc IS 'Whether QC has been verified/approved';
COMMENT ON COLUMN public.pembelian.verified_qc_by IS 'User who verified the QC';
COMMENT ON COLUMN public.pembelian.verified_qc_at IS 'Timestamp when QC was verified';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pembelian_real_nominal_qc ON public.pembelian(real_nominal_qc);
CREATE INDEX IF NOT EXISTS idx_pembelian_verified_qc ON public.pembelian(verified_qc);
CREATE INDEX IF NOT EXISTS idx_pembelian_tanggal_qc ON public.pembelian(tanggal_qc);
