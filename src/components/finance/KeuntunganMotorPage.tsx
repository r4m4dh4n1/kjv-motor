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
}

interface CabangData {
  id: number;
  nama: string;
}

interface KeuntunganMotorPageProps {
  selectedDivision: string;
}

// Interface untuk data yang difilter berdasarkan periode
interface PeriodFilteredData {
  keuntunganData: KeuntunganData[];
  totalBooked: number;
  totalOperasional: number;
  totalPembelianReady: number;
  totalBookedHargaBeli: number;
  totalPencatatanAsset: number;
  totalProfitFiltered: number;
}

// Interface untuk data kumulatif (tidak difilter periode)
interface CumulativeData {
  totalModalPerusahaan: number;
}

// Interface untuk data akumulatif dari awal tahun
interface AccumulativeData {
  totalUnitYTD: number;
  totalPembelianYTD: number;
  totalBookedYTD: number;
}

// Interface untuk DateRange - disesuaikan dengan PembukuanPage.tsx
interface DateRange {
  start: string;
  end: string;
}

const KeuntunganMotorPage = ({ selectedDivision }: KeuntunganMotorPageProps) => {
  const [keuntunganData, setKeuntunganData] = useState<KeuntunganData[]>([]);
  const [cabangList, setCabangList] = useState<CabangData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedCabang, setSelectedCabang] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Data yang difilter berdasarkan periode
  const [totalBooked, setTotalBooked] = useState(0);
  const [totalOperasional, setTotalOperasional] = useState(0);
  const [totalPembelianGabungan, setTotalPembelianGabungan] = useState(0);
  const [totalPencatatanAsset, setTotalPencatatanAsset] = useState(0);
  
  // Data kumulatif (tidak difilter periode)
  const [totalModalPerusahaan, setTotalModalPerusahaan] = useState(0);
  
  // Total modal kalkulasi (gabungan periode + kumulatif)
  const [totalModalKalkulasi, setTotalModalKalkulasi] = useState(0);

  // Data akumulatif untuk card display
  const [displayTotalUnit, setDisplayTotalUnit] = useState(0);
  const [displayTotalPembelian, setDisplayTotalPembelian] = useState(0);
  const [displayTotalBooked, setDisplayTotalBooked] = useState(0);

  // Helper function untuk konversi timezone Indonesia
  const getIndonesiaDate = () => {
    const now = new Date();
    // Offset Indonesia UTC+7 (7 jam * 60 menit * 60 detik * 1000 ms)
    const indonesiaOffset = 7 * 60 * 60 * 1000;
    // Dapatkan UTC time
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    // Tambahkan offset Indonesia
    return new Date(utc + indonesiaOffset);
  };

  // Helper function untuk konversi dari waktu Indonesia ke UTC untuk query database
  const convertToUTC = (localDate: Date) => {
    const indonesiaOffset = 7 * 60 * 60 * 1000;
    return new Date(localDate.getTime() - indonesiaOffset);
  };

  // Fungsi getDateRange yang disesuaikan dengan PembukuanPage.tsx (return string format)
  const getDateRange = (period: string): DateRange => {
    // Gunakan waktu Indonesia sebagai basis perhitungan
    const nowIndonesia = getIndonesiaDate();
    const januaryMinimumUTC = new Date(Date.UTC(2025, 0, 1, 0, 0, 0)); // 1 Januari 2025
    const julyMinimumUTC = new Date(Date.UTC(2025, 6, 1, 0, 0, 0)); // Juli = bulan ke-6 (0-indexed)
    
    // Logging untuk debugging
    console.log('📅 Date range calculation (Indonesia Timezone):', {
      period,
      currentDateIndonesia: nowIndonesia.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      currentDateUTC: new Date().toISOString(),
      currentMonth: nowIndonesia.getMonth() + 1,
      currentYear: nowIndonesia.getFullYear(),
      timezone: 'Asia/Jakarta (UTC+7)'
    });
    
    let startUTC: Date;
    let endUTC: Date;
    
    switch (period) {
      case 'today': {
        const startOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59, 999);
        
        startUTC = convertToUTC(startOfDay);
        endUTC = convertToUTC(endOfDay);
        break;
      }
      
      case 'yesterday': {
        const yesterday = new Date(nowIndonesia);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        
        startUTC = convertToUTC(startOfDay);
        endUTC = convertToUTC(endOfDay);
        
        // Apply minimum date
        startUTC = startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC;
        break;
      }
      
      case 'this_week': {
        const startOfWeek = new Date(nowIndonesia);
        startOfWeek.setDate(nowIndonesia.getDate() - nowIndonesia.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59, 999);
        
        startUTC = convertToUTC(startOfWeek);
        endUTC = convertToUTC(endOfWeek);
        
        // Apply minimum date
        startUTC = startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC;
        break;
      }
      
      case 'last_week': {
        const startOfLastWeek = new Date(nowIndonesia);
        startOfLastWeek.setDate(nowIndonesia.getDate() - nowIndonesia.getDay() - 7);
        startOfLastWeek.setHours(0, 0, 0, 0);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        endOfLastWeek.setHours(23, 59, 59, 999);
        
        startUTC = convertToUTC(startOfLastWeek);
        endUTC = convertToUTC(endOfLastWeek);
        
        // Apply minimum date
        startUTC = startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC;
        break;
      }
        
      case 'this_month': {
        startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), 1, 0, 0, 0));
        endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth() + 1, 0, 23, 59, 59));
        
        // Apply minimum date
        startUTC = startUTC < januaryMinimumUTC ? januaryMinimumUTC : startUTC;
        break;
      }
        
      case 'last_month': {
        const currentMonth = nowIndonesia.getMonth(); // 0-indexed
        const currentYear = nowIndonesia.getFullYear();
        const julyMonth = 6; // Juli = index 6
        const augustMonth = 7; // Agustus = index 7
        
        // Jika bulan berjalan adalah Agustus
        if (currentMonth === augustMonth) {
          // Last month = dari Januari sampai Juli
          startUTC = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0)); // Januari 1
          endUTC = new Date(Date.UTC(currentYear, julyMonth + 1, 0, 23, 59, 59)); // Akhir Juli
        } else {
          // Bulan lainnya: last month = bulan sebelumnya saja
          startUTC = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
          endUTC = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59));
          
          // Tetap terapkan Juli minimum jika diperlukan
          startUTC = startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC;
        }
        break;
      }
      
      case 'this_year': {
        startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), 0, 1, 0, 0, 0));
        endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), 11, 31, 23, 59, 59));
        break;
      }
        
      case 'last_year': {
        startUTC = new Date(Date.UTC(nowIndonesia.getFullYear() - 1, 0, 1, 0, 0, 0));
        endUTC = new Date(Date.UTC(nowIndonesia.getFullYear() - 1, 11, 31, 23, 59, 59));
        
        // Apply minimum date
        startUTC = startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC;
        break;
      }
      
      case 'custom': {
        if (customStartDate && customEndDate) {
          const startDateIndonesia = new Date(`${customStartDate}T00:00:00`);
          const endDateIndonesia = new Date(`${customEndDate}T23:59:59.999`);
          
          startUTC = new Date(Date.UTC(
            startDateIndonesia.getFullYear(),
            startDateIndonesia.getMonth(),
            startDateIndonesia.getDate(),
            0, 0, 0
          ));
          endUTC = new Date(Date.UTC(
            endDateIndonesia.getFullYear(),
            endDateIndonesia.getMonth(),
            endDateIndonesia.getDate(),
            23, 59, 59
          ));
          
          // Apply minimum date
          startUTC = startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC;
        } else {
          // Fallback ke hari ini jika custom date tidak diset
          const startOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 0, 0, 0, 0);
          const endOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59, 999);
          
          startUTC = convertToUTC(startOfDay);
          endUTC = convertToUTC(endOfDay);
        }
        break;
      }
        
      default: {
        // Default ke hari ini
        const startOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59, 999);
        
        startUTC = convertToUTC(startOfDay);
        endUTC = convertToUTC(endOfDay);
      }
    }
    
    // Convert to string format (consistent with PembukuanPage.tsx)
    const startString = startUTC.toISOString().split('T')[0];
    const endString = endUTC.toISOString().split('T')[0];
    
    // Logging hasil perhitungan
    console.log(`📅 ${period.toUpperCase()} date range (Indonesia → UTC):`, {
      startUTC: startUTC.toISOString(),
      endUTC: endUTC.toISOString(),
      startString,
      endString,
      startIndonesia: new Date(startUTC.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
      endIndonesia: new Date(endUTC.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
      daysDifference: Math.ceil((endUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24))
    });
    
    return { start: startString, end: endString };
  };

  // Fungsi untuk mendapatkan range tanggal akumulatif 
  const getAccumulativeDateRange = (period: string): DateRange => {
    const nowIndonesia = getIndonesiaDate();
    
    // Ambil semua data dari database tanpa filter tanggal
    const startDate = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(nowIndonesia.getFullYear(), 11, 31, 23, 59, 59));
    
    console.log('📊 Accumulative date range (ALL DATA):', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startIndonesia: new Date(startDate.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
      endIndonesia: new Date(endDate.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
      note: "Mengambil SEMUA data tanpa batasan tanggal"
    });
    
    return { 
      start: startDate.toISOString().split('T')[0], 
      end: endDate.toISOString().split('T')[0] 
    };
  };

  const fetchInitialData = async () => {
    try {
      const { data: cabangData, error: cabangError } = await supabase
        .from('cabang')
        .select('id, nama');

      if (cabangError) throw cabangError;
      setCabangList(cabangData || []);
      
      console.log('🏢 Cabang data loaded:', cabangData?.length || 0, 'cabang');
    } catch (error) {
      console.error('❌ Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data cabang",
        variant: "destructive",
      });
    }
  };

  // Fungsi untuk mengambil data akumulatif (dari awal tahun sampai periode yang dipilih)
  const fetchAccumulativeData = async (dateRange: DateRange): Promise<AccumulativeData> => {
    console.log('🏦 Fetching accumulative data:', {
      period: selectedPeriod,
      dateRange,
      division: selectedDivision,
      cabang: selectedCabang
    });

    // Convert string dates back to Date objects for comparison
    const startDate = new Date(`${dateRange.start}T00:00:00.000Z`);
    const endDate = new Date(`${dateRange.end}T23:59:59.999Z`);

    // 1. Query untuk total unit YTD (penjualan selesai) - ambil semua data
    let unitYTDQuery = supabase
      .from('penjualans')
      .select('id, status, tanggal, cabang_id, divisi');

    if (selectedDivision !== 'all') {
      unitYTDQuery = unitYTDQuery.eq('divisi', selectedDivision);
    }

    // 2. Query untuk total pembelian YTD (pembelian ready) - ambil semua data
    let pembelianYTDQuery = supabase
      .from('pembelian')
      .select('harga_beli, harga_final, tanggal_pembelian, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      pembelianYTDQuery = pembelianYTDQuery.eq('divisi', selectedDivision);
    }

    // 2b. Query untuk total pembelian YTD dari penjualans (status booked) - ambil semua data
    let penjualansBookedYTDQuery = supabase
      .from('penjualans')
      .select('harga_beli, tanggal, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      penjualansBookedYTDQuery = penjualansBookedYTDQuery.eq('divisi', selectedDivision);
    }

    // 3. Query untuk total booked YTD (DP dari penjualan booked) - ambil semua data
    let bookedYTDQuery = supabase
      .from('penjualans')
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

    // Error handling
    if (unitYTDResult.error) throw unitYTDResult.error;
    if (pembelianYTDResult.error) throw pembelianYTDResult.error;
    if (penjualansBookedYTDResult.error) throw penjualansBookedYTDResult.error;
    if (bookedYTDResult.error) throw bookedYTDResult.error;

    // Filter data berdasarkan cabang SAJA di frontend (TANPA FILTER TANGGAL)
    const filteredUnits = unitYTDResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'selesai';
      return matchesCabang && matchesStatus;
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
      totalPembelianFromPembelian,
      totalPembelianFromPenjualans,
      totalBookedYTD,
      unitRecords: filteredUnits.length,
      pembelianRecords: filteredPembelian.length,
      penjualansBookedRecords: filteredPenjualansBooked.length,
      bookedRecords: filteredBooked.length
    });

    return {
      totalUnitYTD,
      totalPembelianYTD,
      totalBookedYTD
    };
  };

  // Fungsi untuk mengambil data yang difilter berdasarkan periode
  const fetchPeriodFilteredData = async (dateRange: DateRange): Promise<PeriodFilteredData> => {
    console.log('🔍 Fetching period filtered data:', {
      period: selectedPeriod,
      dateRange,
      division: selectedDivision,
      cabang: selectedCabang
    });

    // Convert string dates to Date objects for filtering
    const startDate = new Date(`${dateRange.start}T00:00:00.000Z`);
    const endDate = new Date(`${dateRange.end}T23:59:59.999Z`);

    // Ambil semua data tanpa filter tanggal (sama seperti PembelianPageEnhanced)
    // 1. Query untuk data keuntungan (penjualan yang selesai)
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
        cabang:cabang_id(nama),
        divisi,
        brands(name),
        jenis_motor(jenis_motor),
        pembelian:pembelian_id(harga_final, harga_beli),
        cabang_id
      `);

    if (selectedDivision !== 'all') {
      keuntunganQuery = keuntunganQuery.eq('divisi', selectedDivision);
    }

    // 2. Query untuk total booked (DP dari penjualan dengan status 'Booked')
    let bookedQuery = supabase
      .from('penjualans')
      .select('dp, tanggal, id, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      bookedQuery = bookedQuery.eq('divisi', selectedDivision);
    }

    // 3. Query untuk harga_beli dari penjualans dengan status 'Booked'
    let bookedHargaBeliQuery = supabase
      .from('penjualans')
      .select('harga_beli, tanggal, id, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      bookedHargaBeliQuery = bookedHargaBeliQuery.eq('divisi', selectedDivision);
    }

    // 4. Query untuk pembelian dengan status 'ready' (dengan prioritas harga_final)
    let pembelianReadyQuery = supabase
      .from('pembelian')
      .select('harga_beli, harga_final, divisi, tanggal_pembelian, id, cabang_id, status');

    if (selectedDivision !== 'all') {
      pembelianReadyQuery = pembelianReadyQuery.eq('divisi', selectedDivision);
    }

    // 5. Query untuk total operasional
    let operasionalQuery = supabase
      .from('operational')
      .select('jumlah, tanggal, divisi, cabang_id');

    if (selectedDivision !== 'all') {
      operasionalQuery = operasionalQuery.eq('divisi', selectedDivision);
    }

    // 6. Query untuk pencatatan asset
    let pencatatanAssetQuery = supabase
      .from('pembukuan')
      .select('jumlah, tanggal, divisi, cabang_id, jenis_transaksi')
      .eq('jenis_transaksi', 'pengeluaran')
      .ilike('keterangan', '%asset%');

    if (selectedDivision !== 'all') {
      pencatatanAssetQuery = pencatatanAssetQuery.eq('divisi', selectedDivision);
    }

    const [
      keuntunganResult,
      bookedResult,
      bookedHargaBeliResult,
      pembelianReadyResult,
      operasionalResult,
      pencatatanAssetResult
    ] = await Promise.all([
      keuntunganQuery,
      bookedQuery,
      bookedHargaBeliQuery,
      pembelianReadyQuery,
      operasionalQuery,
      pencatatanAssetQuery
    ]);

    // Error handling
    if (keuntunganResult.error) throw keuntunganResult.error;
    if (bookedResult.error) throw bookedResult.error;
    if (bookedHargaBeliResult.error) throw bookedHargaBeliResult.error;
    if (pembelianReadyResult.error) throw pembelianReadyResult.error;
    if (operasionalResult.error) throw operasionalResult.error;
    if (pencatatanAssetResult.error) throw pencatatanAssetResult.error;

    // Filter data berdasarkan tanggal dan cabang di frontend
    const filteredKeuntungan = keuntunganResult.data?.filter(item => {
      const itemDate = new Date(item.tanggal);
      const matchesDate = itemDate >= startDate && itemDate <= endDate;
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      const matchesStatus = item.status === 'selesai';
      return matchesDate && matchesCabang && matchesStatus;
    }) || [];

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
      return matchesDate && matchesCabang;
    }) || [];

    // Transform data keuntungan untuk display
    const transformedKeuntunganData: KeuntunganData[] = filteredKeuntungan.map(item => ({
      id: item.id,
      nama_motor: `${item.brands?.name || 'Unknown'} ${item.jenis_motor?.jenis_motor || 'Unknown'} ${item.tahun || ''} ${item.warna || ''} ${item.kilometer || ''}km`.trim(),
      modal: item.harga_beli || item.pembelian?.harga_final || item.pembelian?.harga_beli || 0,
      harga_jual: item.harga_jual || 0,
      profit: item.keuntungan || 0,
      tanggal_jual: item.tanggal,
      cabang: item.cabang?.nama || 'Unknown',
      divisi: item.divisi || 'Unknown'
    }));

    // Hitung totals
    const totalBooked = filteredBooked.reduce((sum, item) => sum + (item.dp || 0), 0);
    const totalOperasional = filteredOperasional.reduce((sum, item) => sum + (item.jumlah || 0), 0);
    const totalBookedHargaBeli = filteredBookedHargaBeli.reduce((sum, item) => sum + (item.harga_beli || 0), 0);
    const totalPembelianReady = filteredPembelianReady.reduce((sum, item) => sum + (item.harga_final || item.harga_beli || 0), 0);
    const totalPencatatanAsset = filteredPencatatanAsset.reduce((sum, item) => sum + (item.jumlah || 0), 0);
    const totalProfitFiltered = transformedKeuntunganData.reduce((sum, item) => sum + item.profit, 0);

    console.log('🔍 Period filtered data results:', {
      totalBooked,
      totalOperasional,
      totalBookedHargaBeli,
      totalPembelianReady,
      totalPencatatanAsset,
      totalProfitFiltered,
      keuntunganRecords: transformedKeuntunganData.length,
      bookedRecords: filteredBooked.length,
      operasionalRecords: filteredOperasional.length,
      pembelianReadyRecords: filteredPembelianReady.length,
      pencatatanAssetRecords: filteredPencatatanAsset.length
    });

    return {
      keuntunganData: transformedKeuntunganData,
      totalBooked,
      totalOperasional,
      totalPembelianReady,
      totalBookedHargaBeli,
      totalPencatatanAsset,
      totalProfitFiltered
    };
  };

  // Fungsi untuk mengambil data kumulatif (modal perusahaan)
  const fetchCumulativeData = async (): Promise<CumulativeData> => {
    console.log('💰 Fetching cumulative data (modal perusahaan):', {
      division: selectedDivision,
      cabang: selectedCabang
    });

    // Query untuk modal perusahaan dari pembukuan
    let modalQuery = supabase
      .from('pembukuan')
      .select('jumlah, divisi, cabang_id, jenis_transaksi')
      .eq('jenis_transaksi', 'pemasukan')
      .ilike('keterangan', '%modal%');

    if (selectedDivision !== 'all') {
      modalQuery = modalQuery.eq('divisi', selectedDivision);
    }

    const modalResult = await modalQuery;

    if (modalResult.error) throw modalResult.error;

    // Filter berdasarkan cabang di frontend
    const filteredModal = modalResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      return matchesCabang;
    }) || [];

    const totalModalPerusahaan = filteredModal.reduce((sum, item) => sum + (item.jumlah || 0), 0);

    console.log('💰 Cumulative data results:', {
      totalModalPerusahaan,
      modalRecords: filteredModal.length
    });

    return {
      totalModalPerusahaan
    };
  };

  // Fungsi utama untuk fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🚀 Starting data fetch for period:', selectedPeriod);
      
      // Get date ranges
      const periodDateRange = getDateRange(selectedPeriod);
      const accumulativeDateRange = getAccumulativeDateRange(selectedPeriod);
      
      // Fetch all data in parallel
      const [periodData, accumulativeData, cumulativeData] = await Promise.all([
        fetchPeriodFilteredData(periodDateRange),
        fetchAccumulativeData(accumulativeDateRange),
        fetchCumulativeData()
      ]);
      
      // Update state dengan data periode
      setKeuntunganData(periodData.keuntunganData);
      setTotalBooked(periodData.totalBooked);
      setTotalOperasional(periodData.totalOperasional);
      setTotalPembelianGabungan(periodData.totalPembelianReady + periodData.totalBookedHargaBeli);
      setTotalPencatatanAsset(periodData.totalPencatatanAsset);
      
      // Update state dengan data kumulatif
      setTotalModalPerusahaan(cumulativeData.totalModalPerusahaan);
      
      // Update state dengan data akumulatif untuk display
      setDisplayTotalUnit(accumulativeData.totalUnitYTD);
      setDisplayTotalPembelian(accumulativeData.totalPembelianYTD);
      setDisplayTotalBooked(accumulativeData.totalBookedYTD);
      
      // Hitung total modal kalkulasi
      const totalModalKalkulasiValue = periodData.totalPembelianReady + periodData.totalBookedHargaBeli + 
                                      periodData.totalOperasional + periodData.totalPencatatanAsset + 
                                      cumulativeData.totalModalPerusahaan;
      setTotalModalKalkulasi(totalModalKalkulasiValue);
      
      console.log('✅ Data fetch completed successfully');
      
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
    fetchData();
  }, [selectedPeriod, selectedDivision, selectedCabang, customStartDate, customEndDate]);

  // Handler untuk submit filter
  const handleSubmit = () => {
    fetchData();
  };

  // Handler untuk print
  const handlePrint = () => {
    window.print();
  };

  // Handler untuk export
  const handleExport = () => {
    // Implementation for export functionality
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

  // Calculate profit percentage
  const calculateProfitPercentage = () => {
    if (totalModalKalkulasi === 0) return 0;
    const totalProfit = keuntunganData.reduce((sum, item) => sum + item.profit, 0);
    return ((totalProfit / totalModalKalkulasi) * 100);
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

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="yesterday">Kemarin</SelectItem>
                  <SelectItem value="this_week">Minggu Ini</SelectItem>
                  <SelectItem value="last_week">Minggu Lalu</SelectItem>
                  <SelectItem value="this_month">Bulan Ini</SelectItem>
                  <SelectItem value="last_month">Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">Tahun Ini</SelectItem>
                  <SelectItem value="last_year">Tahun Lalu</SelectItem>
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

            {selectedPeriod === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Tanggal Mulai</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tanggal Akhir</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Filter'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unit Terjual</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayTotalUnit}</div>
            <p className="text-xs text-muted-foreground">Unit motor terjual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayTotalPembelian)}</div>
            <p className="text-xs text-muted-foreground">Modal pembelian motor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Booked</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayTotalBooked)}</div>
            <p className="text-xs text-muted-foreground">DP motor booked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Modal</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalModalKalkulasi)}</div>
            <p className="text-xs text-muted-foreground">Total modal usaha</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            {calculateProfitPercentage() >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              calculateProfitPercentage() >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {calculateProfitPercentage().toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Persentase keuntungan</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Keuntungan Motor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>Motor</TableHead>
                  <TableHead>Modal</TableHead>
                  <TableHead>Harga Jual</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Divisi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading data...
                    </TableCell>
                  </TableRow>
                ) : keuntunganData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Tidak ada data untuk periode yang dipilih
                    </TableCell>
                  </TableRow>
                ) : (
                  keuntunganData.map((item, index) => {
                    const margin = item.modal > 0 ? ((item.profit / item.modal) * 100) : 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.nama_motor}</TableCell>
                        <TableCell>{formatCurrency(item.modal)}</TableCell>
                        <TableCell>{formatCurrency(item.harga_jual)}</TableCell>
                        <TableCell className={item.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(item.profit)}
                        </TableCell>
                        <TableCell className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {margin.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          {new Date(item.tanggal_jual).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>{item.cabang}</TableCell>
                        <TableCell>{item.divisi}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Keuntungan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(keuntunganData.reduce((sum, item) => sum + item.profit, 0))}
              </div>
              <p className="text-sm text-green-700">Total Keuntungan</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(keuntunganData.reduce((sum, item) => sum + item.modal, 0))}
              </div>
              <p className="text-sm text-blue-700">Total Modal</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(keuntunganData.reduce((sum, item) => sum + item.harga_jual, 0))}
              </div>
              <p className="text-sm text-purple-700">Total Penjualan</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeuntunganMotorPage;