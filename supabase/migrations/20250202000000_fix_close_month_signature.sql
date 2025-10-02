-- Fix close_month function signature to match application expectations
-- The application calls close_month with (target_month, target_year, notes)
-- But the current function expects (target_month, target_year, target_division)

-- Drop the existing function with the wrong signature
DROP FUNCTION IF EXISTS public.close_month(integer, integer, text);

-- Create the close_month function with the correct signature that matches the application
CREATE OR REPLACE FUNCTION public.close_month(target_month integer, target_year integer, notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    penjualan_count integer := 0;
    cicilan_count integer := 0;
    pembukuan_count integer := 0;
    biro_jasa_count integer := 0;
    assets_count integer := 0;
    result jsonb;
BEGIN
    -- Check if month is already closed
    IF EXISTS (
        SELECT 1 FROM monthly_closures 
        WHERE closure_month = target_month 
        AND closure_year = target_year
    ) THEN
        RAISE EXCEPTION 'Month % Year % is already closed', target_month, target_year;
    END IF;

    -- Move penjualans to history
    INSERT INTO penjualans_history (
        id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
        harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
        ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
        company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
        biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
        divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
        closed_month, closed_year
    )
    SELECT 
        id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
        harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
        ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
        company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
        biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
        COALESCE(divisi, 'unknown'), tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
        target_month, target_year
    FROM penjualans;
    
    GET DIAGNOSTICS penjualan_count = ROW_COUNT;

    -- Move cicilan to history
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
        sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at,
        closed_month, closed_year, divisi
    )
    SELECT 
        c.id, c.penjualan_id, c.batch_ke, c.tanggal_bayar, c.jenis_pembayaran, c.jumlah_bayar,
        c.sisa_bayar, c.keterangan, c.status, c.tujuan_pembayaran_id, c.created_at, c.updated_at,
        target_month, target_year, COALESCE(c.divisi, 'unknown')
    FROM cicilan c;
    
    GET DIAGNOSTICS cicilan_count = ROW_COUNT;

    -- Move pembukuan to history
    INSERT INTO pembukuan_history (
        id, tanggal, keterangan, debit, kredit, company_id, cabang_id,
        divisi, closed_month, closed_year
    )
    SELECT 
        id, tanggal, keterangan, debit, kredit, company_id, cabang_id,
        COALESCE(divisi, 'unknown'), target_month, target_year
    FROM pembukuan;
    
    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;

    -- Move biro_jasa to history
    INSERT INTO biro_jasa_history (
        id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
        tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id, 
        keterangan, created_at, updated_at, closed_month, closed_year, divisi
    )
    SELECT 
        id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
        tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, biaya_modal, keuntungan, total_bayar, status, 
        rekening_tujuan_id, keterangan, created_at, updated_at, target_month, target_year, 
        COALESCE(divisi, 'unknown')
    FROM biro_jasa;
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

    -- Move assets to history
    INSERT INTO assets_history (
        jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, created_at, updated_at, closed_month, closed_year, divisi
    )
    SELECT 
        jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, created_at, updated_at, target_month, target_year, 'unknown'
    FROM assets;
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;

    -- Delete from original tables
    DELETE FROM cicilan;
    DELETE FROM penjualans;
    DELETE FROM pembukuan;
    DELETE FROM biro_jasa;
    DELETE FROM assets;

    -- Record the closure
    INSERT INTO monthly_closures (closure_month, closure_year, closure_date, notes)
    VALUES (target_month, target_year, CURRENT_DATE, notes);

    -- Return summary
    result := jsonb_build_object(
        'success', true,
        'message', 'Month closed successfully',
        'month', target_month,
        'year', target_year,
        'records_moved', jsonb_build_object(
            'penjualans', penjualan_count,
            'cicilan', cicilan_count,
            'pembukuan', pembukuan_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count
        ),
        'notes', notes
    );

    RETURN result;
END;
$$;