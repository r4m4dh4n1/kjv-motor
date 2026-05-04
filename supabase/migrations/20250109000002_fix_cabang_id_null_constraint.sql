-- Fix cabang_id NULL constraint issue in pembukuan_history
-- This migration addresses the "null value in column cabang_id violates not-null constraint" error

-- First, ensure history tables have the correct structure
-- Add closed_month and closed_year columns if they don't exist
DO $$
BEGIN
    -- Check and add closed_month to biro_jasa_history if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'biro_jasa_history' AND column_name = 'closed_month'
    ) THEN
        ALTER TABLE public.biro_jasa_history ADD COLUMN closed_month integer;
        ALTER TABLE public.biro_jasa_history ADD COLUMN closed_year integer;
        RAISE NOTICE 'Added closed_month and closed_year columns to biro_jasa_history';
    END IF;
    
    -- Check and add closed_month to assets_history if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets_history' AND column_name = 'closed_month'
    ) THEN
        ALTER TABLE public.assets_history ADD COLUMN closed_month integer;
        ALTER TABLE public.assets_history ADD COLUMN closed_year integer;
        RAISE NOTICE 'Added closed_month and closed_year columns to assets_history';
    END IF;
    
    -- Check and add divisi to biro_jasa_history if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'biro_jasa_history' AND column_name = 'divisi'
    ) THEN
        ALTER TABLE public.biro_jasa_history ADD COLUMN divisi VARCHAR(50) DEFAULT 'unknown';
        RAISE NOTICE 'Added divisi column to biro_jasa_history';
    END IF;
    
    -- Check and add divisi to assets_history if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assets_history' AND column_name = 'divisi'
    ) THEN
        ALTER TABLE public.assets_history ADD COLUMN divisi VARCHAR(50) DEFAULT 'unknown';
        RAISE NOTICE 'Added divisi column to assets_history';
    END IF;
END $$;

-- Update any NULL cabang_id values in pembukuan table to a default value
-- You may need to adjust the default value (1) based on your actual cabang data
UPDATE public.pembukuan 
SET cabang_id = 1 
WHERE cabang_id IS NULL;

-- Alternative approach: Modify pembukuan_history to allow NULL cabang_id
-- Uncomment the following lines if you prefer to allow NULL values in history table
-- ALTER TABLE public.pembukuan_history 
-- ALTER COLUMN cabang_id DROP NOT NULL;

-- Drop existing close_month function first to avoid return type conflict
DROP FUNCTION IF EXISTS public.close_month(integer, integer, text);
DROP FUNCTION IF EXISTS public.close_month(integer, integer, text, text);
DROP FUNCTION IF EXISTS public.close_month(integer, integer);

-- Update the close_month function to handle potential NULL cabang_id values
CREATE FUNCTION public.close_month(target_month integer, target_year integer, notes text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    penjualan_count integer;
    cicilan_count integer;
    pembukuan_count integer;
    biro_jasa_count integer;
    assets_count integer;
    result json;
BEGIN
    -- Check if month is already closed
    IF EXISTS (
        SELECT 1 FROM public.monthly_closures 
        WHERE closure_month = target_month AND closure_year = target_year
    ) THEN
        RAISE EXCEPTION 'Month % of year % is already closed', target_month, target_year;
    END IF;

    -- Move penjualans to history
    INSERT INTO public.penjualans_history (
        id, tanggal, cabang_id, brand_id, jenis_id, tahun, kilometer, pajak,
        harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
        ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
        company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
        biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
        divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
        created_at, updated_at, closed_month, closed_year
    )
    SELECT 
        id, tanggal, COALESCE(cabang_id, 1), brand_id, jenis_id, tahun, kilometer, pajak,
        harga_beli, harga_jual, harga_bayar, keuntungan, sisa_bayar, titip_ongkir,
        ongkir_dibayar, total_ongkir, dp, cicilan, company_id, nominal_dana_1,
        company_id_2, nominal_dana_2, pembelian_id, biaya_qc, biaya_pajak,
        biaya_lain_lain, catatan, keterangan_biaya_lain, reason_update_harga,
        divisi, tt, warna, plat, status, jenis_pembayaran, sisa_ongkir,
        created_at, updated_at, target_month, target_year
    FROM public.penjualans
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    GET DIAGNOSTICS penjualan_count = ROW_COUNT;

    -- Move cicilan to history
    INSERT INTO public.cicilan_history (
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, 
        jumlah_bayar, sisa_bayar, keterangan, status, tujuan_pembayaran_id,
        created_at, updated_at, closed_month, closed_year
    )
    SELECT 
        id, penjualan_id, batch_ke, tanggal_bayar, jenis_pembayaran, 
        jumlah_bayar, sisa_bayar, keterangan, status, tujuan_pembayaran_id,
        created_at, updated_at, target_month, target_year
    FROM public.cicilan
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;

    GET DIAGNOSTICS cicilan_count = ROW_COUNT;

    -- Move pembukuan to history with NULL handling for cabang_id
    INSERT INTO public.pembukuan_history (
        id, tanggal, divisi, keterangan, debit, kredit, saldo, 
        cabang_id, company_id, pembelian_id, created_at, updated_at, 
        closed_month, closed_year
    )
    SELECT 
        id, tanggal, divisi, keterangan, debit, kredit, saldo, 
        COALESCE(cabang_id, 1) as cabang_id, -- Use default value 1 if NULL
        company_id, pembelian_id, created_at, updated_at, 
        target_month, target_year
    FROM public.pembukuan
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    GET DIAGNOSTICS pembukuan_count = ROW_COUNT;

    -- Move biro_jasa to history
    INSERT INTO public.biro_jasa_history (
        id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
        tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
        keterangan, created_at, updated_at, closed_month, closed_year, divisi
    )
    SELECT 
        id, tanggal, jenis_pengurusan, brand_id, jenis_motor_id, jenis_motor,
        tahun, warna, plat_nomor, estimasi_biaya, estimasi_tanggal_selesai,
        dp, sisa, biaya_modal, keuntungan, total_bayar, status, rekening_tujuan_id,
        keterangan, created_at, updated_at, target_month, target_year, COALESCE(divisi, 'unknown')
    FROM public.biro_jasa
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    GET DIAGNOSTICS biro_jasa_count = ROW_COUNT;

    -- Move assets to history
    INSERT INTO public.assets_history (
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, created_at, updated_at, closed_month, closed_year, divisi
    )
    SELECT 
        id, jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
        keuntungan, status, created_at, updated_at, target_month, target_year, COALESCE(divisi, 'unknown')
    FROM public.assets
    WHERE EXTRACT(MONTH FROM tanggal_perolehan) = target_month 
    AND EXTRACT(YEAR FROM tanggal_perolehan) = target_year;

    GET DIAGNOSTICS assets_count = ROW_COUNT;

    -- Delete moved records from original tables
    DELETE FROM public.penjualans
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    DELETE FROM public.cicilan
    WHERE EXTRACT(MONTH FROM tanggal_bayar) = target_month 
    AND EXTRACT(YEAR FROM tanggal_bayar) = target_year;

    DELETE FROM public.pembukuan
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    DELETE FROM public.biro_jasa
    WHERE EXTRACT(MONTH FROM tanggal) = target_month 
    AND EXTRACT(YEAR FROM tanggal) = target_year;

    DELETE FROM public.assets
    WHERE EXTRACT(MONTH FROM tanggal_beli) = target_month 
    AND EXTRACT(YEAR FROM tanggal_beli) = target_year;

    -- Record the closure
    INSERT INTO public.monthly_closures (closure_month, closure_year, notes)
    VALUES (target_month, target_year, notes);

    -- Return summary
    result := json_build_object(
        'success', true,
        'message', 'Month closed successfully',
        'month', target_month,
        'year', target_year,
        'records_moved', json_build_object(
            'penjualans', penjualan_count,
            'cicilan', cicilan_count,
            'pembukuan', pembukuan_count,
            'biro_jasa', biro_jasa_count,
            'assets', assets_count
        )
    );

    RETURN result;
END;
$$;