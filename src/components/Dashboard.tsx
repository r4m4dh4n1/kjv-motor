import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Car, Briefcase, Package, TrendingUp, Users, DollarSign, ShoppingCart, Receipt, TrendingDown, BookOpen, Activity, BarChart3, PieChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
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
    // ✅ TAMBAH: Field untuk card baru
    totalPembelianReady: 0, // Total pembelian status ready
    totalUnitReady: 0, // Total unit status ready
    totalUnitPajakMati: 0, // Total unit yang tanggal pajak <= hari ini
    totalBookedAll: 0, // Total booked (harga_beli)
    totalUnitBookedAll: 0, // Total unit booked
    modalPerCompany: [] as Array<{name: string, modal: number}>,
    monthlyTrend: [] as Array<{month: string, pembelian: number, penjualan: number, keuntungan: number}>,
    statusTrend: [] as Array<{date: string, ready: number, booked: number, sold: number}>,
    salesByDivision: [] as Array<{name: string, value: number, color: string}>,
    stockDistribution: [] as Array<{name: string, stock: number, value: number}>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDivision, selectedCabang]);

  // Get current month and year
  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      month: now.getMonth() + 1, // JavaScript months are 0-indexed
      year: now.getFullYear()
    };
  };

  const fetchDashboardData = async () => {
    try {
      const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
      
      // Build queries with division, cabang, and current month filter
      let jenisMotorQuery = supabase.from('jenis_motor').select('*');
      let companiesQuery = supabase.from('companies').select('*');
      let pembelianQuery = supabase
        .from('pembelian')
        .select('*')
        .gte('tanggal_pembelian', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('tanggal_pembelian', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);
      let penjualanQuery = supabase
        .from('penjualans')
        .select('*')
        .gte('tanggal', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('tanggal', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);
      
      // Query terpisah untuk booked orders - ambil semua data tanpa filter waktu
      let bookedOrdersQuery = supabase
        .from('penjualans')
        .select('*')
        .in('status', ['Booked', 'booked']);
      
      let operationalQuery = supabase
        .from('operational')
        .select('*')
        .gte('tanggal', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('tanggal', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);
      
      // ✅ TAMBAH: Query pembelian status ready (tanpa filter periode)
      let pembelianReadyQuery = supabase
        .from('pembelian')
        .select('*')
        .eq('status', 'ready');
      
      // ✅ TAMBAH: Query penjualan status booked (tanpa filter periode)
      let penjualanBookedQuery = supabase
        .from('penjualans')
        .select('*')
        .in('status', ['Booked', 'booked']);
      
      if (selectedDivision !== 'all') {
        jenisMotorQuery = jenisMotorQuery.eq('divisi', selectedDivision);
        companiesQuery = companiesQuery.eq('divisi', selectedDivision);
        pembelianQuery = pembelianQuery.eq('divisi', selectedDivision);
        penjualanQuery = penjualanQuery.eq('divisi', selectedDivision);
        bookedOrdersQuery = bookedOrdersQuery.eq('divisi', selectedDivision);
        operationalQuery = operationalQuery.eq('divisi', selectedDivision);
        pembelianReadyQuery = pembelianReadyQuery.eq('divisi', selectedDivision); // ✅ TAMBAH
        penjualanBookedQuery = penjualanBookedQuery.eq('divisi', selectedDivision); // ✅ TAMBAH
      }

      if (selectedCabang !== 'all') {
        pembelianQuery = pembelianQuery.eq('cabang_id', parseInt(selectedCabang));
        penjualanQuery = penjualanQuery.eq('cabang_id', parseInt(selectedCabang));
        bookedOrdersQuery = bookedOrdersQuery.eq('cabang_id', parseInt(selectedCabang));
        operationalQuery = operationalQuery.eq('cabang_id', parseInt(selectedCabang));
        pembelianReadyQuery = pembelianReadyQuery.eq('cabang_id', parseInt(selectedCabang)); // ✅ TAMBAH: Filter cabang untuk pembelian ready
        penjualanBookedQuery = penjualanBookedQuery.eq('cabang_id', parseInt(selectedCabang)); // ✅ TAMBAH: Filter cabang untuk penjualan booked
      }

      const [
        brandsResult, 
        jenisMotorResult, 
        companiesResult, 
        assetsResult,
        cabangResult,
        pembelianResult,
        penjualanResult,
        bookedOrdersResult,
        operationalResult,
        pembelianReadyResult, // ✅ TAMBAH
        penjualanBookedResult  // ✅ TAMBAH
      ] = await Promise.all([
        supabase.from('brands').select('*'),
        jenisMotorQuery,
        companiesQuery,
        supabase.from('assets').select('*'),
        supabase.from('cabang').select('*'),
        pembelianQuery,
        penjualanQuery,
        bookedOrdersQuery,
        operationalQuery,
        pembelianReadyQuery, // ✅ TAMBAH
        penjualanBookedQuery // ✅ TAMBAH
      ]);

      if (brandsResult.error) throw brandsResult.error;
      if (jenisMotorResult.error) throw jenisMotorResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (assetsResult.error) throw assetsResult.error;
      if (bookedOrdersResult.error) throw bookedOrdersResult.error;
      if (operationalResult.error) throw operationalResult.error;
      if (pembelianReadyResult.error) throw pembelianReadyResult.error; // ✅ TAMBAH
      if (penjualanBookedResult.error) throw penjualanBookedResult.error; // ✅ TAMBAH

      const brands: Brand[] = brandsResult.data || [];
      const jenisMotor: JenisMotor[] = jenisMotorResult.data || [];
      const companies: Company[] = companiesResult.data || [];
      const assets: Asset[] = assetsResult.data || [];
      const cabang = cabangResult.data || [];
      const pembelian = pembelianResult.data || [];
      const penjualan = penjualanResult.data || [];
      const bookedOrders = bookedOrdersResult.data || [];
      const operational = operationalResult.data || [];
      const pembelianReady = pembelianReadyResult.data || []; // ✅ TAMBAH
      const penjualanBooked = penjualanBookedResult.data || []; // ✅ TAMBAH

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
      
      // Calculate booked stats (handle both 'Booked' and 'booked')
      const bookedPenjualan = penjualan.filter(p => 
        p.status === 'Booked' || p.status === 'booked'
      );
      const totalBooked = bookedPenjualan.reduce((sum, p) => sum + p.harga_jual, 0);
      const totalBookedUnit = bookedPenjualan.length;
      
      const totalOperational = operational.reduce((sum, o) => sum + o.nominal, 0);

      // ✅ TAMBAH: Calculate stats untuk card baru
      // 1. Total Pembelian Ready (pakai harga_final jika ada, jika tidak pakai harga_beli)
      const totalPembelianReady = pembelianReady.reduce((sum, p) => {
        const harga = (p.harga_final && p.harga_final > 0) ? p.harga_final : p.harga_beli;
        return sum + harga;
      }, 0);
      
      // 2. Total Unit Ready
      const totalUnitReady = pembelianReady.length;
      
      // 3. Total Unit Pajak Mati (tanggal_pajak <= hari ini)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const totalUnitPajakMati = pembelianReady.filter(p => {
        if (!p.tanggal_pajak) return false;
        const tanggalPajak = new Date(p.tanggal_pajak);
        tanggalPajak.setHours(0, 0, 0, 0);
        return tanggalPajak <= today;
      }).length;
      
      // 4. Total Booked (harga_beli dari penjualan booked)
      const totalBookedAll = penjualanBooked.reduce((sum, p) => sum + (p.harga_beli || 0), 0);
      
      // 5. Total Unit Booked
      const totalUnitBookedAll = penjualanBooked.length;

      // Modal per company
      const modalPerCompany = companies.map(c => ({
        name: c.nama_perusahaan,
        modal: c.modal
      }));

      // Calculate status trend for current month (daily breakdown)
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const statusTrend = [];
      
      for (let day = 1; day <= Math.min(daysInMonth, 30); day++) {
        const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        
        // Count pembelian with ready status for this day
        const readyCount = pembelian.filter(p => 
          p.tanggal_pembelian === dateStr && p.status === 'ready'
        ).length;
        
        // Count penjualan with Booked status for this day (handle both cases)
        const bookedCount = penjualan.filter(p => 
          p.tanggal === dateStr && (p.status === 'Booked' || p.status === 'booked')
        ).length;
        
        // Count penjualan with selesai status for this day (sold = selesai)
        const soldCount = penjualan.filter(p => 
          p.tanggal === dateStr && p.status === 'selesai'
        ).length;

        statusTrend.push({
          date: `${day}/${currentMonth}`,
          ready: readyCount,
          booked: bookedCount,
          sold: soldCount
        });
      }

      // Sample monthly trend data (in real app, fetch from database)
      const monthlyTrend = [
        { month: 'Jan', pembelian: totalPembelian * 0.8, penjualan: totalPenjualan * 0.7, keuntungan: totalKeuntungan * 0.6 },
        { month: 'Feb', pembelian: totalPembelian * 0.9, penjualan: totalPenjualan * 0.8, keuntungan: totalKeuntungan * 0.7 },
        { month: 'Mar', pembelian: totalPembelian * 1.1, penjualan: totalPenjualan * 0.9, keuntungan: totalKeuntungan * 0.8 },
        { month: 'Apr', pembelian: totalPembelian * 0.95, penjualan: totalPenjualan * 1.0, keuntungan: totalKeuntungan * 0.9 },
        { month: 'May', pembelian: totalPembelian * 1.0, penjualan: totalPenjualan * 1.1, keuntungan: totalKeuntungan * 1.0 },
        { month: 'Jun', pembelian: totalPembelian, penjualan: totalPenjualan, keuntungan: totalKeuntungan },
      ];

      // Sales by division
      const salesByDivision = [
        { name: 'Sport', value: sportMotors, color: '#0088FE' },
        { name: 'Start', value: startMotors, color: '#00C49F' },
      ];

      // Stock distribution by type
      const stockDistribution = [
        { name: 'Motor Sport', stock: sportMotors, value: sportMotors },
        { name: 'Motor Start', stock: startMotors, value: startMotors },
      ];

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
        // ✅ TAMBAH: Field untuk card baru
        totalPembelianReady,
        totalUnitReady,
        totalUnitPajakMati,
        totalBookedAll,
        totalUnitBookedAll,
        modalPerCompany,
        monthlyTrend,
        statusTrend,
        salesByDivision,
        stockDistribution,
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

  // Define colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const dashboardStats = [
    {
      title: "Total Keuntungan",
      value: formatCurrency(stats.totalKeuntungan),
      unit: `${stats.totalKeuntunganUnit} Unit`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600",
      change: "+12.5%",
      changeType: "positive"
    },
    {
      title: "Total Penjualan",
      value: formatCurrency(stats.totalPenjualan),
      unit: `${stats.totalPenjualanUnit} Unit`,
      icon: Receipt,
      color: "text-blue-600", 
      bgColor: "bg-gradient-to-r from-blue-500 to-blue-600",
      change: "+8.2%",
      changeType: "positive"
    },
    {
      title: "Total Pembelian",
      value: formatCurrency(stats.totalPembelian),
      unit: `${stats.totalPembelianUnit} Unit`,
      icon: ShoppingCart,
      color: "text-orange-600",
      bgColor: "bg-gradient-to-r from-orange-500 to-orange-600",
      change: "+5.1%",
      changeType: "positive"
    },
    {
      title: "Stock Motors (Total Keseluruhan)",
      value: (stats.sportMotors + stats.startMotors).toString(),
      unit: "Unit Available",
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-gradient-to-r from-purple-500 to-purple-600",
      change: "-2.3%",
      changeType: "negative"
    },
  ];


  if (loading) {
    return <div className="p-6">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-full overflow-hidden animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Analytics
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Data bulan {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} - Real-time insights untuk KJV Motor Divisi {selectedDivision}
          </p>
        </div>
        
        {/* Filter by Cabang */}
        <div className="w-full sm:w-64 lg:w-48 flex-shrink-0">
          <Select value={selectedCabang} onValueChange={setSelectedCabang}>
            <SelectTrigger className="border-2 border-dashed border-border hover:border-primary transition-colors">
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

      {/* Main Stats Cards with Gradient */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
              <div className={`absolute inset-0 ${stat.bgColor} opacity-90`} />
              <CardContent className="relative p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white/80 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mb-1 truncate">
                      {stat.value}
                    </p>
                    {stat.unit && (
                      <p className="text-xs text-white/70">
                        {stat.unit}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className={`w-3 h-3 ${stat.changeType === 'positive' ? 'text-green-200' : 'text-red-200'}`} />
                      <span className={`text-xs ${stat.changeType === 'positive' ? 'text-green-200' : 'text-red-200'}`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-white/20 rounded-full group-hover:bg-white/30 transition-colors">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ✅ TAMBAH: Grid untuk 5 card baru */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <span className="text-xs font-semibold bg-blue-200 text-blue-800 px-2 py-1 rounded">READY</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Pembelian (Ready)</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalPembelianReady)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalUnitReady} Unit</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Package className="w-8 h-8 text-green-600" />
              <span className="text-xs font-semibold bg-green-200 text-green-800 px-2 py-1 rounded">READY</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Unit (Ready)</p>
              <p className="text-2xl font-bold text-green-700">{stats.totalUnitReady}</p>
              <p className="text-xs text-gray-500 mt-1">Unit Available</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <span className="text-xs font-semibold bg-red-200 text-red-800 px-2 py-1 rounded">WARNING</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Unit Pajak Mati</p>
              <p className="text-2xl font-bold text-red-700">{stats.totalUnitPajakMati}</p>
              <p className="text-xs text-gray-500 mt-1">Tanggal Pajak ≤ Hari Ini</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <BookOpen className="w-8 h-8 text-yellow-600" />
              <span className="text-xs font-semibold bg-yellow-200 text-yellow-800 px-2 py-1 rounded">BOOKED</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Booked</p>
              <p className="text-2xl font-bold text-yellow-700">{formatCurrency(stats.totalBookedAll)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalUnitBookedAll} Unit</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <Briefcase className="w-8 h-8 text-purple-600" />
              <span className="text-xs font-semibold bg-purple-200 text-purple-800 px-2 py-1 rounded">BOOKED</span>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Unit Booked</p>
              <p className="text-2xl font-bold text-purple-700">{stats.totalUnitBookedAll}</p>
              <p className="text-xs text-gray-500 mt-1">Unit</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Trend Chart (Ready, Booked, Sold) */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Status Trend Bulan Ini (Ready, Booked, Sold)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.statusTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value} Unit`, 
                    name === 'ready' ? 'Ready' : name === 'booked' ? 'Booked' : 'Sold'
                  ]}
                  labelStyle={{ color: '#666' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ready" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  name="Ready"
                />
                <Line 
                  type="monotone" 
                  dataKey="booked" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                  name="Booked"
                />
                <Line 
                  type="monotone" 
                  dataKey="sold" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                  name="Sold"
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                <div className="text-sm font-medium text-gray-600">Ready</div>
                <div className="text-lg font-bold text-green-600">
                  {stats.statusTrend.reduce((sum, item) => sum + item.ready, 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="w-4 h-4 bg-yellow-500 rounded mx-auto mb-1"></div>
                <div className="text-sm font-medium text-gray-600">Booked</div>
                <div className="text-lg font-bold text-yellow-600">
                  {stats.statusTrend.reduce((sum, item) => sum + item.booked, 0)}
                </div>
              </div>
              <div className="text-center">
                <div className="w-4 h-4 bg-red-500 rounded mx-auto mb-1"></div>
                <div className="text-sm font-medium text-gray-600">Sold</div>
                <div className="text-lg font-bold text-red-600">
                  {stats.statusTrend.reduce((sum, item) => sum + item.sold, 0)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Distribution Pie Chart */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              Distribusi Stock Motor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={stats.stockDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {stats.stockDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value} Unit`, 'Stock']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {stats.stockDistribution.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance & Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Statistik Modal Performance */}
        <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Performance Modal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.modalPerCompany}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Modal']}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="modal" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Motor Sport</span>
              <span className="font-bold text-blue-600">{stats.sportMotors} Unit</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Motor Start</span>
              <span className="font-bold text-green-600">{stats.startMotors} Unit</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
              <span className="text-sm font-medium text-purple-800">Total Stock</span>
              <span className="font-bold text-purple-800">{stats.sportMotors + stats.startMotors} Unit</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-100 to-orange-200 rounded-lg">
              <span className="text-sm font-medium text-orange-800">Booked Orders</span>
              <span className="font-bold text-orange-800">{stats.totalBookedUnit} Unit</span>
            </div>
          </CardContent>
        </Card>

        {/* Company Status */}
        <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Company Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {formatCurrency(stats.totalModal)}
              </div>
              <p className="text-sm text-gray-600">Total Modal</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.activeCompanies}</div>
                <p className="text-xs text-green-700">Active</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{stats.passiveCompanies}</div>
                <p className="text-xs text-gray-700">Passive</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-indigo-800">Operational Cost</span>
                <span className="font-bold text-indigo-800">{formatCurrency(stats.totalOperational)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;