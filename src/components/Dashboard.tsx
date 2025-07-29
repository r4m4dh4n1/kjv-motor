import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Car, Briefcase, Package, TrendingUp, Users, DollarSign, ShoppingCart, Receipt, TrendingDown, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Company = Tables<"companies">;
type JenisMotor = Tables<"jenis_motor">;
type Brand = Tables<"brands">;
type Asset = Tables<"assets">;

interface DashboardProps {
  selectedDivision: string;
}

const Dashboard = ({ selectedDivision }: DashboardProps) => {
  const [selectedCabang, setSelectedCabang] = useState<string>("all");
  const [cabangData, setCabangData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeCompanies: 0,
    passiveCompanies: 0,
    totalModal: 0,
    sportMotors: 0,
    startMotors: 0,
    totalPembelian: 0,
    totalPembelianUnit: 0,
    totalPenjualan: 0,
    totalPenjualanUnit: 0,
    totalKeuntungan: 0,
    totalKeuntunganUnit: 0,
    totalBooked: 0,
    totalBookedUnit: 0,
    totalOperational: 0,
    modalPerCompany: [] as Array<{name: string, modal: number}>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDivision, selectedCabang]);

  const fetchDashboardData = async () => {
    try {
      // Build queries with division and cabang filter
      let jenisMotorQuery = supabase.from('jenis_motor').select('*');
      let companiesQuery = supabase.from('companies').select('*');
      let pembelianQuery = supabase.from('pembelian').select('*');
      let penjualanQuery = supabase.from('penjualans').select('*');
      let operationalQuery = supabase.from('operational').select('*');
      
      if (selectedDivision !== 'all') {
        jenisMotorQuery = jenisMotorQuery.eq('divisi', selectedDivision);
        companiesQuery = companiesQuery.eq('divisi', selectedDivision);
        pembelianQuery = pembelianQuery.eq('divisi', selectedDivision);
        penjualanQuery = penjualanQuery.eq('divisi', selectedDivision);
        operationalQuery = operationalQuery.eq('divisi', selectedDivision);
      }

      if (selectedCabang !== 'all') {
        pembelianQuery = pembelianQuery.eq('cabang_id', parseInt(selectedCabang));
        penjualanQuery = penjualanQuery.eq('cabang_id', parseInt(selectedCabang));
        operationalQuery = operationalQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      const [
        brandsResult, 
        jenisMotorResult, 
        companiesResult, 
        assetsResult,
        cabangResult,
        pembelianResult,
        penjualanResult,
        operationalResult
      ] = await Promise.all([
        supabase.from('brands').select('*'),
        jenisMotorQuery,
        companiesQuery,
        supabase.from('assets').select('*'),
        supabase.from('cabang').select('*'),
        pembelianQuery,
        penjualanQuery,
        operationalQuery
      ]);

      if (brandsResult.error) throw brandsResult.error;
      if (jenisMotorResult.error) throw jenisMotorResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (assetsResult.error) throw assetsResult.error;
      if (operationalResult.error) throw operationalResult.error;


      const brands: Brand[] = brandsResult.data || [];
      const jenisMotor: JenisMotor[] = jenisMotorResult.data || [];
      const companies: Company[] = companiesResult.data || [];
      const assets: Asset[] = assetsResult.data || [];
      const cabang = cabangResult.data || [];
      const pembelian = pembelianResult.data || [];
      const penjualan = penjualanResult.data || [];
      const operational = operationalResult.data || [];

      // Set cabang data for filter
      setCabangData(cabang);

      // Calculate stats
      const activeCompanies = companies.filter(c => c.status === 'active').length;
      const passiveCompanies = companies.filter(c => c.status === 'passive').length;
      const totalModal = companies.reduce((sum, c) => sum + c.modal, 0);
      const sportMotors = jenisMotor.filter(j => j.divisi === 'sport').reduce((sum, j) => sum + j.qty, 0);
      const startMotors = jenisMotor.filter(j => j.divisi === 'start').reduce((sum, j) => sum + j.qty, 0);

      // Calculate financial stats
      const totalPembelian = pembelian.reduce((sum, p) => sum + p.harga_beli, 0);
      const totalPembelianUnit = pembelian.length;
      const totalPenjualan = penjualan.reduce((sum, p) => sum + p.harga_jual, 0);
      const totalPenjualanUnit = penjualan.length;
      const totalKeuntungan = penjualan.reduce((sum, p) => sum + (p.keuntungan || 0), 0);
      const totalKeuntunganUnit = penjualan.length;
      
      // Calculate booked stats (status = booked)
      const bookedPenjualan = penjualan.filter(p => p.status === 'Booked');
      const totalBooked = bookedPenjualan.reduce((sum, p) => sum + p.harga_jual, 0);
      const totalBookedUnit = bookedPenjualan.length;
      
      const totalOperational = operational.reduce((sum, o) => sum + o.nominal, 0);

      // Modal per company
      const modalPerCompany = companies.map(c => ({
        name: c.nama_perusahaan,
        modal: c.modal
      }));

      setStats({
        totalAssets: assets.length,
        activeCompanies,
        passiveCompanies,
        totalModal,
        sportMotors,
        startMotors,
        totalPembelian,
        totalPembelianUnit,
        totalPenjualan,
        totalPenjualanUnit,
        totalKeuntungan,
        totalKeuntunganUnit,
        totalBooked,
        totalBookedUnit,
        totalOperational,
        modalPerCompany,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const dashboardStats = [
    {
      title: "Assets",
      value: stats.totalAssets.toString(),
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Total Keuntungan",
      value: formatCurrency(stats.totalKeuntungan),
      unit: `${stats.totalKeuntunganUnit} Unit`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ];

  const financialStats = [
    {
      title: "Total Pembelian",
      value: formatCurrency(stats.totalPembelian),
      unit: `${stats.totalPembelianUnit} Unit`,
      icon: ShoppingCart,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Total Penjualan",
      value: formatCurrency(stats.totalPenjualan),
      unit: `${stats.totalPenjualanUnit} Unit`,
      icon: Receipt,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Booked",
      value: formatCurrency(stats.totalBooked),
      unit: `${stats.totalBookedUnit} Unit`,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
  ];

  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-4 lg:p-6 max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 truncate">Dashboard</h1>
          <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
            Overview sistem manajemen POS KJV Motor
          </p>
        </div>
        
        {/* Filter by Cabang */}
        <div className="w-full sm:w-64 lg:w-48 flex-shrink-0">
          <Select value={selectedCabang} onValueChange={setSelectedCabang}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {cabangData.map((cabang) => (
                <SelectItem key={cabang.id} value={cabang.id.toString()}>
                  {cabang.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
        {dashboardStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-600 truncate">
                      {stat.title}
                    </p>
                    <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 md:mt-2 truncate">
                      {stat.value}
                    </p>
                    {stat.unit && (
                      <p className="text-xs md:text-sm text-gray-500 mt-1">
                        {stat.unit}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 md:p-3 rounded-full ${stat.bgColor} flex-shrink-0 ml-2`}>
                    <Icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Financial Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        {financialStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-medium text-gray-600 truncate">
                      {stat.title}
                    </p>
                    <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mt-1 md:mt-2 break-all">
                      {stat.value}
                    </p>
                    {stat.unit && (
                      <p className="text-xs md:text-sm text-gray-500 mt-1">
                        {stat.unit}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 md:p-3 rounded-full ${stat.bgColor} flex-shrink-0 ml-2`}>
                    <Icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        {/* Statistik Motor Stock */}
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              Statistik Motor Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Stock Motor Sport</span>
                <span className="font-semibold text-sm md:text-base">{stats.sportMotors} Unit</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Stock Motor Start</span>
                <span className="font-semibold text-sm md:text-base">{stats.startMotors} Unit</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Total Stock</span>
                <span className="font-semibold text-green-600 text-sm md:text-base">{stats.sportMotors + stats.startMotors} Unit</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistik Pembelian Motor */}
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
              Statistik Pembelian Motor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Total Pembelian</span>
                <span className="font-semibold text-sm md:text-base">{stats.totalPembelianUnit} Unit</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Nilai Pembelian</span>
                <span className="font-semibold text-red-600 text-xs md:text-sm break-all">{formatCurrency(stats.totalPembelian)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistik Penjualan Motor */}
        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Receipt className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              Statistik Penjualan Motor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Total Penjualan</span>
                <span className="font-semibold text-sm md:text-base">{stats.totalPenjualanUnit} Unit</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Nilai Penjualan</span>
                <span className="font-semibold text-green-600 text-xs md:text-sm break-all">{formatCurrency(stats.totalPenjualan)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
        {/* Modal per Perusahaan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              Modal per Perusahaan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 md:space-y-3">
              {stats.modalPerCompany.map((company, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-xs md:text-sm text-gray-600 truncate pr-2">{company.name}</span>
                  <span className="font-semibold text-blue-600 text-xs md:text-sm break-all">{formatCurrency(company.modal)}</span>
                </div>
              ))}
              {stats.modalPerCompany.length === 0 && (
                <p className="text-xs md:text-sm text-gray-500">Tidak ada data perusahaan</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Modal Perusahaan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              Summary Perusahaan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Total Modal</span>
                <span className="font-semibold text-blue-600 text-xs md:text-sm break-all">{formatCurrency(stats.totalModal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Companies Aktif</span>
                <span className="font-semibold text-green-600 text-sm md:text-base">{stats.activeCompanies}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs md:text-sm text-gray-600">Companies Passive</span>
                <span className="font-semibold text-gray-500 text-sm md:text-base">{stats.passiveCompanies}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;