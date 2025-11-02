import { ReactNode } from "react";
import { useRBAC, Permission } from "@/hooks/useRBAC";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean; // If true, requires ALL permissions. If false, requires ANY permission
  fallback?: ReactNode;
}

/**
 * Component to conditionally render children based on user permissions
 *
 * Usage:
 * <PermissionGuard permission="view_brands">
 *   <BrandsPage />
 * </PermissionGuard>
 *
 * <PermissionGuard permissions={["delete_data", "update_data"]} requireAll={false}>
 *   <Button>Edit or Delete</Button>
 * </PermissionGuard>
 */
export const PermissionGuard = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: PermissionGuardProps) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRBAC();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    // If no permissions specified, allow access
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  children: ReactNode;
  roles: string[];
  fallback?: ReactNode;
}

/**
 * Component to conditionally render children based on user role
 *
 * Usage:
 * <RoleGuard roles={["super_admin", "admin"]}>
 *   <AdminPanel />
 * </RoleGuard>
 */
export const RoleGuard = ({
  children,
  roles,
  fallback = null,
}: RoleGuardProps) => {
  const { userRole } = useRBAC();

  if (!userRole || !roles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
