-- ========================================
-- COMPLETE SETUP: operational_combined VIEW
-- dengan is_retroactive & original_month
-- ========================================
-- Tujuan: Setup lengkap view operational_combined dengan field retroaktif
-- Tanggal: 2025-11-01
-- Urutan: Jalankan script ini sekali untuk setup lengkap
-- ========================================

-- ========================================
-- PART 1: ADD FIELDS TO TABLES
-- ========================================
DO $$
BEGIN
    -- Add is_retroactive to operational
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'operational' AND column_name = 'is_retroactive'
    ) THEN
        ALTER TABLE operational ADD COLUMN is_retroactive BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added is_retroactive to operational table';
    ELSE
        RAISE NOTICE '⏭️ Column is_retroactive already exists in operational table';
    END IF;

    -- Add original_month to operational
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'operational' AND column_name = 'original_month'
    ) THEN
        ALTER TABLE operational ADD COLUMN original_month DATE;
        RAISE NOTICE '✅ Added original_month to operational table';
    ELSE
        RAISE NOTICE '⏭️ Column original_month already exists in operational table';
    END IF;

    -- Add is_retroactive to operational_history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'operational_history' AND column_name = 'is_retroactive'
    ) THEN
        ALTER TABLE operational_history ADD COLUMN is_retroactive BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added is_retroactive to operational_history table';
    ELSE
        RAISE NOTICE '⏭️ Column is_retroactive already exists in operational_history table';
    END IF;

    -- Add original_month to operational_history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'operational_history' AND column_name = 'original_month'
    ) THEN
        ALTER TABLE operational_history ADD COLUMN original_month DATE;
        RAISE NOTICE '✅ Added original_month to operational_history table';
    ELSE
        RAISE NOTICE '⏭️ Column original_month already exists in operational_history table';
    END IF;
END $$;

-- ========================================
-- PART 2: ADD COMMENTS
-- ========================================
COMMENT ON COLUMN operational.is_retroactive IS 'Flag untuk transaksi retroaktif (dibuat setelah bulan ditutup)';
COMMENT ON COLUMN operational.original_month IS 'Bulan asli transaksi untuk transaksi retroaktif (format: YYYY-MM-DD, biasanya tanggal akhir bulan)';
COMMENT ON COLUMN operational_history.is_retroactive IS 'Flag untuk transaksi retroaktif (dibuat setelah bulan ditutup)';
COMMENT ON COLUMN operational_history.original_month IS 'Bulan asli transaksi untuk transaksi retroaktif (format: YYYY-MM-DD, biasanya tanggal akhir bulan)';

-- ========================================
-- PART 3: CREATE INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_operational_is_retroactive 
ON operational(is_retroactive) WHERE is_retroactive = TRUE;

CREATE INDEX IF NOT EXISTS idx_operational_original_month 
ON operational(original_month) WHERE original_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operational_history_is_retroactive 
ON operational_history(is_retroactive) WHERE is_retroactive = TRUE;

CREATE INDEX IF NOT EXISTS idx_operational_history_original_month 
ON operational_history(original_month) WHERE original_month IS NOT NULL;

-- ========================================
-- PART 4: RECREATE VIEW
-- ========================================
DROP VIEW IF EXISTS operational_combined;

CREATE OR REPLACE VIEW operational_combined AS
-- Data dari tabel operational (aktif)
SELECT 
    id,
    tanggal,
    kategori,
    nominal,
    deskripsi,
    divisi,
    cabang_id,
    company_id,
    asset_id,
    is_retroactive,
    original_month,
    created_at,
    updated_at,
    'active' as data_source
FROM operational

UNION ALL

-- Data dari tabel operational_history (riwayat)
SELECT 
    id,
    tanggal,
    kategori,
    nominal,
    deskripsi,
    divisi,
    cabang_id,
    company_id,
    asset_id,
    is_retroactive,
    original_month,
    created_at,
    updated_at,
    'history' as data_source
FROM operational_history;

-- ========================================
-- PART 5: VERIFICATION
-- ========================================

-- Check columns
SELECT 
    '📋 COLUMN CHECK' as check_type,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('operational', 'operational_history')
    AND column_name IN ('is_retroactive', 'original_month')
ORDER BY table_name, column_name;

-- Check data summary
SELECT 
    '📊 DATA SUMMARY' as check_type,
    data_source,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_records,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as records_with_original_month,
    MIN(tanggal) as earliest_date,
    MAX(tanggal) as latest_date
FROM operational_combined
GROUP BY data_source
ORDER BY data_source;

-- Sample retroactive transactions
SELECT 
    '🔍 SAMPLE RETROACTIVE DATA' as check_type,
    id,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    data_source
FROM operational_combined
WHERE is_retroactive = true
ORDER BY tanggal DESC
LIMIT 5;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ 1. Fields is_retroactive & original_month added';
    RAISE NOTICE '✅ 2. Indexes created for performance';
    RAISE NOTICE '✅ 3. View operational_combined recreated';
    RAISE NOTICE '✅ 4. Verification queries executed';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '📝 NEXT STEPS:';
    RAISE NOTICE '📝 1. Check verification results above';
    RAISE NOTICE '📝 2. Test query: SELECT * FROM operational_combined WHERE is_retroactive = true;';
    RAISE NOTICE '📝 3. Update your application to use the new fields';
    RAISE NOTICE '✅ ========================================';
END $$;

-- ========================================
-- NOTES & USAGE EXAMPLES
-- ========================================
-- 
-- EXAMPLE 1: Query retroactive transactions for October 2025
-- SELECT * FROM operational_combined 
-- WHERE is_retroactive = true 
--   AND original_month >= '2025-10-01' 
--   AND original_month <= '2025-10-31'
-- ORDER BY tanggal DESC;
--
-- EXAMPLE 2: Filter by original_month in application
-- SELECT * FROM operational_combined
-- WHERE kategori LIKE '%Kurang%'
--   AND CASE 
--     WHEN is_retroactive = true AND original_month IS NOT NULL 
--     THEN original_month 
--     ELSE tanggal 
--   END >= '2025-10-01'
--   AND CASE 
--     WHEN is_retroactive = true AND original_month IS NOT NULL 
--     THEN original_month 
--     ELSE tanggal 
--   END <= '2025-10-31';
--
-- EXAMPLE 3: Insert new retroactive transaction
-- INSERT INTO operational (
--   tanggal, kategori, nominal, deskripsi, divisi, cabang_id,
--   is_retroactive, original_month
-- ) VALUES (
--   '2025-11-01',  -- Tanggal dibuat (hari ini)
--   'Gaji Kurang Modal',
--   5000000,
--   'Gaji bulan Oktober (retroaktif)',
--   'sport',
--   1,
--   true,  -- Flag retroaktif
--   '2025-10-31'  -- Bulan asli transaksi (Oktober)
-- );
--
-- ========================================
