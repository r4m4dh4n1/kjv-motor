import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Home,
  Settings,
  Building,
  Building2,
  Car,
  Briefcase,
  Package,
  MapPin,
  ShoppingCart,
  CreditCard,
  FileText,
  BookOpen,
  Calculator,
  Cog,
  Users,
  UserCog,
  Shield,
  DollarSign,
  Pin,
  PinOff,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Calendar,
  XCircle,
  Upload,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";
import { useRBAC } from "@/hooks/useRBAC";

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  selectedDivision: string;
  onDivisionChange: (division: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

const Sidebar = ({
  activeMenu,
  setActiveMenu,
  selectedDivision,
  onDivisionChange,
  collapsed,
  onToggleCollapse,
  isMobile = false,
}: SidebarProps) => {
  // State untuk tracking nested sub-menu
  const [openNestedMenus, setOpenNestedMenus] = useState<string[]>([]);
  const { hasPermission, loading } = useRBAC();

  // Show loading skeleton while user profile loads
  if (loading) {
    return (
      <div className="h-full border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="p-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  const toggleNestedMenu = (menuId: string) => {
    setOpenNestedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  // Filter menu items based on user permissions
  const masterMenuItems = [
    {
      id: "brands",
      label: "Brands",
      icon: Building,
      permission: "view_brands",
    },
    {
      id: "jenis-motor",
      label: "Jenis Motor",
      icon: Car,
      permission: "view_jenis_motor",
    },
    {
      id: "company",
      label: "Company",
      icon: Briefcase,
      permission: "view_companies",
    },
    { id: "asset", label: "Asset", icon: Package, permission: "view_assets" },
    { id: "cabang", label: "Cabang", icon: MapPin, permission: "view_cabang" },
  ].filter((item) => !item.permission || hasPermission(item.permission as any));

  const rbacMenuItems = [
    { id: "employees", label: "Pegawai", icon: Users, permission: "view_rbac" },
    { id: "users", label: "User", icon: UserCog, permission: "view_rbac" },
    { id: "roles", label: "Roles", icon: Shield, permission: "view_rbac" },
    {
      id: "permissions",
      label: "Permissions",
      icon: Settings,
      permission: "view_rbac",
    },
    {
      id: "role-permissions",
      label: "Role Permissions",
      icon: Cog,
      permission: "view_rbac",
    },
    {
      id: "user-roles",
      label: "User Roles",
      icon: Users,
      permission: "view_rbac",
    },
  ].filter((item) => !item.permission || hasPermission(item.permission as any));

  const transactionMenuItems = [
    {
      id: "pembelian",
      label: "Pembelian",
      icon: CreditCard,
      permission: "view_pembelian",
    },
    {
      id: "penjualan",
      label: "Penjualan",
      icon: ShoppingCart,
      permission: "view_penjualan",
      subItems: [
        {
          id: "penjualan-booked",
          label: "Booked",
          icon: BookOpen,
          permission: "view_penjualan_booked",
        },
        {
          id: "penjualan-sold",
          label: "Sold",
          icon: CheckCircle,
          permission: "view_penjualan_sold",
        },
        {
          id: "penjualan-canceled-booked",
          label: "Canceled Booked",
          icon: XCircle,
          permission: "view_penjualan_sold",
        },
      ],
    },
    {
      id: "cicilan",
      label: "Cash Bertahap",
      icon: Calculator,
      permission: "view_cicilan",
    },
    {
      id: "operational",
      label: "Operational",
      icon: Cog,
      permission: "view_operational",
    },
    {
      id: "biro-jasa",
      label: "Biro Jasa",
      icon: FileText,
      permission: "view_biro_jasa",
    },
    {
      id: "pencatatan-asset",
      label: "Pencatatan Asset",
      icon: Package,
      permission: "view_assets",
    },
    {
      id: "price-history-upload",
      label: "Upload Price History",
      icon: Upload,
      permission: "view_upload_price_history",
    },
  ]
    .map((item) => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter(
            (sub: any) =>
              !sub.permission || hasPermission(sub.permission as any)
          ),
        };
      }
      return item;
    })
    .filter(
      (item) => !item.permission || hasPermission(item.permission as any)
    );

  const financeMenuItems = [
    {
      id: "pembukuan",
      label: "Mutasi Transaksi",
      icon: BookOpen,
      permission: "view_pembukuan",
    },
    {
      id: "breakdown-percabang",
      label: "Breakdown Percabang",
      icon: TrendingUp,
      permission: "view_breakdown_percabang",
    },
    {
      id: "keuntungan-motor",
      label: "Pembukuan",
      icon: DollarSign,
      permission: "view_pembukuan",
    },
    {
      id: "reports",
      label: "Analisis Motor",
      icon: FileText,
      permission: "view_pembukuan",
    },
    {
      id: "laba-rugi",
      label: "Laba Rugi",
      icon: BarChart3,
      permission: "view_laba_rugi",
    },
    {
      id: "profit-distribution",
      label: "Distribusi Profit",
      icon: DollarSign,
      permission: "view_breakdown_perpemilik",
    },
    {
      id: "profit-adjustment-summary",
      label: "Ringkasan Penyesuaian Profit",
      icon: TrendingDown,
      permission: "view_laba_rugi",
    },
    {
      id: "close-month",
      label: "Close Month",
      icon: Calendar,
      permission: "view_laba_rugi",
    },
  ].filter((item) => !item.permission || hasPermission(item.permission as any));

  // Update logika untuk mendeteksi menu yang aktif
  const masterMenuOpen = masterMenuItems.some((item) => item.id === activeMenu);

  const transactionMenuOpen = transactionMenuItems.some((item) => {
    if (item.subItems) {
      return (
        item.subItems.some((subItem) => subItem.id === activeMenu) ||
        item.id === activeMenu
      );
    }
    return item.id === activeMenu;
  });

  const financeMenuOpen = financeMenuItems.some(
    (item) => item.id === activeMenu
  );
  const rbacMenuOpen = rbacMenuItems.some((item) => item.id === activeMenu);

  return (
    <div
      className={cn(
        "bg-sidebar-background text-sidebar-foreground shadow-lg flex flex-col h-screen transition-all duration-300",
        isMobile ? "w-64" : collapsed ? "w-16" : "w-64",
        isMobile && "border-r border-sidebar-border"
      )}
    >
      {/* Header - Fixed */}
      <div className="p-3 sm:p-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-between">
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sidebar-primary rounded flex items-center justify-center">
                <span className="text-sm font-bold text-sidebar-primary-foreground">
                  KJV
                </span>
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-sidebar-primary-foreground">
                  KJV Motor
                </h1>
                <p className="text-sidebar-foreground/70 text-xs">POS System</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title={
              isMobile
                ? "Close Menu"
                : collapsed
                ? "Expand Sidebar"
                : "Collapse Sidebar"
            }
          >
            {collapsed && !isMobile ? (
              <Pin className="w-4 h-4" />
            ) : (
              <PinOff className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Dropdown Divisi - Fixed */}
      {(!collapsed || isMobile) && (
        <div className="p-3 sm:p-4 border-b border-sidebar-border flex-shrink-0">
          <label className="block text-xs font-medium text-sidebar-foreground/70 mb-2">
            Divisi:
          </label>
          <Select value={selectedDivision} onValueChange={onDivisionChange}>
            <SelectTrigger className="w-full h-8 bg-sidebar-accent border-sidebar-border text-sidebar-foreground text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sport">Sport</SelectItem>
              <SelectItem value="start">Start</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto px-2 sm:px-3 py-3 sm:py-4">
        {/* Menu Dashboard */}
        <div className="mb-3">
          <button
            onClick={() => setActiveMenu("dashboard")}
            className={cn(
              "w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm",
              activeMenu === "dashboard"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            title="Dashboard"
          >
            <Home className="w-4 h-4" />
            {(!collapsed || isMobile) && "Dashboard"}
          </button>
        </div>

        {/* Menu Master Data - Only show if user has at least one master permission */}
        {masterMenuItems.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => {
                // If no master submenu is active, set to first master menu item
                if (!masterMenuOpen) {
                  setActiveMenu(masterMenuItems[0].id);
                }
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sidebar-foreground transition-colors text-sm",
                masterMenuOpen
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <Settings className="w-4 h-4" />
                {(!collapsed || isMobile) && "Master Data"}
              </div>
              {(!collapsed || isMobile) &&
                (masterMenuOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                ))}
            </button>

            {masterMenuOpen && (!collapsed || isMobile) && (
              <div className="mt-2 ml-4 border-l border-sidebar-border pl-4 space-y-1">
                {masterMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenu(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors text-sm",
                        activeMenu === item.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {(!collapsed || isMobile) && item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Menu Transaction */}
        <div className="mb-3">
          <button
            onClick={() => {
              // If no transaction submenu is active, set to first transaction menu item
              if (!transactionMenuOpen) {
                setActiveMenu("pembelian");
              }
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sidebar-foreground transition-colors text-sm",
              transactionMenuOpen
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <ShoppingCart className="w-4 h-4" />
              {(!collapsed || isMobile) && "Transaction"}
            </div>
            {(!collapsed || isMobile) &&
              (transactionMenuOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              ))}
          </button>

          {transactionMenuOpen && (!collapsed || isMobile) && (
            <div className="mt-2 ml-4 border-l border-sidebar-border pl-4 space-y-1">
              {transactionMenuItems.map((item) => {
                const Icon = item.icon;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isNestedMenuOpen = openNestedMenus.includes(item.id);

                return (
                  <div key={item.id}>
                    <button
                      onClick={() => {
                        if (hasSubItems) {
                          toggleNestedMenu(item.id);
                          // Set ke sub-menu pertama jika belum ada yang aktif
                          if (
                            !item.subItems.some(
                              (subItem) => subItem.id === activeMenu
                            )
                          ) {
                            setActiveMenu(item.subItems[0].id);
                          }
                        } else {
                          setActiveMenu(item.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2 rounded-lg text-left transition-colors text-sm",
                        activeMenu === item.id ||
                          (hasSubItems &&
                            item.subItems.some(
                              (subItem) => subItem.id === activeMenu
                            ))
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </div>
                      {hasSubItems &&
                        (isNestedMenuOpen ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        ))}
                    </button>

                    {/* Level 3 Nested Sub-menu */}
                    {hasSubItems && isNestedMenuOpen && (
                      <div className="mt-1 ml-6 border-l border-sidebar-border pl-4 space-y-1">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => setActiveMenu(subItem.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-left transition-colors text-xs",
                                activeMenu === subItem.id
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              )}
                            >
                              <SubIcon className="w-3 h-3" />
                              {subItem.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Menu Finance - Only show if user has at least one finance permission */}
        {financeMenuItems.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => {
                // If no finance submenu is active, set to first finance menu item
                if (!financeMenuOpen) {
                  setActiveMenu(financeMenuItems[0].id);
                }
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sidebar-foreground transition-colors text-sm",
                financeMenuOpen
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <BookOpen className="w-4 h-4" />
                {(!collapsed || isMobile) && "Finance"}
              </div>
              {(!collapsed || isMobile) &&
                (financeMenuOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                ))}
            </button>

            {financeMenuOpen && (!collapsed || isMobile) && (
              <div className="mt-2 ml-4 border-l border-sidebar-border pl-4 space-y-1">
                {financeMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenu(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors text-sm",
                        activeMenu === item.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {(!collapsed || isMobile) && item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Menu User Management & RBAC - Only show if user has view_rbac permission */}
        {rbacMenuItems.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => {
                // If no rbac submenu is active, set to first rbac menu item
                if (!rbacMenuOpen) {
                  setActiveMenu(rbacMenuItems[0].id);
                }
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sidebar-foreground transition-colors text-sm",
                rbacMenuOpen
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <Shield className="w-4 h-4" />
                {(!collapsed || isMobile) && "User Management"}
              </div>
              {(!collapsed || isMobile) &&
                (rbacMenuOpen ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                ))}
            </button>

            {rbacMenuOpen && (!collapsed || isMobile) && (
              <div className="mt-2 ml-4 border-l border-sidebar-border pl-4 space-y-1">
                {rbacMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenu(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors text-sm",
                        activeMenu === item.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {(!collapsed || isMobile) && item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
