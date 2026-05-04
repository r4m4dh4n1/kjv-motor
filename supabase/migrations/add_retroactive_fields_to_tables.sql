-- ========================================
-- ADD is_retroactive & original_month FIELDS
-- ========================================
-- Tujuan: Menambahkan field is_retroactive dan original_month ke tabel operational dan operational_history
-- Tanggal: 2025-11-01
-- ========================================

-- Step 1: Add fields to operational table (if not exists)
ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE;

ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS original_month DATE;

-- Step 2: Add fields to operational_history table (if not exists)
ALTER TABLE operational_history 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE;

ALTER TABLE operational_history 
ADD COLUMN IF NOT EXISTS original_month DATE;

-- Step 3: Add comments to document the fields
COMMENT ON COLUMN operational.is_retroactive IS 'Flag untuk transaksi retroaktif (dibuat setelah bulan ditutup)';
COMMENT ON COLUMN operational.original_month IS 'Bulan asli transaksi untuk transaksi retroaktif (format: YYYY-MM-DD, biasanya tanggal akhir bulan)';

COMMENT ON COLUMN operational_history.is_retroactive IS 'Flag untuk transaksi retroaktif (dibuat setelah bulan ditutup)';
COMMENT ON COLUMN operational_history.original_month IS 'Bulan asli transaksi untuk transaksi retroaktif (format: YYYY-MM-DD, biasanya tanggal akhir bulan)';

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_operational_is_retroactive 
ON operational(is_retroactive) WHERE is_retroactive = TRUE;

CREATE INDEX IF NOT EXISTS idx_operational_original_month 
ON operational(original_month) WHERE original_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operational_history_is_retroactive 
ON operational_history(is_retroactive) WHERE is_retroactive = TRUE;

CREATE INDEX IF NOT EXISTS idx_operational_history_original_month 
ON operational_history(original_month) WHERE original_month IS NOT NULL;

-- Step 5: Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('operational', 'operational_history')
    AND column_name IN ('is_retroactive', 'original_month')
ORDER BY table_name, column_name;

-- Step 6: Check sample data
SELECT 
    'operational' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational

UNION ALL

SELECT 
    'operational_history' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_history;

-- ========================================
-- NOTES:
-- ========================================
-- 1. Script ini aman dijalankan berkali-kali (menggunakan IF NOT EXISTS)
-- 2. is_retroactive: Boolean flag untuk menandai transaksi retroaktif
-- 3. original_month: DATE field untuk menyimpan bulan asli transaksi
-- 4. Index dibuat untuk meningkatkan performa query
-- 5. Setelah script ini, jalankan recreate_operational_combined_view.sql
-- ========================================
