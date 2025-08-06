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

  function toUTCFromWIB(date: Date): Date {
  return new Date(date.getTime() - (7 * 60 * 60 * 1000));
}

  const getDateRange = (period: string) => {
    // Gunakan waktu Indonesia sebagai basis perhitungan
    const nowIndonesia = getIndonesiaDate();

    // Tanggal minimum Juli 2024
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
    
    let dateRange;
    let start: Date;
    let end: Date;
    
    switch (period) {
      case 'today': {
        const startOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59, 999);
        
        dateRange = { 
          start: convertToUTC(startOfDay), 
          end: convertToUTC(endOfDay)
        };
        break;
      }
      
      case 'yesterday': {
      const yesterday = new Date(nowIndonesia);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      
      const startUTC = convertToUTC(startOfDay);
      const endUTC = convertToUTC(endOfDay);
      
      dateRange = {
        start: startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC,
        end: endUTC
      };
      break;
    }
    
    case 'this_week': {
      const startOfWeek = new Date(nowIndonesia);
      startOfWeek.setDate(nowIndonesia.getDate() - nowIndonesia.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59, 999);
      
      const startUTC = convertToUTC(startOfWeek);
      const endUTC = convertToUTC(endOfWeek);
      
      dateRange = {
        start: startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC,
        end: endUTC
      };
      break;
    }
    
    case 'last_week': {
      const startOfLastWeek = new Date(nowIndonesia);
      startOfLastWeek.setDate(nowIndonesia.getDate() - nowIndonesia.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      
      const startUTC = convertToUTC(startOfLastWeek);
      const endUTC = convertToUTC(endOfLastWeek);
      
      dateRange = {
        start: startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC,
        end: endUTC
      };
      break;
    }
      
     case 'this_month': {
      const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), 1, 0, 0, 0));
      const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth() + 1, 0, 23, 59, 59));
      
      dateRange = { 
        start: startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC, 
        end: endUTC 
      };
      break;
    }
      
     case 'last_month': {
        const currentMonth = nowIndonesia.getMonth(); // 0-indexed
        const currentYear = nowIndonesia.getFullYear();
        const julyMonth = 6; // Juli = index 6
        const augustMonth = 7; // Agustus = index 7
        
        let startUTC: Date;
        let endUTC: Date;
        
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
          const julyMinimumUTC = new Date(Date.UTC(2025, 6, 1, 0, 0, 0));
          startUTC = startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC;
        }
        
        dateRange = {
          start: startUTC,
          end: endUTC
        };
        break;
      }
    
    case 'this_year': {
      const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), 0, 1, 0, 0, 0));
      const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), 11, 31, 23, 59, 59));
      dateRange = { start: startUTC, end: endUTC };
      break;
    }
      
      case 'last_year': {
      const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear() - 1, 0, 1, 0, 0, 0));
      const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear() - 1, 11, 31, 23, 59, 59));
      
      dateRange = {
        start: startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC,
        end: endUTC
      };
      break;
    }
    
    case 'custom': {
      if (customStartDate && customEndDate) {
        const startDateIndonesia = new Date(`${customStartDate}T00:00:00`);
        const endDateIndonesia = new Date(`${customEndDate}T23:59:59.999`);
        
        const startUTC = new Date(Date.UTC(
          startDateIndonesia.getFullYear(),
          startDateIndonesia.getMonth(),
          startDateIndonesia.getDate(),
          0, 0, 0
        ));
        const endUTC = new Date(Date.UTC(
          endDateIndonesia.getFullYear(),
          endDateIndonesia.getMonth(),
          endDateIndonesia.getDate(),
          23, 59, 59
        ));
        
        dateRange = { 
          start: startUTC < julyMinimumUTC ? julyMinimumUTC : startUTC, 
          end: endUTC 
        };
      } else {
        // Fallback ke Juli minimum
        const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59));
        dateRange = { start: julyMinimumUTC, end: endUTC };
      }
      break;
    }
      
      default: {
        // Default ke hari ini
        const startOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59, 999);
        
        dateRange = { 
          start: convertToUTC(startOfDay), 
          end: convertToUTC(endOfDay)
        };
      }
    }
    
    // Logging hasil perhitungan
    console.log(`📅 ${period.toUpperCase()} date range (Indonesia → UTC):`, {
      startUTC: dateRange.start.toISOString(),
      endUTC: dateRange.end.toISOString(),
      startIndonesia: new Date(dateRange.start.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
      endIndonesia: new Date(dateRange.end.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
      startDateForQuery: dateRange.start.toISOString().split('T')[0],
      endDateForQuery: dateRange.end.toISOString().split('T')[0],
      daysDifference: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    });
    
    return dateRange;
  };

  // Fungsi untuk mendapatkan range tanggal akumulatif (dari awal tahun sampai periode yang dipilih)
  const getAccumulativeDateRange = (period: string) => {
    const nowIndonesia = getIndonesiaDate();
    const julyMinimumUTC = new Date(Date.UTC(2025, 6, 1, 0, 0, 0));
    
    // Tentukan tanggal akhir berdasarkan periode yang dipilih
    let endDate: Date;
    
    switch (period) {
      case 'this_month': {
        // Dari awal tahun sampai akhir bulan ini
        endDate = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth() + 1, 0, 23, 59, 59));
        break;
      }
      case 'last_month': {
        // Dari awal tahun sampai akhir bulan lalu
        endDate = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), 0, 23, 59, 59));
        break;
      }
      case 'this_week': {
        // Dari awal tahun sampai akhir minggu ini
        const endOfWeek = new Date(nowIndonesia);
        endOfWeek.setDate(nowIndonesia.getDate() - nowIndonesia.getDay() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        endDate = convertToUTC(endOfWeek);
        break;
      }
      case 'last_week': {
        // Dari awal tahun sampai akhir minggu lalu
        const startOfThisWeek = new Date(nowIndonesia);
        startOfThisWeek.setDate(nowIndonesia.getDate() - nowIndonesia.getDay());
        const endOfLastWeek = new Date(startOfThisWeek);
        endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
        endOfLastWeek.setHours(23, 59, 59, 999);
        endDate = convertToUTC(endOfLastWeek);
        break;
      }
      case 'today': {
        // Dari awal tahun sampai hari ini
        const endOfToday = new Date(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59, 999);
        endDate = convertToUTC(endOfToday);
        break;
      }
      case 'yesterday': {
        // Dari awal tahun sampai kemarin
        const yesterday = new Date(nowIndonesia);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        endDate = convertToUTC(endOfYesterday);
        break;
      }
      default: {
        // Default: sampai sekarang
        endDate = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59));
        break;
      }
    }
    
    // Start date selalu dari awal tahun atau Juli minimum
    const startOfYear = new Date(Date.UTC(nowIndonesia.getFullYear(), 0, 1, 0, 0, 0));
    const startDate = startOfYear < julyMinimumUTC ? julyMinimumUTC : startOfYear;
    
    console.log('📊 Accumulative date range:', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startIndonesia: new Date(startDate.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
      endIndonesia: new Date(endDate.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID')
    });
    
    return { start: startDate, end: endDate };
  };

  console.log('KeuntunganMotorPage - selectedDivision:', selectedDivision);
  
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
  const fetchAccumulativeData = async (dateRange: { start: Date; end: Date }): Promise<AccumulativeData> => {
    console.log('🏦 Fetching accumulative data:', {
      period: selectedPeriod,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        startIndonesia: new Date(dateRange.start.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
        endIndonesia: new Date(dateRange.end.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID')
      },
      division: selectedDivision,
      cabang: selectedCabang
    });

    // 1. Query untuk total unit YTD (penjualan selesai)
    let unitYTDQuery = supabase
      .from('penjualans')
      .select('id')
      .eq('status', 'selesai')
      .gte('tanggal', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      unitYTDQuery = unitYTDQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      unitYTDQuery = unitYTDQuery.eq('divisi', selectedDivision);
    }

    // 2. Query untuk total pembelian YTD (pembelian ready)
    let pembelianYTDQuery = supabase
      .from('pembelian')
      .select('harga_beli')
      .eq('status', 'ready')
      .gte('tanggal_pembelian', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal_pembelian', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      pembelianYTDQuery = pembelianYTDQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      pembelianYTDQuery = pembelianYTDQuery.eq('divisi', selectedDivision);
    }

    // 3. Query untuk total booked YTD (DP dari penjualan booked)
    let bookedYTDQuery = supabase
      .from('penjualans')
      .select('dp')
      .eq('status', 'Booked')
      .gte('tanggal', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      bookedYTDQuery = bookedYTDQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      bookedYTDQuery = bookedYTDQuery.eq('divisi', selectedDivision);
    }

    const [unitYTDResult, pembelianYTDResult, bookedYTDResult] = await Promise.all([
      unitYTDQuery,
      pembelianYTDQuery,
      bookedYTDQuery
    ]);

    // Error handling
    if (unitYTDResult.error) throw unitYTDResult.error;
    if (pembelianYTDResult.error) throw pembelianYTDResult.error;
    if (bookedYTDResult.error) throw bookedYTDResult.error;

    // Hitung totals
    const totalUnitYTD = unitYTDResult.data?.length || 0;
    const totalPembelianYTD = pembelianYTDResult.data?.reduce((sum, item) => sum + (item.harga_beli || 0), 0) || 0;
    const totalBookedYTD = bookedYTDResult.data?.reduce((sum, item) => sum + (item.dp || 0), 0) || 0;

    console.log('📊 Accumulative data results:', {
      totalUnitYTD,
      totalPembelianYTD,
      totalBookedYTD,
      unitRecords: unitYTDResult.data?.length || 0,
      pembelianRecords: pembelianYTDResult.data?.length || 0,
      bookedRecords: bookedYTDResult.data?.length || 0
    });

    return {
      totalUnitYTD,
      totalPembelianYTD,
      totalBookedYTD
    };
  };

  // Fungsi untuk mengambil data yang difilter berdasarkan periode
  const fetchPeriodFilteredData = async (dateRange: { start: Date; end: Date }): Promise<PeriodFilteredData> => {
    console.log('🔍 Fetching period filtered data:', {
      period: selectedPeriod,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        startIndonesia: new Date(dateRange.start.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID'),
        endIndonesia: new Date(dateRange.end.getTime() + (7 * 60 * 60 * 1000)).toLocaleString('id-ID')
      },
      division: selectedDivision,
      cabang: selectedCabang
    });

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
        pembelian:pembelian_id(harga_final, harga_beli)
      `)
      .eq('status', 'selesai')
      .gte('tanggal', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      keuntunganQuery = keuntunganQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      keuntunganQuery = keuntunganQuery.eq('divisi', selectedDivision);
    }

    // 2. Query untuk total booked (DP dari penjualan dengan status 'Booked')
    let bookedQuery = supabase
      .from('penjualans')
      .select('dp, tanggal, id')
      .eq('status', 'Booked')
      .gte('tanggal', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      bookedQuery = bookedQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      bookedQuery = bookedQuery.eq('divisi', selectedDivision);
    }

    // 3. Query untuk harga_beli dari penjualans dengan status 'Booked'
    let bookedHargaBeliQuery = supabase
      .from('penjualans')
      .select('harga_beli, tanggal, id')
      .eq('status', 'Booked')
      .gte('tanggal', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      bookedHargaBeliQuery = bookedHargaBeliQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      bookedHargaBeliQuery = bookedHargaBeliQuery.eq('divisi', selectedDivision);
    }

    // 4. Query untuk pembelian dengan status 'ready'
    let pembelianReadyQuery = supabase
      .from('pembelian')
      .select('harga_beli, divisi, tanggal_pembelian, id')
      .eq('status', 'ready')
      .gte('tanggal_pembelian', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal_pembelian', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      pembelianReadyQuery = pembelianReadyQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      pembelianReadyQuery = pembelianReadyQuery.eq('divisi', selectedDivision);
    }

    // 5. Query untuk total operasional
    let operasionalQuery = supabase
      .from('operational')
      .select('nominal, divisi, tanggal, id')
      .gte('tanggal', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      operasionalQuery = operasionalQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      operasionalQuery = operasionalQuery.eq('divisi', selectedDivision);
    }

    // 6. Query untuk pencatatan asset
    let pencatatanAssetQuery = (supabase as any)
      .from('pencatatan_asset')
      .select('nominal, divisi, tanggal, id')
      .gte('tanggal', dateRange.start.toISOString().split('T')[0])
      .lte('tanggal', dateRange.end.toISOString().split('T')[0]);

    if (selectedCabang !== 'all') {
      pencatatanAssetQuery = pencatatanAssetQuery.eq('cabang_id', parseInt(selectedCabang));
    }
    if (selectedDivision !== 'all') {
      pencatatanAssetQuery = pencatatanAssetQuery.eq('divisi', selectedDivision);
    }

    const [keuntunganResult, bookedResult, bookedHargaBeliResult, pembelianReadyResult, operasionalResult, pencatatanAssetResult] = await Promise.all([
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

    // Logging detail untuk debugging
    console.log('📊 Raw query results:', {
      keuntungan: {
        count: keuntunganResult.data?.length || 0,
        sample: keuntunganResult.data?.slice(0, 2) || []
      },
      booked: {
        count: bookedResult.data?.length || 0,
        sample: bookedResult.data?.slice(0, 2) || []
      },
      pembelianReady: {
        count: pembelianReadyResult.data?.length || 0,
        sample: pembelianReadyResult.data?.slice(0, 2) || [],
        dates: pembelianReadyResult.data?.map(item => item.tanggal_pembelian) || []
      },
      operasional: {
        count: operasionalResult.data?.length || 0,
        sample: operasionalResult.data?.slice(0, 2) || []
      }
    });

    // Format data keuntungan
    const formattedData = keuntunganResult.data?.map(item => {
      const modalValue = item.pembelian 
        ? (item.pembelian.harga_final || item.pembelian.harga_beli || 0)
        : (item.harga_beli || 0);
      
      return {
        id: item.id,
        nama_motor: `${item.brands?.name || ''} ${item.jenis_motor?.jenis_motor || ''} ${item.tahun || ''}  ${item.warna || ''} ${item.kilometer ? Number(item.kilometer).toLocaleString('id-ID') : '0'}`,
        modal: modalValue,
        harga_jual: item.harga_jual || 0,
        profit: item.keuntungan || 0,
        tanggal_jual: item.tanggal,
        cabang: item.cabang?.nama || '',
        divisi: item.divisi || ''
      };
    }) || [];

    // Hitung totals
    const totalBooked = bookedResult.data?.reduce((sum, item) => sum + (item.dp || 0), 0) || 0;
    const totalOperasional = operasionalResult.data?.reduce((sum, item) => sum + (item.nominal || 0), 0) || 0;
    const totalPembelianReady = pembelianReadyResult.data?.reduce((sum, item) => sum + (item.harga_beli || 0), 0) || 0;
    const totalBookedHargaBeli = bookedHargaBeliResult.data?.reduce((sum, item) => sum + (item.harga_beli || 0), 0) || 0;
    const totalPencatatanAsset = pencatatanAssetResult.data?.reduce((sum, item) => sum + (item.nominal || 0), 0) || 0;
    const totalProfitFiltered = formattedData.reduce((sum, item) => sum + item.profit, 0);

    console.log('📊 Period filtered data results:', {
      keuntunganRecords: formattedData.length,
      totalBooked,
      totalOperasional,
      totalPembelianReady,
      totalBookedHargaBeli,
      totalPencatatanAsset,
      totalProfitFiltered,
      pembelianReadyDetails: pembelianReadyResult.data?.map(item => ({
        id: item.id,
        tanggal: item.tanggal_pembelian,
        harga_beli: item.harga_beli,
        divisi: item.divisi
      })) || []
    });

    return {
      keuntunganData: formattedData,
      totalBooked,
      totalOperasional,
      totalPembelianReady,
      totalBookedHargaBeli,
      totalPencatatanAsset,
      totalProfitFiltered
    };
  };

  // Fungsi untuk mengambil data kumulatif (tidak difilter periode)
  const fetchCumulativeData = async (): Promise<CumulativeData> => {
    console.log('🏦 Fetching cumulative data:', {
      division: selectedDivision
    });

    // Query untuk modal perusahaan - tidak perlu filter tanggal karena ini adalah modal kumulatif
    let companiesQuery = supabase
      .from('companies')
      .select('modal, divisi, id');

    if (selectedDivision !== 'all') {
      companiesQuery = companiesQuery.eq('divisi', selectedDivision);
    }

    const companiesResult = await companiesQuery;
    if (companiesResult.error) throw companiesResult.error;

    const totalModalPerusahaan = companiesResult.data?.reduce((sum, item) => sum + (item.modal || 0), 0) || 0;

    console.log('🏦 Cumulative data results:', {
      totalModalPerusahaan,
      companiesRecords: companiesResult.data?.length || 0,
      companiesData: companiesResult.data || []
    });

    return {
      totalModalPerusahaan
    };
  };

  const fetchKeuntunganData = async () => {
    setLoading(true);
    console.log('🚀 Starting fetchKeuntunganData with:', {
      selectedPeriod,
      selectedDivision,
      selectedCabang,
      customStartDate,
      customEndDate,
      timestamp: new Date().toISOString(),
      indonesiaTime: getIndonesiaDate().toLocaleString('id-ID')
    });
    
    try {
      // Reset semua state sebelum fetching data baru
      setKeuntunganData([]);
      setTotalBooked(0);
      setTotalOperasional(0);
      setTotalPembelianGabungan(0);
      setTotalPencatatanAsset(0);
      setTotalModalPerusahaan(0);
      setTotalModalKalkulasi(0);
      setDisplayTotalUnit(0);
      setDisplayTotalPembelian(0);
      setDisplayTotalBooked(0);
      
      const dateRange = getDateRange(selectedPeriod);
      
      // Tentukan apakah perlu data akumulatif untuk card display
      const shouldUseAccumulative = ['this_month', 'last_month', 'this_week', 'last_week', 'today', 'yesterday'].includes(selectedPeriod);
      
      let accumulativeData: AccumulativeData | null = null;
      
      if (shouldUseAccumulative) {
        const accumulativeDateRange = getAccumulativeDateRange(selectedPeriod);
        accumulativeData = await fetchAccumulativeData(accumulativeDateRange);
      }
      
      // Fetch data secara paralel
      const [periodData, cumulativeData] = await Promise.all([
        fetchPeriodFilteredData(dateRange),
        fetchCumulativeData()
      ]);

      // Validasi data sebelum set state
      if (!periodData || !cumulativeData) {
        throw new Error('Data tidak valid dari server');
      }

      // Set data yang difilter berdasarkan periode
      setKeuntunganData(periodData.keuntunganData || []);
      setTotalBooked(periodData.totalBooked || 0);
      setTotalOperasional(periodData.totalOperasional || 0);
      setTotalPencatatanAsset(periodData.totalPencatatanAsset || 0);
      
      // Set total pembelian gabungan
      const totalGabungan = (periodData.totalPembelianReady || 0) + (periodData.totalBookedHargaBeli || 0);
      setTotalPembelianGabungan(totalGabungan);
      
      // Set data kumulatif
      setTotalModalPerusahaan(cumulativeData.totalModalPerusahaan || 0);
      
      // Hitung total modal kalkulasi (gabungan periode + kumulatif)
      const totalModalKalkulasiBaru = 
        (cumulativeData.totalModalPerusahaan || 0) + 
        (periodData.totalPencatatanAsset || 0) + 
        (periodData.totalPembelianReady || 0) + 
        (periodData.totalBookedHargaBeli || 0) + 
        (periodData.totalProfitFiltered || 0) - 
        (periodData.totalOperasional || 0);
      
      setTotalModalKalkulasi(totalModalKalkulasiBaru);

      // Set data untuk card display
      if (shouldUseAccumulative && accumulativeData) {
        setDisplayTotalUnit(accumulativeData.totalUnitYTD);
        setDisplayTotalPembelian(accumulativeData.totalPembelianYTD);
        setDisplayTotalBooked(accumulativeData.totalBookedYTD);
        
        console.log('📊 Using accumulative data for card display:', {
          displayTotalUnit: accumulativeData.totalUnitYTD,
          displayTotalPembelian: accumulativeData.totalPembelianYTD,
          displayTotalBooked: accumulativeData.totalBookedYTD
        });
      } else {
        // Untuk periode lain (this_year, last_year, custom), gunakan data periode
        setDisplayTotalUnit(periodData.keuntunganData?.length || 0);
        setDisplayTotalPembelian(periodData.totalPembelianReady || 0);
        setDisplayTotalBooked(periodData.totalBooked || 0);
        
        console.log('📊 Using period data for card display:', {
          displayTotalUnit: periodData.keuntunganData?.length || 0,
          displayTotalPembelian: periodData.totalPembelianReady || 0,
          displayTotalBooked: periodData.totalBooked || 0
        });
      }

      console.log('✅ Final calculations:', {
        totalModalPerusahaan: cumulativeData.totalModalPerusahaan,
        totalPencatatanAsset: periodData.totalPencatatanAsset,
        totalPembelianReady: periodData.totalPembelianReady,
        totalBookedHargaBeli: periodData.totalBookedHargaBeli,
        totalProfitFiltered: periodData.totalProfitFiltered,
        totalOperasional: periodData.totalOperasional,
        totalModalKalkulasiBaru,
        totalPembelianGabungan: totalGabungan,
        keuntunganDataCount: periodData.keuntunganData?.length || 0,
        shouldUseAccumulative,
        accumulativeData
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

  // Perhitungan metrik dari data tabel (konsisten dengan data yang ditampilkan)
  const totalModal = keuntunganData.reduce((sum, item) => sum + item.modal, 0);
  const totalTerjual = keuntunganData.reduce((sum, item) => sum + item.harga_jual, 0);
  const totalProfit = keuntunganData.reduce((sum, item) => sum + item.profit, 0);
  const totalUnit = keuntunganData.length;

  // Perhitungan metrik finansial berdasarkan data yang sudah difilter per periode
  const netCashFlow = (totalBooked + totalProfit) - totalOperasional;
  const roi = totalPembelianGabungan > 0 ? (totalProfit / totalPembelianGabungan) * 100 : 0;
  const grossProfitMargin = totalProfit - totalOperasional;
  const workingCapital = totalPembelianGabungan;
  const netBusinessValue = totalProfit + totalBooked - totalOperasional;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Nama Motor', 'Modal', 'Harga Jual', 'Keuntungan', 'Tanggal Jual', 'Cabang', 'Divisi'];
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
            <CardTitle className="text-sm font-medium">
              Total Unit
              {['this_month', 'last_month', 'this_week', 'last_week', 'today', 'yesterday'].includes(selectedPeriod) && 
                <span className="text-xs text-blue-500 block">(YTD)</span>
              }
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayTotalUnit}</div>
            <p className="text-xs text-muted-foreground">
              {['this_month', 'last_month', 'this_week', 'last_week', 'today', 'yesterday'].includes(selectedPeriod) 
                ? 'Unit terjual dari awal tahun' 
                : 'Unit terjual'
              }
            </p>
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
            <CardTitle className="text-sm font-medium">
              Total Pembelian
              {['this_month', 'last_month', 'this_week', 'last_week', 'today', 'yesterday'].includes(selectedPeriod) && 
                <span className="text-xs text-blue-500 block">(YTD)</span>
              }
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(displayTotalPembelian)}</div>
            <p className="text-xs text-muted-foreground">
              {['this_month', 'last_month', 'this_week', 'last_week', 'today', 'yesterday'].includes(selectedPeriod) 
                ? 'Modal investasi dari awal tahun' 
                : 'Modal investasi'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Booked
              {['this_month', 'last_month', 'this_week', 'last_week', 'today', 'yesterday'].includes(selectedPeriod) && 
                <span className="text-xs text-blue-500 block">(YTD)</span>
              }
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(displayTotalBooked)}</div>
            <p className="text-xs text-muted-foreground">
              {['this_month', 'last_month', 'this_week', 'last_week', 'today', 'yesterday'].includes(selectedPeriod) 
                ? 'Uang muka dari awal tahun' 
                : 'Uang muka diterima'
              }
            </p>
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
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Motor</TableHead>
                    <TableHead>Modal</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead>Keuntungan</TableHead>
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
                        <TableCell>
                          {new Date(item.tanggal_jual).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="font-medium">{item.nama_motor}</TableCell>
                        <TableCell>{formatCurrency(item.modal)}</TableCell>
                        <TableCell>{formatCurrency(item.harga_jual)}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(item.profit)}
                        </TableCell>
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