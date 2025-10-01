# Retroactive Operational Adjustment

Fitur ini memungkinkan pencatatan transaksi operational yang perlu dimasukkan ke bulan yang sudah di-close dengan sistem approval yang ketat.

## Fitur Utama

### 1. Pengajuan Retroactive Operational
- **Komponen**: `RetroactiveOperationalDialog.tsx`
- **Fungsi**: Form untuk mengajukan transaksi operational retroactive
- **Validasi**: 
  - Bulan target harus sudah di-close
  - Company harus memiliki modal yang cukup
  - Nominal harus valid
  - Kategori sesuai dengan operational categories

### 2. Sistem Approval
- **Komponen**: `RetroactiveApprovalPage.tsx`
- **Fungsi**: Dashboard untuk approve/reject pengajuan
- **Role**: Hanya manager/admin yang bisa approve
- **Audit Trail**: Lengkap dengan timestamp dan user

### 3. Impact Calculation
- **Modal Impact**: Semua kategori mengurangi modal company
- **Profit Impact**: Hanya kategori "Gaji Kurang Profit" yang mengurangi profit
- **Preview**: Tampilkan dampak sebelum approval

## Database Schema

### Tabel Utama

#### `retroactive_operational`
```sql
- id: UUID (Primary Key)
- original_month: VARCHAR(7) -- Format YYYY-MM
- original_year: INTEGER
- adjustment_date: DATE
- category: VARCHAR(100)
- nominal: DECIMAL(15,2)
- description: TEXT
- company_id: UUID (FK to companies)
- divisi: VARCHAR(50)
- status: ENUM('pending', 'approved', 'rejected')
- approved_by: UUID (FK to auth.users)
- approved_at: TIMESTAMP
- rejected_reason: TEXT
- notes: TEXT
- created_by: UUID (FK to auth.users)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `monthly_adjustments`
```sql
- id: UUID (Primary Key)
- month: VARCHAR(7) -- Format YYYY-MM
- year: INTEGER
- divisi: VARCHAR(50)
- total_adjustments: DECIMAL(15,2)
- total_impact_profit: DECIMAL(15,2)
- total_impact_modal: DECIMAL(15,2)
- adjustment_count: INTEGER
- last_adjustment_date: DATE
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `monthly_closures`
```sql
- id: UUID (Primary Key)
- month: INTEGER (1-12)
- year: INTEGER
- divisi: VARCHAR(50)
- status: ENUM('closed', 'restored')
- closed_by: UUID (FK to auth.users)
- closed_at: TIMESTAMP
- restored_by: UUID (FK to auth.users)
- restored_at: TIMESTAMP
- notes: TEXT
```

### Modifikasi Tabel Existing

#### `operational`
```sql
-- Tambahan kolom:
- is_retroactive: BOOLEAN DEFAULT FALSE
- retroactive_id: UUID (FK to retroactive_operational)
```

## Workflow

### 1. Pengajuan
1. User membuka dialog retroactive operational
2. Pilih bulan yang sudah close
3. Isi data transaksi (kategori, nominal, company, deskripsi)
4. System menghitung dampak terhadap modal dan profit
5. Submit pengajuan dengan status 'pending'

### 2. Approval
1. Manager/Admin melihat daftar pengajuan pending
2. Review detail pengajuan dan dampaknya
3. Approve atau reject dengan alasan
4. Jika approved, system otomatis execute adjustment

### 3. Execution (Auto setelah Approval)
1. Insert record ke tabel `operational` dengan tanggal original month
2. Update modal company
3. Jika kategori "Kurang Profit", panggil RPC `deduct_profit`
4. Insert ke tabel `pembukuan` untuk audit trail
5. Update/Insert ke `monthly_adjustments` untuk tracking

## Security & Permissions

### Row Level Security (RLS)
- **retroactive_operational**: User hanya bisa lihat pengajuan sendiri, kecuali admin/manager
- **monthly_adjustments**: Hanya admin/manager/finance yang bisa akses
- **monthly_closures**: Hanya admin/manager yang bisa akses

### Role-based Access
- **User biasa**: Bisa buat pengajuan, lihat pengajuan sendiri
- **Manager/Admin**: Bisa approve/reject, lihat semua pengajuan
- **Finance**: Bisa lihat data untuk reporting

## Integrasi dengan Sistem Existing

### 1. Operational Page
- Tambahkan komponen `RetroactiveOperationalIntegration`
- Tampilkan sebagai card terpisah di bawah form operational biasa

### 2. Finance Dashboard
- Integrasikan dengan `ProfitAdjustmentSummary`
- Tampilkan dampak retroactive adjustment

### 3. Close Month Process
- Validasi tidak ada pending retroactive adjustment sebelum close
- Update monthly_closures table

## Installation Steps

### 1. Database Setup
```sql
-- Jalankan script SQL
\i src/sql/retroactive_schema.sql
```

### 2. Component Integration
```tsx
// Di OperationalPage.tsx
import RetroactiveOperationalIntegration from "@/components/operational/RetroactiveOperationalIntegration";

// Tambahkan di render:
<RetroactiveOperationalIntegration 
  selectedDivision={selectedDivision}
  onRefresh={fetchOperationalData}
/>
```

### 3. Routing
```tsx
// Tambahkan route untuk approval page
{
  path: "/operational/retroactive-approval",
  element: <RetroactiveApprovalPage />
}
```

### 4. Menu Integration
```tsx
// Di Sidebar.tsx, tambahkan sub-menu di operational:
{
  title: "Retroactive Approval",
  href: "/operational/retroactive-approval",
  icon: CalendarDays,
  roles: ["admin", "manager"]
}
```

## Testing Checklist

### Functional Testing
- [ ] Buat pengajuan retroactive operational
- [ ] Validasi bulan sudah close
- [ ] Kalkulasi dampak modal dan profit
- [ ] Approve pengajuan
- [ ] Reject pengajuan dengan alasan
- [ ] Verifikasi data masuk ke operational table
- [ ] Verifikasi update modal company
- [ ] Verifikasi entry pembukuan

### Security Testing
- [ ] User biasa tidak bisa approve
- [ ] RLS berfungsi dengan benar
- [ ] Audit trail lengkap
- [ ] Validasi input

### Integration Testing
- [ ] Integrasi dengan ProfitAdjustmentSummary
- [ ] Integrasi dengan close month process
- [ ] Integrasi dengan operational page

## Monitoring & Maintenance

### Key Metrics
- Jumlah pengajuan per bulan
- Tingkat approval rate
- Dampak total terhadap profit/modal
- Response time approval

### Regular Tasks
- Review pengajuan yang pending terlalu lama
- Audit dampak adjustment terhadap laporan keuangan
- Backup data monthly_adjustments

## Troubleshooting

### Common Issues
1. **Pengajuan tidak muncul**: Cek RLS policy dan role user
2. **Approval gagal**: Cek modal company mencukupi
3. **Data tidak update**: Cek foreign key constraints
4. **Performance lambat**: Cek index pada tabel besar

### Error Handling
- Semua error ditangkap dan ditampilkan ke user
- Log error untuk debugging
- Rollback transaction jika ada kegagalan

## Future Enhancements

1. **Bulk Approval**: Approve multiple pengajuan sekaligus
2. **Email Notification**: Notifikasi otomatis untuk approval
3. **Advanced Reporting**: Dashboard khusus untuk retroactive adjustments
4. **API Integration**: REST API untuk integrasi external
5. **Mobile Support**: Responsive design untuk mobile approval