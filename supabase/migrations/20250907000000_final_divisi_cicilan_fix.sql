-- FINAL FIX: Ensure divisi column exists in cicilan table and close_month function handles it correctly
-- This migration runs after all other migrations to ensure it's not overridden

-- Step 1: Ensure divisi column exists in cicilan table
ALTER TABLE public.cicilan 
ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

-- Step 2: Update any existing cicilan records that don't have divisi set
UPDATE public.cicilan 
SET divisi = COALESCE(p.divisi, 'unknown')
FROM public.penjualans p 
WHERE cicilan.penjualan_id = p.id 
AND (cicilan.divisi IS NULL OR cicilan.divisi = '');

-- Step 3: Create index for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_cicilan_divisi ON public.cicilan(divisi);

-- Step 4: Drop any existing close_month function variants to avoid conflicts
DROP FUNCTION IF EXISTS close_month(integer, integer, text);
DROP FUNCTION IF EXISTS public.close_month(integer, integer, text);

-- Step 5: Create the final close_month function with proper divisi handling
CREATE OR REPLACE FUNCTION public.close_month(target_month integer, target_year integer, target_division text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    penjualan_count integer := 0;
    cicilan_count integer := 0;
    pembukuan_count integer := 0;
    result jsonb;
BEGIN
    -- Check if month is already closed
    IF EXISTS (
        SELECT 1 FROM monthly_closures 
        WHERE closure_month = target_month 
        AND closure_year = target_year
        AND (target_division IS NULL OR division = target_division)
    ) THEN
        RAISE EXCEPTION 'Month % Year % for division % is already closed', target_month, target_year, COALESCE(target_division, 'ALL');
    END IF;

    -- Move penjualans to history
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
    AND (target_division IS NULL OR divisi = target_division);
    
    GET DIAGNOSTICS penjualan_count = ROW_COUNT;

    -- Move cicilan to history - now using divisi from cicilan table
    INSERT INTO cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, jumlah_bayar,
        sisa_bayar, keterangan, status, tujuan_pembayaran_id, created_at, updated_at,
        closed_month, closed_year, divisi
    )
    SELECT 
        c.id, c.penjualan_id, c.batch_ke, c.tanggal_bayar, c.jenis_pembayaran, c.jumlah_bayar,
        c.sisa_bayar, c.keterangan, c.status, c.tujuan_pembayaran_id, c.created_at, c.updated_at,
        target_month, target_year, COALESCE(c.divisi, 'unknown')
    FROM cicilan c
    WHERE c.penjualan_id IN (
        SELECT id FROM penjualans 
        WHERE EXTRACT(MONTH FROM tanggal) = target_month 
        AND EXTRACT(YEAR FROM tanggal) = target_year
        AND (target_division IS NULL OR divisi = target_division)
    );
    
    GET DIAGNOSTICS cicilan_count = ROW_COUNT;

    -- Move pembukuan to history
    INSERT INTO pembukuan_history (
        id, tanggal, divisi, keterangan, debit, kredit, created_at, updated_at,
        closed_month, closed_year
    )
    SELECT 
        id, tanggal, divisi, keterangan, debit, kredit, created_at, updated_at,
        target_month, target_year
    FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND (target_division IS NULL OR divisi = target_division);
    
    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;

    -- Delete from original tables
    DELETE FROM cicilan 
    WHERE penjualan_id IN (
        SELECT id FROM penjualans 
        WHERE EXTRACT(MONTH FROM tanggal) = target_month 
        AND EXTRACT(YEAR FROM tanggal) = target_year
        AND (target_division IS NULL OR divisi = target_division)
    );

    DELETE FROM penjualans 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND (target_division IS NULL OR divisi = target_division);

    DELETE FROM pembukuan 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND (target_division IS NULL OR divisi = target_division);

    -- Record the closure
    INSERT INTO monthly_closures (closure_month, closure_year, division, closed_at)
    VALUES (target_month, target_year, target_division, now());

    -- Return summary
    result := jsonb_build_object(
        'success', true,
        'month', target_month,
        'year', target_year,
        'division', COALESCE(target_division, 'ALL'),
        'penjualan_count', penjualan_count,
        'cicilan_count', cicilan_count,
        'pembukuan_count', pembukuan_count,
        'closed_at', now()
    );

    RETURN result;
END;
$$;

-- Verification queries
-- Check if divisi column exists in cicilan table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cicilan' AND column_name = 'divisi'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: divisi column still does not exist in cicilan table!';
    ELSE
        RAISE NOTICE 'SUCCESS: divisi column exists in cicilan table';
    END IF;
END $$;

-- Show current function signature
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'close_month' AND n.nspname = 'public';