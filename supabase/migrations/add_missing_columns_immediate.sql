-- Run this script directly in your Supabase SQL Editor
-- to add the missing columns to history tables

-- Add missing columns to biro_jasa_history
ALTER TABLE public.biro_jasa_history 
ADD COLUMN IF NOT EXISTS closed_month integer,
ADD COLUMN IF NOT EXISTS closed_year integer,
ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS brand_id integer,
ADD COLUMN IF NOT EXISTS jenis_motor_id integer;

-- Add missing columns to assets_history  
ALTER TABLE public.assets_history 
ADD COLUMN IF NOT EXISTS closed_month integer,
ADD COLUMN IF NOT EXISTS closed_year integer,
ADD COLUMN IF NOT EXISTS divisi VARCHAR(50) DEFAULT 'unknown';

-- Verify the columns were added
SELECT 
    'biro_jasa_history' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'biro_jasa_history'
AND column_name IN ('closed_month', 'closed_year', 'divisi', 'brand_id', 'jenis_motor_id')

UNION ALL

SELECT 
    'assets_history' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'assets_history'
AND column_name IN ('closed_month', 'closed_year', 'divisi')
ORDER BY table_name, column_name;