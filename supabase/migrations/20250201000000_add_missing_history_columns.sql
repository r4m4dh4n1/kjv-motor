-- Add missing columns to history tables
-- This migration ensures biro_jasa_history and assets_history have all required columns

-- Add missing columns to biro_jasa_history
DO $$
BEGIN
    -- Add closed_month column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'biro_jasa_history' 
        AND column_name = 'closed_month'
    ) THEN
        ALTER TABLE public.biro_jasa_history ADD COLUMN closed_month integer;
        RAISE NOTICE 'Added closed_month column to biro_jasa_history';
    END IF;
    
    -- Add closed_year column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'biro_jasa_history' 
        AND column_name = 'closed_year'
    ) THEN
        ALTER TABLE public.biro_jasa_history ADD COLUMN closed_year integer;
        RAISE NOTICE 'Added closed_year column to biro_jasa_history';
    END IF;
    
    -- Add divisi column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'biro_jasa_history' 
        AND column_name = 'divisi'
    ) THEN
        ALTER TABLE public.biro_jasa_history ADD COLUMN divisi VARCHAR(50) DEFAULT 'unknown';
        RAISE NOTICE 'Added divisi column to biro_jasa_history';
    END IF;
    
    -- Add brand_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'biro_jasa_history' 
        AND column_name = 'brand_id'
    ) THEN
        ALTER TABLE public.biro_jasa_history ADD COLUMN brand_id integer;
        RAISE NOTICE 'Added brand_id column to biro_jasa_history';
    END IF;
    
    -- Add jenis_motor_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'biro_jasa_history' 
        AND column_name = 'jenis_motor_id'
    ) THEN
        ALTER TABLE public.biro_jasa_history ADD COLUMN jenis_motor_id integer;
        RAISE NOTICE 'Added jenis_motor_id column to biro_jasa_history';
    END IF;
END $$;

-- Add missing columns to assets_history
DO $$
BEGIN
    -- Add closed_month column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'assets_history' 
        AND column_name = 'closed_month'
    ) THEN
        ALTER TABLE public.assets_history ADD COLUMN closed_month integer;
        RAISE NOTICE 'Added closed_month column to assets_history';
    END IF;
    
    -- Add closed_year column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'assets_history' 
        AND column_name = 'closed_year'
    ) THEN
        ALTER TABLE public.assets_history ADD COLUMN closed_year integer;
        RAISE NOTICE 'Added closed_year column to assets_history';
    END IF;
    
    -- Add divisi column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'assets_history' 
        AND column_name = 'divisi'
    ) THEN
        ALTER TABLE public.assets_history ADD COLUMN divisi VARCHAR(50) DEFAULT 'unknown';
        RAISE NOTICE 'Added divisi column to assets_history';
    END IF;
END $$;