# Setup Operational Combined View dengan Retroactive Fields

## 📋 Overview

Script ini menambahkan field `is_retroactive` dan `original_month` ke tabel `operational` dan `operational_history`, serta membuat ulang view `operational_combined` untuk include field-field baru tersebut.

## 🎯 Tujuan

Memungkinkan pencatatan transaksi retroaktif (transaksi yang dibuat setelah bulan ditutup) dengan informasi bulan aslinya, sehingga laporan keuangan bisa menampilkan transaksi di bulan yang benar.

## 📁 File yang Tersedia

1. **`setup_operational_combined_complete.sql`** ⭐ **[RECOMMENDED]**

   - Script lengkap all-in-one
   - Include verification dan sample queries
   - Aman dijalankan berkali-kali
   - **Gunakan file ini untuk setup**

2. **`add_retroactive_fields_to_tables.sql`**

   - Hanya menambahkan field ke tabel
   - Untuk update manual jika diperlukan

3. **`recreate_operational_combined_view.sql`**

   - Hanya recreate view
   - Gunakan jika field sudah ada tapi view belum update

4. **`supabase/migrations/20251101000000_add_retroactive_fields_to_operational.sql`**
   - Migration file untuk Supabase
   - Gunakan jika menggunakan Supabase CLI

## 🚀 Cara Menggunakan

### Option 1: Supabase Dashboard (RECOMMENDED)

1. Login ke Supabase Dashboard
2. Buka project Anda
3. Pilih **SQL Editor** di sidebar
4. Copy-paste isi file `setup_operational_combined_complete.sql`
5. Klik **Run** atau tekan `Ctrl+Enter`
6. Lihat hasil verification di output

### Option 2: Supabase CLI

```bash
# Jalankan migration
supabase db push

# Atau reset dan push ulang
supabase db reset
```

### Option 3: Manual via psql

```bash
psql -U postgres -d your_database -f setup_operational_combined_complete.sql
```

## ✅ Verification

Setelah menjalankan script, cek hasil dengan query berikut:

```sql
-- 1. Cek apakah field sudah ada
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('operational', 'operational_history')
    AND column_name IN ('is_retroactive', 'original_month')
ORDER BY table_name, column_name;

-- 2. Cek summary data
SELECT
    data_source,
    COUNT(*) as total,
    COUNT(CASE WHEN is_retroactive = true THEN 1 END) as retroactive_count
FROM operational_combined
GROUP BY data_source;

-- 3. Cek sample data retroaktif
SELECT * FROM operational_combined
WHERE is_retroactive = true
LIMIT 5;
```

## 📊 Field Definitions

### `is_retroactive` (BOOLEAN)

- **Default**: `FALSE`
- **Purpose**: Flag untuk menandai transaksi retroaktif
- **Usage**: Set ke `TRUE` untuk transaksi yang dibuat setelah bulan ditutup

### `original_month` (DATE)

- **Default**: `NULL`
- **Purpose**: Menyimpan bulan asli transaksi
- **Format**: `YYYY-MM-DD` (biasanya tanggal akhir bulan)
- **Usage**: Diisi hanya jika `is_retroactive = TRUE`
- **Example**: `'2025-10-31'` untuk transaksi Oktober

## 💡 Contoh Penggunaan

### 1. Insert Transaksi Retroaktif

```sql
-- Transaksi dibuat tanggal 1 November untuk bulan Oktober
INSERT INTO operational (
    tanggal,
    kategori,
    nominal,
    deskripsi,
    divisi,
    cabang_id,
    company_id,
    is_retroactive,
    original_month
) VALUES (
    '2025-11-01',           -- Tanggal dibuat (hari ini)
    'Gaji Kurang Modal',
    5000000,
    'Gaji bulan Oktober (retroaktif)',
    'sport',
    1,
    1,
    true,                   -- Flag retroaktif
    '2025-10-31'           -- Bulan asli (Oktober)
);
```

### 2. Query Transaksi untuk Bulan Tertentu (dengan Retroaktif)

```sql
-- Ambil semua transaksi untuk Oktober 2025 (termasuk yang retroaktif)
SELECT
    id,
    tanggal,
    kategori,
    nominal,
    is_retroactive,
    original_month,
    CASE
        WHEN is_retroactive = true AND original_month IS NOT NULL
        THEN original_month
        ELSE tanggal
    END as effective_date
FROM operational_combined
WHERE (
    -- Transaksi normal Oktober
    (is_retroactive = false OR is_retroactive IS NULL)
    AND tanggal >= '2025-10-01'
    AND tanggal <= '2025-10-31'
) OR (
    -- Transaksi retroaktif untuk Oktober
    is_retroactive = true
    AND original_month >= '2025-10-01'
    AND original_month <= '2025-10-31'
)
ORDER BY effective_date DESC;
```

### 3. Filter untuk Laba Rugi Report

```sql
-- Query untuk laporan Laba Rugi bulan Oktober
-- (logic yang sama dengan di LabaRugiPage.tsx)
WITH filtered_operational AS (
    SELECT
        *,
        CASE
            WHEN is_retroactive = true
                 AND kategori LIKE '%Kurang%'
                 AND original_month IS NOT NULL
            THEN original_month
            ELSE tanggal
        END as report_date
    FROM operational_combined
)
SELECT
    kategori,
    SUM(nominal) as total_nominal,
    COUNT(*) as transaction_count
FROM filtered_operational
WHERE EXTRACT(YEAR FROM report_date) = 2025
  AND EXTRACT(MONTH FROM report_date) = 10  -- Oktober
GROUP BY kategori
ORDER BY kategori;
```

## 🔧 Troubleshooting

### Error: "column already exists"

Script menggunakan `IF NOT EXISTS`, jadi ini normal. Field tidak akan ditambahkan lagi.

### Error: "view operational_combined already exists"

Script akan DROP view terlebih dahulu, jadi ini tidak akan terjadi.

### Data retroaktif tidak muncul di report

Pastikan:

1. Field `is_retroactive` = `TRUE`
2. Field `original_month` diisi dengan tanggal yang benar
3. Logic filtering di aplikasi sudah menggunakan `original_month` untuk retroaktif

### View tidak bisa di-query

Cek apakah kedua tabel (`operational` dan `operational_history`) masih ada:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('operational', 'operational_history');
```

## 📝 Notes

1. **Data Existing**: Transaksi yang sudah ada akan memiliki:

   - `is_retroactive = FALSE` (default)
   - `original_month = NULL`

2. **Performance**: Index sudah dibuat untuk `is_retroactive` dan `original_month` untuk performa query yang optimal

3. **View Access**: View `operational_combined` read-only. Untuk insert/update/delete, gunakan tabel asli (`operational` atau `operational_history`)

4. **Backward Compatibility**: Script ini tidak mengubah struktur existing, hanya menambahkan field baru

## 🔗 Related Files

- Application logic: `src/components/finance/LabaRugiPage.tsx`
- Retroactive dialog: `src/components/operational/RetroactiveOperationalDialog.tsx`
- Types: `src/integrations/supabase/types.ts` (perlu regenerate setelah migration)

## ✨ Next Steps

Setelah menjalankan script:

1. ✅ Regenerate Supabase types:

   ```bash
   npx supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts
   ```

2. ✅ Update aplikasi untuk menggunakan field baru

3. ✅ Test retroactive transaction flow

4. ✅ Verify laporan Laba Rugi menampilkan data dengan benar

## 🆘 Support

Jika ada masalah, cek:

- Console log untuk error details
- Supabase logs di Dashboard > Logs
- SQL Editor di Dashboard untuk manual query

---

**Created**: November 1, 2025  
**Last Updated**: November 1, 2025  
**Version**: 1.0.0
