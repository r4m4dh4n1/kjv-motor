-- =====================================================
-- FIX CLOSE_MONTH FUNCTION FOR BIRO_JASA AND ASSETS
-- =====================================================
-- This script fixes the close_month function to properly handle
-- biro_jasa and assets tables with divisi filtering

-- STEP 1: Add divisi column to biro_jasa table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'biro_jasa' AND column_name = 'divisi'
    ) THEN
        ALTER TABLE public.biro_jasa ADD COLUMN divisi VARCHAR(50) DEFAULT 'unknown';
        RAISE NOTICE 'Added divisi column to biro_jasa table';
    ELSE
        RAISE NOTICE 'divisi column already exists in biro_jasa table';
    END IF;
END $$;

-- STEP 2: Add divisi column to assets table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'divisi'
    ) THEN
        ALTER TABLE public.assets ADD COLUMN divisi VARCHAR(50) DEFAULT 'unknown';
        RAISE NOTICE 'Added divisi column to assets table';
    ELSE
        RAISE NOTICE 'divisi column already exists in assets table';
    END IF;
END $$;

-- STEP 3: Add divisi column to biro_jasa_history table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'biro_jasa_history' AND column_name = 'divisi'
    ) THEN
        ALTER TABLE public.biro_jasa_history ADD COLUMN divisi VARCHAR(50) DEFAULT 'unknown';
        RAISE NOTICE 'Added divisi column to biro_jasa_history table';
    ELSE
        RAISE NOTICE 'divisi column already exists in biro_jasa_history table';
    END IF;
END $$;

-- STEP 4: Add divisi column to assets_history table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets_history' AND column_name = 'divisi'
    ) THEN
        ALTER TABLE public.assets_history ADD COLUMN divisi VARCHAR(50) DEFAULT 'unknown';
        RAISE NOTICE 'Added divisi column to assets_history table';
    ELSE
        RAISE NOTICE 'divisi column already exists in assets_history table';
    END IF;
END $$;

-- STEP 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_biro_jasa_divisi ON public.biro_jasa(divisi);
CREATE INDEX IF NOT EXISTS idx_assets_divisi ON public.assets(divisi);
CREATE INDEX IF NOT EXISTS idx_biro_jasa_history_divisi ON public.biro_jasa_history(divisi);
CREATE INDEX IF NOT EXISTS idx_assets_history_divisi ON public.assets_history(divisi);

-- STEP 6: Update existing records with default divisi value
UPDATE public.biro_jasa SET divisi = 'unknown' WHERE divisi IS NULL;
UPDATE public.assets SET divisi = 'unknown' WHERE divisi IS NULL;
UPDATE public.biro_jasa_history SET divisi = 'unknown' WHERE divisi IS NULL;
UPDATE public.assets_history SET divisi = 'unknown' WHERE divisi IS NULL;

-- STEP 7: Add comments to document the changes
COMMENT ON COLUMN public.biro_jasa.divisi IS 'Division/department for filtering in close_month function';
COMMENT ON COLUMN public.assets.divisi IS 'Division/department for filtering in close_month function';
COMMENT ON COLUMN public.biro_jasa_history.divisi IS 'Division/department for filtering in close_month function';
COMMENT ON COLUMN public.assets_history.divisi IS 'Division/department for filtering in close_month function';

-- STEP 8: Drop existing close_month function
DROP FUNCTION IF EXISTS public.close_month(integer, integer, text);

-- STEP 9: Create the updated close_month function with biro_jasa and assets handling
CREATE OR REPLACE FUNCTION public.close_month(target_month integer, target_year integer, target_division text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    penjualan_count integer := 0;
    cicilan_count integer := 0;
    pembukuan_count integer := 0;
    biro_jasa_count integer := 0;
    assets_count integer := 0;
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

    -- Move biro_jasa to history
    INSERT INTO biro_jasa_history (
        id, tanggal, jenis_pengurusan, jenis_motor, tahun, warna, plat_nomor,
        estimasi_biaya, estimasi_tanggal_selesai, dp, sisa, biaya_modal,
        keuntungan, total_bayar, status, rekening_tujuan_id, keterangan,
        created_at, updated_at, divisi
    )
    SELECT 
        id, tanggal, jenis_pengurusan, jenis_motor, tahun, warna, plat_nomor,
        estimasi_biaya, estimasi_tanggal_selesai, dp, sisa, biaya_modal,
        keuntungan, total_bayar, status, rekening_tujuan_id, keterangan,
        created_at, updated_at, COALESCE(divisi, 'unknown')
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND (target_division IS NULL OR divisi = target_division);
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

    -- Move assets to history
    INSERT INTO assets_history (
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, created_at, updated_at, closed_month, closed_year, divisi
    )
    SELECT 
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, created_at, updated_at, target_month, target_year, COALESCE(divisi, 'unknown')
    FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year
    AND (target_division IS NULL OR divisi = target_division);
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;

    -- Delete from original tables (in correct order to avoid foreign key issues)
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

    DELETE FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND (target_division IS NULL OR divisi = target_division);

    DELETE FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year
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
        'biro_jasa_count', biro_jasa_count,
        'assets_count', assets_count,
        'closed_at', now()
    );

    RETURN result;
END;
$$;

-- STEP 10: Verification queries
-- Check if divisi columns exist in all tables
DO $$
BEGIN
    -- Check biro_jasa
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'biro_jasa' AND column_name = 'divisi'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: divisi column does not exist in biro_jasa table!';
    ELSE
        RAISE NOTICE 'SUCCESS: divisi column exists in biro_jasa table';
    END IF;

    -- Check assets
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'divisi'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: divisi column does not exist in assets table!';
    ELSE
        RAISE NOTICE 'SUCCESS: divisi column exists in assets table';
    END IF;

    -- Check biro_jasa_history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'biro_jasa_history' AND column_name = 'divisi'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: divisi column does not exist in biro_jasa_history table!';
    ELSE
        RAISE NOTICE 'SUCCESS: divisi column exists in biro_jasa_history table';
    END IF;

    -- Check assets_history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets_history' AND column_name = 'divisi'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: divisi column does not exist in assets_history table!';
    ELSE
        RAISE NOTICE 'SUCCESS: divisi column exists in assets_history table';
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

-- Show table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('biro_jasa', 'assets', 'biro_jasa_history', 'assets_history')
AND column_name = 'divisi'
ORDER BY table_name, column_name;

DO $$
BEGIN
    RAISE NOTICE 'Fix completed successfully! The close_month function now properly handles biro_jasa and assets tables with divisi filtering.';
END $$;