import React, { useState } from "react";
import { ChevronDown, ChevronRight, Home, Settings, Building, Building2, Car, Briefcase, Package, MapPin, ShoppingCart, CreditCard, FileText, BookOpen, Calculator, Cog, Users, UserCog, Shield, DollarSign, Pin, PinOff, TrendingUp, CheckCircle, Calendar, XCircle, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  selectedDivision: string;
  onDivisionChange: (division: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

const Sidebar = ({ activeMenu, setActiveMenu, selectedDivision, onDivisionChange, collapsed, onToggleCollapse, isMobile = false }: SidebarProps) => {
  // State untuk tracking nested sub-menu
  const [openNestedMenus, setOpenNestedMenus] = useState<string[]>([]);

  const toggleNestedMenu = (menuId: string) => {
    setOpenNestedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const masterMenuItems = [
    { id: "brands", label: "Brands", icon: Building },
    { id: "jenis-motor", label: "Jenis Motor", icon: Car },
    { id: "company", label: "Company", icon: Briefcase },
    { id: "asset", label: "Asset", icon: Package },
    { id: "cabang", label: "Cabang", icon: MapPin },
  ];

  const rbacMenuItems = [
    { id: "employees", label: "Pegawai", icon: Users },
    { id: "users", label: "User", icon: UserCog },
    { id: "roles", label: "Roles", icon: Shield },
    { id: "permissions", label: "Permissions", icon: Settings },
    { id: "role-permissions", label: "Role Permissions", icon: Cog },
    { id: "user-roles", label: "User Roles", icon: Users },
  ];

  const transactionMenuItems = [
    { id: "pembelian", label: "Pembelian", icon: CreditCard },
    { 
      id: "penjualan", 
      label: "Penjualan", 
      icon: ShoppingCart,
      subItems: [
        { id: "penjualan-booked", label: "Booked", icon: BookOpen },
        { id: "penjualan-sold", label: "Sold", icon: CheckCircle },
        { id: "penjualan-canceled-booked", label: "Canceled Booked", icon: XCircle }
      ]
    },
    { id: "cicilan", label: "Cash Bertahap", icon: Calculator },
    { id: "operational", label: "Operational", icon: Cog },
    { id: "biro-jasa", label: "Biro Jasa", icon: FileText },
    { id: "pencatatan-asset", label: "Pencatatan Asset", icon: Package },
    { id: "fee-penjualan", label: "Fee Penjualan", icon: DollarSign },
    { id: "price-history-upload", label: "Upload Price History", icon: Upload },
  ];

  const financeMenuItems = [
    { id: "pembukuan", label: "Mutasi Transaksi", icon: BookOpen },
    { id: "breakdown-percabang", label: "Breakdown Percabang", icon: TrendingUp },
    { id: "keuntungan-motor", label: "Pembukuan", icon: DollarSign },
    { id: "reports", label: "Analisis Motor", icon: FileText },
    { id: "laba-rugi", label: "Laba Rugi", icon: BarChart3 },
    { id: "profit-distribution", label: "Distribusi Profit", icon: DollarSign },
    { id: "modal-reduction", label: "Pengurangan Modal", icon: Building2 },
    { id: "modal-history", label: "History Modal", icon: FileText },
    { id: "close-month", label: "Close Month", icon: Calendar },
  ];

  // Update logika untuk mendeteksi menu yang aktif
  const masterMenuOpen = masterMenuItems.some(item => item.id === activeMenu);
  
  const transactionMenuOpen = transactionMenuItems.some(item => {
    if (item.subItems) {
      return item.subItems.some(subItem => subItem.id === activeMenu) || item.id === activeMenu;
    }
    return item.id === activeMenu;
  });
  
  const financeMenuOpen = financeMenuItems.some(item => item.id === activeMenu);
  const rbacMenuOpen = rbacMenuItems.some(item => item.id === activeMenu);

  return (
    <div className={cn(
      "bg-sidebar-background text-sidebar-foreground shadow-lg flex flex-col h-screen transition-all duration-300",
      isMobile ? "w-64" : (collapsed ? "w-16" : "w-64"),
      isMobile && "border-r border-sidebar-border"
    )}>
      {/* Header - Fixed */}
      <div className="p-3 sm:p-4 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center justify-between">
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sidebar-primary rounded flex items-center justify-center">
                <span className="text-sm font-bold text-sidebar-primary-foreground">KJV</span>
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-sidebar-primary-foreground">KJV Motor</h1>
                <p className="text-sidebar-foreground/70 text-xs">POS System</p>
              </div>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title={isMobile ? "Close Menu" : (collapsed ? "Expand Sidebar" : "Collapse Sidebar")}
          >
            {collapsed && !isMobile ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dropdown Divisi - Fixed */}
      {(!collapsed || isMobile) && (
        <div className="p-3 sm:p-4 border-b border-sidebar-border flex-shrink-0">
          <label className="block text-xs font-medium text-sidebar-foreground/70 mb-2">Divisi:</label>
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

        {/* Menu Master Data */}
        <div className="mb-3">
          <button
            onClick={() => {
              // If no master submenu is active, set to first master menu item
              if (!masterMenuOpen) {
                setActiveMenu("brands");
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
            {(!collapsed || isMobile) && (masterMenuOpen ? (
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
            {(!collapsed || isMobile) && (transactionMenuOpen ? (
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
                          if (!item.subItems.some(subItem => subItem.id === activeMenu)) {
                            setActiveMenu(item.subItems[0].id);
                          }
                        } else {
                          setActiveMenu(item.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2 rounded-lg text-left transition-colors text-sm",
                        (activeMenu === item.id || (hasSubItems && item.subItems.some(subItem => subItem.id === activeMenu)))
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </div>
                      {hasSubItems && (
                        isNestedMenuOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                      )}
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

        {/* Menu Finance */}
        <div className="mb-3">
          <button
            onClick={() => {
              // If no finance submenu is active, set to first finance menu item
              if (!financeMenuOpen) {
                setActiveMenu("keuntungan-motor");
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
            {(!collapsed || isMobile) && (financeMenuOpen ? (
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

        {/* Menu User Management & RBAC */}
        <div className="mb-3">
          <button
            onClick={() => {
              // If no rbac submenu is active, set to first rbac menu item
              if (!rbacMenuOpen) {
                setActiveMenu("roles");
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
            {(!collapsed || isMobile) && (rbacMenuOpen ? (
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
      </nav>
    </div>
  );
};

export default Sidebar;