-- Add divisi field to biro_jasa and assets tables
-- This ensures these tables can be properly filtered by division in close_month function

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