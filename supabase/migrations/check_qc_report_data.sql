-- Check if qc_report table has data
SELECT COUNT(*) as total_qc_report FROM public.qc_report;

-- Check sample data from qc_report with pembelian details
SELECT 
  qr.id,
  qr.pembelian_id,
  qr.estimasi_nominal_qc,
  qr.real_nominal_qc,
  qr.keterangan,
  p.plat_nomor,
  p.divisi,
  p.cabang_id,
  b.name as brand_name,
  jm.jenis_motor
FROM public.qc_report qr
LEFT JOIN public.pembelian p ON qr.pembelian_id = p.id
LEFT JOIN public.brands b ON p.brand_id = b.id
LEFT JOIN public.jenis_motor jm ON p.jenis_motor_id = jm.id
ORDER BY qr.created_at DESC
LIMIT 10;

-- Check count by divisi
SELECT 
  p.divisi,
  COUNT(*) as total,
  SUM(CASE WHEN qr.real_nominal_qc > 0 THEN 1 ELSE 0 END) as sudah_qc,
  SUM(CASE WHEN qr.real_nominal_qc = 0 OR qr.real_nominal_qc IS NULL THEN 1 ELSE 0 END) as belum_qc
FROM public.qc_report qr
LEFT JOIN public.pembelian p ON qr.pembelian_id = p.id
GROUP BY p.divisi;

-- Check if there's any real_nominal_qc > 0
SELECT 
  COUNT(*) as total_with_real_qc
FROM public.qc_report
WHERE real_nominal_qc > 0;
