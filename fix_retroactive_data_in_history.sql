-- ========================================
-- FIX RETROACTIVE DATA IN operational_history
-- ========================================
-- Tujuan: Copy nilai is_retroactive dan original_month dari operational ke operational_history
-- Tanggal: 2025-11-01
-- Masalah: Data di operational_history punya is_retroactive=FALSE dan original_month=NULL
--          padahal di operational punya nilai yang benar
-- ========================================

-- ========================================
-- STEP 1: CEK DATA SEBELUM FIX
-- ========================================
SELECT 
    '📊 BEFORE FIX - operational' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational;

SELECT 
    '📊 BEFORE FIX - operational_history' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_history;

-- ========================================
-- STEP 2: LIHAT SAMPLE DATA YANG BERMASALAH
-- ========================================
SELECT 
    '🔍 SAMPLE - Data di operational dengan retroactive=TRUE' as info,
    id,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month
FROM operational
WHERE is_retroactive = true
LIMIT 5;

-- ========================================
-- STEP 3: UPDATE operational_history
-- ========================================
-- STRATEGI 1: Jika ID di operational_history SAMA dengan ID di operational
-- (asumsi: data history adalah snapshot dari operational dengan ID yang sama)
UPDATE operational_history oh
SET 
    is_retroactive = o.is_retroactive,
    original_month = o.original_month
FROM operational o
WHERE oh.id = o.id
  AND o.is_retroactive = true;

-- ========================================
-- STEP 4: CEK HASIL SETELAH UPDATE
-- ========================================
SELECT 
    '✅ AFTER FIX - operational' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational;

SELECT 
    '✅ AFTER FIX - operational_history' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_history;

-- ========================================
-- STEP 5: VERIFIKASI DI VIEW operational_combined
-- ========================================
SELECT 
    '✅ VIEW operational_combined' as status,
    data_source,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_combined
GROUP BY data_source
ORDER BY data_source;

-- ========================================
-- STEP 6: SAMPLE DATA SETELAH FIX
-- ========================================
SELECT 
    '✅ SAMPLE AFTER FIX' as info,
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
LIMIT 10;

-- ========================================
-- ALTERNATIVE STRATEGI (jika ID tidak match)
-- ========================================
-- Jika strategi di atas tidak berhasil (karena ID di history berbeda),
-- coba strategi ini: match berdasarkan tanggal, kategori, nominal, deskripsi

/*
UPDATE operational_history oh
SET 
    is_retroactive = o.is_retroactive,
    original_month = o.original_month
FROM operational o
WHERE oh.tanggal = o.tanggal
  AND oh.kategori = o.kategori
  AND oh.nominal = o.nominal
  AND oh.deskripsi = o.deskripsi
  AND o.is_retroactive = true;
*/

-- ========================================
-- NOTES
-- ========================================
-- 1. Script ini akan UPDATE data di operational_history
-- 2. Hanya data dengan is_retroactive=TRUE di operational yang akan di-copy
-- 3. Matching dilakukan berdasarkan ID (atau bisa pakai tanggal+kategori+nominal)
-- 4. Setelah script ini, view operational_combined akan menampilkan data yang benar
-- ========================================
