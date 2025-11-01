-- ========================================
-- RECREATE operational_combined VIEW
-- ========================================
-- Tujuan: Menambahkan field is_retroactive dan original_month ke view
-- Tanggal: 2025-11-01
-- ========================================

-- Step 1: DROP existing view
DROP VIEW IF EXISTS operational_combined;

-- Step 2: CREATE view baru dengan field is_retroactive dan original_month
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
    'active' as data_source  -- Marker untuk data aktif
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
    'history' as data_source  -- Marker untuk data riwayat
FROM operational_history;

-- Step 3: Verify the view
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN data_source = 'active' THEN 1 END) as active_records,
    COUNT(CASE WHEN data_source = 'history' THEN 1 END) as history_records,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_records,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as records_with_original_month
FROM operational_combined;

-- Step 4: Sample data untuk verifikasi
SELECT 
    id,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    data_source
FROM operational_combined
WHERE kategori LIKE '%Kurang%'
ORDER BY tanggal DESC
LIMIT 10;

-- ========================================
-- NOTES:
-- ========================================
-- 1. View ini menggabungkan data dari operational (aktif) dan operational_history (riwayat)
-- 2. Field is_retroactive dan original_month sekarang tersedia di view
-- 3. Field data_source menandakan apakah record dari 'active' atau 'history'
-- 4. Pastikan field is_retroactive dan original_month sudah ada di kedua tabel
-- 5. Jika belum ada, jalankan script add_retroactive_fields.sql terlebih dahulu
-- ========================================
