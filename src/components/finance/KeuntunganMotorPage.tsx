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
}

interface CumulativeData {
  totalModalPerusahaan: number;
}

interface AccumulativeData {
  totalUnitYTD: number;
  totalPembelianYTD: number;
  totalBookedYTD: number;
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

  // State untuk display akumulatif
  const [displayTotalUnit, setDisplayTotalUnit] = useState(0);
  const [displayTotalPembelian, setDisplayTotalPembelian] = useState(0);
  const [displayTotalBooked, setDisplayTotalBooked] = useState(0);

  // Computed values
  const totalModal = keuntunganData.reduce((sum, item) => sum + item.modal, 0);
  const totalHargaJual = keuntunganData.reduce((sum, item) => sum + item.harga_jual, 0);
  const totalKeuntungan = keuntunganData.reduce((sum, item) => sum + item.profit, 0);
  const roi = totalModal > 0 ? ((totalKeuntungan / totalModal) * 100).toFixed(2) : '0.00';

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

  // ✅ PERBAIKAN: Fungsi fetch dari combined views dengan manual join
  // ... existing code ...

// ✅ PERBAIKAN: Fungsi fetch dari combined views dengan manual join
const fetchFromCombinedViews = async () => {
  try {
    setLoading(true); // ✅ Gunakan setLoading, bukan setIsLoading
    console.log('🔄 Fetching from combined views...');

    const dateRange = getDateRange(selectedPeriod);
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
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      return matchesDate && matchesCabang;
    }) || [];

    const filteredBookedHargaBeli = bookedHargaBeliResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      return matchesDate && matchesCabang;
    }) || [];

    const filteredPembelianReady = pembelianReadyResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal_pembelian);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      return matchesDate && matchesCabang;
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

    console.log('📊 Combined view data results:', {
      totalBooked,
      totalBookedHargaBeli,
      totalPembelianReady,
      totalOperasional,
      totalPencatatanAsset,
      totalProfitFiltered,
      keuntunganCount: keuntunganData.length
    });

    // Update state
    setKeuntunganData(keuntunganData);
    setTotalBooked(totalBooked);
    setTotalPembelianGabungan(totalPembelianReady);
    setTotalOperasional(totalOperasional);
    setTotalPencatatanAsset(totalPencatatanAsset);
    setTotalModalPerusahaan(totalBooked + totalBookedHargaBeli);

    return {
      keuntunganData,
      totalBooked,
      totalOperasional,
      totalPembelianReady,
      totalBookedHargaBeli,
      totalPencatatanAsset,
      totalProfitFiltered
    };

  } catch (error) {
    console.error('❌ Error fetching combined data:', error);
    toast({
      title: "Error",
      description: "Gagal mengambil data gabungan. Silakan coba lagi.",
      variant: "destructive",
    });
    throw error;
  } finally {
    setLoading(false); // ✅ Gunakan setLoading, bukan setIsLoading
  }
};

// ... existing code ...

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
      jenis_motor: jenisMotorMap.get(item.jenis_id) || { jenis_motor: 'Unknown' } // Menggunakan jenis_id
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
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'booked';
      return matchesDate && matchesCabang && matchesStatus;
    }) || [];

    const filteredBookedHargaBeli = bookedHargaBeliResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'booked';
      return matchesDate && matchesCabang && matchesStatus;
    }) || [];

    const filteredPembelianReady = pembelianReadyResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal_pembelian);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'ready';
      return matchesDate && matchesCabang && matchesStatus;
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

    console.log('🔍 Active tables data results:', {
      totalBooked,
      totalBookedHargaBeli,
      totalPembelianReady,
      totalOperasional,
      totalPencatatanAsset,
      totalProfitFiltered,
      keuntunganRecords: keuntunganData.length
    });

    return {
      keuntunganData,
      totalBooked,
      totalOperasional,
      totalPembelianReady,
      totalBookedHargaBeli,
      totalPencatatanAsset,
      totalProfitFiltered
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

    const penjualansTable = shouldUseCombined ? 'penjualans_combined' : 'penjualans';
    const pembelianTable = shouldUseCombined ? 'pembelian_combined' : 'pembelian';

    let unitYTDQuery = supabase
      .from(penjualansTable)
      .select('id, status, tanggal, cabang_id, divisi');

    if (selectedDivision !== 'all') {
      unitYTDQuery = unitYTDQuery.eq('divisi', selectedDivision);
    }

    let pembelianYTDQuery = supabase
      .from(pembelianTable)
      .select('harga_beli, harga_final, tanggal_pembelian, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      pembelianYTDQuery = pembelianYTDQuery.eq('divisi', selectedDivision);
    }

    let penjualansBookedYTDQuery = supabase
      .from(penjualansTable)
      .select('harga_beli, tanggal, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      penjualansBookedYTDQuery = penjualansBookedYTDQuery.eq('divisi', selectedDivision);
    }

    let bookedYTDQuery = supabase
      .from(penjualansTable)
      .select('dp, tanggal, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      bookedYTDQuery = bookedYTDQuery.eq('divisi', selectedDivision);
    }

    const [unitYTDResult, pembelianYTDResult, penjualansBookedYTDResult, bookedYTDResult] = await Promise.all([
      unitYTDQuery,
      pembelianYTDQuery,
      penjualansBookedYTDQuery,
      bookedYTDQuery
    ]);

    if (unitYTDResult.error) throw unitYTDResult.error;
    if (pembelianYTDResult.error) throw pembelianYTDResult.error;
    if (penjualansBookedYTDResult.error) throw penjualansBookedYTDResult.error;
    if (bookedYTDResult.error) throw bookedYTDResult.error;

    // Filter data berdasarkan cabang dan tanggal
    const filteredUnits = unitYTDResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'selesai';
      return matchesDate && matchesCabang && matchesStatus;
    }) || [];

    const filteredPembelian = pembelianYTDResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'ready';
      return matchesCabang && matchesStatus;
    }) || [];

    const filteredPenjualansBooked = penjualansBookedYTDResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'booked';
      return matchesCabang && matchesStatus;
    }) || [];

    const filteredBooked = bookedYTDResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'booked';
      return matchesCabang && matchesStatus;
    }) || [];

    // Hitung totals
    const totalUnitYTD = filteredUnits.length;
    const totalPembelianFromPembelian = filteredPembelian.reduce((sum, item) => sum + (item.harga_final || item.harga_beli || 0), 0);
    const totalPembelianFromPenjualans = filteredPenjualansBooked.reduce((sum, item) => sum + (item.harga_beli || 0), 0);
    const totalPembelianYTD = totalPembelianFromPembelian + totalPembelianFromPenjualans;
    const totalBookedYTD = filteredBooked.reduce((sum, item) => sum + (item.dp || 0), 0);

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

    const pembukuanTable = shouldUseCombined ? 'pembukuan_combined' : 'pembukuan';

    let modalQuery = supabase
      .from(pembukuanTable)
      .select('debit, kredit, divisi, cabang_id, keterangan')
      .or('keterangan.ilike.%modal%,keterangan.ilike.%pemasukan%,keterangan.ilike.%setoran%');

    if (selectedDivision !== 'all') {
      modalQuery = modalQuery.eq('divisi', selectedDivision);
    }

    const modalResult = await modalQuery;

    if (modalResult.error) throw modalResult.error;

    const filteredModal = modalResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const isModalIncome = item.keterangan?.toLowerCase().includes('modal') || 
                           item.keterangan?.toLowerCase().includes('pemasukan') ||
                           item.keterangan?.toLowerCase().includes('setoran');
      return matchesCabang && isModalIncome;
    }) || [];

    const totalModalPerusahaan = filteredModal.reduce((sum, item) => sum + (item.kredit || 0), 0);

    console.log('💰 Cumulative data results:', {
      totalModalPerusahaan,
      useCombined: shouldUseCombined
    });

    return {
      totalModalPerusahaan
    };
  };

  // Fungsi utama untuk mengambil semua data
  const fetchData = async () => {
    setLoading(true);
    try {
      const periodDateRange = getDateRange(selectedPeriod);
      const accumulativeDateRange = getAccumulativeDateRange(selectedPeriod);

      const [periodData, cumulativeData, accumulativeData] = await Promise.all([
        fetchPeriodFilteredData(periodDateRange),
        fetchCumulativeData(),
        fetchAccumulativeData(accumulativeDateRange)
      ]);

      setKeuntunganData(periodData.keuntunganData);
      setTotalBooked(periodData.totalBooked);
      setTotalOperasional(periodData.totalOperasional);
      setTotalPembelianGabungan(periodData.totalPembelianReady + periodData.totalBookedHargaBeli);
      setTotalPencatatanAsset(periodData.totalPencatatanAsset);

      setTotalModalPerusahaan(cumulativeData.totalModalPerusahaan);

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
                  {cabangOptions.map((cabang) => (
                    <SelectItem key={cabang} value={cabang}>
                      {cabang}
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

      {/* Ringkasan Keuangan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
      </div>

      {/* Detail Informasi */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detail Informasi Keuangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total Booked:</span> {formatCurrency(totalBooked)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Harga Beli Booked:</span> {formatCurrency(hargaBeliBooked)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Pembelian Ready:</span> {formatCurrency(pembelianReady)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Operasional:</span> {formatCurrency(operasional)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Pencatatan Asset:</span> {formatCurrency(pencatatanAsset)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Modal Perusahaan:</span> {formatCurrency(modalPerusahaan)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total Modal:</span> {formatCurrency(totalModal)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total Harga Jual:</span> {formatCurrency(totalHargaJual)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total Keuntungan:</span> {formatCurrency(totalKeuntungan)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">ROI:</span> {roi}%
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
                {keuntunganData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.nama_motor}</TableCell>
                    <TableCell>{item.cabang}</TableCell>
                    <TableCell>{item.divisi}</TableCell>
                    <TableCell>{formatCurrency(item.modal)}</TableCell>
                    <TableCell>{formatCurrency(item.harga_jual)}</TableCell>
                    <TableCell>{formatCurrency(item.profit)}</TableCell>
                    <TableCell>{((item.profit / item.modal) * 100).toFixed(2)}%</TableCell>
                    <TableCell>{new Date(item.tanggal_jual).toLocaleDateString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeuntunganMotorPage;