-- Fix close_month function to use correct column names for monthly_closures table
-- The table has closure_date, not created_at

DROP FUNCTION IF EXISTS close_month(integer, integer, text);

CREATE OR REPLACE FUNCTION close_month(target_month INTEGER, target_year INTEGER, notes TEXT DEFAULT '')
RETURNS JSON AS $$
DECLARE
    cicilan_count INTEGER := 0;
    fee_count INTEGER := 0;
    pembukuan_count INTEGER := 0;
    penjualan_count INTEGER := 0;
    pembelian_count INTEGER := 0;
    operational_count INTEGER := 0;
    biro_jasa_count INTEGER := 0;
    assets_count INTEGER := 0;
    pencatatan_asset_count INTEGER := 0;
BEGIN
    -- Check if month is already closed
    IF EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = target_month AND closure_year = target_year) THEN
        RAISE EXCEPTION 'Month % % is already closed', target_month, target_year;
    END IF;

    -- STEP 1: Move COMPLETED cicilan from target month
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, 
        sisa_bayar, keterangan, status, created_at, updated_at,
        nominal_dana_1, nominal_dana_2, sumber_dana_1_id, sumber_dana_2_id,
        closed_month, closed_year, closed_at
    )
    SELECT 
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran,
        sisa_bayar, keterangan, status, created_at, updated_at,
        jumlah_bayar, 0, tujuan_pembayaran_id, NULL,
        target_month, target_year, now()
    FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year
    AND status = 'completed';
    
    GET DIAGNOSTICS cicilan_count = ROW_COUNT;
    
    DELETE FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year
    AND status = 'completed';

    -- STEP 2: Move fee_penjualan from target month
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

    -- STEP 3: Move pembukuan entries related to sold pembelian from target month
    INSERT INTO pembukuan_history (
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah, 
        perusahaan_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT DISTINCT
        pb.id, pb.tanggal, pb.jenis_transaksi, pb.kategori, pb.deskripsi, pb.jumlah,
        pb.perusahaan_id, pb.created_at, pb.updated_at, target_month, target_year, now()
    FROM pembukuan pb
    INNER JOIN pembelian pm ON pb.deskripsi LIKE '%' || pm.no_rangka || '%'
    WHERE pm.status = 'sold'
    AND EXTRACT(MONTH FROM pm.tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM pm.tanggal_jual) = target_year;
    
    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;
    
    DELETE FROM pembukuan 
    WHERE id IN (
        SELECT DISTINCT pb.id
        FROM pembukuan pb
        INNER JOIN pembelian pm ON pb.deskripsi LIKE '%' || pm.no_rangka || '%'
        WHERE pm.status = 'sold'
        AND EXTRACT(MONTH FROM pm.tanggal_jual) = target_month 
        AND EXTRACT(YEAR FROM pm.tanggal_jual) = target_year
    );

    -- STEP 4: Move penjualans with status 'sold' from target month
    INSERT INTO penjualans_history (
        id, no_rangka, nama_pembeli, alamat_pembeli, no_hp_pembeli, 
        harga_jual, tanggal_jual, metode_pembayaran, status, divisi,
        perusahaan_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, no_rangka, nama_pembeli, alamat_pembeli, no_hp_pembeli,
        harga_jual, tanggal_jual, metode_pembayaran, status, divisi,
        perusahaan_id, created_at, updated_at, target_month, target_year, now()
    FROM penjualans 
    WHERE status = 'sold'
    AND EXTRACT(MONTH FROM tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM tanggal_jual) = target_year;
    
    GET DIAGNOSTICS penjualan_count = ROW_COUNT;
    
    DELETE FROM penjualans 
    WHERE status = 'sold'
    AND EXTRACT(MONTH FROM tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM tanggal_jual) = target_year;

    -- STEP 5: Move pembelian with status 'sold' from target month
    INSERT INTO pembelian_history (
        id, no_rangka, nama_motor, warna, tahun, harga_beli, tanggal_beli,
        harga_jual, tanggal_jual, keuntungan, status, divisi, perusahaan_id,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, no_rangka, nama_motor, warna, tahun, harga_beli, tanggal_beli,
        harga_jual, tanggal_jual, keuntungan, status, divisi, perusahaan_id,
        created_at, updated_at, target_month, target_year, now()
    FROM pembelian 
    WHERE status = 'sold'
    AND EXTRACT(MONTH FROM tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM tanggal_jual) = target_year;
    
    GET DIAGNOSTICS pembelian_count = ROW_COUNT;
    
    DELETE FROM pembelian 
    WHERE status = 'sold'
    AND EXTRACT(MONTH FROM tanggal_jual) = target_month 
    AND EXTRACT(YEAR FROM tanggal_jual) = target_year;

    -- STEP 6: Move remaining pembukuan entries from target month
    INSERT INTO pembukuan_history (
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah, 
        perusahaan_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah,
        perusahaan_id, created_at, updated_at, target_month, target_year, now()
    FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    -- Update pembukuan_count to include these additional entries
    GET DIAGNOSTICS pembukuan_count = pembukuan_count + ROW_COUNT;
    
    DELETE FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- STEP 7: Move operational records from target month
    INSERT INTO operational_history (
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah, 
        perusahaan_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah,
        perusahaan_id, created_at, updated_at, target_month, target_year, now()
    FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS operational_count = ROW_COUNT;
    
    DELETE FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- STEP 8: Move biro_jasa records from target month
    INSERT INTO biro_jasa_history (
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah, 
        perusahaan_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah,
        perusahaan_id, created_at, updated_at, target_month, target_year, now()
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;
    
    DELETE FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- STEP 9: Move assets records from target month
    INSERT INTO assets_history (
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah, 
        perusahaan_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah,
        perusahaan_id, created_at, updated_at, target_month, target_year, now()
    FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;
    
    DELETE FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- STEP 10: Move pencatatan_asset records from target month
    INSERT INTO pencatatan_asset_history (
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah, 
        perusahaan_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, jenis_transaksi, kategori, deskripsi, jumlah,
        perusahaan_id, created_at, updated_at, target_month, target_year, now()
    FROM pencatatan_asset 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;
    
    GET DIAGNOSTICS pencatatan_asset_count = ROW_COUNT;
    
    DELETE FROM pencatatan_asset 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    -- STEP 11: Insert closure record (FIXED: use closure_date instead of created_at)
    INSERT INTO monthly_closures ( 
        closure_month, 
        closure_year, 
        notes, 
        closure_date, 
        total_cicilan_moved, 
        total_fee_moved, 
        total_pembukuan_moved, 
        total_penjualan_moved, 
        total_pembelian_moved, 
        total_operational_moved, 
        total_biro_jasa_moved, 
        total_assets_moved 
    ) 
    VALUES ( 
        target_month, 
        target_year, 
        notes, 
        NOW(), 
        cicilan_count, 
        fee_count, 
        pembukuan_count, 
        penjualan_count, 
        pembelian_count, 
        operational_count, 
        biro_jasa_count, 
        (assets_count + pencatatan_asset_count) 
    );

    -- Return summary
    RETURN json_build_object(
        'success', true,
        'month', target_month,
        'year', target_year,
        'records_moved', json_build_object(
            'cicilan', cicilan_count,
            'fee_penjualan', fee_count,
            'pembukuan', pembukuan_count,
            'penjualans', penjualan_count,
            'pembelian', pembelian_count,
            'operational', operational_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count,
            'pencatatan_asset', pencatatan_asset_count
        )
    );
END;
$$ LANGUAGE plpgsql;