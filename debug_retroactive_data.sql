-- ========================================
-- DEBUG: Check Retroactive Data for October
-- ========================================

-- 1. Cek semua data retroactive di operational_combined
SELECT 
    '📊 ALL RETROACTIVE DATA' as info,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    data_source,
    EXTRACT(MONTH FROM original_month) as original_month_number,
    EXTRACT(MONTH FROM tanggal::date) as tanggal_month_number
FROM operational_combined
WHERE is_retroactive = TRUE
ORDER BY original_month DESC, tanggal DESC;

-- 2. Cek specifically untuk Oktober 2025
SELECT 
    '✅ OCTOBER 2025 RETROACTIVE' as info,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    data_source
FROM operational_combined
WHERE is_retroactive = TRUE
  AND original_month >= '2025-10-01'
  AND original_month <= '2025-10-31'
ORDER BY tanggal DESC;

-- 3. Cek yang kategori Kurang Modal/Profit untuk Oktober
SELECT 
    '🔍 KURANG MODAL/PROFIT - OCTOBER' as info,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    data_source
FROM operational_combined
WHERE (
    kategori LIKE '%Kurang Modal%' 
    OR kategori LIKE '%Kurang Profit%'
  )
  AND is_retroactive = TRUE
ORDER BY original_month DESC, tanggal DESC;


-- 4. Cek transaksi tanggal 1 November
SELECT 
    '📅 NOVEMBER 1, 2025 TRANSACTIONS' as info,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    data_source
FROM operational_combined
WHERE tanggal = '2025-11-01'
  AND (
    kategori LIKE '%Kurang Modal%' 
    OR kategori LIKE '%Kurang Profit%'
  )
ORDER BY kategori;

-- 5. Count summary
SELECT 
    '📊 SUMMARY' as info,
    COUNT(*) FILTER (WHERE is_retroactive = TRUE) as total_retroactive,
    COUNT(*) FILTER (WHERE is_retroactive = TRUE AND original_month >= '2025-10-01' AND original_month <= '2025-10-31') as october_retroactive,
    COUNT(*) FILTER (WHERE is_retroactive = TRUE AND original_month >= '2025-09-01' AND original_month <= '2025-09-30') as september_retroactive,
    COUNT(*) FILTER (WHERE tanggal = '2025-11-01') as nov_1_transactions
FROM operational_combined
WHERE kategori LIKE '%Kurang Modal%' 
   OR kategori LIKE '%Kurang Profit%';
