import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Printer, Download, TrendingUp, TrendingDown, DollarSign, BarChart3, ChevronDown } from 'lucide-react';
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
  
  // Breakdown per kategori
  biayaPerKategori: {
    [key: string]: number;
  };
  
  // LABA BERSIH
  labaBersih: number;
  
  // MARGIN
  marginKotor: number;
  marginBersih: number;
  
  // Detail data untuk dropdown
  penjualanDetail?: any[];
  operationalDetail?: any[];
}

const LabaRugiPage = ({ selectedDivision }: LabaRugiPageProps) => {
  const [labaRugiData, setLabaRugiData] = useState<LabaRugiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('all');
  const [cabangList, setCabangList] = useState([]);
  
  // State untuk dropdown detail
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  
  // State untuk menyimpan data detail
  const [detailData, setDetailData] = useState<{
    penjualanDetail: any[],
    operationalDetail: any[],
    pendapatanLainDetail: any[],
    hargaBeliDetail: any[]
  }>({
    penjualanDetail: [],
    operationalDetail: [],
    pendapatanLainDetail: [],
    hargaBeliDetail: []
  });

  // Gunakan penjualans_combined untuk periode tertentu
  const shouldUseCombined = ['this_month', 'last_month', 'this_year'].includes(selectedPeriod);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchLabaRugiData();
  }, [selectedPeriod, customStartDate, customEndDate, selectedDivision, selectedCabang]);

  // Update expandedSections ketika labaRugiData berubah
  useEffect(() => {
    if (labaRugiData?.biayaPerKategori) {
      const newExpandedSections: {[key: string]: boolean} = {
        penjualan: false,
        pendapatanLain: false,
        hargaBeli: false,
        biayaPembelian: false,
      };
      
      // Tambahkan state untuk setiap kategori biaya operasional
      Object.keys(labaRugiData.biayaPerKategori).forEach(kategori => {
        newExpandedSections[`biaya_${kategori}`] = false;
      });
      
      setExpandedSections(prev => ({ ...prev, ...newExpandedSections }));
    }
  }, [labaRugiData]);

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
      
      // Tambahkan logging untuk debugging
      console.log('🔍 LabaRugi Debug Info:', {
        selectedPeriod,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
          startLocal: dateRange.start.toLocaleDateString('id-ID'),
          endLocal: dateRange.end.toLocaleDateString('id-ID')
        },

        currentDate: new Date().toLocaleDateString('id-ID')
      });
      
      const [pendapatanData, biayaData] = await Promise.all([
        fetchPendapatanData(dateRange),
        fetchBiayaData(dateRange)
      ]);
      
      const calculatedData = calculateLabaRugi(pendapatanData, biayaData);
      setLabaRugiData(calculatedData);
      
      // Set detail data untuk dropdown
      setDetailData({
        penjualanDetail: pendapatanData.penjualanDetail || [],
        operationalDetail: biayaData.operationalDetail || [],
        pendapatanLainDetail: [],
        hargaBeliDetail: pendapatanData.penjualanDetail || []
      });
      
    } catch (error) {
      console.error('Error fetching laba rugi data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data laba rugi",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendapatanData = async (dateRange: { start: Date; end: Date }) => {
    const startDate = dateRange.start.toISOString();
    const endDate = dateRange.end.toISOString();
    
    console.log('📊 Fetching pendapatan data:', { 
      startDate, 
      endDate, 
      selectedPeriod,
      startLocal: dateRange.start.toLocaleDateString('id-ID'),
      endLocal: dateRange.end.toLocaleDateString('id-ID')
    });
    
    try {
      if (shouldUseCombined) {
        // Gunakan view penjualans_combined untuk periode tertentu
        let query = supabase
          .from('penjualans_combined')
          .select(`
            harga_jual, 
            harga_beli, 
            keuntungan, 
            divisi, 
            cabang_id,
            data_source,
            tanggal,
            catatan,
            id,
            plat,
            brand_id,
            jenis_id
          `)
          .eq('status', 'selesai')
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);

        if (selectedDivision !== 'all') {
          query = query.eq('divisi', selectedDivision);
        }

        if (selectedCabang !== 'all') {
          query = query.eq('cabang_id', parseInt(selectedCabang));
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching combined penjualan data:', error);
          throw error;
        }

        const penjualanData = data || [];
        console.log(`📈 Fetched ${penjualanData.length} combined penjualan records`);
        console.log('📅 Sample dates from data:', penjualanData.slice(0, 5).map(item => ({
          id: item.id,
          tanggal: item.tanggal,
          tanggalLocal: new Date(item.tanggal).toLocaleDateString('id-ID'),
          dataSource: item.data_source
        })));
        
        // Filter data yang benar-benar dalam rentang bulan ini
        const filteredData = penjualanData.filter(item => {
          const itemDate = new Date(item.tanggal);
          const itemDateWIB = new Date(itemDate.getTime() + (7 * 60 * 60 * 1000));
          const currentDate = new Date();
          const currentDateWIB = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000));
          
          if (selectedPeriod === 'this_month') {
            return itemDateWIB.getMonth() === currentDateWIB.getMonth() && 
                   itemDateWIB.getFullYear() === currentDateWIB.getFullYear();
          }
          return true; // Untuk periode lain, gunakan filter database
        });
        
        console.log(`📊 After date filtering: ${filteredData.length} records`);
        
        // Fetch brand and jenis_motor data separately
        const brandIds = [...new Set(filteredData.map(item => item.brand_id).filter(Boolean))];
        const jenisIds = [...new Set(filteredData.map(item => item.jenis_id).filter(Boolean))];
        
        const [brandsResult, jenisMotorResult] = await Promise.all([
          brandIds.length > 0 ? supabase.from('brands').select('id, name').in('id', brandIds) : Promise.resolve({ data: [] }),
          jenisIds.length > 0 ? supabase.from('jenis_motor').select('id, jenis_motor').in('id', jenisIds) : Promise.resolve({ data: [] })
        ]);
        
        const brandMap = new Map((brandsResult.data || []).map(brand => [brand.id, brand]));
        const jenisMap = new Map((jenisMotorResult.data || []).map(jenis => [jenis.id, jenis]));
        
        // Enrich the data with brand and jenis_motor information
        const enrichedData = filteredData.map(item => ({
          ...item,
          brands: brandMap.get(item.brand_id) || { name: `Brand ID: ${item.brand_id}` },
          jenis_motor: jenisMap.get(item.jenis_id) || { jenis_motor: `Jenis ID: ${item.jenis_id}` }
        }));
        
        return {
          totalPenjualan: enrichedData.reduce((sum, item) => sum + (item.harga_jual || 0), 0),
          totalHargaBeli: enrichedData.reduce((sum, item) => sum + (item.harga_beli || 0), 0),
          totalKeuntungan: enrichedData.reduce((sum, item) => sum + (item.keuntungan || 0), 0),
          jumlahTransaksi: enrichedData.length,
          penjualanDetail: enrichedData
        };
        
      } else {
        // Untuk periode lainnya, gunakan tabel penjualans biasa
        let query = supabase
          .from('penjualans')
          .select(`
            harga_jual, 
            harga_beli, 
            keuntungan, 
            divisi, 
            cabang_id, 
            tanggal, 
            catatan, 
            id,
            plat,
            brand_id,
            jenis_id
          `)
          .eq('status', 'selesai')
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);
      
        if (selectedDivision !== 'all') {
          query = query.eq('divisi', selectedDivision);
        }
      
        if (selectedCabang !== 'all') {
          query = query.eq('cabang_id', parseInt(selectedCabang));
        }
      
        const { data: penjualanData, error } = await query;
        if (error) {
          console.error('Error fetching penjualan data:', error);
          throw error;
        }
      
        console.log(`Fetched ${penjualanData?.length || 0} penjualan records`);
        
        // Fetch brand and jenis_motor data separately for regular penjualans
        const brandIds = [...new Set((penjualanData || []).map(item => item.brand_id).filter(Boolean))];
        const jenisIds = [...new Set((penjualanData || []).map(item => item.jenis_id).filter(Boolean))];
        
        const [brandsResult, jenisMotorResult] = await Promise.all([
          brandIds.length > 0 ? supabase.from('brands').select('id, name').in('id', brandIds) : Promise.resolve({ data: [] }),
          jenisIds.length > 0 ? supabase.from('jenis_motor').select('id, jenis_motor').in('id', jenisIds) : Promise.resolve({ data: [] })
        ]);
        
        const brandMap = new Map((brandsResult.data || []).map(brand => [brand.id, brand]));
        const jenisMap = new Map((jenisMotorResult.data || []).map(jenis => [jenis.id, jenis]));
        
        // Enrich the data with brand and jenis_motor information
        const enrichedData = (penjualanData || []).map(item => ({
          ...item,
          brands: brandMap.get(item.brand_id) || { name: `Brand ID: ${item.brand_id}` },
          jenis_motor: jenisMap.get(item.jenis_id) || { jenis_motor: `Jenis ID: ${item.jenis_id}` }
        }));
        
        return {
          totalPenjualan: enrichedData.reduce((sum, item) => sum + (item.harga_jual || 0), 0),
          totalHargaBeli: enrichedData.reduce((sum, item) => sum + (item.harga_beli || 0), 0),
          totalKeuntungan: enrichedData.reduce((sum, item) => sum + (item.keuntungan || 0), 0),
          jumlahTransaksi: enrichedData.length,
          penjualanDetail: enrichedData
        };
      }
    } catch (error) {
      console.error('Error in fetchPendapatanData:', error);
      throw error;
    }
  };

  const fetchBiayaData = async (dateRange: { start: Date; end: Date }) => {
    try {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();
  
      // Selalu gunakan tabel 'operational' untuk memastikan kolom original_month tersedia
      // operational_combined tidak memiliki kolom original_month yang diperlukan untuk retroactive data
      const operationalTable = 'operational';
  
      console.log('Using operational table:', { operationalTable });
  
      // Query operational dengan penanganan error yang lebih baik
      let operationalData: any[] = [];
      
      try {
        // Query dengan kolom yang diperlukan dari tabel operational
        // Selalu include original_month karena kita selalu menggunakan tabel operational
        const selectColumns = 'kategori, nominal, deskripsi, tanggal, divisi, cabang_id, is_retroactive, original_month';
        
        // Untuk menangani original_month, kita ambil data dengan range yang lebih luas
        // dan filter di aplikasi untuk akurasi yang lebih baik
        let operationalQuery = supabase
          .from(operationalTable as any)
          .select(selectColumns);
          
        // Tambahkan filter tanggal dasar untuk semua periode kecuali yang memerlukan range lebih luas
        // Data dengan original_month akan difilter lebih lanjut di aplikasi
        if (selectedPeriod === 'custom' || selectedPeriod === 'this_month' || selectedPeriod === 'last_month' || selectedPeriod === 'this_year') {
          operationalQuery = operationalQuery
            .gte('tanggal', startDate)
            .lte('tanggal', endDate);
        }
  
        if (selectedDivision !== 'all') {
          operationalQuery = operationalQuery.eq('divisi', selectedDivision);
        }
  
        if (selectedCabang !== 'all') {
          operationalQuery = operationalQuery.eq('cabang_id', parseInt(selectedCabang));
        }

        console.log('🔍 Executing simplified operational query...');
        console.log('📅 Date range:', { startDate, endDate });
        console.log('🏢 Filters:', { selectedDivision, selectedCabang, operationalTable });

        const { data, error } = await operationalQuery;
        
        console.log('📊 Query results:', {
          data: data?.length || 0,
          error: error
        });
        
        if (error) {
          console.error(`Error fetching ${operationalTable} data:`, error);
          operationalData = [];
        } else {
          // Gunakan data yang berhasil diambil
          operationalData = data || [];
          console.log(`📊 Operational data loaded: ${operationalData.length} records`);
          
          console.log(`🗃️ Raw operational data from database: ${operationalData?.length || 0} records`);
        console.log('📋 Sample raw operational data:', operationalData?.slice(0, 3).map(item => ({
          tanggal: item.tanggal,
          original_month: item.original_month,
          kategori: item.kategori,
          nominal: item.nominal,
          is_retroactive: item.is_retroactive
        })));
        
        // Log semua data operasional untuk debugging
        console.log('🔍 ALL operational data for debugging:', operationalData?.map(item => ({
          tanggal: item.tanggal,
          original_month: item.original_month,
          kategori: item.kategori,
          nominal: item.nominal,
          is_retroactive: item.is_retroactive,
          divisi: item.divisi
        })));
        }
      } catch (err) {
        console.error('Error in operational query:', err);
        operationalData = [];
      }
  
      console.log(`Fetched ${operationalData.length} operational records before filtering`);
      
      // Filter data berdasarkan periode untuk memastikan akurasi
      // Gunakan original_month jika ada, atau tanggal jika kosong
      const filteredOperationalData = operationalData.filter(item => {
        // Tentukan tanggal yang akan digunakan untuk filtering
        let dateToUse: Date;
        
        console.log('🔍 Filtering item:', {
          tanggal: item.tanggal,
          original_month: item.original_month,
          kategori: item.kategori,
          nominal: item.nominal
        });
        
        if (item.original_month && item.original_month.trim() !== '') {
          // Jika original_month ada, gunakan original_month
          // Format original_month: YYYY-MM-DD atau YYYY-MM
          if (item.original_month.length === 7) {
            // Format YYYY-MM, tambahkan -01
            dateToUse = new Date(item.original_month + '-01');
          } else {
            // Format YYYY-MM-DD
            dateToUse = new Date(item.original_month);
          }
          console.log('📅 Using original_month:', item.original_month, '-> dateToUse:', dateToUse.toLocaleDateString('id-ID'));
        } else {
          // Jika original_month kosong, gunakan tanggal
          dateToUse = new Date(item.tanggal);
          console.log('📅 Using tanggal:', item.tanggal, '-> dateToUse:', dateToUse.toLocaleDateString('id-ID'));
        }
        
        const itemDateWIB = new Date(dateToUse.getTime() + (7 * 60 * 60 * 1000));
        const currentDate = new Date();
        const currentDateWIB = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000));
        
        if (selectedPeriod === 'this_month') {
          const itemMonth = itemDateWIB.getMonth();
          const itemYear = itemDateWIB.getFullYear();
          const currentMonth = currentDateWIB.getMonth();
          const currentYear = currentDateWIB.getFullYear();
          
          console.log('🗓️ Month comparison:', {
            itemMonth: itemMonth + 1,
            itemYear,
            currentMonth: currentMonth + 1,
            currentYear,
            matches: itemMonth === currentMonth && itemYear === currentYear
          });
          
          return itemMonth === currentMonth && itemYear === currentYear;
        } else if (selectedPeriod === 'last_month') {
          const lastMonthDate = new Date(currentDateWIB.getFullYear(), currentDateWIB.getMonth() - 1, 1);
          return itemDateWIB.getMonth() === lastMonthDate.getMonth() && 
                 itemDateWIB.getFullYear() === lastMonthDate.getFullYear();
        } else if (selectedPeriod === 'custom') {
          // Untuk periode custom, filter berdasarkan range tanggal yang dipilih
          return dateToUse >= dateRange.start && dateToUse <= dateRange.end;
        }
        return true; // Untuk periode lain, gunakan filter database
      });
      
      console.log(`📊 After date filtering: ${filteredOperationalData.length} operational records`);
      console.log('📅 Sample operational dates:', filteredOperationalData.slice(0, 5).map(item => {
        const hasOriginalMonth = item.original_month && item.original_month.trim() !== '';
        const dateUsed = hasOriginalMonth ? item.original_month : item.tanggal;
        return {
          tanggal: item.tanggal,
          original_month: item.original_month,
          dateUsedForFiltering: dateUsed,
          usingOriginalMonth: hasOriginalMonth,
          kategori: item.kategori,
          nominal: item.nominal,
          is_retroactive: item.is_retroactive
        };
      }));
      
      console.log('🔍 Current period and date info:', {
        selectedPeriod,
        currentDate: new Date().toLocaleDateString('id-ID'),
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear(),
        dateRangeStart: dateRange.start.toLocaleDateString('id-ID'),
        dateRangeEnd: dateRange.end.toLocaleDateString('id-ID')
      });
  
      // Hitung biaya per kategori menggunakan data yang sudah difilter
      const biayaPerKategori: { [key: string]: number } = {};
      filteredOperationalData.forEach(item => {
        const kategori = item.kategori || 'Lainnya';
        biayaPerKategori[kategori] = (biayaPerKategori[kategori] || 0) + (item.nominal || 0);
      });
  
      const totalOperasional = Object.values(biayaPerKategori).reduce((sum, value) => sum + value, 0);
  
      return {
        biayaPerKategori,
        totalBiayaOperasional: totalOperasional,
        operationalDetail: filteredOperationalData
      };
    } catch (error) {
      console.error('Error in fetchBiayaData:', error);
      return {
        biayaPerKategori: {},
        totalBiayaOperasional: 0,
        operationalDetail: []
      };
    }
  };

  const calculateLabaRugi = (pendapatanData: any, biayaData: any): LabaRugiData => {
    const totalBiayaOperasional = biayaData.totalBiayaOperasional || 0;
    const labaBersih = (pendapatanData.totalKeuntungan || 0) - totalBiayaOperasional;
    
    return {
      // PENDAPATAN
      totalPenjualan: pendapatanData.totalPenjualan || 0,
      totalPendapatanLain: 0, // Belum diimplementasi
      totalPendapatan: pendapatanData.totalPenjualan || 0,
      
      // HARGA POKOK PENJUALAN
      totalHargaBeli: pendapatanData.totalHargaBeli || 0,
      totalBiayaPembelian: 0, // Belum diimplementasi
      totalHPP: pendapatanData.totalHargaBeli || 0,
      
      // LABA KOTOR
      labaKotor: pendapatanData.totalKeuntungan || 0,
      
      // BIAYA OPERASIONAL
      totalBiayaOperasional,
      totalBiayaAdministrasi: 0, // Bisa dipecah dari biayaPerKategori jika diperlukan
      totalBiayaPenjualan: 0, // Bisa dipecah dari biayaPerKategori jika diperlukan
      biayaPerKategori: biayaData.biayaPerKategori || {},
      
      // LABA BERSIH
      labaBersih,
      
      // MARGIN
      marginKotor: pendapatanData.totalPenjualan > 0 ? 
        ((pendapatanData.totalKeuntungan || 0) / pendapatanData.totalPenjualan) * 100 : 0,
      marginBersih: pendapatanData.totalPenjualan > 0 ? 
        (labaBersih / pendapatanData.totalPenjualan) * 100 : 0,
        
      // Detail data
      penjualanDetail: pendapatanData.penjualanDetail || [],
      operationalDetail: biayaData.operationalDetail || []
    };
  };

  // Fungsi helper untuk mendapatkan detail biaya per kategori
  const getBiayaDetailByKategori = (kategori: string) => {
    return detailData.operationalDetail.filter(item => 
      (item.kategori || 'Lainnya') === kategori
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Implementasi export ke Excel/PDF
    toast({
      title: "Export",
      description: "Fitur export akan segera tersedia",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Laba Rugi</h1>
          <p className="text-muted-foreground">
            Analisis profitabilitas untuk divisi {selectedDivision}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">Bulan Ini</SelectItem>
                  <SelectItem value="last_month">Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">Tahun Ini</SelectItem>
                  <SelectItem value="last_year">Tahun Lalu</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <>
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="cabang">Cabang</Label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cabang" />
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
          </div>
        </CardContent>
      </Card>

      {/* Laporan Laba Rugi */}
      {labaRugiData && (
        <Card>
          <CardHeader>
            <CardTitle>Laporan Laba Rugi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {/* PENDAPATAN */}
                <TableRow className="font-semibold bg-blue-50">
                  <TableCell colSpan={2} className="text-blue-700">PENDAPATAN</TableCell>
                </TableRow>
                <TableRow 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('penjualan')}
                >
                  <TableCell className="pl-4 flex items-center">
                    <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${
                      expandedSections.penjualan ? 'rotate-180' : ''
                    }`} />
                    Penjualan
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalPenjualan)}
                  </TableCell>
                </TableRow>
                
                {/* Detail Penjualan */}
                {expandedSections.penjualan && detailData.penjualanDetail.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="pl-8">
                      <div className="max-h-40 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Tanggal</TableHead>
                              <TableHead className="text-xs">ID</TableHead>
                              <TableHead className="text-xs">Harga Jual</TableHead>
                              <TableHead className="text-xs">Motor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailData.penjualanDetail.slice(0, 5).map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs">
                                  {new Date(item.tanggal).toLocaleDateString('id-ID')}
                                </TableCell>
                                <TableCell className="text-xs">{item.id}</TableCell>
                                <TableCell className="text-xs">
                                  {formatCurrency(item.harga_jual || 0)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {item.brands?.name || '-'} {item.jenis_motor?.jenis_motor || '-'} {item.plat || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {detailData.penjualanDetail.length > 5 && (
                          <div className="text-xs text-gray-500 mt-2">
                            ... dan {detailData.penjualanDetail.length - 5} data lainnya
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                <TableRow>
                  <TableCell className="pl-4">Pendapatan Lain-lain</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalPendapatanLain)}
                  </TableCell>
                </TableRow>
                
                <TableRow className="font-semibold border-t">
                  <TableCell className="pl-4">Total Penjualan</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalPendapatan)}
                  </TableCell>
                </TableRow>

                {/* HARGA POKOK PENJUALAN */}
                <TableRow className="font-semibold bg-red-50">
                  <TableCell colSpan={2} className="text-red-700">HARGA POKOK PENJUALAN</TableCell>
                </TableRow>
                <TableRow 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('hargaBeli')}
                >
                  <TableCell className="pl-4 flex items-center">
                    <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${
                      expandedSections.hargaBeli ? 'rotate-180' : ''
                    }`} />
                    Harga Beli
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalHargaBeli)}
                  </TableCell>
                </TableRow>
                
                {/* Detail Harga Beli */}
                {expandedSections.hargaBeli && detailData.penjualanDetail.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="pl-8">
                      <div className="max-h-40 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Tanggal</TableHead>
                              <TableHead className="text-xs">ID</TableHead>
                              <TableHead className="text-xs">Harga Beli</TableHead>
                              <TableHead className="text-xs">Motor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detailData.penjualanDetail.slice(0, 5).map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs">
                                  {new Date(item.tanggal).toLocaleDateString('id-ID')}
                                </TableCell>
                                <TableCell className="text-xs">{item.id}</TableCell>
                                <TableCell className="text-xs">
                                  {formatCurrency(item.harga_beli || 0)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {item.brands?.name || '-'} {item.jenis_motor?.jenis_motor || '-'} {item.plat || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {detailData.penjualanDetail.length > 5 && (
                          <div className="text-xs text-gray-500 mt-2">
                            ... dan {detailData.penjualanDetail.length - 5} data lainnya
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                
                <TableRow 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection('biayaPembelian')}
                >
                  <TableCell className="pl-4 flex items-center">
                    <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${
                      expandedSections.biayaPembelian ? 'rotate-180' : ''
                    }`} />
                    Biaya Pembelian
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalBiayaPembelian)}
                  </TableCell>
                </TableRow>
                
                {/* Detail Biaya Pembelian - bisa ditambahkan jika ada data */}
                {expandedSections.biayaPembelian && (
                  <TableRow>
                    <TableCell colSpan={2} className="pl-8">
                      <div className="text-xs text-gray-500">
                        Detail biaya pembelian belum tersedia
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                
                <TableRow className="font-semibold border-t">
                  <TableCell className="pl-4">Total HPP</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalHPP)}
                  </TableCell>
                </TableRow>

                {/* LABA KOTOR */}
                <TableRow className="font-semibold bg-green-50">
                  <TableCell className="text-green-700">LABA KOTOR</TableCell>
                  <TableCell className="text-right text-green-700">
                    {formatCurrency(labaRugiData.labaKotor)}
                  </TableCell>
                </TableRow>

                {/* BIAYA OPERASIONAL */}
                <TableRow className="font-semibold bg-orange-50">
                  <TableCell colSpan={2} className="text-orange-700">BIAYA OPERASIONAL</TableCell>
                </TableRow>
                
                {/* Breakdown Biaya per Kategori dengan Dropdown */}
                {Object.entries(labaRugiData.biayaPerKategori).map(([kategori, nominal]) => {
                  const detailBiaya = getBiayaDetailByKategori(kategori);
                  const sectionKey = `biaya_${kategori}`;
                  
                  return (
                    <React.Fragment key={kategori}>
                      <TableRow 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleSection(sectionKey)}
                      >
                        <TableCell className="pl-4 flex items-center">
                          <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${
                            expandedSections[sectionKey] ? 'rotate-180' : ''
                          }`} />
                          <span className="capitalize">{kategori}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(nominal)}
                        </TableCell>
                      </TableRow>
                      
                      {/* Detail Biaya per Kategori */}
                      {expandedSections[sectionKey] && (
                        <TableRow>
                          <TableCell colSpan={2} className="pl-8">
                            {detailBiaya.length > 0 ? (
                              <div className="space-y-2">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Tanggal</TableHead>
                                      <TableHead className="text-xs">Deskripsi</TableHead>
                                      <TableHead className="text-xs">Nominal</TableHead>
                                      <TableHead className="text-xs">Divisi</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {detailBiaya.slice(0, 5).map((item, index) => (
                                      <TableRow key={index}>
                                        <TableCell className="text-xs">
                                          {new Date(item.tanggal).toLocaleDateString('id-ID')}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {item.deskripsi || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {formatCurrency(item.nominal || 0)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          {item.divisi || '-'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {detailBiaya.length > 5 && (
                                  <div className="text-xs text-gray-500 mt-2">
                                    ... dan {detailBiaya.length - 5} transaksi lainnya
                                  </div>
                                )}
                                <div className="text-xs font-medium text-gray-700 mt-2">
                                  Total {detailBiaya.length} transaksi: {formatCurrency(nominal)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                Tidak ada detail transaksi untuk kategori {kategori}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                
                <TableRow className="font-semibold border-t">
                  <TableCell className="pl-4">Total Biaya Operasional</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalBiayaOperasional)}
                  </TableCell>
                </TableRow>

                {/* LABA BERSIH */}
                <TableRow className="font-bold bg-gray-100 text-lg">
                  <TableCell className="text-gray-800">LABA BERSIH</TableCell>
                  <TableCell className={`text-right ${
                    labaRugiData.labaBersih >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(labaRugiData.labaBersih)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {labaRugiData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(labaRugiData.totalPendapatan)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Laba Kotor</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(labaRugiData.labaKotor)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Biaya Operasional</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(labaRugiData.totalBiayaOperasional)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                {labaRugiData.labaBersih >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Laba Bersih</p>
                  <p className={`text-2xl font-bold ${
                    labaRugiData.labaBersih >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(labaRugiData.labaBersih)}
                  </p>
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