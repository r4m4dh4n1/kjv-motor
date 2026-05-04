-- Migration: Add tanggal_selesai_qc field to qc_report table
-- Description: Menambahkan kolom tanggal_selesai_qc untuk menyimpan tanggal selesai QC yang sebenarnya

-- Add tanggal_selesai_qc column to qc_report
ALTER TABLE qc_report
ADD COLUMN IF NOT EXISTS tanggal_selesai_qc DATE;

-- Add comment to column
COMMENT ON COLUMN qc_report.tanggal_selesai_qc IS 'Tanggal selesai QC yang sebenarnya (real completion date)';
