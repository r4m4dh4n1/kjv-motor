-- Fix close_month function to handle foreign key constraints properly
-- Also fix column mapping and RLS policies

-- First, add missing INSERT policies for history tables
CREATE POLICY "Allow authenticated users to insert cicilan_history" ON cicilan_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert fee_penjualan_history" ON fee_penjualan_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert penjualans_history" ON penjualans_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert pembelian_history" ON pembelian_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert pembukuan_history" ON pembukuan_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert operational_history" ON operational_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert biro_jasa_history" ON biro_jasa_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert assets_history" ON assets_history
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert pencatatan_asset_history" ON pencatatan_asset_history
    FOR INSERT TO authenticated WITH CHECK (true);

-- Add policies for monthly_closures table
CREATE POLICY "Allow authenticated users to insert monthly_closures" ON monthly_closures
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update monthly_closures" ON monthly_closures
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete monthly_closures" ON monthly_closures
    FOR DELETE TO authenticated USING (true);

-- Create the fixed close_month function
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

    -- STEP 1: Move cicilan first (they reference penjualans)
    -- Fix column mapping for cicilan_history - use correct column mapping
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, 
        sisa_bayar, keterangan, status, tujuan_pembayaran_id,
        nominal_dana_1, nominal_dana_2, sumber_dana_1_id, sumber_dana_2_id,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran,
        sisa_bayar, keterangan, status, tujuan_pembayaran_id,
        jumlah_bayar, 0, tujuan_pembayaran_id, NULL,
        created_at, updated_at, target_month, target_year, now()
    FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;
    
    GET DIAGNOSTICS cicilan_count = ROW_COUNT;
    
    DELETE FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;

    -- STEP 2: Move fee_penjualan (they reference penjualans)
    INSERT INTO fee_penjualan_history 
    SELECT *, target_month, target_year, now()
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

    -- STEP 4: Move ALL penjualans that should be closed (including those referencing pembelian to be moved)
    INSERT INTO penjualans_history 
    SELECT *, target_month, target_year, now()
    FROM penjualans 
    WHERE (
        -- Completed sales from target month
        (EXTRACT(MONTH FROM tanggal) = target_month 
         AND EXTRACT(YEAR FROM tanggal) = target_year
         AND status = 'selesai')
        OR
        -- Sales that reference pembelian from target month (regardless of penjualan date)
        pembelian_id IN (
            SELECT id FROM pembelian 
            WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
            AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
            AND status != 'ready'
        )
    );
    
    GET DIAGNOSTICS penjualan_count = ROW_COUNT;
    
    DELETE FROM penjualans 
    WHERE (
        (EXTRACT(MONTH FROM tanggal) = target_month 
         AND EXTRACT(YEAR FROM tanggal) = target_year
         AND status = 'selesai')
        OR
        pembelian_id IN (
            SELECT id FROM pembelian 
            WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
            AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
            AND status != 'ready'
        )
    );

    -- STEP 5: Now safe to move pembelian (no more references)
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

    -- STEP 7: Move other tables (operational, biro_jasa, assets)
    INSERT INTO operational_history 
    SELECT *, target_month, target_year, now()
    FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS operational_count = ROW_COUNT;
    
    DELETE FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    INSERT INTO biro_jasa_history 
    SELECT *, target_month, target_year, now()
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;
    
    DELETE FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    INSERT INTO assets_history 
    SELECT *, target_month, target_year, now()
    FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;
    
    DELETE FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;

    -- STEP 8: Move pencatatan_asset if exists
    INSERT INTO pencatatan_asset_history 
    SELECT *, target_month, target_year, now()
    FROM pencatatan_asset 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS pencatatan_asset_count = ROW_COUNT;
    
    DELETE FROM pencatatan_asset 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
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