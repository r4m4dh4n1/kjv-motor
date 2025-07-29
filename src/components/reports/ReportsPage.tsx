import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { FileText, Download, TrendingUp, DollarSign, Package, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportsPageProps {
  selectedDivision: string;
}

const ReportsPage = ({ selectedDivision }: ReportsPageProps) => {
  // Updated filter states
  const [dateFilter, setDateFilter] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [reportType, setReportType] = useState("sales");
  const [salesData, setSalesData] = useState([]);
  const [salesDetailsData, setSalesDetailsData] = useState([]);
  const [purchaseData, setPurchaseData] = useState([]);
  const [profitData, setProfitData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCabang, setSelectedCabang] = useState("all");
  const [brandsOptions, setBrandsOptions] = useState([]);
  const [cabangOptions, setCabangOptions] = useState([]);
  const [trenPenjualanData, setTrenPenjualanData] = useState([]);
  const [trenPembelianData, setTrenPembelianData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Date range calculation function
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case "today":
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday.toISOString().split('T')[0], end: yesterday.toISOString().split('T')[0] };
      
      case "this_week":
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { start: startOfWeek.toISOString().split('T')[0], end: endOfWeek.toISOString().split('T')[0] };
      
      case "last_week":
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        return { start: lastWeekStart.toISOString().split('T')[0], end: lastWeekEnd.toISOString().split('T')[0] };
      
      case "this_month":
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: startOfMonth.toISOString().split('T')[0], end: endOfMonth.toISOString().split('T')[0] };
      
      case "last_month":
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: lastMonthStart.toISOString().split('T')[0], end: lastMonthEnd.toISOString().split('T')[0] };
      
      case "this_year":
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        return { start: startOfYear.toISOString().split('T')[0], end: endOfYear.toISOString().split('T')[0] };
      
      case "last_year":
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        return { start: lastYearStart.toISOString().split('T')[0], end: lastYearEnd.toISOString().split('T')[0] };
      
      case "custom":
        return { start: customStartDate, end: customEndDate };
      
      case "all":
      default:
        return { start: "2020-01-01", end: "2030-12-31" };
    }
  };

  useEffect(() => {
    // Initialize with today's date for custom filter
    const today = new Date().toISOString().split('T')[0];
    setCustomStartDate(today);
    setCustomEndDate(today);
  }, []);

  // PERBAIKAN: Menambahkan selectedBrand dan selectedCabang ke dependency array
  useEffect(() => {
    fetchReportData();
  }, [dateFilter, customStartDate, customEndDate, selectedDivision, selectedBrand, selectedCabang]);

  const fetchReportData = async () => {
    const { start, end } = getDateRange();
    
    // Skip if custom dates are not set
    if (dateFilter === "custom" && (!customStartDate || !customEndDate)) {
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        fetchSalesData(start, end),
        fetchPurchaseData(start, end),
        fetchProfitData(start, end),
        fetchInventoryData(start, end),
        fetchOptionsData(),
        fetchTrenData(start, end)
      ]);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data laporan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesData = async (dateFrom: string, dateTo: string) => {
    let query = supabase
      .from('penjualans')
      .select(`
        *,
        brands:brand_id(name),
        jenis_motor:jenis_id(jenis_motor),
        cabang:cabang_id(nama)
      `)
      .gte('tanggal', dateFrom)
      .lte('tanggal', dateTo);

    if (selectedDivision !== 'all') {
      query = query.eq('divisi', selectedDivision);
    }

    if (selectedBrand !== 'all') {
      query = query.eq('brand_id', parseInt(selectedBrand));
    }

    if (selectedCabang !== 'all') {
      query = query.eq('cabang_id', parseInt(selectedCabang));
    }

    const { data, error } = await query;
    if (error) throw error;

    // Process data for charts
    const brandSales = data?.reduce((acc, sale) => {
      const brandName = sale.brands?.name || 'Unknown';
      acc[brandName] = (acc[brandName] || 0) + sale.harga_jual;
      return acc;
    }, {});

    const chartData = Object.entries(brandSales || {}).map(([brand, total]) => ({
      brand,
      total: total as number
    }));

    setSalesData(chartData);
    setSalesDetailsData(data || []);
  };

  // PERBAIKAN: Menambahkan filter Brand dan Cabang ke fetchPurchaseData
  const fetchPurchaseData = async (dateFrom: string, dateTo: string) => {
    let query = supabase
      .from('pembelian')
      .select(`
        *,
        brands:brand_id(name),
        cabang:cabang_id(nama)
      `)
      .gte('tanggal_pembelian', dateFrom)
      .lte('tanggal_pembelian', dateTo);

    if (selectedDivision !== 'all') {
      query = query.eq('divisi', selectedDivision);
    }

    if (selectedBrand !== 'all') {
      query = query.eq('brand_id', parseInt(selectedBrand));
    }

    if (selectedCabang !== 'all') {
      query = query.eq('cabang_id', parseInt(selectedCabang));
    }

    const { data, error } = await query;
    if (error) throw error;

    // Process monthly purchase data
    const monthlyPurchases = data?.reduce((acc, purchase) => {
      const month = new Date(purchase.tanggal_pembelian).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + purchase.harga_beli;
      return acc;
    }, {});

    const chartData = Object.entries(monthlyPurchases || {}).map(([month, total]) => ({
      month,
      total: total as number
    }));

    setPurchaseData(chartData);
  };

  // PERBAIKAN: Menambahkan filter Brand dan Cabang ke fetchProfitData
  const fetchProfitData = async (dateFrom: string, dateTo: string) => {
    let query = supabase
      .from('penjualans')
      .select('tanggal, keuntungan, brand_id, cabang_id')
      .gte('tanggal', dateFrom)
      .lte('tanggal', dateTo);

    if (selectedDivision !== 'all') {
      query = query.eq('divisi', selectedDivision);
    }

    if (selectedBrand !== 'all') {
      query = query.eq('brand_id', parseInt(selectedBrand));
    }

    if (selectedCabang !== 'all') {
      query = query.eq('cabang_id', parseInt(selectedCabang));
    }

    const { data, error } = await query;
    if (error) throw error;

    // Process daily profit data
    const dailyProfit = data?.reduce((acc, sale) => {
      const date = sale.tanggal;
      acc[date] = (acc[date] || 0) + (sale.keuntungan || 0);
      return acc;
    }, {});

    const chartData = Object.entries(dailyProfit || {}).map(([date, profit]) => ({
      date: new Date(date).toLocaleDateString('id-ID'),
      profit: profit as number
    }));

    setProfitData(chartData);
  };

  // PERBAIKAN: Menambahkan filter Brand dan Cabang ke fetchInventoryData
  const fetchInventoryData = async (dateFrom: string, dateTo: string) => {
    // Fetch pembelian data
    let pembelianQuery = supabase
      .from('pembelian')
      .select(`
        *,
        brands:brand_id(name),
        jenis_motor:jenis_motor_id(jenis_motor),
        cabang:cabang_id(nama)
      `)
      .gte('tanggal_pembelian', dateFrom)
      .lte('tanggal_pembelian', dateTo);

    if (selectedDivision !== 'all') {
      pembelianQuery = pembelianQuery.eq('divisi', selectedDivision);
    }

    if (selectedBrand !== 'all') {
      pembelianQuery = pembelianQuery.eq('brand_id', parseInt(selectedBrand));
    }

    if (selectedCabang !== 'all') {
      pembelianQuery = pembelianQuery.eq('cabang_id', parseInt(selectedCabang));
    }

    // Fetch penjualan data  
    let penjualanQuery = supabase
      .from('penjualans')
      .select(`
        *,
        brands:brand_id(name),
        jenis_motor:jenis_id(jenis_motor),
        cabang:cabang_id(nama)
      `)
      .gte('tanggal', dateFrom)
      .lte('tanggal', dateTo);

    if (selectedDivision !== 'all') {
      penjualanQuery = penjualanQuery.eq('divisi', selectedDivision);
    }

    if (selectedBrand !== 'all') {
      penjualanQuery = penjualanQuery.eq('brand_id', parseInt(selectedBrand));
    }

    if (selectedCabang !== 'all') {
      penjualanQuery = penjualanQuery.eq('cabang_id', parseInt(selectedCabang));
    }

    const [pembelianResult, penjualanResult] = await Promise.all([
      pembelianQuery,
      penjualanQuery
    ]);

    if (pembelianResult.error) throw pembelianResult.error;
    if (penjualanResult.error) throw penjualanResult.error;

    // Calculate stock based on purchases - sales
    const stockMap = new Map();

    // Add purchases
    pembelianResult.data?.forEach(item => {
      const key = `${item.brands?.name} ${item.jenis_motor?.jenis_motor}`;
      stockMap.set(key, (stockMap.get(key) || 0) + 1);
    });

    // Subtract sales
    penjualanResult.data?.forEach(item => {
      const key = `${item.brands?.name} ${item.jenis_motor?.jenis_motor}`;
      stockMap.set(key, (stockMap.get(key) || 0) - 1);
    });

    const chartData = Array.from(stockMap.entries()).map(([name, qty]) => ({
      name,
      qty: Math.max(0, qty) // Ensure non-negative stock
    }));

    setInventoryData(chartData);
  };

  const fetchOptionsData = async () => {
    // Fetch brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .order('name');

    if (brandsError) throw brandsError;
    setBrandsOptions(brands || []);

    // Fetch cabang
    const { data: cabang, error: cabangError } = await supabase
      .from('cabang')
      .select('id, nama')
      .order('nama');

    if (cabangError) throw cabangError;
    setCabangOptions(cabang || []);
  };

  // PERBAIKAN: Menambahkan filter Brand dan Cabang ke fetchTrenData
  const fetchTrenData = async (dateFrom: string, dateTo: string) => {
    // Fetch tren penjualan (most sold)
    let penjualanTrenQuery = supabase
      .from('penjualans')
      .select(`
        brands:brand_id(name),
        jenis_motor:jenis_id(jenis_motor),
        cabang:cabang_id(nama)
      `)
      .gte('tanggal', dateFrom)
      .lte('tanggal', dateTo);

    if (selectedDivision !== 'all') {
      penjualanTrenQuery = penjualanTrenQuery.eq('divisi', selectedDivision);
    }

    if (selectedBrand !== 'all') {
      penjualanTrenQuery = penjualanTrenQuery.eq('brand_id', parseInt(selectedBrand));
    }

    if (selectedCabang !== 'all') {
      penjualanTrenQuery = penjualanTrenQuery.eq('cabang_id', parseInt(selectedCabang));
    }

    // Fetch tren pembelian (most purchased)
    let pembelianTrenQuery = supabase
      .from('pembelian')
      .select(`
        brands:brand_id(name),
        jenis_motor:jenis_motor_id(jenis_motor),
        cabang:cabang_id(nama)
      `)
      .gte('tanggal_pembelian', dateFrom)
      .lte('tanggal_pembelian', dateTo);

    if (selectedDivision !== 'all') {
      pembelianTrenQuery = pembelianTrenQuery.eq('divisi', selectedDivision);
    }

    if (selectedBrand !== 'all') {
      pembelianTrenQuery = pembelianTrenQuery.eq('brand_id', parseInt(selectedBrand));
    }

    if (selectedCabang !== 'all') {
      pembelianTrenQuery = pembelianTrenQuery.eq('cabang_id', parseInt(selectedCabang));
    }

    const [penjualanTrenResult, pembelianTrenResult] = await Promise.all([
      penjualanTrenQuery,
      pembelianTrenQuery
    ]);

    if (penjualanTrenResult.error) throw penjualanTrenResult.error;
    if (pembelianTrenResult.error) throw pembelianTrenResult.error;

    // Process tren penjualan
    const penjualanCount = penjualanTrenResult.data?.reduce((acc, sale) => {
      const key = `${sale.brands?.name} ${sale.jenis_motor?.jenis_motor}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const trenPenjualan = Object.entries(penjualanCount || {})
      .map(([motor, count]) => ({ motor, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setTrenPenjualanData(trenPenjualan);

    // Process tren pembelian
    const pembelianCount = pembelianTrenResult.data?.reduce((acc, purchase) => {
      const key = `${purchase.brands?.name} ${purchase.jenis_motor?.jenis_motor}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const trenPembelian = Object.entries(pembelianCount || {})
      .map(([motor, count]) => ({ motor, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setTrenPembelianData(trenPembelian);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const exportToCSV = (data: any[], filename: string) => {
    const { start, end } = getDateRange();
    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(data[0] || {}).join(",") + "\n"
      + data.map(row => Object.values(row).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${start}_${end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Laporan & Analisis
          </h1>
          <p className="text-gray-600 mt-2">
            Dashboard analisis bisnis dan laporan keuangan
          </p>
        </div>
        <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Print Laporan
        </Button>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateFilter">Periode</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua periode</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateFilter === "custom" && (
              <>
                <div>
                  <Label htmlFor="customStartDate">Tanggal Mulai</Label>
                  <Input
                    id="customStartDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customEndDate">Tanggal Selesai</Label>
                  <Input
                    id="customEndDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="reportType">Jenis Laporan</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih jenis laporan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Penjualan</SelectItem>
                  <SelectItem value="purchase">Pembelian</SelectItem>
                  <SelectItem value="profit">Keuntungan</SelectItem>
                  <SelectItem value="inventory">Inventori</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Brand</SelectItem>
                  {brandsOptions.map((brand: any) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cabang">Cabang</Label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {cabangOptions.map((cabang: any) => (
                    <SelectItem key={cabang.id} value={cabang.id.toString()}>
                      {cabang.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-end mt-4">
            <Button onClick={fetchReportData} disabled={loading} className="w-full">
              {loading ? "Loading..." : "Generate Laporan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Penjualan</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(salesData.reduce((sum, item) => sum + item.total, 0))}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pembelian</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(purchaseData.reduce((sum, item) => sum + item.total, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Keuntungan</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(profitData.reduce((sum, item) => sum + item.profit, 0))}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stock</p>
                <p className="text-2xl font-bold text-orange-600">
                  {inventoryData.reduce((sum, item) => sum + item.qty, 0)} Unit
                </p>
              </div>
              <Package className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Penjualan per Brand</TabsTrigger>
          <TabsTrigger value="purchase">Pembelian Bulanan</TabsTrigger>
          <TabsTrigger value="profit">Tren Keuntungan</TabsTrigger>
          <TabsTrigger value="inventory">Stok Inventori</TabsTrigger>
          <TabsTrigger value="trend">Tren Motor</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Penjualan per Brand</CardTitle>
              <Button 
                onClick={() => exportToCSV(salesData, 'penjualan_per_brand')}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="brand" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="total" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pembelian Bulanan</CardTitle>
              <Button 
                onClick={() => exportToCSV(purchaseData, 'pembelian_bulanan')}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={purchaseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line type="monotone" dataKey="total" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tren Keuntungan Harian</CardTitle>
              <Button 
                onClick={() => exportToCSV(profitData, 'tren_keuntungan')}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line type="monotone" dataKey="profit" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stok Inventori</CardTitle>
              <Button 
                onClick={() => exportToCSV(inventoryData, 'stok_inventori')}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={inventoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, qty }) => `${name}: ${qty}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="qty"
                  >
                    {inventoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Motor Terlaris</CardTitle>
                <Button 
                  onClick={() => exportToCSV(trenPenjualanData, 'motor_terlaris')}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={trenPenjualanData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="motor" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Motor Terbanyak Dibeli</CardTitle>
                <Button 
                  onClick={() => exportToCSV(trenPembelianData, 'motor_terbanyak_dibeli')}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={trenPembelianData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="motor" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Detail Penjualan</CardTitle>
          <Button 
            onClick={() => exportToCSV(salesDetailsData, 'detail_penjualan')}
            size="sm"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Jenis Motor</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Harga Jual</TableHead>
                <TableHead>Keuntungan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesDetailsData.map((sale: any, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(sale.tanggal).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{sale.brands?.name || 'N/A'}</TableCell>
                  <TableCell>{sale.jenis_motor?.jenis_motor || 'N/A'}</TableCell>
                  <TableCell>{sale.cabang?.nama || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(sale.harga_jual)}</TableCell>
                  <TableCell>{formatCurrency(sale.keuntungan || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;