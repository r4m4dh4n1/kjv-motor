-- MIGRATION: Create operational_combined view (Simplified Version)
-- Jalankan script ini di Supabase SQL Editor

-- Step 1: Drop view jika sudah ada (untuk memastikan clean slate)
DROP VIEW IF EXISTS operational_combined;

-- Step 2: Create operational_combined view dengan UNION yang benar
CREATE VIEW operational_combined AS
SELECT 
    id,
    kategori,
    nominal,
    deskripsi,
    tanggal,
    divisi,
    cabang_id,
    is_retroactive,
    original_month,
    'operational' as data_source
FROM operational

UNION ALL

SELECT 
    id,
    kategori,
    nominal,
    deskripsi,
    tanggal,
    divisi,
    cabang_id,
    false as is_retroactive,  -- Default untuk operational_history
    NULL as original_month,   -- Default untuk operational_history
    'operational_history' as data_source
FROM operational_history;

-- Step 3: Grant permissions
GRANT SELECT ON operational_combined TO authenticated;
GRANT SELECT ON operational_combined TO anon;

-- Step 4: Test query untuk memastikan view berfungsi
SELECT 
    data_source,
    COUNT(*) as record_count,
    MIN(tanggal) as earliest_date,
    MAX(tanggal) as latest_date
FROM operational_combined 
GROUP BY data_source
ORDER BY data_source;

-- Step 5: Test query untuk melihat sample data
SELECT 
    kategori,
    nominal,
    tanggal,
    is_retroactive,
    original_month,
    data_source
FROM operational_combined 
WHERE tanggal >= '2024-01-01'
ORDER BY tanggal DESC
LIMIT 10;