-- Test final untuk memastikan operational_combined berfungsi dengan benar
-- Jalankan query ini di Supabase SQL Editor

-- 1. Test query untuk melihat data dengan kolom yang diperlukan
SELECT 
    kategori,
    nominal,
    tanggal,
    is_retroactive,
    original_month,
    data_source,
    divisi
FROM operational_combined 
WHERE tanggal >= '2024-01-01'
AND kategori IN ('Kurang Modal', 'Kurang Profit')
ORDER BY tanggal DESC
LIMIT 10;

-- 2. Test query untuk melihat distribusi data berdasarkan source
SELECT 
    data_source,
    COUNT(*) as total_records,
    COUNT(CASE WHEN kategori = 'Kurang Modal' THEN 1 END) as kurang_modal_count,
    COUNT(CASE WHEN kategori = 'Kurang Profit' THEN 1 END) as kurang_profit_count,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count,
    COUNT(CASE WHEN original_month IS NOT NULL THEN 1 END) as with_original_month
FROM operational_combined 
WHERE tanggal >= '2024-01-01'
GROUP BY data_source
ORDER BY data_source;

-- 3. Test query untuk periode bulan lalu (simulasi filtering aplikasi)
SELECT 
    kategori,
    SUM(nominal) as total_nominal,
    COUNT(*) as record_count
FROM operational_combined 
WHERE tanggal >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
AND tanggal < DATE_TRUNC('month', CURRENT_DATE)
AND kategori IN ('Kurang Modal', 'Kurang Profit')
GROUP BY kategori
ORDER BY kategori;