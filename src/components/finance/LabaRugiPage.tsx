import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Printer, Download, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatUtils';
import { getDateRange } from '@/utils/dateUtils';

interface LabaRugiPageProps {
  selectedDivision: string;
}

interface LabaRugiData {
  // PENDAPATAN
  totalPenjualan: number;
  totalPendapatanLain: number;
  totalPendapatan: number;
  
  // HARGA POKOK PENJUALAN
  totalHargaBeli: number;
  totalBiayaPembelian: number;
  totalHPP: number;
  
  // LABA KOTOR
  labaKotor: number;
  
  // BIAYA OPERASIONAL
  totalBiayaOperasional: number;
  totalBiayaAdministrasi: number;
  totalBiayaPenjualan: number;
  totalBiayaLain: number;
  totalBiayaOperasi: number;
  
  // LABA BERSIH
  labaBersih: number;
  
  // MARGIN
  marginKotor: number;
  marginBersih: number;
}

const LabaRugiPage = ({ selectedDivision }: LabaRugiPageProps) => {
  const [labaRugiData, setLabaRugiData] = useState<LabaRugiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('all');
  const [cabangList, setCabangList] = useState([]);

  // Tentukan apakah menggunakan combined view
  const shouldUseCombined = ['last_month', 'this_year', 'last_year', 'custom'].includes(selectedPeriod);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchLabaRugiData();
  }, [selectedPeriod, customStartDate, customEndDate, selectedDivision, selectedCabang]);

  const fetchInitialData = async () => {
    try {
      const { data: cabangData } = await supabase
        .from('cabang')
        .select('id, nama')
        .order('nama');
      
      setCabangList(cabangData || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchLabaRugiData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange(selectedPeriod, customStartDate, customEndDate);
      
      // Fetch data berdasarkan periode
      const [pendapatanData, biayaData] = await Promise.all([
        fetchPendapatanData(dateRange),
        fetchBiayaData(dateRange)
      ]);
      
      // Hitung laba rugi
      const labaRugi = calculateLabaRugi(pendapatanData, biayaData);
      setLabaRugiData(labaRugi);
      
    } catch (error) {
      console.error('Error fetching laba rugi data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data laba rugi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendapatanData = async (dateRange: { start: Date; end: Date }) => {
    // Konversi Date ke ISO string untuk Supabase
    const startDate = dateRange.start.toISOString();
    const endDate = dateRange.end.toISOString();
    
    try {
      if (shouldUseCombined) {
        // Fetch dari kedua tabel secara terpisah
        const [activeResult, historyResult] = await Promise.allSettled([
          // Query tabel penjualans (data aktif)
          (async () => {
            let query = supabase
              .from('penjualans')
              .select('harga_jual, harga_beli, keuntungan, divisi, cabang_id')
              .eq('status', 'selesai')
              .gte('tanggal', startDate)
              .lte('tanggal', endDate);
              
            if (selectedDivision !== 'all') {
              query = query.eq('divisi', selectedDivision);
            }
            if (selectedCabang !== 'all') {
              query = query.eq('cabang_id', parseInt(selectedCabang));
            }
            
            return await query;
          })(),
          
          // Query tabel penjualans_history (data historis)
          (async () => {
            let query = supabase
              .from('penjualans_history')
              .select('harga_jual, harga_beli, keuntungan, divisi, cabang_id')
              .eq('status', 'selesai')
              .gte('tanggal', startDate)
              .lte('tanggal', endDate);
              
            if (selectedDivision !== 'all') {
              query = query.eq('divisi', selectedDivision);
            }
            if (selectedCabang !== 'all') {
              query = query.eq('cabang_id', parseInt(selectedCabang));
            }
            
            return await query;
          })()
        ]);
  
        let combinedData: any[] = [];
  
        // Process active data
        if (activeResult.status === 'fulfilled' && !activeResult.value.error) {
          combinedData = [...combinedData, ...(activeResult.value.data || [])];
          console.log('Active data found:', activeResult.value.data?.length || 0);
        } else {
          console.log('Active data error:', activeResult.status === 'fulfilled' ? activeResult.value.error : activeResult.reason);
        }
  
        // Process history data
        if (historyResult.status === 'fulfilled' && !historyResult.value.error) {
          combinedData = [...combinedData, ...(historyResult.value.data || [])];
          console.log('History data found:', historyResult.value.data?.length || 0);
        } else {
          console.log('History data error:', historyResult.status === 'fulfilled' ? historyResult.value.error : historyResult.reason);
        }
  
        console.log('Combined data total:', combinedData.length);
        console.log('Date range:', { startDate, endDate });
        console.log('Filters:', { selectedDivision, selectedCabang });
  
        return {
          totalPenjualan: combinedData.reduce((sum, item) => sum + (item.harga_jual || 0), 0),
          totalHargaBeli: combinedData.reduce((sum, item) => sum + (item.harga_beli || 0), 0),
          totalKeuntungan: combinedData.reduce((sum, item) => sum + (item.keuntungan || 0), 0)
        };
        
      } else {
        // Untuk periode current, gunakan tabel penjualans biasa
        let penjualanQuery = supabase
          .from('penjualans')
          .select('harga_jual, harga_beli, keuntungan, divisi, cabang_id')
          .eq('status', 'selesai')
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);
      
        if (selectedDivision !== 'all') {
          penjualanQuery = penjualanQuery.eq('divisi', selectedDivision);
        }
      
        if (selectedCabang !== 'all') {
          penjualanQuery = penjualanQuery.eq('cabang_id', parseInt(selectedCabang));
        }
      
        const { data: penjualanData, error } = await penjualanQuery;
        if (error) throw error;
      
        console.log('Current period data found:', penjualanData?.length || 0);
        
        return {
          totalPenjualan: penjualanData?.reduce((sum, item) => sum + (item.harga_jual || 0), 0) || 0,
          totalHargaBeli: penjualanData?.reduce((sum, item) => sum + (item.harga_beli || 0), 0) || 0,
          totalKeuntungan: penjualanData?.reduce((sum, item) => sum + (item.keuntungan || 0), 0) || 0
        };
      }
    } catch (error) {
      console.error('Error in fetchPendapatanData:', error);
      throw error;
    }
  };

  // Perbaiki fetchBiayaData untuk menggunakan nama tabel yang benar
  const fetchBiayaData = async (dateRange: { start: Date; end: Date }) => {
    try {
      // Konversi Date ke ISO string untuk Supabase
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();
  
      // Gunakan tabel yang benar - operational dan operational_history
      const operationalTable = shouldUseCombined ? 'operational_history' : 'operational';
      const pembukuanTable = shouldUseCombined ? 'pembukuan_combined' : 'pembukuan';
  
      // Query operational dengan kolom yang benar
      const { data: operationalData, error: operationalError } = await supabase
        .from(operationalTable)
        .select('tanggal, divisi, kategori, deskripsi, nominal, cabang_id')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: false });
  
      if (operationalError) {
        console.error('Error fetching operational data:', operationalError);
        throw operationalError;
      }
  
      // Query pembukuan
      const { data: pembukuanData, error: pembukuanError } = await supabase
        .from(pembukuanTable)
        .select('tanggal, divisi, keterangan, debit, kredit, cabang_id')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: false });
  
      if (pembukuanError) {
        console.error('Error fetching pembukuan data:', pembukuanError);
        throw pembukuanError;
      }
  
      // Hitung total operasional - gunakan kategori sebagai pengganti jenis_biaya
      const totalOperasional = operationalData?.reduce((sum, item) => {
        return sum + (item.nominal || 0);
      }, 0) || 0;
  
      // Hitung total pembukuan (debit sebagai pengeluaran)
      const totalPembukuan = pembukuanData?.reduce((sum, item) => {
        return sum + (item.debit || 0);
      }, 0) || 0;
  
      return {
        operasional: operationalData || [],
        pembukuan: pembukuanData || [],
        totalOperasional,
        totalPembukuan,
        totalBiaya: totalOperasional + totalPembukuan
      };
    } catch (error) {
      console.error('Error in fetchBiayaData:', error);
      throw error;
    }
  };

  // Perbaiki fungsi calculateLabaRugi
  const calculateLabaRugi = (pendapatanData: any, biayaData: any): LabaRugiData => {
    const totalPendapatan = pendapatanData.totalPenjualan;
    const totalHPP = pendapatanData.totalHargaBeli;
    const labaKotor = totalPendapatan - totalHPP;
    
    // Perbaiki: gunakan nama property yang benar dari biayaData
    const totalBiayaOperasional = biayaData.totalOperasional || 0;
    const totalBiayaLain = biayaData.totalPembukuan || 0;
    const totalBiayaOperasi = totalBiayaOperasional + totalBiayaLain;
    const labaBersih = labaKotor - totalBiayaOperasi;
    
    const marginKotor = totalPendapatan > 0 ? (labaKotor / totalPendapatan) * 100 : 0;
    const marginBersih = totalPendapatan > 0 ? (labaBersih / totalPendapatan) * 100 : 0;
  
    return {
      totalPenjualan: pendapatanData.totalPenjualan,
      totalPendapatanLain: 0,
      totalPendapatan: totalPendapatan,
      totalHargaBeli: pendapatanData.totalHargaBeli,
      totalBiayaPembelian: 0,
      totalHPP: totalHPP,
      labaKotor,
      totalBiayaOperasional, // Sekarang akan menampilkan nilai yang benar
      totalBiayaAdministrasi: 0,
      totalBiayaPenjualan: 0,
      totalBiayaLain, // Sekarang akan menampilkan nilai yang benar
      totalBiayaOperasi,
      labaBersih, // Sekarang tidak akan NaN
      marginKotor,
      marginBersih
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implementasi export ke Excel/PDF
    toast({
      title: "Info",
      description: "Fitur export akan segera tersedia",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Laporan Laba Rugi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filter Periode */}
            <div className="space-y-2">
              <Label>Periode</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="this_week">Minggu Ini</SelectItem>
                  <SelectItem value="this_month">Bulan Ini</SelectItem>
                  <SelectItem value="last_month">Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">Tahun Ini</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Cabang */}
            <div className="space-y-2">
              <Label>Cabang</Label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {cabangList.map((cabang: any) => (
                    <SelectItem key={cabang.id} value={cabang.id.toString()}>
                      {cabang.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Akhir</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2">Memuat data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Laporan Laba Rugi */}
      {!loading && labaRugiData && (
        <Card>
          <CardHeader>
            <CardTitle>Laporan Laba Rugi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {/* PENDAPATAN */}
                <TableRow className="bg-blue-50">
                  <TableCell className="font-bold" colSpan={2}>PENDAPATAN</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Penjualan</TableCell>
                  <TableCell className="text-right">{formatCurrency(labaRugiData.totalPenjualan)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Pendapatan Lain-lain</TableCell>
                  <TableCell className="text-right">{formatCurrency(labaRugiData.totalPendapatanLain)}</TableCell>
                </TableRow>
                <TableRow className="border-b-2">
                  <TableCell className="font-semibold">Total Pendapatan</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(labaRugiData.totalPendapatan)}</TableCell>
                </TableRow>

                {/* HARGA POKOK PENJUALAN */}
                <TableRow className="bg-red-50">
                  <TableCell className="font-bold" colSpan={2}>HARGA POKOK PENJUALAN</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Harga Beli</TableCell>
                  <TableCell className="text-right">{formatCurrency(labaRugiData.totalHargaBeli)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Biaya Pembelian</TableCell>
                  <TableCell className="text-right">{formatCurrency(labaRugiData.totalBiayaPembelian)}</TableCell>
                </TableRow>
                <TableRow className="border-b-2">
                  <TableCell className="font-semibold">Total HPP</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(labaRugiData.totalHPP)}</TableCell>
                </TableRow>

                {/* LABA KOTOR */}
                <TableRow className="bg-green-50">
                  <TableCell className="font-bold">LABA KOTOR</TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {formatCurrency(labaRugiData.labaKotor)} ({labaRugiData.marginKotor.toFixed(2)}%)
                  </TableCell>
                </TableRow>

                {/* BIAYA OPERASIONAL */}
                <TableRow className="bg-orange-50">
                  <TableCell className="font-bold" colSpan={2}>BIAYA OPERASIONAL</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Biaya Operasional</TableCell>
                  <TableCell className="text-right">{formatCurrency(labaRugiData.totalBiayaOperasional)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Biaya Administrasi</TableCell>
                  <TableCell className="text-right">{formatCurrency(labaRugiData.totalBiayaAdministrasi)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Biaya Penjualan</TableCell>
                  <TableCell className="text-right">{formatCurrency(labaRugiData.totalBiayaPenjualan)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Biaya Lain-lain</TableCell>
                  <TableCell className="text-right">{formatCurrency(labaRugiData.totalBiayaLain)}</TableCell>
                </TableRow>
                <TableRow className="border-b-2">
                  <TableCell className="font-semibold">Total Biaya Operasi</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(labaRugiData.totalBiayaOperasi)}</TableCell>
                </TableRow>

                {/* LABA BERSIH */}
                <TableRow className="bg-purple-50">
                  <TableCell className="font-bold text-lg">LABA BERSIH</TableCell>
                  <TableCell className="text-right font-bold text-lg text-purple-600">
                    {formatCurrency(labaRugiData.labaBersih)} ({labaRugiData.marginBersih.toFixed(2)}%)
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {!loading && labaRugiData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Pendapatan</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(labaRugiData.totalPendapatan)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Laba Kotor</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(labaRugiData.labaKotor)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Biaya</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(labaRugiData.totalBiayaOperasi)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Laba Bersih</p>
                  <p className="text-xl font-bold text-purple-600">{formatCurrency(labaRugiData.labaBersih)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LabaRugiPage;