# RBAC (Role-Based Access Control) Setup

## Overview

Sistem RBAC telah dikonfigurasi dengan 4 role utama: **Super Admin**, **Admin**, **Owner**, dan **QC**.

## Roles & Permissions

### 1. Super Admin

**Access:** Full access ke semua modul dan fitur

- ✅ Dashboard
- ✅ Master Data (Brands, Jenis Motor, Asset, Cabang, Companies)
- ✅ All Transactions (Pembelian, Penjualan, Cicilan, Operational, Biro Jasa, Upload Price History)
- ✅ Finance (Pembukuan, Laba Rugi, Breakdown)
- ✅ RBAC Management (Roles, Permissions, User Roles)
- ✅ Settings
- ✅ **CRUD Operations:** Create, Read, Update, Delete, Search

---

### 2. Owner

**Access:** Semua modul **KECUALI:**

- ❌ Master Data (Brands, Jenis Motor, Asset, Cabang)
- ❌ Transaction → Upload Price History
- ❌ RBAC Management

**Allowed Operations:**

- ✅ **Delete & Search ONLY** (NO Create/Update)
- ✅ Dashboard
- ✅ Companies
- ✅ All Transactions (Pembelian, Penjualan, Cicilan, Operational, Biro Jasa)
- ✅ Finance (Pembukuan, Laba Rugi, Breakdown, Profit Distribution)
- ✅ Settings

**Restrictions:**

- ❌ Tidak bisa Create data baru
- ❌ Tidak bisa Update/Edit data
- ✅ Hanya bisa Delete dan Search

---

### 3. QC (Quality Control)

**Access:** **SANGAT TERBATAS**

- ✅ Dashboard (view only)
- ✅ Transaction → Penjualan (Booked & Sold)
  - **ONLY** button "Update Harga" yang bisa diakses
  - Semua button lain (Edit, Delete, Cancel DP, dll) **HIDDEN**
- ✅ Search data

**Restrictions:**

- ❌ Tidak bisa Create data
- ❌ Tidak bisa Edit data umum
- ❌ Tidak bisa Delete data
- ✅ **HANYA** bisa Update Harga Penjualan
- ❌ Tidak bisa akses modul lain (Master, Finance, RBAC, dll)

---

### 4. Admin

**Access:** Full access **KECUALI** RBAC Management

- ✅ Dashboard
- ✅ Master Data (Brands, Jenis Motor, Asset, Cabang, Companies)
- ✅ All Transactions (Pembelian, Penjualan, Cicilan, Operational, Biro Jasa, Upload Price History)
- ✅ Finance (Pembukuan, Laba Rugi, Breakdown)
- ✅ Settings
- ✅ **CRUD Operations:** Create, Read, Update, Delete, Search
- ❌ **NO RBAC Management** (tidak bisa manage roles/permissions)

---

## Permission List

### View Permissions

- `view_dashboard` - Akses dashboard
- `view_brands` - Lihat brands
- `view_jenis_motor` - Lihat jenis motor
- `view_assets` - Lihat assets
- `view_cabang` - Lihat cabang
- `view_companies` - Lihat companies
- `view_pembelian` - Lihat pembelian
- `view_penjualan` - Lihat penjualan
- `view_penjualan_booked` - Lihat penjualan booked
- `view_penjualan_sold` - Lihat penjualan sold
- `view_operational` - Lihat operational
- `view_cicilan` - Lihat cicilan
- `view_biro_jasa` - Lihat biro jasa
- `view_upload_price_history` - Lihat upload price history
- `view_pembukuan` - Lihat pembukuan
- `view_laba_rugi` - Lihat laba rugi
- `view_breakdown_percabang` - Lihat breakdown per cabang
- `view_breakdown_perpemilik` - Lihat breakdown per pemilik
- `view_settings` - Akses settings
- `view_rbac` - Akses RBAC management

### Action Permissions

- `create_data` - Buat data baru
- `update_data` - Edit data umum
- `update_harga_penjualan` - Update harga penjualan (QC permission)
- `delete_data` - Hapus data
- `search_data` - Search/filter data

---

## Implementation

### Files Modified/Created:

1. **`src/hooks/useRBAC.tsx`** (NEW)

   - Hook untuk check permissions
   - Role definitions dengan permission mapping
   - Functions: `hasPermission()`, `hasRole()`, `getUserPermissions()`

2. **`src/components/rbac/PermissionGuard.tsx`** (NEW)

   - React component untuk conditional rendering
   - Usage: `<PermissionGuard permission="view_brands">...</PermissionGuard>`

3. **`src/components/layout/Sidebar.tsx`** (MODIFIED)

   - Filter menu items berdasarkan permission
   - Hide menu yang tidak boleh diakses

4. **`src/components/transaction/PenjualanTable.tsx`** (MODIFIED)
   - Hide buttons berdasarkan permission
   - Owner: Hanya Delete button visible
   - QC: Hanya Update Harga button visible
   - Admin/Super Admin: All buttons visible

---

## Usage Examples

### Check Permission in Component

```tsx
import { useRBAC } from "@/hooks/useRBAC";

const MyComponent = () => {
  const { hasPermission, hasRole } = useRBAC();

  return (
    <div>
      {hasPermission("create_data") && <Button>Add New</Button>}

      {hasRole("owner") && <p>Welcome, Owner!</p>}
    </div>
  );
};
```

### Use Permission Guard

```tsx
import { PermissionGuard } from "@/components/rbac/PermissionGuard";

<PermissionGuard permission="view_brands">
  <BrandsPage />
</PermissionGuard>

<PermissionGuard permissions={["delete_data", "update_data"]} requireAll={false}>
  <Button>Edit or Delete</Button>
</PermissionGuard>
```

---

## Testing

### Test Role: Owner

1. Login sebagai Owner
2. Verify:
   - ❌ Menu Master Data (Brands, Jenis Motor, Asset, Cabang) **tidak muncul**
   - ❌ Menu Upload Price History **tidak muncul**
   - ✅ Menu lain visible (Dashboard, Pembelian, Penjualan, Finance, dll)
   - ✅ Di tabel, **hanya button Delete** yang visible
   - ❌ Button Edit, Add, Update Harga **tidak visible**

### Test Role: QC

1. Login sebagai QC
2. Verify:
   - ✅ Dashboard visible
   - ✅ Menu Penjualan (Booked/Sold) visible
   - ❌ Semua menu lain **tidak muncul**
   - ✅ Di tabel penjualan, **hanya button Update Harga** yang visible
   - ❌ Button Edit, Delete, Cancel DP, dll **tidak visible**

---

## Database Requirements

### Roles Table

Pastikan role sudah ada di database:

```sql
INSERT INTO roles (role_name, description) VALUES
('super_admin', 'Full system access'),
('admin', 'Full access except RBAC'),
('owner', 'Delete & Search only, no master data'),
('qc', 'View dashboard and update harga penjualan only');
```

### User Roles Assignment

Assign role ke user melalui tabel `user_roles`:

```sql
INSERT INTO user_roles (user_id, role_id) VALUES
('user-uuid-here', (SELECT id FROM roles WHERE role_name = 'owner'));
```

---

## Notes

- **Case Insensitive:** Role names di-lowercase otomatis saat check
- **Default Behavior:** Jika permission tidak specified, akses di-allow
- **Menu Filtering:** Menu otomatis di-filter di Sidebar
- **Button Visibility:** Buttons di tabel otomatis di-hide berdasarkan permission
- **Search:** Semua role (kecuali super limited roles) punya akses search

---

## Future Enhancements

1. **Granular Permissions:** Add more specific permissions (e.g., `update_own_data` vs `update_all_data`)
2. **Cabang/Division Scoping:** Restrict data by cabang/division per user
3. **Audit Log:** Track who did what and when
4. **Permission UI:** Admin interface untuk manage permissions tanpa code
