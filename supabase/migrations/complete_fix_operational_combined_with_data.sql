-- ========================================
-- COMPLETE FIX: operational_combined dengan Retroactive Data
-- ========================================
-- Tujuan: Setup lengkap + fix data retroactive di operational_history
-- Tanggal: 2025-11-01
-- ========================================

-- ========================================
-- PART 1: TAMBAH KOLOM (jika belum ada)
-- ========================================
ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE;

ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS original_month DATE;

ALTER TABLE operational_history 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE;

ALTER TABLE operational_history 
ADD COLUMN IF NOT EXISTS original_month DATE;

-- ========================================
-- PART 2: CEK DATA SEBELUM FIX
-- ========================================
SELECT '📊 DATA SEBELUM FIX' as info;

SELECT 
    'operational' as tabel,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational
UNION ALL
SELECT 
    'operational_history' as tabel,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_history;

-- ========================================
-- PART 3: COPY DATA RETROACTIVE KE HISTORY
-- ========================================
-- STRATEGI 1: Match by ID
UPDATE operational_history oh
SET 
    is_retroactive = o.is_retroactive,
    original_month = o.original_month
FROM operational o
WHERE oh.id = o.id
  AND o.is_retroactive = true;

-- Jika ada data yang tidak match by ID, coba match by data attributes
UPDATE operational_history oh
SET 
    is_retroactive = o.is_retroactive,
    original_month = o.original_month
FROM operational o
WHERE oh.tanggal = o.tanggal
  AND oh.kategori = o.kategori
  AND oh.nominal = o.nominal
  AND COALESCE(oh.deskripsi, '') = COALESCE(o.deskripsi, '')
  AND oh.divisi = o.divisi
  AND o.is_retroactive = true
  AND oh.is_retroactive = false; -- Only update if not already updated

-- ========================================
-- PART 4: DROP & RECREATE VIEW
-- ========================================
DROP VIEW IF EXISTS operational_combined CASCADE;

CREATE VIEW operational_combined AS
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
-- PART 5: VERIFIKASI HASIL
-- ========================================
SELECT '✅ DATA SETELAH FIX' as info;

SELECT 
    'operational' as tabel,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational
UNION ALL
SELECT 
    'operational_history' as tabel,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_history;

-- Verifikasi di view
SELECT '✅ VERIFIKASI VIEW' as info;

SELECT 
    data_source,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_combined
GROUP BY data_source
ORDER BY data_source;

-- ========================================
-- PART 6: SAMPLE DATA RETROACTIVE
-- ========================================
SELECT '✅ SAMPLE DATA RETROACTIVE' as info;

SELECT 
    id,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    data_source
FROM operational_combined
WHERE is_retroactive = true
ORDER BY tanggal DESC, data_source
LIMIT 10;

-- ========================================
-- PART 7: CREATE INDEXES
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
-- SUCCESS MESSAGE
-- ========================================
SELECT '✅ ========================================' as message
UNION ALL SELECT '✅ SETUP & FIX SELESAI!'
UNION ALL SELECT '✅ ========================================'
UNION ALL SELECT '✅ 1. Field ditambahkan ke kedua tabel'
UNION ALL SELECT '✅ 2. Data retroactive di-copy ke operational_history'
UNION ALL SELECT '✅ 3. View operational_combined di-recreate'
UNION ALL SELECT '✅ 4. Indexes dibuat untuk performance'
UNION ALL SELECT '✅ ========================================'
UNION ALL SELECT '📝 NEXT: Cek hasil di atas, pastikan retroactive_count > 0'
UNION ALL SELECT '✅ ========================================';
