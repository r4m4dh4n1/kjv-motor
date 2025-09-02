-- Create or replace close_month function to ensure only company modal, ready purchases, and booked sales carry forward
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

    -- Move pembukuan entries to history
    INSERT INTO pembukuan_history 
    SELECT *, target_month, target_year, now()
    FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;
    
    DELETE FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- Move cicilan to history
    INSERT INTO cicilan_history 
    SELECT *, target_month, target_year, now()
    FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;
    
    GET DIAGNOSTICS cicilan_count = ROW_COUNT;
    
    DELETE FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;

    -- Move fee_penjualan to history
    INSERT INTO fee_penjualan_history 
    SELECT *, target_month, target_year, now()
    FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year;
    
    GET DIAGNOSTICS fee_count = ROW_COUNT;
    
    DELETE FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year;

    -- Move operational to history
    INSERT INTO operational_history 
    SELECT *, target_month, target_year, now()
    FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS operational_count = ROW_COUNT;
    
    DELETE FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- Move completed biro_jasa to history
    INSERT INTO biro_jasa_history 
    SELECT *, target_month, target_year, now()
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'Selesai';
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;
    
    DELETE FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'Selesai';

    -- Move sold assets to history
    INSERT INTO assets_history 
    SELECT *, target_month, target_year, now()
    FROM assets 
    WHERE EXTRACT(MONTH FROM COALESCE(tanggal_jual, tanggal_perolehan)) = target_month 
    AND EXTRACT(YEAR FROM COALESCE(tanggal_jual, tanggal_perolehan)) = target_year
    AND status = 'terjual';
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;
    
    DELETE FROM assets 
    WHERE EXTRACT(MONTH FROM COALESCE(tanggal_jual, tanggal_perolehan)) = target_month 
    AND EXTRACT(YEAR FROM COALESCE(tanggal_jual, tanggal_perolehan)) = target_year
    AND status = 'terjual';

    -- Move pencatatan_asset to history
    INSERT INTO pencatatan_asset_history 
    SELECT *, target_month, target_year, now()
    FROM pencatatan_asset 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS pencatatan_asset_count = ROW_COUNT;
    
    DELETE FROM pencatatan_asset 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- Record the closure
    INSERT INTO monthly_closures (
        closure_month, closure_year, closure_date, notes,
        total_penjualan_moved, total_pembelian_moved, total_pembukuan_moved,
        total_cicilan_moved, total_fee_moved, total_operational_moved,
        total_biro_jasa_moved, total_assets_moved, created_by
    ) VALUES (
        target_month, target_year, now(), notes,
        penjualan_count, pembelian_count, pembukuan_count,
        cicilan_count, fee_count, operational_count,
        biro_jasa_count, assets_count, auth.email()
    );

    records_moved := jsonb_build_object(
        'penjualan', penjualan_count,
        'pembelian', pembelian_count,
        'pembukuan', pembukuan_count,
        'cicilan', cicilan_count,
        'fee_penjualan', fee_count,
        'operational', operational_count,
        'biro_jasa', biro_jasa_count,
        'assets', assets_count,
        'pencatatan_asset', pencatatan_asset_count
    );

    result := jsonb_build_object(
        'success', true,
        'month', target_month,
        'year', target_year,
        'records_moved', records_moved,
        'message', 'Month closed successfully. Company modal, ready purchases, and booked sales remain active.'
    );

    RETURN result;
END;
$$;