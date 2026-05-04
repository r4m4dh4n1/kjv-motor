-- STANDALONE SCRIPT: Add divisi field to biro_jasa and assets tables
-- Run this directly in Supabase SQL Editor

-- Step 1: Add divisi column to biro_jasa table
ALTER TABLE public.biro_jasa 
ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

-- Step 2: Add divisi column to assets table  
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

-- Step 2.1: Add divisi column to history tables as well
ALTER TABLE public.biro_jasa_history 
ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

ALTER TABLE public.assets_history 
ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_biro_jasa_divisi ON public.biro_jasa(divisi);
CREATE INDEX IF NOT EXISTS idx_assets_divisi ON public.assets(divisi);

-- Step 4: Update existing records to set default divisi if needed
UPDATE public.biro_jasa 
SET divisi = 'unknown' 
WHERE divisi IS NULL OR divisi = '';

UPDATE public.assets 
SET divisi = 'unknown' 
WHERE divisi IS NULL OR divisi = '';

-- Step 5: Add comments to document the new columns
COMMENT ON COLUMN public.biro_jasa.divisi IS 'Divisi/cabang yang menangani biro jasa ini';
COMMENT ON COLUMN public.assets.divisi IS 'Divisi/cabang yang memiliki asset ini';

-- Step 6: Update close_month function to handle biro_jasa and assets with divisi
-- Drop existing function variants first
DROP FUNCTION IF EXISTS close_month(integer, integer, text);
DROP FUNCTION IF EXISTS public.close_month(integer, integer, text);

-- Create updated close_month function that includes biro_jasa and assets processing
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

    -- Move cicilan to history
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
        id, tanggal, jenis_motor, brand_id, jenis_motor_id, warna, plat_nomor,
        tahun, jenis_pengurusan, keterangan, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, rekening_tujuan_id, status, created_at, updated_at, divisi,
        closed_month, closed_year, closed_at
    )
    SELECT 
        id, tanggal, jenis_motor, brand_id, jenis_motor_id, warna, plat_nomor,
        tahun, jenis_pengurusan, keterangan, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, rekening_tujuan_id, status, created_at, updated_at, divisi,
        target_month, target_year, now()
    FROM biro_jasa 
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year
    AND (target_division IS NULL OR divisi = target_division);
    
    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

    -- Move assets to history
    INSERT INTO assets_history (
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, created_at, updated_at, closed_month, closed_year, divisi, closed_at
    )
    SELECT 
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, created_at, updated_at, target_month, target_year, divisi, now()
    FROM assets 
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year
    AND (target_division IS NULL OR divisi = target_division);
    
    GET DIAGNOSTICS assets_count = ROW_COUNT;

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
        'records_moved', jsonb_build_object(
            'penjualans', penjualan_count,
            'cicilan', cicilan_count,
            'pembukuan', pembukuan_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count
        ),
        'closed_at', now()
    );

    RETURN result;
END;
$$;

-- Verification queries
DO $$
BEGIN
    -- Check biro_jasa divisi column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'biro_jasa' AND column_name = 'divisi'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: divisi column does not exist in biro_jasa table!';
    ELSE
        RAISE NOTICE 'SUCCESS: divisi column exists in biro_jasa table';
    END IF;
    
    -- Check assets divisi column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets' AND column_name = 'divisi'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: divisi column does not exist in assets table!';
    ELSE
        RAISE NOTICE 'SUCCESS: divisi column exists in assets table';
    END IF;
    
    -- Check biro_jasa_history divisi column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'biro_jasa_history' AND column_name = 'divisi'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: divisi column does not exist in biro_jasa_history table!';
    ELSE
        RAISE NOTICE 'SUCCESS: divisi column exists in biro_jasa_history table';
    END IF;
    
    -- Check assets_history divisi column
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