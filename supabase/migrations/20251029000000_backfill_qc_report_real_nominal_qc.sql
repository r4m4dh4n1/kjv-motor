-- Backfill qc_report.real_nominal_qc from price_histories_pembelian.biaya_qc
-- Dry-run SELECTs included. Run the dry-run queries first to review affected rows.
-- Migration created: 2025-10-29

-- 1) DRY RUN: total qc_report rows and how many already have real_nominal_qc
-- SELECT COUNT(*) AS total_qc_report FROM qc_report;
-- SELECT COUNT(*) AS real_nonzero FROM qc_report WHERE COALESCE(real_nominal_qc,0) <> 0;
-- SELECT COUNT(*) AS belum_rule_matches FROM qc_report WHERE COALESCE(estimasi_nominal_qc,0) = 0 AND COALESCE(real_nominal_qc,0) = 0;

-- 2) DRY RUN: latest biaya_qc per pembelian (preview)
-- SELECT DISTINCT ON (pembelian_id) pembelian_id, biaya_qc, created_at
-- FROM price_histories_pembelian
-- WHERE biaya_qc IS NOT NULL
-- ORDER BY pembelian_id, created_at DESC
-- LIMIT 200;

-- 3) DRY RUN: qc_report rows that would be updated (have empty real_nominal_qc but price history exists)
-- WITH ph_latest AS (
--   SELECT DISTINCT ON (pembelian_id) pembelian_id, biaya_qc
--   FROM price_histories_pembelian
--   WHERE biaya_qc IS NOT NULL
--   ORDER BY pembelian_id, created_at DESC
-- )
-- SELECT qr.id AS qc_id, qr.pembelian_id, qr.estimasi_nominal_qc, qr.real_nominal_qc, ph_latest.biaya_qc
-- FROM qc_report qr
-- JOIN ph_latest ON ph_latest.pembelian_id = qr.pembelian_id
-- WHERE (qr.real_nominal_qc IS NULL OR qr.real_nominal_qc = 0)
-- LIMIT 200;

-- 4) Update existing qc_report rows: set real_nominal_qc from latest biaya_qc when real is empty/0
BEGIN;

WITH ph_latest AS (
  SELECT DISTINCT ON (pembelian_id) pembelian_id, biaya_qc
  FROM price_histories_pembelian
  WHERE biaya_qc IS NOT NULL
  ORDER BY pembelian_id, created_at DESC
)
UPDATE qc_report qr
SET real_nominal_qc = ph_latest.biaya_qc,
    updated_at = NOW()
FROM ph_latest
WHERE qr.pembelian_id = ph_latest.pembelian_id
  AND (qr.real_nominal_qc IS NULL OR qr.real_nominal_qc = 0);

-- 5) Insert missing qc_report rows for pembelian that have biaya_qc but no qc_report row yet
WITH ph_latest AS (
  SELECT DISTINCT ON (pembelian_id) pembelian_id, biaya_qc
  FROM price_histories_pembelian
  WHERE biaya_qc IS NOT NULL
  ORDER BY pembelian_id, created_at DESC
)
INSERT INTO qc_report (pembelian_id, estimasi_nominal_qc, real_nominal_qc, created_at)
SELECT ph_latest.pembelian_id, 0, ph_latest.biaya_qc, NOW()
FROM ph_latest
LEFT JOIN qc_report qr ON qr.pembelian_id = ph_latest.pembelian_id
WHERE qr.id IS NULL;

COMMIT;

-- ROLLBACK (not executed): example of how to revert the update step
-- NOTE: This rollback will only revert rows that were updated by the update statement above if you have captured them.
-- It's safer to back up affected rows before running the migration.
-- Example backup SELECT:
-- SELECT qr.* FROM qc_report qr
-- JOIN (
--   SELECT DISTINCT ON (pembelian_id) pembelian_id, biaya_qc
--   FROM price_histories_pembelian
--   WHERE biaya_qc IS NOT NULL
--   ORDER BY pembelian_id, created_at DESC
-- ) ph_latest ON ph_latest.pembelian_id = qr.pembelian_id
-- WHERE (qr.real_nominal_qc IS NULL OR qr.real_nominal_qc = 0);

-- To rollback (if you recorded previous real_nominal_qc values), you would run an UPDATE to restore previous values.
