# QC Role Implementation Summary

## Role: QC (Quality Control)

**Username:** lia@gmail.com

## Access Permissions

### Menus yang Bisa Diakses:

1. ✅ **Dashboard** - View only
2. ✅ **Transaction → Pembelian** - Limited access

### Di Menu Pembelian, QC Bisa:

1. ✅ **Search** - Mencari data pembelian
2. ✅ **Lihat Detail** - Melihat detail pembelian
3. ✅ **History Harga** - Melihat riwayat perubahan harga
4. ✅ **Update Harga** - Update harga pembelian

### Yang TIDAK Bisa Diakses oleh QC:

- ❌ **Edit** - Tidak bisa edit data pembelian
- ❌ **Update QC** - Tidak bisa update QC data
- ❌ **Report QC** - Tidak bisa lihat report QC
- ❌ **History QC** - Tidak bisa lihat history QC
- ❌ **Hapus** - Tidak bisa delete data
- ❌ **Tambah** - Tidak bisa create data baru
- ❌ **Semua menu lain** (Master Data, Penjualan, Operational, dll)

## Technical Implementation

### Permissions Added:

```typescript
export type Permission =
  | "update_harga_pembelian" // Update harga pembelian
  | "view_detail_pembelian" // View detail
  | "view_history_harga"; // View price history
// ... other permissions
```

### Role Configuration:

```typescript
qc: [
  "view_dashboard",
  "view_pembelian",
  "search_data",
  "view_detail_pembelian",
  "view_history_harga",
  "update_harga_pembelian",
];
```

## Files Modified:

1. ✅ `src/hooks/useRBAC.tsx` - Added QC permissions
2. ✅ `src/components/transaction/PembelianTable.tsx` - Updated button visibility logic
3. ✅ `src/components/transaction/PembelianPageEnhanced.tsx` - Added View Report QC button permission

## Setup Instructions:

### 1. Execute SQL Script:

Run `assign_qc_role.sql` in Supabase SQL Editor to:

- Create QC role if not exists
- Create profile for lia@gmail.com if not exists
- Assign QC role to lia@gmail.com

### 2. Test with QC User:

1. Login as lia@gmail.com
2. Verify you can only see:
   - Dashboard
   - Transaction → Pembelian
3. In Pembelian page, verify you can only see these buttons:
   - Lihat Detail
   - History Harga
   - Update Harga
4. Verify you CANNOT see:
   - Button Tambah (top right)
   - Button View Report QC (top right)
   - Button Edit (in action menu)
   - Button Update QC (in action menu)
   - Button Report QC (in action menu)
   - Button History QC (in action menu)
   - Button Hapus (in action menu)

## Notes:

- QC role is focused on price management and viewing details only
- Cannot modify or delete pembelian data
- Cannot create new records
- Cannot update QC data or view QC reports
- Limited to Dashboard viewing and Pembelian price operations
- All permissions are enforced at the UI level through the RBAC system
