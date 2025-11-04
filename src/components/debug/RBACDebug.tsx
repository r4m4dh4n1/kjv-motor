import React from "react";
import { useRBAC } from "@/hooks/useRBAC";
import { useAuth } from "@/hooks/useAuth";

const RBACDebug = () => {
  const { hasPermission, userRole, loading: rbacLoading } = useRBAC();
  const { userProfile, loading: authLoading, user } = useAuth();

  return (
    <div className="p-4 bg-gray-100 border rounded-lg m-4">
      <h3 className="font-bold text-lg mb-3">🔍 RBAC Debug Info</h3>

      <div className="space-y-2 text-sm">
        <div>
          <strong>Auth Loading:</strong> {authLoading ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>RBAC Loading:</strong> {rbacLoading ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>User ID:</strong> {user?.id || "null"}
        </div>
        <div>
          <strong>User Role:</strong> {userRole || "null"}
        </div>
        <div>
          <strong>Has view_pembelian:</strong>{" "}
          {hasPermission("view_pembelian") ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>User Profile Loaded:</strong>{" "}
          {userProfile ? "✅ Yes" : "❌ No"}
        </div>

        {userProfile && (
          <div className="mt-3 p-2 bg-white rounded border">
            <strong>User Profile:</strong>
            <pre className="text-xs mt-1 overflow-auto max-h-40">
              {JSON.stringify(userProfile, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-3">
          <strong>Key Permissions Check:</strong>
          <ul className="ml-4 mt-1">
            <li>
              view_dashboard: {hasPermission("view_dashboard") ? "✅" : "❌"}
            </li>
            <li>
              view_pembelian: {hasPermission("view_pembelian") ? "✅" : "❌"}
            </li>
            <li>
              view_penjualan: {hasPermission("view_penjualan") ? "✅" : "❌"}
            </li>
            <li>create_data: {hasPermission("create_data") ? "✅" : "❌"}</li>
            <li>update_data: {hasPermission("update_data") ? "✅" : "❌"}</li>
            <li>delete_data: {hasPermission("delete_data") ? "✅" : "❌"}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RBACDebug;
