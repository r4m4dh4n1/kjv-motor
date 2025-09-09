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

    // 5. Query untuk total operasional (PERBAIKAN: gunakan 'nominal' bukan 'jumlah')
    let operasionalQuery = supabase
      .from('operational')
      .select('nominal, tanggal, divisi, cabang_id');

    if (selectedDivision !== 'all') {
      operasionalQuery = operasionalQuery.eq('divisi', selectedDivision);
    }

    // 6. Query untuk pencatatan asset (PERBAIKAN: gunakan 'debit, kredit' bukan 'jumlah')
    let pencatatanAssetQuery = supabase
      .from('pembukuan')
      .select('debit, kredit, tanggal, divisi, cabang_id, jenis_transaksi')
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

    // Transform data keuntungan
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

    // Hitung totals (PERBAIKAN: gunakan kolom yang benar)
    const totalBooked = filteredBooked.reduce((sum, item) => sum + (item.dp || 0), 0);
    const totalOperasional = filteredOperasional.reduce((sum, item) => sum + (item.nominal || 0), 0);
    const totalBookedHargaBeli = filteredBookedHargaBeli.reduce((sum, item) => sum + (item.harga_beli || 0), 0);
    const totalPembelianReady = filteredPembelianReady.reduce((sum, item) => sum + (item.harga_final || item.harga_beli || 0), 0);
    const totalPencatatanAsset = filteredPencatatanAsset.reduce((sum, item) => {
      // Untuk pengeluaran asset, gunakan debit
      return sum + (item.debit || 0);
    }, 0);
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

    // Query untuk modal perusahaan dari pembukuan (PERBAIKAN: gunakan 'debit, kredit' bukan 'jumlah')
    let modalQuery = supabase
      .from('pembukuan')
      .select('debit, kredit, divisi, cabang_id, jenis_transaksi')
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

    const totalModalPerusahaan = filteredModal.reduce((sum, item) => {
      // Untuk pemasukan modal, gunakan kredit
      return sum + (item.kredit || 0);
    }, 0);

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
      // Dapatkan range tanggal untuk periode yang dipilih
      const periodDateRange = getDateRange(selectedPeriod);
      
      // Dapatkan range tanggal akumulatif (semua data)
      const accumulativeDateRange = getAccumulativeDateRange(selectedPeriod);
      
      console.log('🚀 Starting data fetch:', {
        selectedPeriod,
        selectedDivision,
        selectedCabang,
        periodDateRange,
        accumulativeDateRange
      });

      // Fetch data secara paralel
      const [periodData, cumulativeData, accumulativeData] = await Promise.all([
        fetchPeriodFilteredData(periodDateRange),
        fetchCumulativeData(),
        fetchAccumulativeData(accumulativeDateRange)
      ]);

      // Set data yang difilter berdasarkan periode
      setKeuntunganData(periodData.keuntunganData);
      setTotalBooked(periodData.totalBooked);
      setTotalOperasional(periodData.totalOperasional);
      setTotalPembelianGabungan(periodData.totalPembelianReady + periodData.totalBookedHargaBeli);
      setTotalPencatatanAsset(periodData.totalPencatatanAsset);
      
      // Set data kumulatif
      setTotalModalPerusahaan(cumulativeData.totalModalPerusahaan);
      
      // Set data akumulatif untuk display
      setDisplayTotalUnit(accumulativeData.totalUnitYTD);
      setDisplayTotalPembelian(accumulativeData.totalPembelianYTD);
      setDisplayTotalBooked(accumulativeData.totalBookedYTD);
      
      // Hitung total modal kalkulasi
      const modalKalkulasi = periodData.totalBooked + periodData.totalPembelianReady + periodData.totalBookedHargaBeli + cumulativeData.totalModalPerusahaan;
      setTotalModalKalkulasi(modalKalkulasi);
      
      console.log('✅ Data fetch completed successfully:', {
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
        calculatedValues: {
          totalPembelianGabungan: periodData.totalPembelianReady + periodData.totalBookedHargaBeli,
          modalKalkulasi
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data keuntungan motor",
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
  }, [selectedPeriod, selectedDivision, selectedCabang, customStartDate, customEndDate, cabangList]);

  // Fungsi untuk format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fungsi untuk print
  const handlePrint = () => {
    window.print();
  };

  // Fungsi untuk export (placeholder)
  const handleExport = () => {
    toast({
      title: "Export",
      description: "Fitur export akan segera tersedia",
    });
  };

  // Kalkulasi untuk profit analysis
  const totalProfit = keuntunganData.reduce((sum, item) => sum + item.profit, 0);
  const totalModal = totalModalKalkulasi;
  const totalPengeluaran = totalOperasional + totalPencatatanAsset;
  const netProfit = totalProfit - totalPengeluaran;
  const profitMargin = totalModal > 0 ? (netProfit / totalModal) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analisis Keuntungan Motor</h1>
          <p className="text-muted-foreground">
            Analisis komprehensif keuntungan dan performa bisnis motor
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
          <CardTitle>Filter & Kontrol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Periode Filter */}
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Unit Terjual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unit Terjual</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayTotalUnit}</div>
            <p className="text-xs text-muted-foreground">
              Unit yang telah selesai terjual
            </p>
          </CardContent>
        </Card>

        {/* Total Pembelian */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayTotalPembelian)}</div>
            <p className="text-xs text-muted-foreground">
              Total investasi pembelian motor
            </p>
          </CardContent>
        </Card>

        {/* Total Booked */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Booked</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayTotalBooked)}</div>
            <p className="text-xs text-muted-foreground">
              Total DP dari penjualan booked
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            {netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              netProfit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Profit margin: {profitMargin.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Analisis Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Profit Penjualan</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(totalProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Booked (Periode)</span>
              <span className="text-lg font-bold">
                {formatCurrency(totalBooked)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Modal Kalkulasi</span>
              <span className="text-lg font-bold">
                {formatCurrency(totalModal)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Analisis Biaya
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Operasional</span>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(totalOperasional)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Pencatatan Asset</span>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(totalPencatatanAsset)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Pengeluaran</span>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(totalPengeluaran)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Transaction Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detail Transaksi Keuntungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-lg">Loading...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Motor</TableHead>
                    <TableHead>Modal</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Divisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keuntunganData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Tidak ada data keuntungan untuk periode yang dipilih
                      </TableCell>
                    </TableRow>
                  ) : (
                    keuntunganData.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {new Date(item.tanggal_jual).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.nama_motor}
                        </TableCell>
                        <TableCell>{formatCurrency(item.modal)}</TableCell>
                        <TableCell>{formatCurrency(item.harga_jual)}</TableCell>
                        <TableCell className={`font-medium ${
                          item.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(item.profit)}
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