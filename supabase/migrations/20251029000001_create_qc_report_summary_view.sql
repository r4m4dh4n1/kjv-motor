-- Create view that summarizes qc_report per pembelian
-- Returns one row per pembelian with max estimasi/real and flags
-- Created: 2025-10-29

CREATE OR REPLACE VIEW qc_report_summary_per_pembelian AS
WITH qr AS (
  SELECT
    pembelian_id,
    MAX(COALESCE(real_nominal_qc, 0))    AS max_real,
    MAX(COALESCE(estimasi_nominal_qc,0)) AS max_estimasi
  FROM qc_report
  GROUP BY pembelian_id
)
SELECT
  qr.pembelian_id,
  qr.max_estimasi,
  qr.max_real,
  p.status,
  p.divisi,
  p.cabang_id,
  CASE WHEN qr.max_estimasi = 0 AND qr.max_real = 0 THEN true ELSE false END AS is_belum_qc,
  CASE WHEN qr.max_real <> 0 THEN true ELSE false END AS is_sudah_qc
FROM qr
LEFT JOIN pembelian p ON p.id = qr.pembelian_id;
