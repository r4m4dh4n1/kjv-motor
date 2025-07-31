-- Fix restore_month function completely based on actual table schemas
CREATE OR REPLACE FUNCTION public.restore_month(target_month integer, target_year integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pembelian_count integer := 0;
  penjualan_count integer := 0;
  pembukuan_count integer := 0;
  cicilan_count integer := 0;
  fee_count integer := 0;
  operational_count integer := 0;
  biro_jasa_count integer := 0;
  assets_count integer := 0;
  result json;
BEGIN
  -- Check if closure exists
  IF NOT EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = target_month AND closure_year = target_year) THEN
    RAISE EXCEPTION 'Month % year % was not closed, nothing to restore', target_month, target_year;
  END IF;

  -- Restore assets from history (AUTO INCREMENT - exclude ID)
  INSERT INTO assets (
    jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
    keuntungan, status, created_at, updated_at
  )
  SELECT 
    jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
    keuntungan, status, created_at, updated_at
  FROM assets_history 
  WHERE closed_month = target_month AND closed_year = target_year;
  
  GET DIAGNOSTICS assets_count = ROW_COUNT;

  -- Delete from assets_history
  DELETE FROM assets_history 
  WHERE closed_month = target_month AND closed_year = target_year;

  -- Restore biro_jasa from history (AUTO INCREMENT - exclude ID)
  INSERT INTO biro_jasa (
    tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
    tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
    dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
    keterangan, created_at, updated_at
  )
  SELECT 
    tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
    tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
    dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
    keterangan, created_at, updated_at
  FROM biro_jasa_history 
  WHERE closed_month = target_month AND closed_year = target_year;
  
  GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

  -- Delete from biro_jasa_history
  DELETE FROM biro_jasa_history 
  WHERE closed_month = target_month AND closed_year = target_year;

  -- Restore operational from history (UUID - keep original ID)
  INSERT INTO operational (
    id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
    created_at, updated_at
  )
  SELECT 
    id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
    created_at, updated_at
  FROM operational_history 
  WHERE closed_month = target_month AND closed_year = target_year;
  
  GET DIAGNOSTICS operational_count = ROW_COUNT;

  -- Delete from operational_history
  DELETE FROM operational_history 
  WHERE closed_month = target_month AND closed_year = target_year;

  -- Restore pembelian from history (MANUAL ID - keep original ID)
  INSERT INTO pembelian (
    id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id, jenis_motor_id,
    tahun, warna, kilometer, plat_nomor, tanggal_pajak, harga_beli, harga_final,
    sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2, keterangan,
    status, created_at, updated_at
  )
  SELECT 
    id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id, jenis_motor_id,
    tahun, warna, kilometer, plat_nomor, tanggal_pajak, harga_beli, harga_final,
    sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2, keterangan,
    status, created_at, updated_at
  FROM pembelian_history 
  WHERE closed_month = target_month AND closed_year = target_year;
  
  GET DIAGNOSTICS pembelian_count = ROW_COUNT;

  -- Delete from pembelian_history
  DELETE FROM pembelian_history 
  WHERE closed_month = target_month AND closed_year = target_year;

  -- Restore pembukuan from history (AUTO INCREMENT - exclude ID)
  INSERT INTO pembukuan (
    tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
    company_id, pembelian_id, created_at, updated_at
  )
  SELECT 
    tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
    company_id, pembelian_id, created_at, updated_at
  FROM pembukuan_history 
  WHERE closed_month = target_month AND closed_year = target_year;
  
  GET DIAGNOSTICS pembukuan_count = ROW_COUNT;

  -- Delete from pembukuan_history
  DELETE FROM pembukuan_history 
  WHERE closed_month = target_month AND closed_year = target_year;

  -- Restore penjualans from history (MANUAL ID - keep original ID)
  INSERT INTO penjualans (
    id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
    harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
    ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
    company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
    biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
    divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
    created_at, updated_at
  )
  SELECT 
    id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
    harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
    ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
    company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
    biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
    divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
    created_at, updated_at
  FROM penjualans_history 
  WHERE closed_month = target_month AND closed_year = target_year;
  
  GET DIAGNOSTICS penjualan_count = ROW_COUNT;

  -- Delete from penjualans_history
  DELETE FROM penjualans_history 
  WHERE closed_month = target_month AND closed_year = target_year;

  -- Restore fee_penjualan from history (AUTO INCREMENT - exclude ID)
  INSERT INTO fee_penjualan (
    penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
    created_at, updated_at
  )
  SELECT 
    penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
    created_at, updated_at
  FROM fee_penjualan_history 
  WHERE closed_month = target_month AND closed_year = target_year;
  
  GET DIAGNOSTICS fee_count = ROW_COUNT;

  -- Delete from fee_penjualan_history
  DELETE FROM fee_penjualan_history 
  WHERE closed_month = target_month AND closed_year = target_year;

  -- Restore cicilan from history (MANUAL ID - keep original ID)
  INSERT INTO cicilan (
    id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
    sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at
  )
  SELECT 
    id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
    sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at
  FROM cicilan_history 
  WHERE closed_month = target_month AND closed_year = target_year;
  
  GET DIAGNOSTICS cicilan_count = ROW_COUNT;

  -- Delete from cicilan_history
  DELETE FROM cicilan_history 
  WHERE closed_month = target_month AND closed_year = target_year;

  -- Remove the closure record
  DELETE FROM monthly_closures 
  WHERE closure_month = target_month AND closure_year = target_year;

  -- Build result
  result := json_build_object(
    'success', true,
    'month', target_month,
    'year', target_year,
    'records_restored', json_build_object(
      'pembelian', pembelian_count,
      'penjualan', penjualan_count,
      'pembukuan', pembukuan_count,
      'cicilan', cicilan_count,
      'fee_penjualan', fee_count,
      'operational', operational_count,
      'biro_jasa', biro_jasa_count,
      'assets', assets_count
    )
  );

  RETURN result;
END;
$function$;