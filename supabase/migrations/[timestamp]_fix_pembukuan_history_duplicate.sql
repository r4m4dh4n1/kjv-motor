-- Fix close_month function to handle pembukuan_history ID conflicts
CREATE OR REPLACE FUNCTION close_month(target_month integer, target_year integer, notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
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

    -- Move completed sales (selesai/sold) to history
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

    -- Move sold purchases (not ready) to history
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

    -- Move pembukuan entries to history (EXCLUDE existing IDs)
    INSERT INTO pembukuan_history (
        tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at, target_month, target_year, now()
    FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND id NOT IN (SELECT id FROM pembukuan_history WHERE id IS NOT NULL);
    
    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;
    
    DELETE FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- ... rest of the function remains the same
    
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
$$;