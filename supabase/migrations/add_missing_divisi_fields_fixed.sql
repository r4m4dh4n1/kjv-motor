-- Add missing divisi column to history tables and fix close_month function
-- This script fixes the "column divisi does not exist" error

-- Add divisi column to cicilan_history table
ALTER TABLE cicilan_history ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

-- Add divisi column to biro_jasa_history table  
ALTER TABLE biro_jasa_history ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

-- Add divisi column to assets_history table
ALTER TABLE assets_history ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

-- Drop the existing close_month function to avoid parameter name conflicts
DROP FUNCTION IF EXISTS close_month(INTEGER, INTEGER, TEXT);

-- Create the corrected close_month function
CREATE OR REPLACE FUNCTION close_month(p_month INTEGER, p_year INTEGER, p_notes TEXT DEFAULT '')
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
    temp_count INTEGER := 0;
BEGIN
    -- Validate input parameters
    IF p_month < 1 OR p_month > 12 THEN
        RAISE EXCEPTION 'Invalid month: %. Month must be between 1 and 12.', p_month;
    END IF;
    
    IF p_year < 2000 OR p_year > 2100 THEN
        RAISE EXCEPTION 'Invalid year: %. Year must be between 2000 and 2100.', p_year;
    END IF;

    -- Check if month is already closed
    IF EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = p_month AND closure_year = p_year) THEN
        RAISE EXCEPTION 'Month % of year % has already been closed.', p_month, p_year;
    END IF;

    -- Move cicilan records (fixed to handle missing divisi column)
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran,
        jumlah_bayar, sisa_bayar, keterangan, status, tujuan_pembayaran_id,
        created_at, updated_at, closed_month, closed_year, closed_at, divisi
    )
    SELECT 
        c.id, c.penjualan_id, c.batch_ke, c.tanggal_bayar, c.jenis_pembayaran,
        c.jumlah_bayar, c.sisa_bayar, c.keterangan, c.status, c.tujuan_pembayaran_id,
        c.created_at, c.updated_at, p_month, p_year, NOW(), 
        COALESCE(p.divisi, 'unknown')
    FROM cicilan c
    LEFT JOIN penjualans p ON c.penjualan_id = p.id
    WHERE EXTRACT(MONTH FROM c.tanggal_bayar) = p_month 
    AND EXTRACT(YEAR FROM c.tanggal_bayar) = p_year;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    cicilan_count := cicilan_count + temp_count;

    DELETE FROM cicilan 
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = p_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = p_year;

    -- Move fee_penjualan records
    INSERT INTO fee_penjualan_history (
        id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
        created_at, updated_at, p_month, p_year, NOW()
    FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = p_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = p_year;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    fee_count := fee_count + temp_count;

    DELETE FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = p_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = p_year;

    -- Move pembukuan records
    INSERT INTO pembukuan_history (
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id, company_id, pembelian_id,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id, company_id, pembelian_id,
        created_at, updated_at, p_month, p_year, NOW()
    FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = p_month 
    AND EXTRACT(YEAR FROM tanggal) = p_year;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    pembukuan_count := pembukuan_count + temp_count;

    DELETE FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = p_month 
    AND EXTRACT(YEAR FROM tanggal) = p_year;

    -- Move penjualans records
    INSERT INTO penjualans_history (
        id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
        harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
        ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
        company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
        biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
        divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
        harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
        ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
        company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
        biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
        divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
        created_at, updated_at, p_month, p_year, NOW()
    FROM penjualans 
    WHERE EXTRACT(MONTH FROM tanggal) = p_month 
    AND EXTRACT(YEAR FROM tanggal) = p_year;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    penjualan_count := penjualan_count + temp_count;

    DELETE FROM penjualans 
    WHERE EXTRACT(MONTH FROM tanggal) = p_month 
    AND EXTRACT(YEAR FROM tanggal) = p_year;

    -- Move pembelian records
    INSERT INTO pembelian_history (
        id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id,
        jenis_motor_id, tahun, warna, kilometer, plat_nomor, tanggal_pajak,
        harga_beli, harga_final, sumber_dana_1_id, nominal_dana_1,
        sumber_dana_2_id, nominal_dana_2, keterangan, status,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal_pembelian, divisi, cabang_id, jenis_pembelian, brand_id,
        jenis_motor_id, tahun, warna, kilometer, plat_nomor, tanggal_pajak,
        harga_beli, harga_final, sumber_dana_1_id, nominal_dana_1,
        sumber_dana_2_id, nominal_dana_2, keterangan, status,
        created_at, updated_at, p_month, p_year, NOW()
    FROM pembelian 
    WHERE EXTRACT(MONTH FROM tanggal_pembelian) = p_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = p_year;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    pembelian_count := pembelian_count + temp_count;

    DELETE FROM pembelian 
    WHERE EXTRACT(MONTH FROM tanggal_pembelian) = p_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = p_year;

    -- Move operational records
    INSERT INTO operational_history (
        id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, divisi, kategori, deskripsi, nominal, cabang_id, company_id,
        created_at, updated_at, p_month, p_year, NOW()
    FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = p_month 
    AND EXTRACT(YEAR FROM tanggal) = p_year;
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    operational_count := operational_count + temp_count;

    DELETE FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = p_month 
    AND EXTRACT(YEAR FROM tanggal) = p_year;

    -- Move biro_jasa records (with correct schema)
    INSERT INTO biro_jasa_history (
        id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
        tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
        keterangan, created_at, updated_at, closed_month, closed_year, closed_at, divisi
    )
    SELECT 
        id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
        tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
        keterangan, created_at, updated_at, p_month, p_year, NOW(), 'unknown'
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = p_month 
    AND EXTRACT(YEAR FROM tanggal) = p_year
    AND status = 'Selesai';
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    biro_jasa_count := biro_jasa_count + temp_count;

    DELETE FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = p_month 
    AND EXTRACT(YEAR FROM tanggal) = p_year
    AND status = 'Selesai';

    -- Move assets records
    INSERT INTO assets_history (
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual,
        harga_jual, keuntungan, status, created_at, updated_at,
        closed_month, closed_year, closed_at, divisi
    )
    SELECT 
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual,
        harga_jual, keuntungan, status, created_at, updated_at,
        p_month, p_year, NOW(), 'unknown'
    FROM assets 
    WHERE (tanggal_jual IS NOT NULL AND EXTRACT(MONTH FROM tanggal_jual) = p_month 
           AND EXTRACT(YEAR FROM tanggal_jual) = p_year)
    OR (tanggal_jual IS NULL AND EXTRACT(MONTH FROM tanggal_perolehan) = p_month 
        AND EXTRACT(YEAR FROM tanggal_perolehan) = p_year);
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    assets_count := assets_count + temp_count;

    DELETE FROM assets 
    WHERE (tanggal_jual IS NOT NULL AND EXTRACT(MONTH FROM tanggal_jual) = p_month 
           AND EXTRACT(YEAR FROM tanggal_jual) = p_year)
    OR (tanggal_jual IS NULL AND EXTRACT(MONTH FROM tanggal_perolehan) = p_month 
        AND EXTRACT(YEAR FROM tanggal_perolehan) = p_year);

    -- Insert closure record
    INSERT INTO monthly_closures (
        closure_month, closure_year, notes, closure_date,
        total_cicilan_moved, total_fee_moved, total_pembukuan_moved,
        total_penjualan_moved, total_pembelian_moved, total_operational_moved,
        total_biro_jasa_moved, total_assets_moved
    ) VALUES (
        p_month, p_year, p_notes, NOW(),
        cicilan_count, fee_count, pembukuan_count,
        penjualan_count, pembelian_count, operational_count,
        biro_jasa_count, assets_count
    );

    -- Return summary
    RETURN json_build_object(
        'success', true,
        'month', p_month,
        'year', p_year,
        'records_moved', json_build_object(
            'cicilan', cicilan_count,
            'fee_penjualan', fee_count,
            'pembukuan', pembukuan_count,
            'penjualans', penjualan_count,
            'pembelian', pembelian_count,
            'operational', operational_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count
        ),
        'total_records', cicilan_count + fee_count + pembukuan_count + 
                        penjualan_count + pembelian_count + operational_count + 
                        biro_jasa_count + assets_count,
        'notes', p_notes
    );
END;
$$ LANGUAGE plpgsql;