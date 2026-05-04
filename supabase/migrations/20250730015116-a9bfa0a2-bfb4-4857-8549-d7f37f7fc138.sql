-- Fix close_month function to handle foreign key constraints properly
CREATE OR REPLACE FUNCTION public.close_month(target_month integer, target_year integer, notes text DEFAULT NULL::text)
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
  -- Check if closure already exists
  IF EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = target_month AND closure_year = target_year) THEN
    RAISE EXCEPTION 'Month % year % has already been closed', target_month, target_year;
  END IF;

  -- Move pembukuan to history FIRST (before deleting pembelian records)
  INSERT INTO pembukuan_history (
    id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
    company_id, pembelian_id, created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
    company_id, pembelian_id, created_at, updated_at, target_month, target_year
  FROM pembukuan 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
  
  GET DIAGNOSTICS pembukuan_count = ROW_COUNT;

  -- Delete from pembukuan BEFORE deleting pembelian
  DELETE FROM pembukuan 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

  -- Move completed pembelian (sold, not ready) to history
  INSERT INTO pembelian_history (
    id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id, jenis_motor_id,
    tahun, warna, kilometer, plat_nomor, tanggal_pajak, harga_beli, harga_final,
    sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2, keterangan,
    status, created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id, jenis_motor_id,
    tahun, warna, kilometer, plat_nomor, tanggal_pajak, harga_beli, harga_final,
    sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2, keterangan,
    status, created_at, updated_at, target_month, target_year
  FROM pembelian 
  WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND status != 'ready';
  
  GET DIAGNOSTICS pembelian_count = ROW_COUNT;

  -- Move completed penjualans (sold, not booked) to history
  INSERT INTO penjualans_history (
    id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
    harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
    ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
    company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
    biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
    divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
    created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
    harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
    ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
    company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
    biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
    divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
    created_at, updated_at, target_month, target_year
  FROM penjualans 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status != 'booked';
  
  GET DIAGNOSTICS penjualan_count = ROW_COUNT;

  -- Move completed cicilan to history
  INSERT INTO cicilan_history (
    id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
    sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at,
    closed_month, closed_year
  )
  SELECT 
    id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
    sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at,
    target_month, target_year
  FROM cicilan 
  WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;
  
  GET DIAGNOSTICS cicilan_count = ROW_COUNT;

  -- Move fee_penjualan to history
  INSERT INTO fee_penjualan_history (
    id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
    created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
    created_at, updated_at, target_month, target_year
  FROM fee_penjualan 
  WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year;
  
  GET DIAGNOSTICS fee_count = ROW_COUNT;

  -- Move operational to history
  INSERT INTO operational_history (
    id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
    created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
    created_at, updated_at, target_month, target_year
  FROM operational 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
  
  GET DIAGNOSTICS operational_count = ROW_COUNT;

  -- Move completed biro_jasa to history
  INSERT INTO biro_jasa_history (
    id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
    tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
    dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
    keterangan, created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
    tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
    dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
    keterangan, created_at, updated_at, target_month, target_year
  FROM biro_jasa 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'Selesai';
  
  GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

  -- Move sold assets to history
  INSERT INTO assets_history (
    id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
    keuntungan, status, created_at, updated_at, closed_month, closed_year
  )
  SELECT 
    id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
    keuntungan, status, created_at, updated_at, target_month, target_year
  FROM assets 
  WHERE ((EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year)
    OR (tanggal_jual IS NOT NULL 
    AND EXTRACT(MONTH FROM tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM tanggal_jual) = target_year))
    AND status = 'terjual';
  
  GET DIAGNOSTICS assets_count = ROW_COUNT;

  -- Now delete records from original tables (pembukuan already deleted above)
  DELETE FROM pembelian 
  WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND status != 'ready';

  DELETE FROM penjualans 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status != 'booked';

  DELETE FROM cicilan 
  WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;

  DELETE FROM fee_penjualan 
  WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year;

  DELETE FROM operational 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

  DELETE FROM biro_jasa 
  WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'Selesai';

  DELETE FROM assets 
  WHERE ((EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year)
    OR (tanggal_jual IS NOT NULL 
    AND EXTRACT(MONTH FROM tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM tanggal_jual) = target_year))
    AND status = 'terjual';

  -- Record the closure
  INSERT INTO monthly_closures (
    closure_month, closure_year, total_pembelian_moved, total_penjualan_moved,
    total_pembukuan_moved, total_cicilan_moved, total_fee_moved,
    total_operational_moved, total_biro_jasa_moved, total_assets_moved, notes
  ) VALUES (
    target_month, target_year, pembelian_count, penjualan_count,
    pembukuan_count, cicilan_count, fee_count, operational_count,
    biro_jasa_count, assets_count, notes
  );

  -- Build result
  result := json_build_object(
    'success', true,
    'month', target_month,
    'year', target_year,
    'records_moved', json_build_object(
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
$function$