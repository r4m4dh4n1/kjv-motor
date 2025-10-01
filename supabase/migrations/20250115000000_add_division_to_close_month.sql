-- Drop existing functions first
DROP FUNCTION IF EXISTS close_month(integer, integer, text);
DROP FUNCTION IF EXISTS restore_month(integer, integer);

-- Recreate close_month function with division parameter
CREATE OR REPLACE FUNCTION close_month(target_month INTEGER, target_year INTEGER, target_division TEXT, notes TEXT DEFAULT '')
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
    -- Check if month is already closed for this division
    IF EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = target_month AND closure_year = target_year AND divisi = target_division) THEN
        RAISE EXCEPTION 'Month % % for division % is already closed', target_month, target_year, target_division;
    END IF;

    -- STEP 1: Move COMPLETED cicilan from target month and division
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, 
        sisa_bayar, keterangan, status, created_at, updated_at,
        nominal_dana_1, nominal_dana_2, sumber_dana_1_id, sumber_dana_2_id,
        closed_month, closed_year, closed_at
    )
    SELECT 
        c.id, c.penjualan_id, c.batch_ke, c.tanggal_bayar, c.jenis_pembayaran,
        c.sisa_bayar, c.keterangan, c.status, c.created_at, c.updated_at,
        c.jumlah_bayar, 0, c.tujuan_pembayaran_id, NULL,
        target_month, target_year, now()
    FROM cicilan c
    INNER JOIN penjualans p ON c.penjualan_id = p.id
    WHERE EXTRACT(MONTH FROM c.tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM c.tanggal_bayar) = target_year
    AND c.status = 'completed'
    AND p.divisi = target_division;
    
    GET DIAGNOSTICS cicilan_count = ROW_COUNT;
    
    DELETE FROM cicilan 
    WHERE id IN (
        SELECT c.id FROM cicilan c
        INNER JOIN penjualans p ON c.penjualan_id = p.id
        WHERE EXTRACT(MONTH FROM c.tanggal_bayar) = target_month 
        AND EXTRACT(YEAR FROM c.tanggal_bayar) = target_year
        AND c.status = 'completed'
        AND p.divisi = target_division
    );

    -- STEP 2: Move fee_penjualan from target month and division
    INSERT INTO fee_penjualan_history (
        id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
        created_at, updated_at, target_month, target_year, now()
    FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS fee_count = ROW_COUNT;
    
    DELETE FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year
    AND divisi = target_division;

    -- STEP 3: Move pembukuan entries that reference pembelian from target division
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
    AND pb.divisi = target_division
    AND p.id NOT IN (SELECT id FROM pembukuan_history WHERE id IS NOT NULL);
    
    DELETE FROM pembukuan 
    WHERE pembelian_id IN (
        SELECT id FROM pembelian 
        WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
        AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
        AND status = 'sold'
        AND divisi = target_division
    );
    
    -- STEP 4: Move penjualans with status 'sold' from target month and division
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
    AND status = 'sold'
    AND divisi = target_division;
    
    GET DIAGNOSTICS penjualan_count = ROW_COUNT;
    
    DELETE FROM penjualans 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND status = 'sold'
    AND divisi = target_division;

    -- STEP 5: Move pembelian with status 'sold' from target month and division
    INSERT INTO pembelian_history (
        id, tanggal_pembelian, cabang_id, brand_id, jenis_id, tahun, kilometer,
        pajak, harga_beli, company_id, divisi, tt, warna, plat, status,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal_pembelian, cabang_id, brand_id, jenis_id, tahun, kilometer,
        pajak, harga_beli, company_id, divisi, tt, warna, plat, status,
        created_at, updated_at, target_month, target_year, now()
    FROM pembelian 
    WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND status = 'sold'
    AND divisi = target_division;
    
    GET DIAGNOSTICS pembelian_count = ROW_COUNT;
    
    DELETE FROM pembelian 
    WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND status = 'sold'
    AND divisi = target_division;

    -- STEP 6: Move operational from target month and division
    INSERT INTO operational_history (
        id, tanggal, divisi, kategori, keterangan, debit, kredit, saldo,
        cabang_id, company_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, divisi, kategori, keterangan, debit, kredit, saldo,
        cabang_id, company_id, created_at, updated_at, target_month, target_year, now()
    FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS operational_count = ROW_COUNT;
    
    DELETE FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division;

    -- STEP 7: Move biro_jasa from target month and division
    INSERT INTO biro_jasa_history (
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, created_at, updated_at, target_month, target_year, now()
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;
    
    DELETE FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division;

    -- STEP 8: Move assets from target month and division
    INSERT INTO assets_history (
        id, tanggal_perolehan, divisi, nama_asset, kategori, harga_perolehan,
        umur_ekonomis, nilai_residu, metode_depresiasi, cabang_id, company_id,
        created_at, updated_at, closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal_perolehan, divisi, nama_asset, kategori, harga_perolehan,
        umur_ekonomis, nilai_residu, metode_depresiasi, cabang_id, company_id,
        created_at, updated_at, target_month, target_year, now()
    FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;
    
    DELETE FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year
    AND divisi = target_division;

    -- Record the closure
    INSERT INTO monthly_closures (closure_month, closure_year, divisi, notes, closed_at)
    VALUES (target_month, target_year, target_division, notes, now());

    -- Return summary
    RETURN json_build_object(
        'success', true,
        'message', 'Month closed successfully for division ' || target_division,
        'month', target_month,
        'year', target_year,
        'division', target_division,
        'records_moved', json_build_object(
            'cicilan', cicilan_count,
            'fee_penjualan', fee_count,
            'penjualans', penjualan_count,
            'pembelian', pembelian_count,
            'operational', operational_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Recreate restore_month function with division parameter
CREATE OR REPLACE FUNCTION restore_month(target_month INTEGER, target_year INTEGER, target_division TEXT)
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
BEGIN
    -- Check if month is actually closed for this division
    IF NOT EXISTS (SELECT 1 FROM monthly_closures WHERE closure_month = target_month AND closure_year = target_year AND divisi = target_division) THEN
        RAISE EXCEPTION 'Month % % for division % is not closed', target_month, target_year, target_division;
    END IF;

    -- Restore cicilan
    INSERT INTO cicilan (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran,
        sisa_bayar, keterangan, status, created_at, updated_at,
        jumlah_bayar, tujuan_pembayaran_id
    )
    SELECT 
        ch.id, ch.penjualan_id, ch.batch_ke, ch.tanggal_bayar, ch.jenis_pembayaran,
        ch.sisa_bayar, ch.keterangan, ch.status, ch.created_at, ch.updated_at,
        ch.nominal_dana_1, ch.sumber_dana_1_id
    FROM cicilan_history ch
    INNER JOIN penjualans_history ph ON ch.penjualan_id = ph.id
    WHERE ch.closed_month = target_month 
    AND ch.closed_year = target_year
    AND ph.divisi = target_division;
    
    GET DIAGNOSTICS cicilan_count = ROW_COUNT;
    
    DELETE FROM cicilan_history 
    WHERE id IN (
        SELECT ch.id FROM cicilan_history ch
        INNER JOIN penjualans_history ph ON ch.penjualan_id = ph.id
        WHERE ch.closed_month = target_month 
        AND ch.closed_year = target_year
        AND ph.divisi = target_division
    );

    -- Restore fee_penjualan
    INSERT INTO fee_penjualan (
        id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
        created_at, updated_at
    )
    SELECT 
        id, penjualan_id, tanggal_fee, jumlah_fee, divisi, keterangan,
        created_at, updated_at
    FROM fee_penjualan_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS fee_count = ROW_COUNT;
    
    DELETE FROM fee_penjualan_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;

    -- Restore pembelian first (referenced by other tables)
    INSERT INTO pembelian (
        id, tanggal_pembelian, cabang_id, brand_id, jenis_id, tahun, kilometer,
        pajak, harga_beli, company_id, divisi, tt, warna, plat, status,
        created_at, updated_at
    )
    SELECT 
        id, tanggal_pembelian, cabang_id, brand_id, jenis_id, tahun, kilometer,
        pajak, harga_beli, company_id, divisi, tt, warna, plat, status,
        created_at, updated_at
    FROM pembelian_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS pembelian_count = ROW_COUNT;
    
    DELETE FROM pembelian_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;

    -- Restore penjualans
    INSERT INTO penjualans (
        id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
        harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
        ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
        company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
        biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
        divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
        created_at, updated_at, subsidi_ongkir
    )
    SELECT 
        id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
        harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
        ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
        company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
        biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
        divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
        created_at, updated_at, subsidi_ongkir
    FROM penjualans_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS penjualan_count = ROW_COUNT;
    
    DELETE FROM penjualans_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;

    -- Restore pembukuan
    INSERT INTO pembukuan (
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at
    )
    SELECT 
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, pembelian_id, created_at, updated_at
    FROM pembukuan_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year;
    
    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;
    
    DELETE FROM pembukuan_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year;

    -- Restore operational
    INSERT INTO operational (
        id, tanggal, divisi, kategori, keterangan, debit, kredit, saldo,
        cabang_id, company_id, created_at, updated_at
    )
    SELECT 
        id, tanggal, divisi, kategori, keterangan, debit, kredit, saldo,
        cabang_id, company_id, created_at, updated_at
    FROM operational_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS operational_count = ROW_COUNT;
    
    DELETE FROM operational_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;

    -- Restore biro_jasa
    INSERT INTO biro_jasa (
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, created_at, updated_at
    )
    SELECT 
        id, tanggal, divisi, keterangan, debit, kredit, saldo, cabang_id,
        company_id, created_at, updated_at
    FROM biro_jasa_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;
    
    DELETE FROM biro_jasa_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;

    -- Restore assets
    INSERT INTO assets (
        id, tanggal_perolehan, divisi, nama_asset, kategori, harga_perolehan,
        umur_ekonomis, nilai_residu, metode_depresiasi, cabang_id, company_id,
        created_at, updated_at
    )
    SELECT 
        id, tanggal_perolehan, divisi, nama_asset, kategori, harga_perolehan,
        umur_ekonomis, nilai_residu, metode_depresiasi, cabang_id, company_id,
        created_at, updated_at
    FROM assets_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;
    
    DELETE FROM assets_history 
    WHERE closed_month = target_month 
    AND closed_year = target_year
    AND divisi = target_division;

    -- Remove the closure record
    DELETE FROM monthly_closures 
    WHERE closure_month = target_month 
    AND closure_year = target_year 
    AND divisi = target_division;

    -- Return summary
    RETURN json_build_object(
        'success', true,
        'message', 'Month restored successfully for division ' || target_division,
        'month', target_month,
        'year', target_year,
        'division', target_division,
        'records_restored', json_build_object(
            'cicilan', cicilan_count,
            'fee_penjualan', fee_count,
            'pembukuan', pembukuan_count,
            'penjualans', penjualan_count,
            'pembelian', pembelian_count,
            'operational', operational_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count
        )
    );
END;
$$ LANGUAGE plpgsql;