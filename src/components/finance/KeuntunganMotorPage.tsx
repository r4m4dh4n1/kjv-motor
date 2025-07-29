import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Printer, Download, TrendingUp, TrendingDown, DollarSign, Calculator, PieChart, BarChart3, Target, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface KeuntunganData {
  id: number;
  nama_motor: string;
  modal: number;
  harga_jual: number;
  profit: number;
  tanggal_jual: string;
  cabang: string;
  divisi: string;
}

interface CabangData {
  id: number;
  nama: string;
}

interface KeuntunganMotorPageProps {
  selectedDivision: string;
}

const KeuntunganMotorPage = ({ selectedDivision }: KeuntunganMotorPageProps) => {
  const [keuntunganData, setKeuntunganData] = useState<KeuntunganData[]>([]);
  const [cabangList, setCabangList] = useState<CabangData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedCabang, setSelectedCabang] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [totalBooked, setTotalBooked] = useState(0);
  const [totalOperasional, setTotalOperasional] = useState(0);
  const [totalPembelianGabungan, setTotalPembelianGabungan] = useState(0);

  const getDateRange = (period: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return { start: today, end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59) };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59) };
      
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { start: startOfWeek, end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) };
      
      case 'last_week':
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        endOfLastWeek.setHours(23, 59, 59);
        return { start: startOfLastWeek, end: endOfLastWeek };
      
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        return { start: startOfMonth, end: endOfMonth };
      
      case 'last_month':
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start: startOfLastMonth, end: endOfLastMonth };
      
      case 'this_year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return { start: startOfYear, end: endOfYear };
      
      case 'last_year':
        const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
        const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        return { start: startOfLastYear, end: endOfLastYear };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate + 'T23:59:59')
          };
        }
        return { start: today, end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59) };
      
      default:
        return { start: today, end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59) };
    }
  };
  console.log('KeuntunganMotorPage - selectedDivision:', selectedDivision);
  const fetchInitialData = async () => {
    try {
      const { data: cabangData, error: cabangError } = await supabase
        .from('cabang')
        .select('id, nama');

      if (cabangError) throw cabangError;
      setCabangList(cabangData || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data cabang",
        variant: "destructive",
      });
    }
  };

  const fetchKeuntunganData = async () => {
    setLoading(true);
    console.log('Fetching data with division:', selectedDivision);
    try {
      const dateRange = getDateRange(selectedPeriod);

      // Query untuk data keuntungan (penjualan yang selesai)
      let keuntunganQuery = supabase
        .from('penjualans')
        .select(`
          id,
          harga_beli,
          harga_jual,
          keuntungan,
          status,
          tanggal,
          cabang:cabang_id(nama),
          divisi,
          brands(name),
          jenis_motor(jenis_motor)
        `)
        .eq('status', 'selesai')
        .gte('tanggal', dateRange.start.toISOString())
        .lte('tanggal', dateRange.end.toISOString());

      if (selectedCabang !== 'all') {
        keuntunganQuery = keuntunganQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // Filter berdasarkan divisi jika bukan 'all'
      if (selectedDivision !== 'all') {
        keuntunganQuery = keuntunganQuery.eq('divisi', selectedDivision);
      }

      // Query untuk total booked (DP dari penjualan dengan status 'Booked')
      let bookedQuery = supabase
        .from('penjualans')
        .select('dp')
        .eq('status', 'Booked')
        .gte('tanggal', dateRange.start.toISOString())
        .lte('tanggal', dateRange.end.toISOString());

      if (selectedCabang !== 'all') {
        bookedQuery = bookedQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // Filter berdasarkan divisi jika bukan 'all'
      if (selectedDivision !== 'all') {
        bookedQuery = bookedQuery.eq('divisi', selectedDivision);
      }

      // Query untuk harga_beli dari penjualans dengan status 'Booked'
      let bookedHargaBeliQuery = supabase
        .from('penjualans')
        .select('harga_beli')
        .eq('status', 'Booked')
        .gte('tanggal', dateRange.start.toISOString())
        .lte('tanggal', dateRange.end.toISOString());

      if (selectedCabang !== 'all') {
        bookedHargaBeliQuery = bookedHargaBeliQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // Filter berdasarkan divisi jika bukan 'all'
      if (selectedDivision !== 'all') {
        bookedHargaBeliQuery = bookedHargaBeliQuery.eq('divisi', selectedDivision);
      }

      // Query untuk pembelian dengan status 'ready'
      let pembelianReadyQuery = supabase
        .from('pembelian')
        .select('harga_beli, divisi')
        .eq('status', 'ready')
        .gte('tanggal_pembelian', dateRange.start.toISOString())
        .lte('tanggal_pembelian', dateRange.end.toISOString());

      if (selectedCabang !== 'all') {
        pembelianReadyQuery = pembelianReadyQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // Filter berdasarkan divisi jika bukan 'all'
      if (selectedDivision !== 'all') {
        pembelianReadyQuery = pembelianReadyQuery.eq('divisi', selectedDivision);
      }

      // Query untuk total operasional
      let operasionalQuery = supabase
        .from('operational')
        .select('nominal, divisi')
        .gte('tanggal', dateRange.start.toISOString())
        .lte('tanggal', dateRange.end.toISOString());

      if (selectedCabang !== 'all') {
        operasionalQuery = operasionalQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // Filter berdasarkan divisi jika bukan 'all'
      if (selectedDivision !== 'all') {
        operasionalQuery = operasionalQuery.eq('divisi', selectedDivision);
      }

      const [keuntunganResult, bookedResult, bookedHargaBeliResult, pembelianReadyResult, operasionalResult] = await Promise.all([
        keuntunganQuery,
        bookedQuery,
        bookedHargaBeliQuery,
        pembelianReadyQuery,
        operasionalQuery
      ]);

      if (keuntunganResult.error) throw keuntunganResult.error;
      if (bookedResult.error) throw bookedResult.error;
      if (bookedHargaBeliResult.error) throw bookedHargaBeliResult.error;
      if (pembelianReadyResult.error) throw pembelianReadyResult.error;
      if (operasionalResult.error) throw operasionalResult.error;

      // Format data keuntungan
      const formattedData = keuntunganResult.data?.map(item => ({
        id: item.id,
        nama_motor: `${item.brands?.name || ''} ${item.jenis_motor?.jenis_motor || ''}`,
        modal: item.harga_beli || 0,
        harga_jual: item.harga_jual || 0,
        profit: item.keuntungan || 0,
        tanggal_jual: item.tanggal,
        cabang: item.cabang?.nama || '',
        divisi: item.divisi || ''
      })) || [];

      setKeuntunganData(formattedData);

      // Hitung total booked (DP) - TIDAK DIUBAH
      const totalBookedAmount = bookedResult.data?.reduce((sum, item) => sum + (item.dp || 0), 0) || 0;
      setTotalBooked(totalBookedAmount);

      // Hitung total operasional - TIDAK DIUBAH
      const totalOperasionalAmount = operasionalResult.data?.reduce((sum, item) => sum + (item.nominal || 0), 0) || 0;
      setTotalOperasional(totalOperasionalAmount);

      // Hitung total pembelian gabungan:
      // 1. Harga beli dari pembelian dengan status 'ready'
      const totalPembelianReady = pembelianReadyResult.data?.reduce((sum, item) => sum + (item.harga_beli || 0), 0) || 0;
      
      // 2. Harga beli dari penjualans dengan status 'Booked'
      const totalBookedHargaBeli = bookedHargaBeliResult.data?.reduce((sum, item) => sum + (item.harga_beli || 0), 0) || 0;
      
      // 3. Total gabungan untuk card Total Pembelian
      const totalGabungan = totalPembelianReady + totalBookedHargaBeli;
      setTotalPembelianGabungan(totalGabungan);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data keuntungan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchKeuntunganData();
  }, [selectedPeriod, selectedCabang, customStartDate, customEndDate, selectedDivision]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const totalModal = keuntunganData.reduce((sum, item) => sum + item.modal, 0);
  const totalTerjual = keuntunganData.reduce((sum, item) => sum + item.harga_jual, 0);
  const totalProfit = keuntunganData.reduce((sum, item) => sum + item.profit, 0);
  const totalUnit = keuntunganData.length;

  // Perhitungan metrik finansial baru
  const netCashFlow = (totalBooked + totalProfit) - totalOperasional;
  const roi = totalPembelianGabungan > 0 ? (totalProfit / totalPembelianGabungan) * 100 : 0;
  const grossProfitMargin = totalProfit - totalOperasional;
  const workingCapital = totalPembelianGabungan;
  const netBusinessValue = totalProfit + totalBooked - totalOperasional;
    const totalModalKalkulasi = totalPembelianGabungan + totalBooked - totalOperasional;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Nama Motor', 'Modal', 'Harga Jual', 'Profit', 'Tanggal Jual', 'Cabang', 'Divisi'];
    const csvContent = [
      headers.join(','),
      ...keuntunganData.map(row => [
        row.nama_motor,
        row.modal,
        row.harga_jual,
        row.profit,
        row.tanggal_jual,
        row.cabang,
        row.divisi
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `keuntungan-motor-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keuntungan Motor</h1>
          <p className="text-muted-foreground">Laporan keuntungan penjualan motor {selectedDivision !== 'all' ? `(Divisi: ${selectedDivision})` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
            <Label htmlFor="period">Periode</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
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

            <div className="space-y-2">
              <Label htmlFor="cabang">Cabang</Label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {cabangList.map((cabang) => (
                    <SelectItem key={cabang.id} value={cabang.id.toString()}>
                      {cabang.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={fetchKeuntunganData} 
                className="w-full mt-6"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Filter'}
              </Button>
            </div>
          </div>

          {selectedPeriod === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Tanggal Mulai</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Tanggal Selesai</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards - Metrik Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unit</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnit}</div>
            <p className="text-xs text-muted-foreground">Unit terjual</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Modal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              totalModalKalkulasi >= 0 ? 'text-purple-600' : 'text-red-600'
            }`}>
              {formatCurrency(totalModalKalkulasi)}
            </div>
            <p className="text-xs text-muted-foreground">Modal kerja aktual</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalPembelianGabungan)}</div>
            <p className="text-xs text-muted-foreground">Modal investasi</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Booked</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalBooked)}</div>
            <p className="text-xs text-muted-foreground">Uang muka diterima</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operasional</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOperasional)}</div>
            <p className="text-xs text-muted-foreground">Biaya operasional</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keuntungan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</div>
            <p className="text-xs text-muted-foreground">Profit kotor</p>
          </CardContent>
        </Card>
      </div>

      {/* Metrik Finansial Lanjutan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            {netCashFlow >= 0 ? 
              <TrendingUp className="h-4 w-4 text-green-500" /> : 
              <TrendingDown className="h-4 w-4 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(netCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">Arus kas bersih</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              roi >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(roi)}
            </div>
            <p className="text-xs text-muted-foreground">Return on Investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit Margin</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              grossProfitMargin >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(grossProfitMargin)}
            </div>
            <p className="text-xs text-muted-foreground">Margin kotor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working Capital</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(workingCapital)}</div>
            <p className="text-xs text-muted-foreground">Modal kerja</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Business Value</CardTitle>
            {netBusinessValue >= 0 ? 
              <TrendingUp className="h-4 w-4 text-green-500" /> : 
              <TrendingDown className="h-4 w-4 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              netBusinessValue >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(netBusinessValue)}
            </div>
            <p className="text-xs text-muted-foreground">Nilai bisnis bersih</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Keuntungan Motor</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Motor</TableHead>
                    <TableHead>Modal</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Tanggal Jual</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Divisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keuntunganData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    keuntunganData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nama_motor}</TableCell>
                        <TableCell>{formatCurrency(item.modal)}</TableCell>
                        <TableCell>{formatCurrency(item.harga_jual)}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(item.profit)}
                        </TableCell>
                        <TableCell>
                          {new Date(item.tanggal_jual).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>{item.cabang}</TableCell>
                        <TableCell>{item.divisi}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KeuntunganMotorPage;