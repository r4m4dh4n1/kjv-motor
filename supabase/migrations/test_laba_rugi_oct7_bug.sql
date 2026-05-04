-- ================================================================
-- TEST QUERY: Bug Laba Rugi Versi 7 Oktober 2025
-- Cek apakah transaksi dari bulan lain ikut terhitung
-- ================================================================

-- Asumsi: Testing untuk periode "Last Month" (September 2025) 
-- pada tanggal 7 Oktober 2025

-- ================================================================
-- 1. QUERY YANG DIGUNAKAN DI VERSI 7 OKTOBER (PENJUALAN)
-- ================================================================
-- Query database menggunakan .gte() dan .lte() dengan ISO string
-- Contoh untuk Last Month (September 2025) dari tanggal 7 Oktober 2025:

SELECT 
    id,
    tanggal,
    tanggal::date as tanggal_date,
    EXTRACT(MONTH FROM tanggal) as bulan,
    EXTRACT(YEAR FROM tanggal) as tahun,
    harga_jual,
    harga_beli,
    keuntungan,
    divisi,
    status
FROM penjualans
WHERE status = 'selesai'
  AND tanggal >= '2025-09-01T00:00:00.000Z'::timestamptz  -- Start of Sept (UTC)
  AND tanggal <= '2025-09-30T23:59:59.999Z'::timestamptz  -- End of Sept (UTC)
ORDER BY tanggal;

-- MASALAH: Query ini dalam UTC, tapi data tanggal di database dalam WIB
-- Contoh bug:
-- - Tanggal 2025-08-31 23:00 WIB = 2025-08-31 16:00 UTC (masih Agustus)
-- - Tanggal 2025-09-01 06:00 WIB = 2025-08-31 23:00 UTC (dianggap Agustus!)
-- - Tanggal 2025-10-01 02:00 WIB = 2025-09-30 19:00 UTC (dianggap September!)


-- ================================================================
-- 2. CEK TRANSAKSI YANG SEHARUSNYA TIDAK MASUK (AGUSTUS)
-- ================================================================
-- Cari transaksi Agustus yang bisa ikut masuk karena timezone bug

SELECT 
    id,
    tanggal,
    tanggal::date as tanggal_date,
    tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta' as tanggal_wib,
    EXTRACT(MONTH FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) as bulan_wib,
    EXTRACT(YEAR FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) as tahun_wib,
    harga_jual,
    keuntungan,
    'AGUSTUS - SEHARUSNYA TIDAK MASUK' as keterangan
FROM penjualans
WHERE status = 'selesai'
  -- Query asli mencari >= Sept 1 UTC
  AND tanggal >= '2025-09-01T00:00:00.000Z'::timestamptz
  -- Tapi data ini sebenarnya masih Agustus di WIB
  AND EXTRACT(MONTH FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) = 8
  AND EXTRACT(YEAR FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) = 2025
ORDER BY tanggal;


-- ================================================================
-- 3. CEK TRANSAKSI YANG SEHARUSNYA TIDAK MASUK (OKTOBER)
-- ================================================================
-- Cari transaksi Oktober yang bisa ikut masuk karena timezone bug

SELECT 
    id,
    tanggal,
    tanggal::date as tanggal_date,
    tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta' as tanggal_wib,
    EXTRACT(MONTH FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) as bulan_wib,
    EXTRACT(YEAR FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) as tahun_wib,
    harga_jual,
    keuntungan,
    'OKTOBER - SEHARUSNYA TIDAK MASUK' as keterangan
FROM penjualans
WHERE status = 'selesai'
  -- Query asli mencari <= Sept 30 23:59:59 UTC
  AND tanggal <= '2025-09-30T23:59:59.999Z'::timestamptz
  -- Tapi data ini sebenarnya sudah Oktober di WIB
  AND EXTRACT(MONTH FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) = 10
  AND EXTRACT(YEAR FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) = 2025
ORDER BY tanggal;


-- ================================================================
-- 4. OPERATIONAL - QUERY DENGAN BUG DOUBLE FILTERING
-- ================================================================
-- Query database (sama seperti penjualan)

SELECT 
    id,
    kategori,
    tanggal,
    tanggal::date as tanggal_date,
    tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta' as tanggal_wib,
    EXTRACT(MONTH FROM tanggal) as bulan_utc,
    EXTRACT(MONTH FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) as bulan_wib,
    original_month,
    nominal,
    is_retroactive,
    divisi
FROM operational_combined
WHERE tanggal >= '2025-09-01T00:00:00.000Z'::timestamptz
  AND tanggal <= '2025-09-30T23:59:59.999Z'::timestamptz
ORDER BY tanggal;

-- Kemudian di aplikasi, ada filtering lagi dengan:
-- itemDateWIB.getMonth() === lastMonthDate.getMonth()
-- Ini bisa memfilter sebagian, tapi tetap berisiko edge case


-- ================================================================
-- 5. CUSTOM PERIOD - BUG PALING PARAH
-- ================================================================
-- Contoh: User pilih custom 2025-10-01 sampai 2025-10-15

-- Query database:
SELECT 
    id,
    tanggal,
    tanggal::date as tanggal_date,
    tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta' as tanggal_wib,
    EXTRACT(DAY FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) as hari_wib,
    EXTRACT(MONTH FROM (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')) as bulan_wib,
    harga_jual,
    keuntungan
FROM penjualans
WHERE status = 'selesai'
  AND tanggal >= '2025-10-01T00:00:00.000Z'::timestamptz  -- User input: 2025-10-01
  AND tanggal <= '2025-10-15T23:59:59.999Z'::timestamptz  -- User input: 2025-10-15
ORDER BY tanggal;

-- BUG: Data September 30 malam (23:00 WIB = 16:00 UTC Sept 30) bisa masuk!
-- BUG: Data Oktober 16 pagi (01:00 WIB = Oct 15 18:00 UTC) tidak masuk!


-- ================================================================
-- 6. QUERY YANG BENAR (REKOMENDASI)
-- ================================================================
-- Gunakan date comparison di timezone WIB, bukan UTC

-- Untuk Last Month (September 2025):
SELECT 
    id,
    tanggal,
    (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date as tanggal_wib_date,
    harga_jual,
    keuntungan
FROM penjualans
WHERE status = 'selesai'
  AND (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date >= '2025-09-01'::date
  AND (tanggal AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::date <= '2025-09-30'::date
ORDER BY tanggal;


-- Atau lebih sederhana, jika data tanggal sudah dalam WIB:
SELECT 
    id,
    tanggal::date as tanggal_date,
    EXTRACT(MONTH FROM tanggal) as bulan,
    EXTRACT(YEAR FROM tanggal) as tahun,
    harga_jual,
    keuntungan
FROM penjualans
WHERE status = 'selesai'
  AND tanggal::date >= '2025-09-01'::date
  AND tanggal::date <= '2025-09-30'::date
ORDER BY tanggal;


-- ================================================================
-- 7. TEST CASE SPESIFIK - Edge Cases
-- ================================================================

-- Test Case 1: Transaksi di penghujung September (23:00 WIB)
-- Apakah masuk dalam query Last Month?
SELECT 
    '2025-09-30 23:00:00+07'::timestamptz as tanggal_wib,
    ('2025-09-30 23:00:00+07'::timestamptz AT TIME ZONE 'UTC') as tanggal_utc,
    ('2025-09-30 23:00:00+07'::timestamptz >= '2025-09-01T00:00:00.000Z'::timestamptz) as masuk_gte,
    ('2025-09-30 23:00:00+07'::timestamptz <= '2025-09-30T23:59:59.999Z'::timestamptz) as masuk_lte,
    'Seharusnya MASUK September' as expected;

-- Test Case 2: Transaksi di awal Oktober (01:00 WIB)
-- Apakah masuk dalam query Last Month?
SELECT 
    '2025-10-01 01:00:00+07'::timestamptz as tanggal_wib,
    ('2025-10-01 01:00:00+07'::timestamptz AT TIME ZONE 'UTC') as tanggal_utc,
    ('2025-10-01 01:00:00+07'::timestamptz >= '2025-09-01T00:00:00.000Z'::timestamptz) as masuk_gte,
    ('2025-10-01 01:00:00+07'::timestamptz <= '2025-09-30T23:59:59.999Z'::timestamptz) as masuk_lte,
    'Seharusnya TIDAK MASUK September' as expected;

-- Test Case 3: Transaksi di akhir Agustus (23:00 WIB)
-- Apakah masuk dalam query Last Month?
SELECT 
    '2025-08-31 23:00:00+07'::timestamptz as tanggal_wib,
    ('2025-08-31 23:00:00+07'::timestamptz AT TIME ZONE 'UTC') as tanggal_utc,
    ('2025-08-31 23:00:00+07'::timestamptz >= '2025-09-01T00:00:00.000Z'::timestamptz) as masuk_gte,
    ('2025-08-31 23:00:00+07'::timestamptz <= '2025-09-30T23:59:59.999Z'::timestamptz) as masuk_lte,
    'Seharusnya TIDAK MASUK September' as expected;


-- ================================================================
-- 8. SUMMARY QUERY - Hitung Total Per Bulan
-- ================================================================
-- Bandingkan total menggunakan metode lama vs baru

WITH metode_lama AS (
  SELECT 
    COUNT(*) as jumlah_transaksi,
    SUM(keuntungan) as total_keuntungan,
    'Metode Lama (UTC dengan .gte/.lte)' as metode
  FROM penjualans
  WHERE status = 'selesai'
    AND tanggal >= '2025-09-01T00:00:00.000Z'::timestamptz
    AND tanggal <= '2025-09-30T23:59:59.999Z'::timestamptz
),
metode_baru AS (
  SELECT 
    COUNT(*) as jumlah_transaksi,
    SUM(keuntungan) as total_keuntungan,
    'Metode Baru (WIB dengan date comparison)' as metode
  FROM penjualans
  WHERE status = 'selesai'
    AND tanggal::date >= '2025-09-01'::date
    AND tanggal::date <= '2025-09-30'::date
)
SELECT * FROM metode_lama
UNION ALL
SELECT * FROM metode_baru;


-- ================================================================
-- 9. OPERATIONAL COMBINED - Test Retroactive Logic
-- ================================================================
-- Cek apakah data retroactive dengan original_month juga bermasalah

SELECT 
    id,
    kategori,
    tanggal,
    tanggal::date as tanggal_date,
    original_month,
    CASE 
        WHEN original_month IS NOT NULL THEN original_month::date
        ELSE tanggal::date
    END as effective_date,
    nominal,
    is_retroactive,
    'Check if in September' as note,
    CASE 
        WHEN original_month IS NOT NULL THEN 
            EXTRACT(MONTH FROM original_month::date) = 9 AND EXTRACT(YEAR FROM original_month::date) = 2025
        ELSE 
            EXTRACT(MONTH FROM tanggal::date) = 9 AND EXTRACT(YEAR FROM tanggal::date) = 2025
    END as should_be_included_in_sept
FROM operational_combined
WHERE 
    -- Query versi lama
    (tanggal >= '2025-09-01T00:00:00.000Z'::timestamptz
    AND tanggal <= '2025-09-30T23:59:59.999Z'::timestamptz)
    -- Atau punya original_month September
    OR (original_month IS NOT NULL 
        AND EXTRACT(MONTH FROM original_month::date) = 9 
        AND EXTRACT(YEAR FROM original_month::date) = 2025)
ORDER BY tanggal, original_month;


-- ================================================================
-- 10. REKOMENDASI FIX
-- ================================================================
-- Query yang BENAR untuk Last Month (September 2025):

-- PENJUALAN
SELECT 
    id,
    tanggal::date,
    harga_jual,
    harga_beli,
    keuntungan,
    divisi
FROM penjualans
WHERE status = 'selesai'
  AND tanggal::date BETWEEN '2025-09-01' AND '2025-09-30'
  -- Atau gunakan EXTRACT jika perlu:
  -- AND EXTRACT(MONTH FROM tanggal) = 9
  -- AND EXTRACT(YEAR FROM tanggal) = 2025
ORDER BY tanggal;

-- OPERATIONAL (dengan retroactive support)
SELECT 
    id,
    kategori,
    tanggal,
    original_month,
    nominal,
    is_retroactive
FROM operational_combined
WHERE 
    -- Untuk data retroactive, gunakan original_month
    (is_retroactive = true 
     AND original_month IS NOT NULL
     AND EXTRACT(MONTH FROM original_month::date) = 9
     AND EXTRACT(YEAR FROM original_month::date) = 2025)
    -- Untuk data normal, gunakan tanggal
    OR (COALESCE(is_retroactive, false) = false
        AND EXTRACT(MONTH FROM tanggal) = 9
        AND EXTRACT(YEAR FROM tanggal) = 2025)
ORDER BY tanggal;
