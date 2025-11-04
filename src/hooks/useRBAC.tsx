import { useAuth } from "./useAuth";

// Permission types
export type Permission =
  | "view_dashboard"
  | "view_brands"
  | "view_jenis_motor"
  | "view_assets"
  | "view_cabang"
  | "view_companies"
  | "view_pembelian"
  | "view_penjualan"
  | "view_penjualan_booked"
  | "view_penjualan_sold"
  | "view_operational"
  | "view_cicilan"
  | "view_biro_jasa"
  | "view_upload_price_history"
  | "view_pembukuan"
  | "view_laba_rugi"
  | "view_breakdown_percabang"
  | "view_breakdown_perpemilik"
  | "create_data"
  | "update_data"
  | "update_harga_penjualan"
  | "delete_data"
  | "search_data"
  | "view_settings"
  | "view_rbac"
  | "update_qc_pembelian"
  | "view_detail_pembelian"
  | "view_history_harga"
  | "view_report_qc"
  | "report_qc";

// Role definitions with their permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  // Super Admin - Full access to everything
  super_admin: [
    "view_dashboard",
    "view_brands",
    "view_jenis_motor",
    "view_assets",
    "view_cabang",
    "view_companies",
    "view_pembelian",
    "view_penjualan",
    "view_penjualan_booked",
    "view_penjualan_sold",
    "view_operational",
    "view_cicilan",
    "view_biro_jasa",
    "view_upload_price_history",
    "view_pembukuan",
    "view_laba_rugi",
    "view_breakdown_percabang",
    "view_breakdown_perpemilik",
    "create_data",
    "update_data",
    "update_harga_penjualan",
    "delete_data",
    "search_data",
    "view_settings",
    "view_rbac",
    "update_qc_pembelian",
    "view_detail_pembelian",
    "view_history_harga",
    "view_report_qc",
    "report_qc",
  ],

  // Owner - Can access all modules EXCEPT:
  // - Master data (Brands, Jenis Motor, Asset, Cabang)
  // - Upload Price History
  // Can only DELETE and SEARCH (no create/update)
  owner: [
    "view_dashboard",
    "view_companies",
    "view_pembelian",
    "view_penjualan",
    "view_penjualan_booked",
    "view_penjualan_sold",
    "view_operational",
    "view_cicilan",
    "view_biro_jasa",
    "view_pembukuan",
    "view_laba_rugi",
    "view_breakdown_percabang",
    "view_breakdown_perpemilik",
    "delete_data",
    "search_data",
    "view_settings",
  ],

  // QC - Can only access:
  // - Dashboard
  // - Transaction -> Pembelian (limited buttons: Update QC, Lihat Detail, History Harga, View Report QC)
  // - Can search data
  qc: [
    "view_dashboard",
    "view_pembelian",
    "search_data",
    "view_detail_pembelian",
    "view_history_harga",
    "view_report_qc",
    "report_qc",
  ],

  // Admin - Full access except RBAC management
  admin: [
    "view_dashboard",
    "view_brands",
    "view_jenis_motor",
    "view_assets",
    "view_cabang",
    "view_companies",
    "view_pembelian",
    "view_penjualan",
    "view_penjualan_booked",
    "view_penjualan_sold",
    "view_operational",
    "view_cicilan",
    "view_biro_jasa",
    "view_upload_price_history",
    "view_pembukuan",
    "view_laba_rugi",
    "view_breakdown_percabang",
    "view_breakdown_perpemilik",
    "create_data",
    "update_data",
    "update_harga_penjualan",
    "delete_data",
    "search_data",
    "view_settings",
    "update_qc_pembelian",
    "view_detail_pembelian",
    "view_history_harga",
    "view_report_qc",
    "report_qc",
  ],

  // Administrator - Same as Super Admin (full access)
  administrator: [
    "view_dashboard",
    "view_brands",
    "view_jenis_motor",
    "view_assets",
    "view_cabang",
    "view_companies",
    "view_pembelian",
    "view_penjualan",
    "view_penjualan_booked",
    "view_penjualan_sold",
    "view_operational",
    "view_cicilan",
    "view_biro_jasa",
    "view_upload_price_history",
    "view_pembukuan",
    "view_laba_rugi",
    "view_breakdown_percabang",
    "view_breakdown_perpemilik",
    "create_data",
    "update_data",
    "update_harga_penjualan",
    "delete_data",
    "search_data",
    "view_settings",
    "view_rbac",
    "update_qc_pembelian",
    "view_detail_pembelian",
    "view_history_harga",
    "view_report_qc",
    "report_qc",
  ],
};

// Hook to check permissions
export const useRBAC = () => {
  const { userProfile, loading } = useAuth();

  // Get user's role name
  const getUserRole = (): string | null => {
    // If still loading, return null temporarily
    if (loading) {
      return null;
    }

    if (!userProfile?.user_roles?.[0]?.roles?.role_name) {
      console.log("🔍 RBAC Debug: No role found in userProfile", userProfile);
      return null;
    }
    const roleName = userProfile.user_roles[0].roles.role_name.toLowerCase();
    console.log("🔍 RBAC Debug: User role =", roleName);
    return roleName;
  };

  // Check if user has a specific permission
  const hasPermission = (permission: Permission): boolean => {
    // If still loading, default to false (will show loading state)
    if (loading) {
      return false;
    }

    const role = getUserRole();
    if (!role) {
      console.log("🔍 RBAC Debug: No role, permission denied for", permission);
      return false;
    }

    const permissions = ROLE_PERMISSIONS[role];

    // If role not defined in ROLE_PERMISSIONS, default to full access (for backward compatibility)
    if (!permissions) {
      console.warn(
        `🔍 RBAC Debug: Role "${role}" not defined in ROLE_PERMISSIONS, defaulting to full access`
      );
      return true;
    }

    const hasAccess = permissions.includes(permission);
    console.log(
      `🔍 RBAC Debug: Role "${role}" checking "${permission}" = ${hasAccess}`
    );
    return hasAccess;
  };

  // Check if user has ANY of the given permissions
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  // Check if user has ALL of the given permissions
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  // Get all permissions for current user
  const getUserPermissions = (): Permission[] => {
    const role = getUserRole();
    if (!role) return [];
    return ROLE_PERMISSIONS[role] || [];
  };

  // Check if user has a specific role
  const hasRole = (roleName: string): boolean => {
    const role = getUserRole();
    return role === roleName.toLowerCase();
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    hasRole,
    userRole: getUserRole(),
    loading, // Add loading state
  };
};
