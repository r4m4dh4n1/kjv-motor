-- FINAL ULTIMATE FIX: Fix close_month function to properly handle divisi column for cicilan_history
-- This migration fixes the "column divisi does not exist" error by updating the latest close_month function
-- Timestamp: 20250905000000 (newer than 20250904013000) to ensure this runs last

DROP FUNCTION IF EXISTS close_month(integer, integer, text);

-- Recreate function with correct divisi handling for cicilan_history
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
    -- Check if month is already closed (FIXED: use closure_month and closure_year)
    IF EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = target_month AND closure_year = target_year) THEN
        RAISE EXCEPTION 'Month % % is already closed', target_month, target_year;
    END IF;

    -- STEP 1: Move COMPLETED cicilan from target month (FIXED: include divisi from penjualans)
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, 
        sisa_bayar, keterangan, status, created_at, updated_at,
        nominal_dana_1, nominal_dana_2, sumber_dana_1_id, sumber_dana_2_id,
        closed_month, closed_year, closed_at, divisi
    )
    SELECT 
        c.id, c.penjualan_id, c.batch_ke, c.tanggal_bayar, c.jenis_pembayaran,
        c.sisa_bayar, c.keterangan, c.status, c.created_at, c.updated_at,
        c.jumlah_bayar, 0, c.tujuan_pembayaran_id, NULL,
        target_month, target_year, now(), COALESCE(p.divisi, 'unknown')
    FROM cicilan c
    LEFT JOIN penjualans p ON c.penjualan_id = p.id
    WHERE EXTRACT(MONTH FROM c.tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM c.tanggal_bayar) = target_year
    AND c.status = 'completed';
    
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

    -- STEP 3: Move pembukuan entries that reference pembelian (FIXED)
    INSERT INTO pembukuan_history (
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        p.id, p.tanggal, p.divisi, p.keterangan, p.debit, p.kredit, p.saldo, p.cabang_id,
        p.company_id, p.pembelian_id, p.created_at, p.updated_at, target_month, target_year, now()
    FROM pembukuan p
    INNER JOIN pembelian pb ON p.pembelian_id = pb.id
    WHERE EXTRACT(MONTH FROM pb.tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM pb.tanggal_pembelian) = target_year
    AND pb.status = 'sold'
    AND p.id NOT IN (SELECT id FROM pembukuan_history WHERE id IS NOT NULL);
    
    DELETE FROM pembukuan 
    WHERE pembelian_id IN (
        SELECT id FROM pembelian 
        WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
        AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
        AND status = 'sold'
    );
    
    -- STEP 4: Move ALL penjualans that reference pembelian to be deleted (FIXED)
-- STEP 3.5: Move penjualans with status 'sold' from target month
INSERT INTO penjualans_history (
    id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
    harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
    ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
    company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
    biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
    divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
    created_at, updated_at, closed_month, closed_year, subsidi_ongkir, closed_at
)
SELECT 
    id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
    harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
    ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
    company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
    biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
    divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
    created_at, updated_at, target_month, target_year, subsidi_ongkir, now()
FROM penjualans 
WHERE EXTRACT(MONTH FROM tanggal) = target_month 
AND EXTRACT(YEAR FROM tanggal) = target_year
AND status = 'sold';

GET DIAGNOSTICS penjualan_count = ROW_COUNT;

DELETE FROM penjualans 
WHERE EXTRACT(MONTH FROM tanggal) = target_month 
AND EXTRACT(YEAR FROM tanggal) = target_year
AND status = 'sold';

-- STEP 5: Move pembelian with status 'sold' from target month
INSERT INTO pembelian_history (
    id, tanggal_pembelian, cabang_id, brand_id, jenis_id, tahun, kilometer,
    harga_beli, harga_jual, keuntungan, company_id, divisi, tt, warna, plat,
    status, created_at, updated_at, closed_month, closed_year, closed_at
)
SELECT 
    id, tanggal_pembelian, cabang_id, brand_id, jenis_id, tahun, kilometer,
    harga_beli, harga_jual, keuntungan, company_id, divisi, tt, warna, plat,
    status, created_at, updated_at, target_month, target_year, now()
FROM pembelian 
WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
AND status = 'sold';

GET DIAGNOSTICS pembelian_count = ROW_COUNT;

DELETE FROM pembelian 
WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
AND status = 'sold';

-- STEP 6: Move operational from target month
INSERT INTO operational_history (
    id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
    company_id, created_at, updated_at, closed_month, closed_year, closed_at
)
SELECT 
    id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
    company_id, created_at, updated_at, target_month, target_year, now()
FROM operational 
WHERE EXTRACT(MONTH FROM tanggal) = target_month 
AND EXTRACT(YEAR FROM tanggal) = target_year;

GET DIAGNOSTICS operational_count = ROW_COUNT;

DELETE FROM operational 
WHERE EXTRACT(MONTH FROM tanggal) = target_month 
AND EXTRACT(YEAR FROM tanggal) = target_year;

-- STEP 7: Move biro_jasa from target month (FIXED: use 'unknown' for divisi)
INSERT INTO biro_jasa_history (
    id, company_id, tanggal, jenis_motor_id, brand_id, plat_nomor, 
    biaya_biro_jasa, keuntungan, keterangan, created_at, updated_at,
    closed_month, closed_year, closed_at, divisi
)
SELECT 
    id, company_id, tanggal, jenis_motor_id, brand_id, plat_nomor,
    biaya_biro_jasa, keuntungan, keterangan, created_at, updated_at,
    target_month, target_year, now(), 'unknown'
FROM biro_jasa 
WHERE EXTRACT(MONTH FROM tanggal) = target_month 
AND EXTRACT(YEAR FROM tanggal) = target_year;

GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

DELETE FROM biro_jasa 
WHERE EXTRACT(MONTH FROM tanggal) = target_month 
AND EXTRACT(YEAR FROM tanggal) = target_year;

-- STEP 8: Move assets from target month (FIXED: use 'unknown' for divisi)
INSERT INTO assets_history (
    id, jenis_asset, tanggal_perolehan, harga_asset, keterangan,
    created_at, updated_at, closed_month, closed_year, closed_at, divisi
)
SELECT 
    id, jenis_asset, tanggal_perolehan, harga_asset, keterangan,
    created_at, updated_at, target_month, target_year, now(), 'unknown'
FROM assets 
WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;

GET DIAGNOSTICS assets_count = ROW_COUNT;

DELETE FROM assets 
WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;

-- STEP 9: Move pencatatan_asset from target month
INSERT INTO pencatatan_asset_history (
    id, jenis_asset, tanggal_perolehan, harga_asset, keterangan, divisi,
    created_at, updated_at, closed_month, closed_year, closed_at
)
SELECT 
    id, jenis_asset, tanggal_perolehan, harga_asset, keterangan, divisi,
    created_at, updated_at, target_month, target_year, now()
FROM pencatatan_asset 
WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;

GET DIAGNOSTICS pencatatan_asset_count = ROW_COUNT;

DELETE FROM pencatatan_asset 
WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;

-- STEP 10: Record the closure (FIXED: use closure_month and closure_year)
INSERT INTO monthly_closures (closure_month, closure_year, notes, closed_at)
VALUES (target_month, target_year, notes, now());

-- Return summary
RETURN json_build_object(
    'status', 'success',
    'message', 'Month closed successfully',
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