-- Fix close_month function with proper column mapping for all tables
CREATE OR REPLACE FUNCTION public.close_month(target_month integer, target_year integer, notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
    result jsonb;
    records_moved jsonb;
    penjualan_count integer := 0;
    pembelian_count integer := 0;
    pembukuan_count integer := 0;
    cicilan_count integer := 0;
    fee_count integer := 0;
    operational_count integer := 0;
    biro_jasa_count integer := 0;
    assets_count integer := 0;
    pencatatan_asset_count integer := 0;
BEGIN
    -- Check if closure already exists
    IF EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = target_month AND closure_year = target_year) THEN
        RAISE EXCEPTION 'Closure for month % year % already exists', target_month, target_year;
    END IF;

    -- STEP 1: Move cicilan first (they reference penjualans) - ONLY completed cicilan
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, 
        jumlah_bayar, sisa_bayar, keterangan, status, tujuan_pembayaran_id,
        created_at, updated_at, closed_month, closed_year, closed_at,
        sumber_dana_1_id, nominal_dana_1, sumber_dana_2_id, nominal_dana_2
    )
    SELECT 
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran,
        jumlah_bayar, sisa_bayar, keterangan, status, tujuan_pembayaran_id,
        created_at, updated_at, target_month, target_year, now(),
        tujuan_pembayaran_id, jumlah_bayar, NULL, 0
    FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year
    AND status = 'completed';
    
    GET DIAGNOSTICS cicilan_count = ROW_COUNT;
    
    DELETE FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year
    AND status = 'completed';

    -- STEP 2: Move fee_penjualan with proper column mapping
    INSERT INTO fee_penjualan_history (
        id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
        created_at, updated_at, target_month, target_year, now()
    FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year;
    
    GET DIAGNOSTICS fee_count = ROW_COUNT;
    
    DELETE FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year;

    -- STEP 3: Move pembukuan entries that reference pembelian
    INSERT INTO pembukuan_history (
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at, target_month, target_year, now()
    FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND pembelian_id IS NOT NULL
    AND id NOT IN (SELECT id FROM pembukuan_history WHERE id IS NOT NULL);
    
    DELETE FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND pembelian_id IS NOT NULL;

    -- STEP 4: Move COMPLETED penjualans from target month
    INSERT INTO penjualans_history 
    SELECT *, target_month, target_year, now()
    FROM penjualans 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'selesai';
    
    GET DIAGNOSTICS penjualan_count = ROW_COUNT;
    
    DELETE FROM penjualans 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'selesai';

    -- STEP 5: Move SOLD pembelian (not ready status)
    INSERT INTO pembelian_history 
    SELECT *, target_month, target_year, now()
    FROM pembelian 
    WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND status != 'ready';
    
    GET DIAGNOSTICS pembelian_count = ROW_COUNT;
    
    DELETE FROM pembelian 
    WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND status != 'ready';

    -- STEP 6: Move remaining pembukuan entries (those without pembelian_id)
    INSERT INTO pembukuan_history (
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at, target_month, target_year, now()
    FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND pembelian_id IS NULL
    AND id NOT IN (SELECT id FROM pembukuan_history WHERE id IS NOT NULL);
    
    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;
    
    DELETE FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND pembelian_id IS NULL;

    -- STEP 7: Move operational
    INSERT INTO operational_history 
    SELECT *, target_month, target_year, now()
    FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS operational_count = ROW_COUNT;
    
    DELETE FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- STEP 8: Move biro_jasa with proper column mapping
    INSERT INTO biro_jasa_history (
        id, tanggal, jenis_motor, brand_id, jenis_motor_id, warna, plat_nomor, tahun,
        jenis_pengurusan, keterangan, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, rekening_tujuan_id, status, created_at, updated_at,
        biaya_modal, keuntungan, total_bayar
    )
    SELECT 
        id, tanggal, jenis_motor, 
        -- Map brand_name to brand_id if needed, otherwise use NULL
        NULL as brand_id, 
        NULL as jenis_motor_id,  -- No jenis_motor_id in current biro_jasa
        warna, plat_nomor, tahun,
        jenis_pengurusan, keterangan, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, rekening_tujuan_id, status, created_at, updated_at,
        biaya_modal, keuntungan, total_bayar
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;
    
    DELETE FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- STEP 9: Move assets
    INSERT INTO assets_history 
    SELECT *, target_month, target_year, now()
    FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;
    
    DELETE FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;

    -- STEP 10: Move pencatatan_asset if exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pencatatan_asset') THEN
        INSERT INTO pencatatan_asset_history 
        SELECT *, target_month, target_year, now()
        FROM pencatatan_asset 
        WHERE EXTRACT(MONTH FROM tanggal) = target_month 
        AND EXTRACT(YEAR FROM tanggal) = target_year;
        
        GET DIAGNOSTICS pencatatan_asset_count = ROW_COUNT;
        
        DELETE FROM pencatatan_asset 
        WHERE EXTRACT(MONTH FROM tanggal) = target_month 
        AND EXTRACT(YEAR FROM tanggal) = target_year;
    END IF;
    
    -- Create closure record
    INSERT INTO monthly_closures (closure_month, closure_year, notes, created_at)
    VALUES (target_month, target_year, notes, now());
    
    -- Return summary
    result := jsonb_build_object(
        'success', true,
        'message', 'Month closed successfully',
        'records_moved', jsonb_build_object(
            'penjualan', penjualan_count,
            'pembelian', pembelian_count,
            'pembukuan', pembukuan_count,
            'cicilan', cicilan_count,
            'fee_penjualan', fee_count,
            'operational', operational_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count,
            'pencatatan_asset', pencatatan_asset_count
        )
    );
    
    RETURN result;
END;
$function$;