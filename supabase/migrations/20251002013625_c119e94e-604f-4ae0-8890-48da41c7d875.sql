-- Fix ambiguous column reference in close_month_by_division function
DROP FUNCTION IF EXISTS public.close_month_by_division(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.close_month_by_division(text, text, integer, integer);

-- First, fix the foreign key constraint to allow proper deletion
ALTER TABLE public.pembukuan_history 
DROP CONSTRAINT IF EXISTS pembukuan_history_pembelian_id_fkey;

ALTER TABLE public.pembukuan_history 
ADD CONSTRAINT pembukuan_history_pembelian_id_fkey 
FOREIGN KEY (pembelian_id) REFERENCES public.pembelian(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.close_month_by_division(
  p_notes text,
  target_division text,
  target_month integer, 
  target_year integer
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    penjualan_count integer := 0;
    cicilan_count integer := 0;
    pembukuan_count integer := 0;
    pembelian_count integer := 0;
    operational_count integer := 0;
    biro_jasa_count integer := 0;
    assets_count integer := 0;
    fee_penjualan_count integer := 0;
    result jsonb;
BEGIN
    -- Check if month is already closed for this division
    IF EXISTS (
        SELECT 1 FROM monthly_closures 
        WHERE closure_month = target_month 
        AND closure_year = target_year
        AND (created_by = target_division OR notes LIKE '%' || target_division || '%')
    ) THEN
        RAISE EXCEPTION 'Month % Year % for division % is already closed', target_month, target_year, target_division;
    END IF;

    -- Move penjualans to history (only for target division)
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
    AND divisi = target_division
    AND status = 'sold';
    
    GET DIAGNOSTICS penjualan_count = ROW_COUNT;

    -- Move cicilan to history (for penjualans in target division)
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
        sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at,
        closed_month, closed_year, divisi
    )
    SELECT 
        c.id, c.penjualan_id, c.batch_ke, c.tanggal_bayar, c.jenis_pembayaran, c.jumlah_bayar,
        c.sisa_bayar, c.keterangan, c.status, c.tujuan_pembayaran_id, c.created_at, c.updated_at,
        target_month, target_year, COALESCE(c.divisi, target_division)
    FROM cicilan c
    INNER JOIN penjualans p ON c.penjualan_id = p.id
    WHERE EXTRACT(MONTH FROM c.tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM c.tanggal_bayar) = target_year
    AND p.divisi = target_division
    AND c.status = 'completed';
    
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
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS fee_penjualan_count = ROW_COUNT;

    -- Move pembukuan to history
    -- Use a robust approach with temporary tables to pre-validate all records
    
    -- Create temporary table to identify all pembukuan records that need to be moved
    CREATE TEMP TABLE temp_pembukuan_candidates AS
    SELECT p.*
    FROM pembukuan p
    WHERE 
        -- Pembukuan from target month/division
        (EXTRACT(MONTH FROM p.tanggal) = target_month 
         AND EXTRACT(YEAR FROM p.tanggal) = target_year
         AND p.divisi = target_division)
        OR
        -- Pembukuan that reference pembelian records that will be deleted
        (p.pembelian_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM pembelian pb
            WHERE pb.id = p.pembelian_id
            AND EXTRACT(MONTH FROM pb.tanggal_pembelian) = target_month 
            AND EXTRACT(YEAR FROM pb.tanggal_pembelian) = target_year
            AND pb.divisi = target_division
            AND pb.status = 'sold'
        ));

    -- Create temporary table for records with valid pembelian_id references
    CREATE TEMP TABLE temp_pembukuan_valid AS
    SELECT t.*
    FROM temp_pembukuan_candidates t
    WHERE t.pembelian_id IS NULL 
       OR EXISTS (SELECT 1 FROM pembelian WHERE id = t.pembelian_id);

    -- Create temporary table for records with orphaned pembelian_id references
    CREATE TEMP TABLE temp_pembukuan_orphaned AS
    SELECT t.*
    FROM temp_pembukuan_candidates t
    WHERE t.pembelian_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM pembelian WHERE id = t.pembelian_id);

    -- Insert valid records (preserving their pembelian_id)
    INSERT INTO pembukuan_history (
        id, tanggal, keterangan, debit, kredit, company_id, cabang_id,
        divisi, pembelian_id, created_at, updated_at, closed_month, closed_year
    )
    SELECT 
        id, tanggal, keterangan, debit, kredit, company_id, cabang_id,
        divisi, pembelian_id, created_at, updated_at, target_month, target_year
    FROM temp_pembukuan_valid;

    -- Insert orphaned records (setting pembelian_id to NULL)
    INSERT INTO pembukuan_history (
        id, tanggal, keterangan, debit, kredit, company_id, cabang_id,
        divisi, pembelian_id, created_at, updated_at, closed_month, closed_year
    )
    SELECT 
        id, tanggal, keterangan, debit, kredit, company_id, cabang_id,
        divisi, NULL::integer as pembelian_id, created_at, updated_at, target_month, target_year
    FROM temp_pembukuan_orphaned;

    -- Clean up temporary tables
    DROP TABLE temp_pembukuan_candidates;
    DROP TABLE temp_pembukuan_valid;
    DROP TABLE temp_pembukuan_orphaned;
    
    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;

    -- Move pembelian to history
    INSERT INTO pembelian_history (
        id, tanggal_pembelian, cabang_id, brand_id, jenis_motor_id, tahun, kilometer,
        tanggal_pajak, harga_beli, harga_final, sumber_dana_1_id, nominal_dana_1,
        sumber_dana_2_id, nominal_dana_2, warna, plat_nomor, keterangan, status,
        divisi, jenis_pembelian, created_at, updated_at, closed_month, closed_year
    )
    SELECT 
        id, tanggal_pembelian, cabang_id, brand_id, jenis_motor_id, tahun, kilometer,
        tanggal_pajak, harga_beli, harga_final, sumber_dana_1_id, nominal_dana_1,
        sumber_dana_2_id, nominal_dana_2, warna, plat_nomor, keterangan, status,
        divisi, jenis_pembelian, created_at, updated_at, target_month, target_year
    FROM pembelian 
    WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND divisi = target_division
    AND status = 'sold';
    
    GET DIAGNOSTICS pembelian_count = ROW_COUNT;

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
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS operational_count = ROW_COUNT;

    -- Move biro_jasa to history
    INSERT INTO biro_jasa_history (
        id, tanggal, jenis_pengurusan, brand_name, jenis_motor, tahun, warna, plat_nomor,
        estimasi_biaya, estimasi_tanggal_selesai, dp, sisa, biaya_modal, keuntungan,
        total_bayar, status, rekening_tujuan_id, keterangan, divisi,
        created_at, updated_at, closed_month, closed_year
    )
    SELECT 
        id, tanggal, jenis_pengurusan, brand_name, jenis_motor, tahun, warna, plat_nomor,
        estimasi_biaya, estimasi_tanggal_selesai, dp, sisa, biaya_modal, keuntungan,
        total_bayar, status, rekening_tujuan_id, keterangan, divisi,
        created_at, updated_at, target_month, target_year
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division
    AND status = 'Selesai';
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

    -- Move assets to history
    INSERT INTO assets_history (
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, divisi, created_at, updated_at, closed_month, closed_year
    )
    SELECT 
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, divisi, created_at, updated_at, target_month, target_year
    FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year
    AND divisi = target_division;
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;

    -- Delete from original tables
    DELETE FROM cicilan 
    WHERE penjualan_id IN (
        SELECT id FROM penjualans 
        WHERE EXTRACT(MONTH FROM tanggal) = target_month 
        AND EXTRACT(YEAR FROM tanggal) = target_year
        AND divisi = target_division
        AND status = 'sold'
    ) AND status = 'completed';

    DELETE FROM fee_penjualan 
    WHERE EXTRACT(MONTH FROM tanggal_fee) = target_month 
    AND EXTRACT(YEAR FROM tanggal_fee) = target_year
    AND divisi = target_division;

    -- Delete all penjualans that reference pembelian records to be deleted
    -- This prevents foreign key constraint violations
    DELETE FROM penjualans 
    WHERE pembelian_id IN (
        SELECT id FROM pembelian 
        WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
        AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
        AND divisi = target_division
        AND status = 'sold'
    );

    -- Also delete penjualans that match the original criteria
    DELETE FROM penjualans 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division
    AND status = 'sold';

    -- Delete pembukuan records (both from target month/division and those referencing target pembelian)
    DELETE FROM pembukuan 
    WHERE (
        -- Pembukuan from target month/division
        (EXTRACT(MONTH FROM tanggal) = target_month 
         AND EXTRACT(YEAR FROM tanggal) = target_year
         AND divisi = target_division)
        OR
        -- Pembukuan that reference pembelian records to be deleted
        pembelian_id IN (
            SELECT id FROM pembelian 
            WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
            AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
            AND divisi = target_division
            AND status = 'sold'
        )
    );

    -- Now safe to delete pembelian records
    DELETE FROM pembelian 
    WHERE EXTRACT(MONTH FROM tanggal_pembelian) = target_month 
    AND EXTRACT(YEAR FROM tanggal_pembelian) = target_year
    AND divisi = target_division
    AND status = 'sold';

    DELETE FROM operational 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division;

    DELETE FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND divisi = target_division
    AND status = 'Selesai';

    DELETE FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year
    AND divisi = target_division;

    -- Record the closure (using p_notes parameter to avoid ambiguity)
    INSERT INTO monthly_closures (closure_month, closure_year, created_by, notes, closure_date)
    VALUES (target_month, target_year, target_division, COALESCE(p_notes, 'Closed for division: ' || target_division), now());

    -- Return summary
    result := jsonb_build_object(
        'success', true,
        'message', 'Month closed successfully for division ' || target_division,
        'month', target_month,
        'year', target_year,
        'division', target_division,
        'records_moved', jsonb_build_object(
            'penjualans', penjualan_count,
            'cicilan', cicilan_count,
            'fee_penjualan', fee_penjualan_count,
            'pembukuan', pembukuan_count,
            'pembelian', pembelian_count,
            'operational', operational_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count
        )
    );

    RETURN result;
END;
$$;