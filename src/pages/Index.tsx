import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import Dashboard from "@/components/Dashboard";
import BrandsPage from "@/components/master/BrandsPage";
import JenisMotorPage from "@/components/master/JenisMotorPage";
import CompanyPage from "@/components/master/CompanyPage";
import AssetPage from "@/components/master/AssetPage";
import CabangPage from "@/components/master/CabangPage";
import EmployeesPage from "@/components/master/EmployeesPage";
import UserApprovalPage from "@/components/master/UserApprovalPage";
import PembelianPageEnhanced from "../components/transaction/PembelianPageEnhanced";
import PenjualanPage from "@/components/transaction/PenjualanPage";
import CicilanPageEnhanced from '../components/transaction/CicilanPageEnhanced';
import OperationalPage from "@/components/transaction/OperationalPage";
import BiroJasaPageEnhanced from "../components/transaction/BiroJasaPageEnhanced";
import FeePenjualanPageEnhanced from "../components/transaction/FeePenjualanPageEnhanced";
import PembukuanPage from "@/components/finance/PembukuanPage";
import ReportsPage from "@/components/reports/ReportsPage";
import RolesPage from "@/components/rbac/RolesPage";
import PermissionsPage from "@/components/rbac/PermissionsPage";
import RolePermissionsPage from "@/components/rbac/RolePermissionsPage";
import UserRolesPage from "@/components/rbac/UserRolesPage";
import BreakdownPercabangPage from "@/components/finance/BreakdownPercabangPage";
import KeuntunganMotorPage from "@/components/finance/KeuntunganMotorPage";
import PenjualanBookedPageEnhanced from "@/components/transaction/PenjualanBookedPageEnhanced";
import PenjualanSoldPageEnhanced from "@/components/transaction/PenjualanSoldPageEnhanced";
import PenjualanCanceledBookedPage from "@/components/transaction/PenjualanCanceledBookedPage";
import CloseMonthPage from "@/components/finance/CloseMonthPage";
import { ProfitDistributionPage } from "@/components/finance/ProfitDistributionPage";
import { PencatatanAssetPage } from "@/components/transaction/PencatatanAssetPage";


const Index = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [selectedDivision, setSelectedDivision] = useState("sport");
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <Dashboard selectedDivision={selectedDivision} />;
      case "brands":
        return <BrandsPage />;
      case "jenis-motor":
        return <JenisMotorPage selectedDivision={selectedDivision} />;
      case "company":
        return <CompanyPage selectedDivision={selectedDivision} />;
      case "asset":
        return <AssetPage />;
      case "cabang":
        return <CabangPage />;
      case "employees":
        return <EmployeesPage />;
      case "users":
        return <UserApprovalPage />;
      case "pembelian":
      return <PembelianPageEnhanced selectedDivision={selectedDivision} />;
        case "penjualan-booked":
  return <PenjualanBookedPageEnhanced selectedDivision={selectedDivision} />;
case "penjualan-sold":
  return <PenjualanSoldPageEnhanced selectedDivision={selectedDivision} />;
case "penjualan-canceled-booked":
  return <PenjualanCanceledBookedPage selectedDivision={selectedDivision} />;
      case 'cicilan':
  return <CicilanPageEnhanced selectedDivision={selectedDivision} />;
      case "operational":
        return <OperationalPage selectedDivision={selectedDivision} />;
      case 'biro-jasa':
  return <BiroJasaPageEnhanced selectedDivision={selectedDivision} />;
case 'fee-penjualan':
  return <FeePenjualanPageEnhanced selectedDivision={selectedDivision} />;
      case "pembukuan":
        return <PembukuanPage selectedDivision={selectedDivision} />;
      case "reports":
        return <ReportsPage selectedDivision={selectedDivision} />;
      case "roles":
        return <RolesPage />;
      case "permissions":
        return <PermissionsPage />;
      case "role-permissions":
        return <RolePermissionsPage />;
      case "user-roles":
        return <UserRolesPage />;
      case "breakdown-percabang":
        return <BreakdownPercabangPage selectedDivision={selectedDivision} />;
        case "keuntungan-motor":
          return <KeuntunganMotorPage selectedDivision={selectedDivision} />;
        case "profit-distribution":
          return <ProfitDistributionPage selectedDivision={selectedDivision} />;
        case "close-month":
          return <CloseMonthPage />;
        case "pencatatan-asset":
          return <PencatatanAssetPage selectedDivision={selectedDivision} />;
        default:
        return <Dashboard selectedDivision={selectedDivision} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
        ${isMobile && !mobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
        transition-transform duration-300 ease-in-out
        ${isMobile ? 'w-64' : ''}
      `}>
        <Sidebar 
          activeMenu={activeMenu} 
          setActiveMenu={(menu) => {
            setActiveMenu(menu);
            if (isMobile) setMobileMenuOpen(false);
          }}
          selectedDivision={selectedDivision}
          onDivisionChange={setSelectedDivision}
          collapsed={isMobile ? false : sidebarCollapsed}
          onToggleCollapse={() => {
            if (isMobile) {
              setMobileMenuOpen(!mobileMenuOpen);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
          isMobile={isMobile}
        />
      </div>
      
      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${isMobile ? 'w-full' : ''}`}>
        <Header 
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          isMobile={isMobile}
        />
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;