-- Script untuk memperbaiki data retroaktif lama
-- Mengupdate tanggal operational dan pembukuan agar sesuai dengan bulan target

-- 1. Update tabel operational untuk data retroaktif kategori "gaji mengurangi modal"
-- Menggunakan original_month sebagai tanggal yang benar
UPDATE operational 
SET tanggal = original_month
WHERE is_retroactive = true 
  AND kategori LIKE '%gaji%modal%'
  AND original_month IS NOT NULL
  AND tanggal != original_month;

-- 2. Update tabel pembukuan untuk data retroaktif kategori "gaji mengurangi modal"  
-- Mencari berdasarkan keterangan yang mengandung "Retroaktif Modal"
UPDATE pembukuan 
SET tanggal = (
    SELECT o.original_month 
    FROM operational o 
    WHERE o.is_retroactive = true 
      AND o.kategori LIKE '%gaji%modal%'
      AND pembukuan.keterangan LIKE '%' || o.deskripsi || '%'
      AND o.original_month IS NOT NULL
    LIMIT 1
)
WHERE keterangan LIKE '%Retroaktif Modal%'
  AND EXISTS (
    SELECT 1 FROM operational o 
    WHERE o.is_retroactive = true 
      AND o.kategori LIKE '%gaji%modal%'
      AND pembukuan.keterangan LIKE '%' || o.deskripsi || '%'
      AND o.original_month IS NOT NULL
  );

-- 3. Alternatif: Update berdasarkan company_id dan nominal yang sama
UPDATE pembukuan 
SET tanggal = (
    SELECT o.original_month 
    FROM operational o 
    WHERE o.is_retroactive = true 
      AND o.kategori LIKE '%gaji%modal%'
      AND o.company_id = pembukuan.company_id
      AND o.nominal = pembukuan.debit
      AND o.original_month IS NOT NULL
    ORDER BY o.created_at DESC
    LIMIT 1
)
WHERE keterangan LIKE '%gaji%'
  AND keterangan LIKE '%modal%'
  AND EXISTS (
    SELECT 1 FROM operational o 
    WHERE o.is_retroactive = true 
      AND o.kategori LIKE '%gaji%modal%'
      AND o.company_id = pembukuan.company_id
      AND o.nominal = pembukuan.debit
      AND o.original_month IS NOT NULL
  );

-- 4. Verifikasi hasil update
SELECT 
    'operational' as tabel,
    COUNT(*) as total_updated
FROM operational 
WHERE is_retroactive = true 
  AND kategori LIKE '%gaji%modal%'
  AND tanggal = original_month

UNION ALL

SELECT 
    'pembukuan' as tabel,
    COUNT(*) as total_records
FROM pembukuan 
WHERE keterangan LIKE '%gaji%'
  AND keterangan LIKE '%modal%';

-- 5. Tampilkan data yang sudah diperbaiki untuk verifikasi
SELECT 
    o.tanggal as tanggal_operational,
    o.original_month as bulan_target,
    o.kategori,
    o.deskripsi,
    o.nominal,
    o.company_id,
    p.tanggal as tanggal_pembukuan,
    p.keterangan
FROM operational o
LEFT JOIN pembukuan p ON (
    p.company_id = o.company_id 
    AND p.debit = o.nominal
    AND p.keterangan LIKE '%' || SUBSTRING(o.deskripsi FROM 1 FOR 20) || '%'
)
WHERE o.is_retroactive = true 
  AND o.kategori LIKE '%gaji%modal%'
ORDER BY o.created_at DESC
LIMIT 10;