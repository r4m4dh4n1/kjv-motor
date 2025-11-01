-- ========================================
-- FIX operational_combined VIEW - STEP BY STEP
-- ========================================
-- Tujuan: Menambahkan field yang hilang kemudian recreate view
-- Tanggal: 2025-11-01
-- Urutan: JALANKAN SCRIPT INI DARI ATAS KE BAWAH
-- ========================================

-- ========================================
-- STEP 1: CEK KOLOM YANG ADA SEKARANG
-- ========================================
SELECT 
    'BEFORE' as status,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('operational', 'operational_history')
    AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ========================================
-- STEP 2: TAMBAH KOLOM KE TABEL operational (jika belum ada)
-- ========================================
ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE;

ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS original_month DATE;

-- ========================================
-- STEP 3: TAMBAH KOLOM KE TABEL operational_history (jika belum ada)
-- ========================================
ALTER TABLE operational_history 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE;

ALTER TABLE operational_history 
ADD COLUMN IF NOT EXISTS original_month DATE;

-- ========================================
-- STEP 4: CEK LAGI SETELAH DITAMBAHKAN
-- ========================================
SELECT 
    'AFTER' as status,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('operational', 'operational_history')
    AND column_name IN ('is_retroactive', 'original_month')
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- ========================================
-- STEP 5: DROP VIEW LAMA (WAJIB!)
-- ========================================
-- CATATAN: Harus DROP dulu sebelum CREATE karena struktur kolom berubah
DROP VIEW IF EXISTS operational_combined CASCADE;

-- ========================================
-- STEP 6: CREATE VIEW BARU DENGAN KOLOM LENGKAP
-- ========================================
CREATE VIEW operational_combined AS
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
-- STEP 7: VERIFIKASI VIEW BERHASIL DIBUAT
-- ========================================
SELECT 
    '✅ VIEW CREATED' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN data_source = 'active' THEN 1 END) as active_records,
    COUNT(CASE WHEN data_source = 'history' THEN 1 END) as history_records,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_records,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_combined;

-- ========================================
-- STEP 8: TEST QUERY VIEW
-- ========================================
SELECT 
    '✅ SAMPLE DATA' as status,
    id,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    data_source
FROM operational_combined
ORDER BY tanggal DESC
LIMIT 5;

-- ========================================
-- STEP 9: CREATE INDEXES UNTUK PERFORMANCE
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
-- FINAL MESSAGE
-- ========================================
SELECT '✅ ========================================' as message
UNION ALL SELECT '✅ SETUP SELESAI!'
UNION ALL SELECT '✅ ========================================'
UNION ALL SELECT '✅ Field is_retroactive & original_month sudah ditambahkan'
UNION ALL SELECT '✅ View operational_combined sudah di-recreate'
UNION ALL SELECT '✅ Indexes sudah dibuat untuk performance'
UNION ALL SELECT '✅ ========================================'
UNION ALL SELECT '📝 NEXT: Test dengan query berikut:'
UNION ALL SELECT '📝 SELECT * FROM operational_combined WHERE is_retroactive = true;'
UNION ALL SELECT '✅ ========================================';
