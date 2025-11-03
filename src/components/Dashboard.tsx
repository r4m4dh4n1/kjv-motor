import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Building,
  Car,
  Briefcase,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Receipt,
  TrendingDown,
  BookOpen,
  Activity,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";
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
  const [detailPajakMati, setDetailPajakMati] = useState<any[]>([]);
  const [detailStockTua, setDetailStockTua] = useState<any[]>([]);
  const [detailBelumQC, setDetailBelumQC] = useState<any[]>([]);
  const [detailSudahQC, setDetailSudahQC] = useState<any[]>([]);
  const [openDialogPajakMati, setOpenDialogPajakMati] = useState(false);
  const [openDialogStockTua, setOpenDialogStockTua] = useState(false);
  const [openDialogBelumQC, setOpenDialogBelumQC] = useState(false);
  const [openDialogSudahQC, setOpenDialogSudahQC] = useState(false);
  const [openDialogReadyTotal, setOpenDialogReadyTotal] = useState(false);
  const [openDialogBookedDP, setOpenDialogBookedDP] = useState(false);
  const [openDialogBookedUnit, setOpenDialogBookedUnit] = useState(false);
  const [readyUnits, setReadyUnits] = useState<any[]>([]);
  const [bookedUnits, setBookedUnits] = useState<any[]>([]);

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
    stockMotorsBulanIni: 0, // Stock motors bulan ini (pembelian bulan ini dengan status ready)
    totalUnitStokTua: 0, // Total unit yang tanggal pembeliannya sudah lama (> 3 bulan) tapi masih ready
    unitBelumQC: 0, // Total unit yang belum QC (unique pembelian_id where real_nominal_qc is null or 0)
    totalUnitSudahQC: 0,
    modalPerCompany: [] as Array<{ name: string; modal: number }>,
    monthlyTrend: [] as Array<{
      month: string;
      pembelian: number;
      penjualan: number;
      keuntungan: number;
    }>,
    statusTrend: [] as Array<{
      date: string;
      ready: number;
      booked: number;
      sold: number;
    }>,
    salesByDivision: [] as Array<{
      name: string;
      value: number;
      color: string;
    }>,
    stockDistribution: [] as Array<{
      name: string;
      stock: number;
      value: number;
    }>,
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
      year: now.getFullYear(),
    };
  };

  const fetchDashboardData = async () => {
    try {
      const { month: currentMonth, year: currentYear } = getCurrentMonthYear();

      // Build queries with division, cabang, and current month filter
      let jenisMotorQuery = supabase.from("jenis_motor").select("*");
      let companiesQuery = supabase.from("companies").select("*");
      let pembelianQuery = supabase
        .from("pembelian")
        .select("*")
        .gte(
          "tanggal_pembelian",
          `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`
        )
        .lt(
          "tanggal_pembelian",
          `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-01`
        );
      let penjualanQuery = supabase
        .from("penjualans")
        .select("*")
        .eq("status", "selesai") // ✅ FIXED: Only count sold items for profit calculation
        .gte(
          "tanggal",
          `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`
        )
        .lt(
          "tanggal",
          `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-01`
        );

      // Query terpisah untuk booked orders - ambil semua data tanpa filter waktu
      let bookedOrdersQuery = supabase
        .from("penjualans")
        .select("*")
        .in("status", ["Booked", "booked"]);

      let operationalQuery = supabase
        .from("operational")
        .select("*")
        .gte(
          "tanggal",
          `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`
        )
        .lt(
          "tanggal",
          `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-01`
        );

      // ✅ TAMBAH: Query pembelian status ready (tanpa filter periode) - dengan join untuk brand dan jenis motor
      let pembelianReadyQuery = supabase
        .from("pembelian")
        .select(
          `
          *,
          brands:brand_id(name),
          jenis_motor:jenis_motor_id(jenis_motor)
        `
        )
        .eq("status", "ready");

      // ✅ FIX: Query pembelian bulan ini dengan status ready (untuk Stock Motors Bulan ini)
      let pembelianReadyBulanIniQuery = supabase
        .from("pembelian")
        .select("*")
        .eq("status", "ready")
        .gte(
          "tanggal_pembelian",
          `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`
        )
        .lt(
          "tanggal_pembelian",
          `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-01`
        );

      // ✅ TAMBAH: Query pembelian lama (> 3 bulan) yang masih ready - dengan join
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

      let pembelianStokTuaQuery = supabase
        .from("pembelian")
        .select(
          `
          *,
          brands:brand_id(name),
          jenis_motor:jenis_motor_id(jenis_motor)
        `
        )
        .eq("status", "ready")
        .lt("tanggal_pembelian", threeMonthsAgoStr);

      // QC Report - fetch separately if needed (table might not exist yet)
      // let qcReportQuery = supabase.from("qc_report").select("*");

      // ✅ TAMBAH: Query penjualan status booked (tanpa filter periode)
      let penjualanBookedQuery = supabase
        .from("penjualans")
        .select(
          `
          *,
          pembelian:pembelian_id(
            *,
            brands:brand_id(name),
            jenis_motor:jenis_motor_id(jenis_motor)
          )
        `
        )
        .in("status", ["Booked", "booked"]);

      if (selectedDivision !== "all") {
        jenisMotorQuery = jenisMotorQuery.eq("divisi", selectedDivision);
        companiesQuery = companiesQuery.eq("divisi", selectedDivision);
        pembelianQuery = pembelianQuery.eq("divisi", selectedDivision);
        penjualanQuery = penjualanQuery.eq("divisi", selectedDivision);
        bookedOrdersQuery = bookedOrdersQuery.eq("divisi", selectedDivision);
        operationalQuery = operationalQuery.eq("divisi", selectedDivision);
        pembelianReadyQuery = pembelianReadyQuery.eq(
          "divisi",
          selectedDivision
        ); // ✅ TAMBAH
        pembelianReadyBulanIniQuery = pembelianReadyBulanIniQuery.eq(
          "divisi",
          selectedDivision
        ); // ✅ FIX
        pembelianStokTuaQuery = pembelianStokTuaQuery.eq(
          "divisi",
          selectedDivision
        ); // ✅ TAMBAH: Filter divisi untuk stok tua
        penjualanBookedQuery = penjualanBookedQuery.eq(
          "divisi",
          selectedDivision
        ); // ✅ TAMBAH
      }

      if (selectedCabang !== "all") {
        pembelianQuery = pembelianQuery.eq(
          "cabang_id",
          parseInt(selectedCabang)
        );
        penjualanQuery = penjualanQuery.eq(
          "cabang_id",
          parseInt(selectedCabang)
        );
        bookedOrdersQuery = bookedOrdersQuery.eq(
          "cabang_id",
          parseInt(selectedCabang)
        );
        operationalQuery = operationalQuery.eq(
          "cabang_id",
          parseInt(selectedCabang)
        );
        pembelianReadyQuery = pembelianReadyQuery.eq(
          "cabang_id",
          parseInt(selectedCabang)
        ); // ✅ TAMBAH: Filter cabang untuk pembelian ready
        pembelianReadyBulanIniQuery = pembelianReadyBulanIniQuery.eq(
          "cabang_id",
          parseInt(selectedCabang)
        ); // ✅ FIX
        pembelianStokTuaQuery = pembelianStokTuaQuery.eq(
          "cabang_id",
          parseInt(selectedCabang)
        ); // ✅ TAMBAH: Filter cabang untuk stok tua
        penjualanBookedQuery = penjualanBookedQuery.eq(
          "cabang_id",
          parseInt(selectedCabang)
        ); // ✅ TAMBAH: Filter cabang untuk penjualan booked
        // NOTE: qc_report does not contain divisi/cabang directly, we'll filter client-side after fetching joined pembelian
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
        penjualanBookedResult, // ✅ TAMBAH
        pembelianReadyBulanIniResult, // ✅ FIX
        pembelianStokTuaResult, // ✅ TAMBAH: Stock tua
      ] = await Promise.all([
        supabase.from("brands").select("*"),
        jenisMotorQuery,
        companiesQuery,
        supabase.from("assets").select("*"),
        supabase.from("cabang").select("*"),
        pembelianQuery,
        penjualanQuery,
        bookedOrdersQuery,
        operationalQuery,
        pembelianReadyQuery, // ✅ TAMBAH
        penjualanBookedQuery, // ✅ TAMBAH
        pembelianReadyBulanIniQuery, // ✅ FIX
        pembelianStokTuaQuery, // ✅ TAMBAH: Stock tua
      ]);

      if (brandsResult.error) throw brandsResult.error;
      if (jenisMotorResult.error) throw jenisMotorResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (assetsResult.error) throw assetsResult.error;
      if (bookedOrdersResult.error) throw bookedOrdersResult.error;
      if (operationalResult.error) throw operationalResult.error;
      if (pembelianReadyResult.error) throw pembelianReadyResult.error; // ✅ TAMBAH
      if (penjualanBookedResult.error) throw penjualanBookedResult.error; // ✅ TAMBAH
      if (pembelianReadyBulanIniResult.error)
        throw pembelianReadyBulanIniResult.error; // ✅ FIX
      if (pembelianStokTuaResult.error) throw pembelianStokTuaResult.error; // ✅ TAMBAH

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
      const pembelianReadyBulanIni = pembelianReadyBulanIniResult.data || []; // ✅ FIX
      const pembelianStokTua = pembelianStokTuaResult.data || []; // ✅ TAMBAH

      // Count stock statistics

      // Set cabang data for filter
      setCabangData(cabang);
      setReadyUnits(pembelianReady);
      setBookedUnits(penjualanBooked);

      // Calculate stats
      const activeCompanies = companies.filter(
        (c) => c.status === "active"
      ).length;
      const passiveCompanies = companies.filter(
        (c) => c.status === "passive"
      ).length;
      const totalModal = companies.reduce((sum, c) => sum + c.modal, 0);
      const sportMotors = pembelianReady.filter(
        (p) => p.divisi === "sport"
      ).length;
      const startMotors = pembelianReady.filter(
        (p) => p.divisi === "start"
      ).length;
      // Calculate financial stats
      // ✅ FIX: Gunakan harga_final jika ada, jika tidak pakai harga_beli (konsisten dengan Total Pembelian Ready)
      const totalPembelian = pembelian.reduce((sum, p) => {
        const harga =
          p.harga_final && p.harga_final > 0 ? p.harga_final : p.harga_beli;
        return sum + harga;
      }, 0);
      const totalPembelianUnit = pembelian.length;
      const totalPenjualan = penjualan.reduce(
        (sum, p) => sum + p.harga_jual,
        0
      );
      const totalPenjualanUnit = penjualan.length;
      const totalKeuntungan = penjualan.reduce(
        (sum, p) => sum + (p.keuntungan || 0),
        0
      );
      const totalKeuntunganUnit = penjualan.length;

      // Calculate booked stats (handle both 'Booked' and 'booked')
      const bookedPenjualan = penjualan.filter(
        (p) => p.status === "Booked" || p.status === "booked"
      );
      const totalBooked = bookedPenjualan.reduce(
        (sum, p) => sum + p.harga_jual,
        0
      );
      const totalBookedUnit = bookedPenjualan.length;

      const totalOperational = operational.reduce(
        (sum, o) => sum + o.nominal,
        0
      );

      // ✅ TAMBAH: Calculate stats untuk card baru
      // 1. Total Pembelian Ready (pakai harga_final jika ada, jika tidak pakai harga_beli)
      const totalPembelianReady = pembelianReady.reduce((sum, p) => {
        const harga =
          p.harga_final && p.harga_final > 0 ? p.harga_final : p.harga_beli;
        return sum + harga;
      }, 0);

      // 2. Total Unit Ready
      const totalUnitReady = pembelianReady.length;

      // 3. Total Unit Pajak Mati (tanggal_pajak <= hari ini)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const detailUnitPajakMati = pembelianReady.filter((p) => {
        if (!p.tanggal_pajak) return false;
        const tanggalPajak = new Date(p.tanggal_pajak);
        tanggalPajak.setHours(0, 0, 0, 0);
        return tanggalPajak <= today;
      });
      const totalUnitPajakMati = detailUnitPajakMati.length;

      // 4. Total Booked (DP/Uang Muka dari penjualan booked)
      const totalBookedAll = penjualanBooked.reduce(
        (sum, p) => sum + (p.dp || 0),
        0
      );

      // 5. Total Unit Booked
      const totalUnitBookedAll = penjualanBooked.length;

      // 6. Stock Motors Bulan Ini (pembelian bulan ini dengan status ready)
      const stockMotorsBulanIni = pembelianReadyBulanIni.length;

      // 7. Total Unit Stock Tua (> 3 bulan tapi masih ready)
      const totalUnitStokTua = pembelianStokTua.length;
      
      // 8. QC processing - removed for now (table might not exist)
      const unitBelumQC = 0;
      const unitSudahQC = 0;
      setDetailBelumQC([]);
      setDetailSudahQC([]);

      // Set detail untuk popup
      setDetailPajakMati(detailUnitPajakMati);
      setDetailStockTua(pembelianStokTua);

      // Modal per company
      const modalPerCompany = companies.map((c) => ({
        name: c.nama_perusahaan,
        modal: c.modal,
      }));

      // Calculate status trend for current month (daily breakdown)
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const statusTrend = [];

      for (let day = 1; day <= Math.min(daysInMonth, 30); day++) {
        const dateStr = `${currentYear}-${currentMonth
          .toString()
          .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

        // Count pembelian with ready status for this day
        const readyCount = pembelian.filter(
          (p) => p.tanggal_pembelian === dateStr && p.status === "ready"
        ).length;

        // Count penjualan with Booked status for this day (handle both cases)
        const bookedCount = penjualan.filter(
          (p) =>
            p.tanggal === dateStr &&
            (p.status === "Booked" || p.status === "booked")
        ).length;

        // Count penjualan with selesai status for this day (sold = selesai)
        const soldCount = penjualan.filter(
          (p) => p.tanggal === dateStr && p.status === "selesai"
        ).length;

        statusTrend.push({
          date: `${day}/${currentMonth}`,
          ready: readyCount,
          booked: bookedCount,
          sold: soldCount,
        });
      }

      // Sample monthly trend data (in real app, fetch from database)
      const monthlyTrend = [
        {
          month: "Jan",
          pembelian: totalPembelian * 0.8,
          penjualan: totalPenjualan * 0.7,
          keuntungan: totalKeuntungan * 0.6,
        },
        {
          month: "Feb",
          pembelian: totalPembelian * 0.9,
          penjualan: totalPenjualan * 0.8,
          keuntungan: totalKeuntungan * 0.7,
        },
        {
          month: "Mar",
          pembelian: totalPembelian * 1.1,
          penjualan: totalPenjualan * 0.9,
          keuntungan: totalKeuntungan * 0.8,
        },
        {
          month: "Apr",
          pembelian: totalPembelian * 0.95,
          penjualan: totalPenjualan * 1.0,
          keuntungan: totalKeuntungan * 0.9,
        },
        {
          month: "May",
          pembelian: totalPembelian * 1.0,
          penjualan: totalPenjualan * 1.1,
          keuntungan: totalKeuntungan * 1.0,
        },
        {
          month: "Jun",
          pembelian: totalPembelian,
          penjualan: totalPenjualan,
          keuntungan: totalKeuntungan,
        },
      ];

      // Sales by division
      const salesByDivision = [
        { name: "Sport", value: sportMotors, color: "#0088FE" },
        { name: "Start", value: startMotors, color: "#00C49F" },
      ];

      // Stock distribution by type
      const stockDistribution = [
        { name: "Motor Sport", stock: sportMotors, value: sportMotors },
        { name: "Motor Start", stock: startMotors, value: startMotors },
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
        stockMotorsBulanIni,
        totalUnitStokTua,
        unitBelumQC,
        totalUnitSudahQC: unitSudahQC,
        modalPerCompany,
        monthlyTrend,
        statusTrend,
        salesByDivision,
        stockDistribution,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Define colors for charts
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
  ];

  // ✅ FIX: Stock motors bulan ini sudah dihitung dengan benar dari pembelian bulan ini yang statusnya ready
  const stockMotorsBulanIni = stats.stockMotorsBulanIni;

  const dashboardStats = [
    {
      title: "Total Keuntungan",
      value: formatCurrency(stats.totalKeuntungan),
      unit: `${stats.totalKeuntunganUnit} Unit`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-gradient-to-r from-emerald-500 to-emerald-600",
      change: "+12.5%",
      changeType: "positive",
    },
    {
      title: "Total Penjualan",
      value: formatCurrency(stats.totalPenjualan),
      unit: `${stats.totalPenjualanUnit} Unit`,
      icon: Receipt,
      color: "text-blue-600",
      bgColor: "bg-gradient-to-r from-blue-500 to-blue-600",
      change: "+8.2%",
      changeType: "positive",
    },
    {
      title: "Total Pembelian",
      value: formatCurrency(stats.totalPembelian),
      unit: `${stats.totalPembelianUnit} Unit`,
      icon: ShoppingCart,
      color: "text-orange-600",
      bgColor: "bg-gradient-to-r from-orange-500 to-orange-600",
      change: "+5.1%",
      changeType: "positive",
    },
    {
      title: "Unit belum QC",
      value: stats.unitBelumQC.toString(),
      unit: "Unit",
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-gradient-to-r from-purple-500 to-purple-600",
      change: "-2.3%",
      changeType: "negative",
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
            Data bulan{" "}
            {new Date().toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}{" "}
            - Real-time insights untuk KJV Motor Divisi {selectedDivision}
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
          const isClickable = stat.title === "Unit belum QC";
          return (
            <Card
              key={index}
              onClick={
                isClickable ? () => setOpenDialogBelumQC(true) : undefined
              }
              className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group ${
                isClickable ? "cursor-pointer" : ""
              }`}
            >
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
                      <p className="text-xs text-white/70">{stat.unit}</p>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp
                        className={`w-3 h-3 ${
                          stat.changeType === "positive"
                            ? "text-green-200"
                            : "text-red-200"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          stat.changeType === "positive"
                            ? "text-green-200"
                            : "text-red-200"
                        }`}
                      >
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

      {/* ✅ REDESIGN: Grid untuk 6 card baru - Lebih compact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Modal Unit Ready */}
        <Dialog
          open={openDialogReadyTotal}
          onOpenChange={setOpenDialogReadyTotal}
        >
          <Card
            className="border border-blue-200 bg-blue-50 shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
            onClick={() => setOpenDialogReadyTotal(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <DollarSign className="w-6 h-6 text-blue-600" />
                <span className="text-[10px] font-semibold bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                  READY
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mb-1">Modal Unit Ready</p>
              <p className="text-lg font-bold text-blue-700">
                {formatCurrency(stats.totalPembelianReady)}
              </p>
              <p className="text-[10px] text-gray-500">
                {stats.totalUnitReady} Unit
              </p>
            </CardContent>
          </Card>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modal Unit Ready</DialogTitle>
              <DialogDescription>
                Daftar unit dengan status ready dan modal yang dibutuhkan
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {readyUnits.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left text-xs font-semibold">
                          No
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Tanggal Beli
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Brand
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Jenis Motor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Harga
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...readyUnits]
                        .sort((a, b) => {
                          // Primary sort: Brand name A -> Z
                          const brandA = (a.brands?.name || "").toLowerCase();
                          const brandB = (b.brands?.name || "").toLowerCase();
                          const brandCompare = brandA.localeCompare(brandB);
                          if (brandCompare !== 0) return brandCompare;

                          // Tie-breaker: Tanggal pembelian (terbaru ke terlama)
                          const dateA = new Date(
                            a.tanggal_pembelian || 0
                          ).getTime();
                          const dateB = new Date(
                            b.tanggal_pembelian || 0
                          ).getTime();
                          return dateB - dateA;
                        })
                        .map((unit, idx) => {
                          const harga =
                            unit.harga_final && unit.harga_final > 0
                              ? unit.harga_final
                              : unit.harga_beli;
                          return (
                            <tr key={unit.id} className="hover:bg-gray-50">
                              <td className="border p-2 text-xs">{idx + 1}</td>
                              <td className="border p-2 text-xs">
                                {unit.tanggal_pembelian || "-"}
                              </td>
                              <td className="border p-2 text-xs">
                                {unit.brands?.name || "-"}
                              </td>
                              <td className="border p-2 text-xs">
                                {unit.jenis_motor?.jenis_motor || "-"}
                              </td>
                              <td className="border p-2 text-xs font-semibold">
                                {formatCurrency(harga)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Tidak ada data</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Total Unit Ready card removed as requested */}

        {/* Unit Belum QC (popup) */}
        <Dialog open={openDialogBelumQC} onOpenChange={setOpenDialogBelumQC}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Unit Belum QC</DialogTitle>
              <DialogDescription>
                Daftar unit yang belum melalui proses Quality Control
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {detailBelumQC.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left text-xs font-semibold">
                          No
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Brand
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Jenis Motor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Plat Nomor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Tanggal Pembelian
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Estimasi QC
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Real QC
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...detailBelumQC]
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )
                        .map((qc, idx) => {
                          const estimasi = qc.estimasi_nominal_qc;
                          const real = qc.real_nominal_qc;
                          const hasEstimasi =
                            estimasi != null && estimasi !== 0;
                          const hasReal = real != null && real !== 0;
                          // Status berdasarkan real QC: jika real > 0 maka QC selesai, jika real = 0 maka belum selesai
                          const isQCSelesai = hasReal;
                          return (
                            <tr
                              key={`${qc.id}-${qc.pembelian_id}-${idx}`}
                              className="hover:bg-gray-50"
                            >
                              <td className="border p-2 text-xs">{idx + 1}</td>
                              <td className="border p-2 text-xs">
                                {qc.pembelian?.brands?.name || "-"}
                              </td>
                              <td className="border p-2 text-xs">
                                {qc.pembelian?.jenis_motor?.jenis_motor || "-"}
                              </td>
                              <td className="border p-2 text-xs font-semibold">
                                {qc.pembelian?.plat_nomor || "-"}
                              </td>
                              <td className="border p-2 text-xs">
                                {qc.pembelian?.tanggal_pembelian || "-"}
                              </td>
                              <td className="border p-2 text-xs font-semibold">
                                {hasEstimasi
                                  ? formatCurrency(Number(estimasi))
                                  : "-"}
                              </td>
                              <td className="border p-2 text-xs font-semibold">
                                {hasReal ? formatCurrency(Number(real)) : "-"}
                              </td>
                              <td className="border p-2">
                                {isQCSelesai ? (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-[10px]">
                                    QC Selesai
                                  </span>
                                ) : (
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-[10px]">
                                    Belum QC
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Tidak ada data</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Unit Sudah QC (popup + card) */}
        <Dialog open={openDialogSudahQC} onOpenChange={setOpenDialogSudahQC}>
          <Card
            className="border border-green-200 bg-green-50 shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
            onClick={() => setOpenDialogSudahQC(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Package className="w-6 h-6 text-green-600" />
                <span className="text-[10px] font-semibold bg-green-200 text-green-800 px-2 py-0.5 rounded">
                  QC
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mb-1">Unit sudah QC</p>
              <p className="text-lg font-bold text-green-700">
                {stats.totalUnitSudahQC}
              </p>
              <p className="text-[10px] text-gray-500">All Periode</p>
            </CardContent>
          </Card>

          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Unit Sudah QC</DialogTitle>
              <DialogDescription>
                Daftar unit yang sudah selesai melalui proses Quality Control
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {detailSudahQC.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left text-xs font-semibold">
                          No
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Brand
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Jenis Motor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Plat Nomor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Tanggal Pembelian
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Estimasi QC
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Real QC
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...detailSudahQC]
                        .sort(
                          (a, b) =>
                            new Date(
                              b.pembelian?.tanggal_pembelian || b.created_at
                            ).getTime() -
                            new Date(
                              a.pembelian?.tanggal_pembelian || a.created_at
                            ).getTime()
                        )
                        .map((qc, idx) => {
                          const estimasi = qc.estimasi_nominal_qc;
                          const real = qc.real_nominal_qc;
                          const hasEstimasi =
                            estimasi != null && estimasi !== 0;
                          const hasReal = real != null && real !== 0;
                          // Status berdasarkan real QC: jika real > 0 maka QC selesai
                          const isQCSelesai = hasReal;
                          return (
                            <tr
                              key={`${qc.id}-${qc.pembelian_id}-${idx}`}
                              className="hover:bg-gray-50"
                            >
                              <td className="border p-2 text-xs">{idx + 1}</td>
                              <td className="border p-2 text-xs">
                                {qc.pembelian?.brands?.name || "-"}
                              </td>
                              <td className="border p-2 text-xs">
                                {qc.pembelian?.jenis_motor?.jenis_motor || "-"}
                              </td>
                              <td className="border p-2 text-xs font-semibold">
                                {qc.pembelian?.plat_nomor || "-"}
                              </td>
                              <td className="border p-2 text-xs">
                                {qc.pembelian?.tanggal_pembelian || "-"}
                              </td>
                              <td className="border p-2 text-xs font-semibold">
                                {hasEstimasi
                                  ? formatCurrency(Number(estimasi))
                                  : "-"}
                              </td>
                              <td className="border p-2 text-xs font-semibold">
                                {hasReal ? formatCurrency(Number(real)) : "-"}
                              </td>
                              <td className="border p-2">
                                {isQCSelesai ? (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-[10px]">
                                    QC Selesai
                                  </span>
                                ) : (
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-[10px]">
                                    Belum QC
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Tidak ada data</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Card Pajak Mati dengan Popup */}
        <Dialog
          open={openDialogPajakMati}
          onOpenChange={setOpenDialogPajakMati}
        >
          <Card
            className="border border-red-200 bg-red-50 shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
            onClick={() => setOpenDialogPajakMati(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <TrendingDown className="w-6 h-6 text-red-600" />
                <span className="text-[10px] font-semibold bg-red-200 text-red-800 px-2 py-0.5 rounded">
                  ⚠️
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mb-1">Pajak Mati</p>
              <p className="text-lg font-bold text-red-700">
                {stats.totalUnitPajakMati}
              </p>
              <p className="text-[10px] text-gray-500">Unit</p>
            </CardContent>
          </Card>

          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Unit Pajak Mati</DialogTitle>
              <DialogDescription>
                Daftar unit yang pajak kendaraannya sudah mati atau expired
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {detailPajakMati.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left text-xs font-semibold">
                          No
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Brand
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Jenis Motor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Plat Nomor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Tanggal Pajak
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...detailPajakMati]
                        .sort(
                          (a, b) =>
                            new Date(a.tanggal_pajak).getTime() -
                            new Date(b.tanggal_pajak).getTime()
                        )
                        .map((unit, idx) => (
                          <tr key={unit.id} className="hover:bg-gray-50">
                            <td className="border p-2 text-xs">{idx + 1}</td>
                            <td className="border p-2 text-xs">
                              {unit.brands?.name || "-"}
                            </td>
                            <td className="border p-2 text-xs">
                              {unit.jenis_motor?.jenis_motor || "-"}
                            </td>
                            <td className="border p-2 text-xs font-semibold">
                              {unit.plat_nomor || "-"}
                            </td>
                            <td className="border p-2 text-xs">
                              {unit.tanggal_pajak || "-"}
                            </td>
                            <td className="border p-2">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-[10px]">
                                Pajak Mati
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Tidak ada data</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Total DP Booked */}
        <Dialog open={openDialogBookedDP} onOpenChange={setOpenDialogBookedDP}>
          <Card
            className="border border-yellow-200 bg-yellow-50 shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
            onClick={() => setOpenDialogBookedDP(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <DollarSign className="w-6 h-6 text-yellow-600" />
                <span className="text-[10px] font-semibold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                  BOOKED
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mb-1">Total DP Booked</p>
              <p className="text-lg font-bold text-yellow-700">
                {formatCurrency(stats.totalBookedAll)}
              </p>
              <p className="text-[10px] text-gray-500">
                {stats.totalUnitBookedAll} Unit
              </p>
            </CardContent>
          </Card>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>DP Booked</DialogTitle>
              <DialogDescription>
                Daftar unit yang sudah dibooking dan total DP yang diterima
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {bookedUnits.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left text-xs font-semibold">
                          No
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Tanggal Beli
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Brand
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Jenis Motor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          DP
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Harga Jual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...bookedUnits]
                        .sort(
                          (a, b) =>
                            new Date(
                              b.pembelian?.tanggal_pembelian || b.tanggal
                            ).getTime() -
                            new Date(
                              a.pembelian?.tanggal_pembelian || a.tanggal
                            ).getTime()
                        )
                        .map((unit, idx) => (
                          <tr key={unit.id} className="hover:bg-gray-50">
                            <td className="border p-2 text-xs">{idx + 1}</td>
                            <td className="border p-2 text-xs">
                              {unit.pembelian?.tanggal_pembelian || "-"}
                            </td>
                            <td className="border p-2 text-xs">
                              {unit.pembelian?.brands?.name || "-"}
                            </td>
                            <td className="border p-2 text-xs">
                              {unit.pembelian?.jenis_motor?.jenis_motor || "-"}
                            </td>
                            <td className="border p-2 text-xs font-semibold">
                              {formatCurrency(unit.dp || 0)}
                            </td>
                            <td className="border p-2 text-xs">
                              {formatCurrency(unit.harga_jual || 0)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Tidak ada data</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Unit Booked */}
        <Dialog
          open={openDialogBookedUnit}
          onOpenChange={setOpenDialogBookedUnit}
        >
          <Card
            className="border border-purple-200 bg-purple-50 shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
            onClick={() => setOpenDialogBookedUnit(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Briefcase className="w-6 h-6 text-purple-600" />
                <span className="text-[10px] font-semibold bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                  BOOKED
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mb-1">Unit Booked</p>
              <p className="text-lg font-bold text-purple-700">
                {stats.totalUnitBookedAll}
              </p>
              <p className="text-[10px] text-gray-500">All Periode</p>
            </CardContent>
          </Card>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Unit Booked</DialogTitle>
              <DialogDescription>
                Daftar lengkap unit yang sudah dibooking oleh customer
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {bookedUnits.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left text-xs font-semibold">
                          No
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Tanggal Beli
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Brand
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Jenis Motor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          DP
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Harga Jual
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...bookedUnits]
                        .sort(
                          (a, b) =>
                            new Date(
                              b.pembelian?.tanggal_pembelian || b.tanggal
                            ).getTime() -
                            new Date(
                              a.pembelian?.tanggal_pembelian || a.tanggal
                            ).getTime()
                        )
                        .map((unit, idx) => (
                          <tr key={unit.id} className="hover:bg-gray-50">
                            <td className="border p-2 text-xs">{idx + 1}</td>
                            <td className="border p-2 text-xs">
                              {unit.pembelian?.tanggal_pembelian || "-"}
                            </td>
                            <td className="border p-2 text-xs">
                              {unit.pembelian?.brands?.name || "-"}
                            </td>
                            <td className="border p-2 text-xs">
                              {unit.pembelian?.jenis_motor?.jenis_motor || "-"}
                            </td>
                            <td className="border p-2 text-xs font-semibold">
                              {formatCurrency(unit.dp || 0)}
                            </td>
                            <td className="border p-2 text-xs">
                              {formatCurrency(unit.harga_jual || 0)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Tidak ada data</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Card Stock Tua dengan Popup */}
        <Dialog open={openDialogStockTua} onOpenChange={setOpenDialogStockTua}>
          <Card
            className="border border-amber-200 bg-amber-50 shadow-md hover:shadow-lg transition-all hover:scale-105 cursor-pointer"
            onClick={() => setOpenDialogStockTua(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Activity className="w-6 h-6 text-amber-600" />
                <span className="text-[10px] font-semibold bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                  ⚠️
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mb-1">Stock Tua</p>
              <p className="text-lg font-bold text-amber-700">
                {stats.totalUnitStokTua}
              </p>
              <p className="text-[10px] text-gray-500">&gt; 3 Bulan</p>
            </CardContent>
          </Card>

          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Unit Stock Tua (&gt; 3 Bulan)</DialogTitle>
              <DialogDescription>
                Daftar unit yang sudah lebih dari 3 bulan sejak pembelian namun
                masih berstatus ready
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {detailStockTua.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left text-xs font-semibold">
                          No
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Brand
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Jenis Motor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Plat Nomor
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Tanggal Pembelian
                        </th>
                        <th className="border p-2 text-left text-xs font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...detailStockTua]
                        .sort(
                          (a, b) =>
                            new Date(a.tanggal_pembelian).getTime() -
                            new Date(b.tanggal_pembelian).getTime()
                        )
                        .map((unit, idx) => (
                          <tr key={unit.id} className="hover:bg-gray-50">
                            <td className="border p-2 text-xs">{idx + 1}</td>
                            <td className="border p-2 text-xs">
                              {unit.brands?.name || "-"}
                            </td>
                            <td className="border p-2 text-xs">
                              {unit.jenis_motor?.jenis_motor || "-"}
                            </td>
                            <td className="border p-2 text-xs font-semibold">
                              {unit.plat_nomor || "-"}
                            </td>
                            <td className="border p-2 text-xs">
                              {unit.tanggal_pembelian || "-"}
                            </td>
                            <td className="border p-2">
                              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-[10px]">
                                Ready
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Tidak ada data</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
                    name === "ready"
                      ? "Ready"
                      : name === "booked"
                      ? "Booked"
                      : "Sold",
                  ]}
                  labelStyle={{ color: "#666" }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ready"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                  name="Ready"
                />
                <Line
                  type="monotone"
                  dataKey="booked"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                  name="Booked"
                />
                <Line
                  type="monotone"
                  dataKey="sold"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
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
                  {stats.statusTrend.reduce(
                    (sum, item) => sum + item.booked,
                    0
                  )}
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
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} Unit`, "Stock"]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
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
                  <span className="text-sm text-muted-foreground">
                    {entry.name}
                  </span>
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
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Modal",
                  ]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
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
              <span className="text-sm font-medium text-gray-600">
                Motor Sport
              </span>
              <span className="font-bold text-blue-600">
                {stats.sportMotors} Unit
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">
                Motor Start
              </span>
              <span className="font-bold text-green-600">
                {stats.startMotors} Unit
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
              <span className="text-sm font-medium text-purple-800">
                Total Stock
              </span>
              <span className="font-bold text-purple-800">
                {stats.sportMotors + stats.startMotors} Unit
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-100 to-orange-200 rounded-lg">
              <span className="text-sm font-medium text-orange-800">
                Booked Orders
              </span>
              <span className="font-bold text-orange-800">
                {stats.totalBookedUnit} Unit
              </span>
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
                <div className="text-2xl font-bold text-green-600">
                  {stats.activeCompanies}
                </div>
                <p className="text-xs text-green-700">Active</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {stats.passiveCompanies}
                </div>
                <p className="text-xs text-gray-700">Passive</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-indigo-800">
                  Operational Cost
                </span>
                <span className="font-bold text-indigo-800">
                  {formatCurrency(stats.totalOperational)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
