-- Create views to combine active and history data for easy viewing
-- This is safer than trying to restore data

-- 1. Combined Pembelian View
CREATE OR REPLACE VIEW public.pembelian_combined AS
SELECT 
  id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id, jenis_motor_id,
  tahun, warna, kilometer, plat_nomor, tanggal_pajak, harga_beli, harga_final,
  sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2, keterangan,
  status, created_at, updated_at,
  'active' as data_source,
  NULL as closed_month,
  NULL as closed_year
FROM pembelian
UNION ALL
SELECT 
  id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id, jenis_motor_id,
  tahun, warna, kilometer, plat_nomor, tanggal_pajak, harga_beli, harga_final,
  sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2, keterangan,
  status, created_at, updated_at,
  'history' as data_source,
  closed_month,
  closed_year
FROM pembelian_history;

-- 2. Combined Penjualan View
CREATE OR REPLACE VIEW public.penjualans_combined AS
SELECT 
  id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
  harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
  ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
  company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
  biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
  divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
  created_at, updated_at,
  'active' as data_source,
  NULL as closed_month,
  NULL as closed_year
FROM penjualans
UNION ALL
SELECT 
  id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
  harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
  ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
  company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
  biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
  divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
  created_at, updated_at,
  'history' as data_source,
  closed_month,
  closed_year
FROM penjualans_history;

-- 3. Combined Pembukuan View
CREATE OR REPLACE VIEW public.pembukuan_combined AS
SELECT 
  id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
  company_id, pembelian_id, created_at, updated_at,
  'active' as data_source,
  NULL as closed_month,
  NULL as closed_year
FROM pembukuan
UNION ALL
SELECT 
  id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
  company_id, pembelian_id, created_at, updated_at,
  'history' as data_source,
  closed_month,
  closed_year
FROM pembukuan_history;

-- 4. Combined Assets View
CREATE OR REPLACE VIEW public.assets_combined AS
SELECT 
  id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
  keuntungan, status, created_at, updated_at,
  'active' as data_source,
  NULL as closed_month,
  NULL as closed_year
FROM assets
UNION ALL
SELECT 
  id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
  keuntungan, status, created_at, updated_at,
  'history' as data_source,
  closed_month,
  closed_year
FROM assets_history;

-- 5. Function to get data by month/year
CREATE OR REPLACE FUNCTION public.get_monthly_data(target_month integer, target_year integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  pembelian_count integer;
  penjualan_count integer;
  pembukuan_count integer;
  assets_count integer;
BEGIN
  -- Count records from specific month/year
  SELECT COUNT(*) INTO pembelian_count
  FROM pembelian_combined
  WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year;
    
  SELECT COUNT(*) INTO penjualan_count
  FROM penjualans_combined
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
  SELECT COUNT(*) INTO pembukuan_count
  FROM pembukuan_combined
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
  SELECT COUNT(*) INTO assets_count
  FROM assets_combined
  WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;

  result := json_build_object(
    'month', target_month,
    'year', target_year,
    'data_summary', json_build_object(
      'pembelian', pembelian_count,
      'penjualan', penjualan_count,
      'pembukuan', pembukuan_count,
      'assets', assets_count
    )
  );

  RETURN result;
END;
$function$;