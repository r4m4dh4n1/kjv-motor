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
import { calculateStandardProfitTotals } from '@/utils/profitCalculationUtils';

interface KeuntunganData {
  id: number;
  nama_motor: string;
  modal: number;
  harga_jual: number;
  profit: number;
  tanggal_jual: string;
  cabang: string;
  divisi: string;
  data_source?: string;
}

interface CabangData {
  id: number;
  nama: string;
}

interface KeuntunganMotorPageProps {
  selectedDivision: string;
}

interface PeriodFilteredData {
  keuntunganData: KeuntunganData[];
  totalBooked: number;
  totalOperasional: number;
  totalPembelianReady: number;
  totalBookedHargaBeli: number;
  totalPencatatanAsset: number;
  totalProfitFiltered: number;
  totalKeuntunganBiroJasa: number;
}

interface CumulativeData {
  totalModalPerusahaan: number;
}

interface AccumulativeData {
  totalUnitYTD: number;
  totalPembelianYTD: number;
  totalBookedYTD: number;
}

interface CompanyModalDetail {
  id: number;
  nama_perusahaan: string;
  modal: number;
  divisi: string;
}

interface DateRange {
  start: string;
  end: string;
}

const KeuntunganMotorPage = ({ selectedDivision }: KeuntunganMotorPageProps) => {
  // State untuk data
  const [keuntunganData, setKeuntunganData] = useState<KeuntunganData[]>([]);
  const [cabangList, setCabangList] = useState<CabangData[]>([]);
  const [loading, setLoading] = useState(false);

  // State untuk filter
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedCabang, setSelectedCabang] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // State untuk totals
  const [totalBooked, setTotalBooked] = useState(0);
  const [totalOperasional, setTotalOperasional] = useState(0);
  const [totalPembelianGabungan, setTotalPembelianGabungan] = useState(0);
  const [totalPencatatanAsset, setTotalPencatatanAsset] = useState(0);
  const [totalModalPerusahaan, setTotalModalPerusahaan] = useState(0);
  const [totalModalKalkulasi, setTotalModalKalkulasi] = useState(0);
  const [totalModalCompanies, setTotalModalCompanies] = useState(0);
  const [totalKeuntunganBiroJasa, setTotalKeuntunganBiroJasa] = useState(0);

  // State untuk display akumulatif
  const [displayTotalUnit, setDisplayTotalUnit] = useState(0);
  const [displayTotalPembelian, setDisplayTotalPembelian] = useState(0);
  const [displayTotalBooked, setDisplayTotalBooked] = useState(0);

  // State untuk detail company
  const [companiesModalDetail, setCompaniesModalDetail] = useState<CompanyModalDetail[]>([]);
  const [showCompanyBreakdown, setShowCompanyBreakdown] = useState(false);

  // Computed values
  const totalModal = keuntunganData.reduce((sum, item) => sum + item.modal, 0);
  const totalHargaJual = keuntunganData.reduce((sum, item) => sum + item.harga_jual, 0);
  const totalKeuntungan = keuntunganData.reduce((sum, item) => sum + item.profit, 0);
  const roi = totalModal > 0 ? ((totalKeuntungan / totalModal) * 100).toFixed(2) : '0.00';

  // ← TAMBAHAN BARU: Rumus Cash Flow Operasional
  const cashFlowOperasional = totalModalCompanies + 
                            totalPembelianGabungan + 
                            totalBooked + 
                            totalKeuntungan + 
                            totalKeuntunganBiroJasa - 
                            totalOperasional;

  // Computed values untuk detail informasi
  const hargaBeliBooked = totalPembelianGabungan;
  const pembelianReady = totalPembelianGabungan;
  const operasional = totalOperasional;
  const pencatatanAsset = totalPencatatanAsset;
  const modalPerusahaan = totalModalPerusahaan;

  // Generate cabang options dari cabangList
  const cabangOptions = cabangList.map(cabang => cabang.id.toString());

  // Tentukan apakah harus menggunakan combined view
  const shouldUseCombined = ['last_month', 'this_year', 'last_year'].includes(selectedPeriod) || 
                           (selectedPeriod === 'custom' && customStartDate && customEndDate);

  // Fungsi untuk mendapatkan range tanggal berdasarkan periode
  const getDateRange = (period: string): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        };
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'last_week':
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return {
          start: lastWeekStart.toISOString().split('T')[0],
          end: lastWeekEnd.toISOString().split('T')[0]
        };
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: lastMonthStart.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        };
      case 'this_year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return {
          start: startOfYear.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'last_year':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        return {
          start: lastYearStart.toISOString().split('T')[0],
          end: lastYearEnd.toISOString().split('T')[0]
        };
      case 'custom':
        return {
          start: customStartDate || today.toISOString().split('T')[0],
          end: customEndDate || today.toISOString().split('T')[0]
        };
      default:
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
    }
  };

  // Fungsi untuk mendapatkan range tanggal akumulatif
  const getAccumulativeDateRange = (period: string): DateRange => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return {
      start: startOfYear.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };

  // Fungsi untuk fetch data awal (cabang)
  const fetchInitialData = async () => {
    try {
      const { data: cabangData, error: cabangError } = await supabase
        .from('cabang')
        .select('id, nama')
        .order('nama');

      if (cabangError) throw cabangError;
      setCabangList(cabangData || []);

    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data awal",
        variant: "destructive",
      });
    }
  };

  // Fungsi untuk mengambil keuntungan biro jasa
  const fetchBiroJasaKeuntungan = async (dateRange: DateRange): Promise<number> => {
    const startDate = new Date(`${dateRange.start}T00:00:00.000Z`);
    const endDate = new Date(`${dateRange.end}T23:59:59.999Z`);
    
    const biroJasaTable = shouldUseCombined ? 'biro_jasa_history' : 'biro_jasa';
    
    let biroJasaQuery = supabase
      .from(biroJasaTable)
      .select('keuntungan, tanggal')
      .eq('status', 'Selesai');
      
    if (selectedDivision !== 'all') {
      // Note: biro_jasa table doesn't have divisi column, so we skip this filter
      // biroJasaQuery = biroJasaQuery.eq('divisi', selectedDivision);
    }
    
    const { data, error } = await biroJasaQuery;
    
    if (error) {
      console.error('Error fetching biro jasa data:', error);
      return 0;
    }
    
    const filteredData = data?.filter(item => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      return matchesDate;
    }) || [];
    
    return filteredData.reduce((sum, item) => sum + (item.keuntungan || 0), 0);
  };

  // ✅ PERBAIKAN: Fungsi fetch dari combined views dengan manual join
  const fetchFromCombinedViews = async (dateRange: DateRange): Promise<PeriodFilteredData> => {
    try {
      console.log('🔄 Fetching from combined views...', { dateRange });

      const startDate = new Date(`${dateRange.start}T00:00:00.000Z`);
      const endDate = new Date(`${dateRange.end}T23:59:59.999Z`);
      
      // Query keuntungan dengan manual join
      let keuntunganQuery = supabase
        .from('penjualans_combined')
        .select(`
          id, tanggal, cabang_id, brand_id, jenis_id, tahun, warna, divisi,
          harga_beli, harga_jual, keuntungan, data_source
        `);

      if (selectedDivision !== 'all') {
        keuntunganQuery = keuntunganQuery.eq('divisi', selectedDivision);
      }

      // Query data referensi secara terpisah
      const [keuntunganResult, cabangResult, brandsResult, jenisMotorResult] = await Promise.all([
        keuntunganQuery,
        supabase.from('cabang').select('id, nama'),
        supabase.from('brands').select('id, name'),
        supabase.from('jenis_motor').select('id, jenis_motor')
      ]);

      if (keuntunganResult.error) throw keuntunganResult.error;
      if (cabangResult.error) throw cabangResult.error;
      if (brandsResult.error) throw brandsResult.error;
      if (jenisMotorResult.error) throw jenisMotorResult.error;

      // Buat mapping untuk data referensi
      const cabangMap = new Map(cabangResult.data?.map(c => [c.id, c]) || []);
      const brandsMap = new Map(brandsResult.data?.map(b => [b.id, b]) || []);
      const jenisMotorMap = new Map(jenisMotorResult.data?.map(j => [j.id, j]) || []);

      // Enrich data keuntungan dengan informasi relasi
      const enrichedKeuntungan = keuntunganResult.data?.map(item => ({
        ...item,
        cabang: cabangMap.get(item.cabang_id),
        brands: brandsMap.get(item.brand_id),
        jenis_motor: jenisMotorMap.get(item.jenis_id)
      })) || [];

      // Filter berdasarkan tanggal
      const filteredKeuntungan = enrichedKeuntungan.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate >= startDate && itemDate <= endDate;
      });

      // Filter berdasarkan cabang
      const cabangFilteredKeuntungan = selectedCabang === 'all' 
        ? filteredKeuntungan 
        : filteredKeuntungan.filter(item => item.cabang_id.toString() === selectedCabang);

      // Query untuk data lainnya (booked, pembelian, operasional, dll)
      let bookedQuery = supabase
        .from('penjualans_combined')
        .select('dp, tanggal, id, cabang_id, divisi, status');

      if (selectedDivision !== 'all') {
        bookedQuery = bookedQuery.eq('divisi', selectedDivision);
      }

      let bookedHargaBeliQuery = supabase
        .from('penjualans_combined')
        .select('harga_beli, tanggal, id, cabang_id, divisi, status');

      if (selectedDivision !== 'all') {
        bookedHargaBeliQuery = bookedHargaBeliQuery.eq('divisi', selectedDivision);
      }

      let pembelianReadyQuery = supabase
        .from('pembelian_combined')
        .select('harga_beli, harga_final, divisi, tanggal_pembelian, id, cabang_id, status');

      if (selectedDivision !== 'all') {
        pembelianReadyQuery = pembelianReadyQuery.eq('divisi', selectedDivision);
      }

      let operasionalQuery = supabase
        .from('operational')
        .select('nominal, tanggal, divisi, cabang_id');

      if (selectedDivision !== 'all') {
        operasionalQuery = operasionalQuery.eq('divisi', selectedDivision);
      }

      let pencatatanAssetQuery = supabase
        .from('pembukuan_combined')
        .select('debit, kredit, tanggal, divisi, cabang_id, keterangan')
        .or('keterangan.ilike.%asset%,keterangan.ilike.%aset%,keterangan.ilike.%pengeluaran%');

      if (selectedDivision !== 'all') {
        pencatatanAssetQuery = pencatatanAssetQuery.eq('divisi', selectedDivision);
      }

      const [
        bookedResult,
        bookedHargaBeliResult,
        pembelianReadyResult,
        operasionalResult,
        pencatatanAssetResult
      ] = await Promise.all([
        bookedQuery,
        bookedHargaBeliQuery,
        pembelianReadyQuery,
        operasionalQuery,
        pencatatanAssetQuery
      ]);

      // Error handling untuk semua query
      if (bookedResult.error) throw bookedResult.error;
      if (bookedHargaBeliResult.error) throw bookedHargaBeliResult.error;
      if (pembelianReadyResult.error) throw pembelianReadyResult.error;
      if (operasionalResult.error) throw operasionalResult.error;
      if (pencatatanAssetResult.error) throw pencatatanAssetResult.error;

      // Filter semua data berdasarkan tanggal dan cabang
      const filteredBooked = bookedResult.data?.filter(item => {
        const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
        // Hapus filter tanggal, hanya filter cabang
        return matchesCabang;
      }) || [];

      const filteredBookedHargaBeli = bookedHargaBeliResult.data?.filter(item => {
        const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
        return matchesCabang;
      }) || [];

      const filteredPembelianReady = pembelianReadyResult.data?.filter(item => {
        const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
        // Hapus filter tanggal, hanya filter cabang
        return matchesCabang;
      }) || [];

      const filteredOperasional = operasionalResult.data?.filter(item => {
        const itemDate = new Date(item.tanggal);
        const matchesDate = itemDate >= startDate && itemDate <= endDate;
        const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
        return matchesDate && matchesCabang;
      }) || [];

      const filteredPencatatanAsset = pencatatanAssetResult.data?.filter(item => {
        const itemDate = new Date(item.tanggal);
        const matchesDate = itemDate >= startDate && itemDate <= endDate;
        const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
        return matchesDate && matchesCabang;
      }) || [];

      // Hitung totals
      const totalBooked = filteredBooked.reduce((sum, item) => sum + (item.dp || 0), 0);
      const totalBookedHargaBeli = filteredBookedHargaBeli.reduce((sum, item) => sum + (item.harga_beli || 0), 0);
      const totalPembelianReady = filteredPembelianReady.reduce((sum, item) => sum + (item.harga_final || item.harga_beli || 0), 0);
      const totalOperasional = filteredOperasional.reduce((sum, item) => sum + (item.nominal || 0), 0);
      const totalPencatatanAsset = filteredPencatatanAsset.reduce((sum, item) => sum + (item.debit || 0), 0);

      // Transform data keuntungan untuk display
      const keuntunganData: KeuntunganData[] = cabangFilteredKeuntungan.map(item => ({
        id: item.id,
        nama_motor: `${item.brands?.name || 'Unknown'} ${item.jenis_motor?.jenis_motor || 'Unknown'} ${item.tahun || ''} ${item.warna || ''}`.trim(),
        modal: item.harga_beli || 0,
        harga_jual: item.harga_jual || 0,
        profit: item.keuntungan || 0,
        tanggal_jual: item.tanggal,
        cabang: item.cabang?.nama || `Cabang ID: ${item.cabang_id}`,
        divisi: item.divisi,
        data_source: item.data_source || 'combined'
      }));

      const totalProfitFiltered = keuntunganData.reduce((sum, item) => sum + item.profit, 0);

      const totalKeuntunganBiroJasa = await fetchBiroJasaKeuntungan(dateRange);

      console.log('📊 Combined view data results:', {
        totalBooked,
        totalBookedHargaBeli,
        totalPembelianReady,
        totalOperasional,
        totalPencatatanAsset,
        totalProfitFiltered,
        totalKeuntunganBiroJasa,
        keuntunganCount: keuntunganData.length
      });

      return {
        keuntunganData,
        totalBooked,
        totalOperasional,
        totalPembelianReady,
        totalBookedHargaBeli,
        totalPencatatanAsset,
        totalProfitFiltered,
        totalKeuntunganBiroJasa
      };

    } catch (error) {
      console.error('❌ Error fetching combined data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data gabungan. Silakan coba lagi.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // ✅ FUNGSI EXISTING: Fetch dari tabel aktif (untuk periode pendek)
  const fetchFromActiveTables = async (dateRange: DateRange): Promise<PeriodFilteredData> => {
    console.log('🔍 Fetching from active tables:', {
      period: selectedPeriod,
      dateRange,
      division: selectedDivision,
      cabang: selectedCabang
    });

    const startDate = new Date(`${dateRange.start}T00:00:00.000Z`);
    const endDate = new Date(`${dateRange.end}T23:59:59.999Z`);

    // ✅ PERBAIKAN: Query dengan manual join untuk tabel aktif juga
    let keuntunganQuery = supabase
      .from('penjualans')
      .select(`
        id,
        pembelian_id,
        harga_beli,
        harga_jual,
        keuntungan,
        status,
        tanggal,
        tahun,
        warna,
        kilometer,
        cabang_id,
        divisi,
        brand_id,
        jenis_id
      `);

    if (selectedDivision !== 'all') {
      keuntunganQuery = keuntunganQuery.eq('divisi', selectedDivision);
    }

    // Query untuk data referensi
    const [keuntunganResult, cabangResult, brandsResult, jenisMotorResult] = await Promise.all([
      keuntunganQuery,
      supabase.from('cabang').select('id, nama'),
      supabase.from('brands').select('id, name'),
      supabase.from('jenis_motor').select('id, jenis_motor')
    ]);

    if (keuntunganResult.error) throw keuntunganResult.error;
    if (cabangResult.error) throw cabangResult.error;
    if (brandsResult.error) throw brandsResult.error;
    if (jenisMotorResult.error) throw jenisMotorResult.error;

    // Buat mapping untuk data referensi
    const cabangMap = new Map(cabangResult.data?.map(c => [c.id, c]) || []);
    const brandsMap = new Map(brandsResult.data?.map(b => [b.id, b]) || []);
    const jenisMotorMap = new Map(jenisMotorResult.data?.map(j => [j.id, j]) || []);

    // Filter dan enrich data keuntungan
    const filteredKeuntungan = keuntunganResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'selesai';
      return matchesDate && matchesCabang && matchesStatus;
    }) || [];

    const enrichedKeuntungan = filteredKeuntungan.map(item => ({
      ...item,
      cabang: cabangMap.get(item.cabang_id) || { nama: `Cabang ID: ${item.cabang_id}` },
      brands: brandsMap.get(item.brand_id) || { name: 'Unknown' },
      jenis_motor: jenisMotorMap.get(item.jenis_id) || { jenis_motor: 'Unknown' }
    }));

    // Query untuk data lainnya (sama seperti sebelumnya)
    let bookedQuery = supabase
      .from('penjualans')
      .select('dp, tanggal, id, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      bookedQuery = bookedQuery.eq('divisi', selectedDivision);
    }

    let bookedHargaBeliQuery = supabase
      .from('penjualans')
      .select('harga_beli, tanggal, id, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      bookedHargaBeliQuery = bookedHargaBeliQuery.eq('divisi', selectedDivision);
    }

    let pembelianReadyQuery = supabase
      .from('pembelian')
      .select('harga_beli, harga_final, divisi, tanggal_pembelian, id, cabang_id, status');

    if (selectedDivision !== 'all') {
      pembelianReadyQuery = pembelianReadyQuery.eq('divisi', selectedDivision);
    }

    let operasionalQuery = supabase
      .from('operational')
      .select('nominal, tanggal, divisi, cabang_id');

    if (selectedDivision !== 'all') {
      operasionalQuery = operasionalQuery.eq('divisi', selectedDivision);
    }

    let pencatatanAssetQuery = supabase
      .from('pembukuan')
      .select('debit, kredit, tanggal, divisi, cabang_id, keterangan')
      .or('keterangan.ilike.%asset%,keterangan.ilike.%aset%,keterangan.ilike.%pengeluaran%');

    if (selectedDivision !== 'all') {
      pencatatanAssetQuery = pencatatanAssetQuery.eq('divisi', selectedDivision);
    }

    const [
      bookedResult,
      bookedHargaBeliResult,
      pembelianReadyResult,
      operasionalResult,
      pencatatanAssetResult
    ] = await Promise.all([
      bookedQuery,
      bookedHargaBeliQuery,
      pembelianReadyQuery,
      operasionalQuery,
      pencatatanAssetQuery
    ]);

    if (bookedResult.error) throw bookedResult.error;
    if (bookedHargaBeliResult.error) throw bookedHargaBeliResult.error;
    if (pembelianReadyResult.error) throw pembelianReadyResult.error;
    if (operasionalResult.error) throw operasionalResult.error;
    if (pencatatanAssetResult.error) throw pencatatanAssetResult.error;

    // Filter data berdasarkan periode dan cabang
    const filteredBooked = bookedResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'booked';
      // Hapus filter tanggal, hanya filter cabang dan status
      return matchesCabang && matchesStatus;
    }) || [];

    const filteredBookedHargaBeli = bookedHargaBeliResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'booked';
      return matchesCabang && matchesStatus;
    }) || [];

    const filteredPembelianReady = pembelianReadyResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'ready';
      // Hapus filter tanggal, hanya filter cabang dan status
      return matchesCabang && matchesStatus;
    }) || [];

    const filteredOperasional = operasionalResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      return matchesDate && matchesCabang;
    }) || [];

    const filteredPencatatanAsset = pencatatanAssetResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const isAssetExpense = item.keterangan?.toLowerCase().includes('asset') || 
                            item.keterangan?.toLowerCase().includes('aset') ||
                            (item.keterangan?.toLowerCase().includes('pengeluaran') && 
                             item.keterangan?.toLowerCase().includes('asset'));
      return matchesDate && matchesCabang && isAssetExpense;
    }) || [];

    // Hitung totals
    const totalBooked = filteredBooked.reduce((sum, item) => sum + (item.dp || 0), 0);
    const totalBookedHargaBeli = filteredBookedHargaBeli.reduce((sum, item) => sum + (item.harga_beli || 0), 0);
    const totalPembelianReady = filteredPembelianReady.reduce((sum, item) => sum + (item.harga_final || item.harga_beli || 0), 0);
    const totalOperasional = filteredOperasional.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalPencatatanAsset = filteredPencatatanAsset.reduce((sum, item) => sum + (item.debit || 0), 0);

    // Transform data keuntungan untuk display
    const keuntunganData: KeuntunganData[] = enrichedKeuntungan.map(item => ({
      id: item.id,
      nama_motor: `${item.brands?.name || 'Unknown'} ${item.jenis_motor?.jenis_motor || 'Unknown'} ${item.tahun || ''} ${item.warna || ''}`.trim(),
      modal: item.harga_beli || 0,
      harga_jual: item.harga_jual || 0,
      profit: item.keuntungan || 0,
      tanggal_jual: item.tanggal,
      cabang: item.cabang?.nama || 'Unknown',
      divisi: item.divisi,
      data_source: 'active'
    }));

    const totalProfitFiltered = keuntunganData.reduce((sum, item) => sum + item.profit, 0);

    const totalKeuntunganBiroJasa = await fetchBiroJasaKeuntungan(dateRange);

    console.log('🔍 Active tables data results:', {
      totalBooked,
      totalBookedHargaBeli,
      totalPembelianReady,
      totalOperasional,
      totalPencatatanAsset,
      totalProfitFiltered,
      totalKeuntunganBiroJasa,
      keuntunganRecords: keuntunganData.length
    });

    return {
      keuntunganData,
      totalBooked,
      totalOperasional,
      totalPembelianReady,
      totalBookedHargaBeli,
      totalPencatatanAsset,
      totalProfitFiltered,
      totalKeuntunganBiroJasa
    };
  };

  // ✅ PERBAIKAN: Fungsi fetch dengan logika combined view
  const fetchPeriodFilteredData = async (dateRange: DateRange): Promise<PeriodFilteredData> => {
    console.log('🔍 Fetching period filtered data:', {
      period: selectedPeriod,
      table: shouldUseCombined ? 'combined_views' : 'active_tables',
      dateRange,
      division: selectedDivision,
      cabang: selectedCabang
    });

    if (shouldUseCombined) {
      return await fetchFromCombinedViews(dateRange);
    } else {
      return await fetchFromActiveTables(dateRange);
    }
  };

  // Fungsi untuk mengambil data akumulatif
  const fetchAccumulativeData = async (dateRange: DateRange): Promise<AccumulativeData> => {
    console.log('🏦 Fetching accumulative data:', {
      period: selectedPeriod,
      dateRange,
      division: selectedDivision,
      cabang: selectedCabang
    });

    const startDate = new Date(`${dateRange.start}T00:00:00.000Z`);
    const endDate = new Date(`${dateRange.end}T23:59:59.999Z`);

    // Query berdasarkan tabel yang sesuai
    let unitYTDResult: any, pembelianYTDResult: any, penjualansBookedYTDResult: any, bookedYTDResult: any;

    if (shouldUseCombined) {
      // Use combined tables
      let unitQuery = supabase
        .from('penjualans_combined')
        .select('id, status, tanggal, cabang_id, divisi');
      if (selectedDivision !== 'all') unitQuery = unitQuery.eq('divisi', selectedDivision);

      let pembelianQuery = supabase
        .from('pembelian_combined')
        .select('harga_beli, harga_final, tanggal_pembelian, cabang_id, divisi, status');
      if (selectedDivision !== 'all') pembelianQuery = pembelianQuery.eq('divisi', selectedDivision);

      let penjualansBookedQuery = supabase
        .from('penjualans_combined')
        .select('harga_beli, tanggal, cabang_id, divisi, status');
      if (selectedDivision !== 'all') penjualansBookedQuery = penjualansBookedQuery.eq('divisi', selectedDivision);

      let bookedQuery = supabase
        .from('penjualans_combined')
        .select('dp, tanggal, cabang_id, divisi, status');
      if (selectedDivision !== 'all') bookedQuery = bookedQuery.eq('divisi', selectedDivision);

      [unitYTDResult, pembelianYTDResult, penjualansBookedYTDResult, bookedYTDResult] = await Promise.all([
        unitQuery,
        pembelianQuery,
        penjualansBookedQuery,
        bookedQuery
      ]);
    } else {
      // Use regular tables
      let unitQuery = supabase
        .from('penjualans')
        .select('id, status, tanggal, cabang_id, divisi');
      if (selectedDivision !== 'all') unitQuery = unitQuery.eq('divisi', selectedDivision);

      let pembelianQuery = supabase
        .from('pembelian')
        .select('harga_beli, harga_final, tanggal_pembelian, cabang_id, divisi, status');
      if (selectedDivision !== 'all') pembelianQuery = pembelianQuery.eq('divisi', selectedDivision);

      let penjualansBookedQuery = supabase
        .from('penjualans')
        .select('harga_beli, tanggal, cabang_id, divisi, status');
      if (selectedDivision !== 'all') penjualansBookedQuery = penjualansBookedQuery.eq('divisi', selectedDivision);

      let bookedQuery = supabase
        .from('penjualans')
        .select('dp, tanggal, cabang_id, divisi, status');
      if (selectedDivision !== 'all') bookedQuery = bookedQuery.eq('divisi', selectedDivision);

      [unitYTDResult, pembelianYTDResult, penjualansBookedYTDResult, bookedYTDResult] = await Promise.all([
        unitQuery,
        pembelianQuery,
        penjualansBookedQuery,
        bookedQuery
      ]);
    }

    if (unitYTDResult.error) throw unitYTDResult.error;
    if (pembelianYTDResult.error) throw pembelianYTDResult.error;
    if (penjualansBookedYTDResult.error) throw penjualansBookedYTDResult.error;
    if (bookedYTDResult.error) throw bookedYTDResult.error;

    // Filter data berdasarkan cabang dan tanggal
    const filteredUnits = (unitYTDResult.data as any[] || []).filter((item: any) => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id?.toString() === selectedCabang;
      const matchesStatus = item.status === 'selesai';
      return matchesDate && matchesCabang && matchesStatus;
    });

    const filteredPembelian = (pembelianYTDResult.data as any[] || []).filter((item: any) => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id?.toString() === selectedCabang;
      const matchesStatus = item.status === 'ready';
      return matchesCabang && matchesStatus;
    });

    const filteredPenjualansBooked = (penjualansBookedYTDResult.data as any[] || []).filter((item: any) => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id?.toString() === selectedCabang;
      const matchesStatus = item.status === 'booked';
      return matchesCabang && matchesStatus;
    });

    const filteredBooked = (bookedYTDResult.data as any[] || []).filter((item: any) => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id?.toString() === selectedCabang;
      const matchesStatus = item.status === 'booked';
      return matchesCabang && matchesStatus;
    });

    // Hitung totals
    const totalUnitYTD = filteredUnits.length;
    const totalPembelianFromPembelian = filteredPembelian.reduce((sum: number, item: any) => sum + (item.harga_final || item.harga_beli || 0), 0);
    const totalPembelianFromPenjualans = filteredPenjualansBooked.reduce((sum: number, item: any) => sum + (item.harga_beli || 0), 0);
    const totalPembelianYTD = totalPembelianFromPembelian + totalPembelianFromPenjualans;
    const totalBookedYTD = filteredBooked.reduce((sum: number, item: any) => sum + (item.dp || 0), 0);

    console.log('📊 Accumulative data results:', {
      totalUnitYTD,
      totalPembelianYTD,
      totalBookedYTD,
      useCombined: shouldUseCombined
    });

    return {
      totalUnitYTD,
      totalPembelianYTD,
      totalBookedYTD
    };
  };

  // Fungsi untuk mengambil data kumulatif
  const fetchCumulativeData = async (): Promise<CumulativeData> => {
    console.log('💰 Fetching cumulative data:', {
      division: selectedDivision,
      cabang: selectedCabang
    });

    // Query modal berdasarkan tabel yang sesuai
    let modalResult: any;
    
    if (shouldUseCombined) {
      let modalQuery = supabase
        .from('pembukuan_combined')
        .select('debit, kredit, divisi, cabang_id, keterangan')
        .or('keterangan.ilike.%modal%,keterangan.ilike.%pemasukan%,keterangan.ilike.%setoran%');
      if (selectedDivision !== 'all') modalQuery = modalQuery.eq('divisi', selectedDivision);
      modalResult = await modalQuery;
    } else {
      let modalQuery = supabase
        .from('pembukuan')
        .select('debit, kredit, divisi, cabang_id, keterangan')
        .or('keterangan.ilike.%modal%,keterangan.ilike.%pemasukan%,keterangan.ilike.%setoran%');
      if (selectedDivision !== 'all') modalQuery = modalQuery.eq('divisi', selectedDivision);
      modalResult = await modalQuery;
    }

    if (modalResult.error) throw modalResult.error;

    const filteredModal = (modalResult.data as any[] || []).filter((item: any) => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id?.toString() === selectedCabang;
      const isModalIncome = item.keterangan?.toLowerCase().includes('modal') || 
                           item.keterangan?.toLowerCase().includes('pemasukan') ||
                           item.keterangan?.toLowerCase().includes('setoran');
      return matchesCabang && isModalIncome;
    });

    const totalModalPerusahaan = filteredModal.reduce((sum: number, item: any) => sum + (item.kredit || 0), 0);

    console.log('💰 Cumulative data results:', {
      totalModalPerusahaan,
      useCombined: shouldUseCombined
    });

    return {
      totalModalPerusahaan
    };
  };

  // Fungsi untuk mengambil total modal dari tabel companies
  const fetchTotalModalCompanies = async (): Promise<number> => {
    console.log('🏢 Fetching total modal companies:', {
      division: selectedDivision,
      cabang: selectedCabang
    });

    let companiesQuery = supabase
      .from('companies')
      .select('id, nama_perusahaan, modal, divisi');

    if (selectedDivision !== 'all') {
      companiesQuery = companiesQuery.eq('divisi', selectedDivision);
    }

    const { data: companiesData, error } = await companiesQuery;

    if (error) {
      console.error('Error fetching companies data:', error);
      throw error;
    }

    // Simpan detail companies untuk breakdown
    setCompaniesModalDetail(companiesData || []);

    const totalModal = companiesData?.reduce((sum, company) => sum + Number(company.modal || 0), 0) || 0;

    console.log('🏢 Total modal companies result:', {
      totalModal,
      companiesCount: companiesData?.length || 0,
      companiesDetail: companiesData
    });

    return totalModal;
  };

  // Fungsi utama untuk mengambil semua data
  const fetchData = async () => {
    setLoading(true);
    try {
      const periodDateRange = getDateRange(selectedPeriod);
      const accumulativeDateRange = getAccumulativeDateRange(selectedPeriod);

      const [periodData, cumulativeData, accumulativeData, modalCompanies] = await Promise.all([
        fetchPeriodFilteredData(periodDateRange),
        fetchCumulativeData(),
        fetchAccumulativeData(accumulativeDateRange),
        fetchTotalModalCompanies() // Tambahkan pemanggilan fungsi baru
      ]);

      setKeuntunganData(periodData.keuntunganData);
      setTotalBooked(periodData.totalBooked);
      setTotalOperasional(periodData.totalOperasional);
      setTotalPembelianGabungan(periodData.totalPembelianReady + periodData.totalBookedHargaBeli);
      setTotalPencatatanAsset(periodData.totalPencatatanAsset);

      setTotalModalPerusahaan(cumulativeData.totalModalPerusahaan);
      setTotalModalCompanies(modalCompanies); //
      setTotalKeuntunganBiroJasa(periodData.totalKeuntunganBiroJasa);

      setDisplayTotalUnit(accumulativeData.totalUnitYTD);
      setDisplayTotalPembelian(accumulativeData.totalPembelianYTD);
      setDisplayTotalBooked(accumulativeData.totalBookedYTD);

       const modalKalkulasi = periodData.totalBooked + 
                            periodData.totalPembelianReady + 
                            periodData.totalBookedHargaBeli + 
                            cumulativeData.totalModalPerusahaan;
      setTotalModalKalkulasi(modalKalkulasi);

      console.log('✅ All data fetched successfully:', {
        periodData: {
          keuntunganRecords: periodData.keuntunganData.length,
          totalBooked: periodData.totalBooked,
          totalOperasional: periodData.totalOperasional,
          totalPembelianReady: periodData.totalPembelianReady,
          totalBookedHargaBeli: periodData.totalBookedHargaBeli,
          totalPencatatanAsset: periodData.totalPencatatanAsset,
          totalProfitFiltered: periodData.totalProfitFiltered
        },
        cumulativeData,
        accumulativeData,
        totalModalKalkulasi: modalKalkulasi,
        totalModalCompanies: modalCompanies, // Log nilai baru
        useCombined: shouldUseCombined
      });

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data keuntungan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect untuk fetch data awal
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Effect untuk fetch data ketika filter berubah
  useEffect(() => {
    if (cabangList.length > 0) {
      fetchData();
    }
  }, [selectedPeriod, selectedCabang, selectedDivision, customStartDate, customEndDate, cabangList]);

  // Fungsi untuk print
  const handlePrint = () => {
    window.print();
  };

  // Fungsi untuk export
  const handleExport = () => {
    toast({
      title: "Export",
      description: "Fitur export akan segera tersedia",
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Keuntungan Motor</h1>
          <p className="text-muted-foreground">
            Analisis keuntungan dan profitabilitas penjualan motor
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Period Filter */}
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">📅 Hari Ini</SelectItem>
                  <SelectItem value="yesterday">📅 Kemarin</SelectItem>
                  <SelectItem value="this_week">📅 Minggu Ini</SelectItem>
                  <SelectItem value="last_week">📅 Minggu Lalu</SelectItem>
                  <SelectItem value="this_month">📅 Bulan Ini</SelectItem>
                  <SelectItem value="last_month">📊 Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">📊 Tahun Ini</SelectItem>
                  <SelectItem value="last_year">📊 Tahun Lalu</SelectItem>
                  <SelectItem value="custom">📊 Custom</SelectItem>
                </SelectContent>
              </Select>
              {/* Info periode yang menggunakan combined view */}
              {shouldUseCombined && (
                <p className="text-xs text-blue-600 mt-1">
                  📊 Menggunakan data gabungan (active + history)
                </p>
              )}
            </div>

            {/* Cabang Filter */}
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

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tanggal Akhir</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
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

      {/* Ringkasan Keuangan */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Modal</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalModal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Harga Jual</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalHargaJual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Keuntungan</h3>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalKeuntungan)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">ROI</h3>
            <p className="text-2xl font-bold text-orange-600">{roi}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Modal Company</h3>
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalModalCompanies)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ← TAMBAHAN BARU: Card Khusus Cash Flow Operasional */}
      <Card className="mb-6 border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Calculator className="h-5 w-5" />
            Analisis Cash Flow Operasional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Breakdown Komponen */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 mb-3">Komponen Perhitungan:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">+ Modal Company:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCompanyBreakdown(!showCompanyBreakdown)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {showCompanyBreakdown ? 'Sembunyikan' : 'Detail'}
                    </Button>
                  </div>
                  <span className="font-medium">{formatCurrency(totalModalCompanies)}</span>
                </div>
                {/* Breakdown per company */}
                {showCompanyBreakdown && (
                  <div className="ml-4 mt-2 space-y-1">
                    {companiesModalDetail.map((company) => (
                      <div key={company.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border text-xs">
                        <span className="text-gray-600">
                          • {company.nama_perusahaan} ({company.divisi})
                        </span>
                        <span className="font-medium text-gray-800">
                          {formatCurrency(company.modal)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-green-600">+ Pembelian Ready:</span>
                  <span className="font-medium">{formatCurrency(totalPembelianGabungan)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-green-600">+ DP Booked:</span>
                  <span className="font-medium">{formatCurrency(totalBooked)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-green-600">+ Keuntungan Motor:</span>
                  <span className="font-medium">{formatCurrency(totalKeuntungan)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-green-600">+ Keuntungan Biro Jasa:</span>
                  <span className="font-medium">{formatCurrency(totalKeuntunganBiroJasa)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-red-600">- Operational:</span>
                  <span className="font-medium">{formatCurrency(totalOperasional)}</span>
                </div>
              </div>
            </div>
            
            {/* Hasil Akhir */}
            <div className="flex flex-col justify-center items-center">
              <div className="text-center p-6 bg-white rounded-lg border-2 border-blue-200 w-full">
                <h4 className="text-lg font-semibold text-gray-700 mb-2">Cash Flow Operasional</h4>
                <p className={`text-3xl font-bold ${
                  cashFlowOperasional >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(cashFlowOperasional)}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {cashFlowOperasional >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">Positif</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600 font-medium">Negatif</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Indikator Kesehatan Keuangan */}
              <div className="mt-4 w-full">
                <div className="text-xs text-gray-500 text-center mb-2">Status Kesehatan Keuangan</div>
                <div className={`h-2 rounded-full ${
                  cashFlowOperasional >= totalModalCompanies * 0.2 ? 'bg-green-500' :
                  cashFlowOperasional >= 0 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div className={`text-xs text-center mt-1 ${
                  cashFlowOperasional >= totalModalCompanies * 0.2 ? 'text-green-600' :
                  cashFlowOperasional >= 0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {
                    cashFlowOperasional >= totalModalCompanies * 0.2 ? 'Sangat Sehat' :
                    cashFlowOperasional >= 0 ? 'Sehat' : 'Perlu Perhatian'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel Detail Keuntungan Motor */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Keuntungan Motor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motor</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Modal</TableHead>
                  <TableHead>Harga Jual</TableHead>
                  <TableHead>Keuntungan</TableHead>
                  <TableHead>Margin (%)</TableHead>
                  <TableHead>Tanggal Jual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keuntunganData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {loading ? 'Memuat data...' : 'Tidak ada data keuntungan untuk periode yang dipilih'}
                    </TableCell>
                  </TableRow>
                ) : (
                  keuntunganData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.nama_motor}</TableCell>
                      <TableCell>{item.cabang}</TableCell>
                      <TableCell>{item.divisi}</TableCell>
                      <TableCell>{formatCurrency(item.modal)}</TableCell>
                      <TableCell>{formatCurrency(item.harga_jual)}</TableCell>
                      <TableCell>{formatCurrency(item.profit)}</TableCell>
                      <TableCell>{item.modal > 0 ? ((item.profit / item.modal) * 100).toFixed(2) : '0.00'}%</TableCell>
                      <TableCell>{new Date(item.tanggal_jual).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeuntunganMotorPage;