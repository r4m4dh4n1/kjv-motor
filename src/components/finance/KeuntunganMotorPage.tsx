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
  data_source?: string; // ✅ TAMBAHAN: Indikator sumber data
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

  // ✅ TAMBAHAN: Logika untuk menentukan penggunaan combined view
  const shouldUseCombined = ['last_month', 'this_year', 'last_year', 'custom'].includes(selectedPeriod);

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
      timezone: 'Asia/Jakarta (UTC+7)',
      useCombined: shouldUseCombined
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
      daysDifference: Math.ceil((endUTC.getTime() - startUTC.getTime()) / (1000 * 60 * 60 * 24)),
      useCombined: shouldUseCombined
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

  // ✅ FUNGSI BARU: Fetch dari combined views
  const fetchFromCombinedViews = async (dateRange: DateRange): Promise<PeriodFilteredData> => {
    console.log('📊 Fetching from combined views:', {
      period: selectedPeriod,
      dateRange,
      division: selectedDivision,
      cabang: selectedCabang
    });

    try {
      // 1. Query untuk data keuntungan dari penjualans_combined
      let keuntunganQuery = supabase
        .from('penjualans_combined')
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
          cabang_id,
          data_source,
          closed_month,
          closed_year
        `)
        .eq('status', 'selesai')
        .gte('tanggal', dateRange.start)
        .lte('tanggal', dateRange.end);

      if (selectedDivision !== 'all') {
        keuntunganQuery = keuntunganQuery.eq('divisi', selectedDivision);
      }

      if (selectedCabang !== 'all') {
        keuntunganQuery = keuntunganQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // 2. Query untuk total booked dari penjualans_combined
      let bookedQuery = supabase
        .from('penjualans_combined')
        .select('dp, tanggal, id, cabang_id, divisi, status, data_source')
        .neq('status', 'selesai')
        .gte('tanggal', dateRange.start)
        .lte('tanggal', dateRange.end);

      if (selectedDivision !== 'all') {
        bookedQuery = bookedQuery.eq('divisi', selectedDivision);
      }

      if (selectedCabang !== 'all') {
        bookedQuery = bookedQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // 3. Query untuk harga_beli dari penjualans_combined (status booked)
      let bookedHargaBeliQuery = supabase
        .from('penjualans_combined')
        .select('harga_beli, tanggal, id, cabang_id, divisi, status, data_source')
        .neq('status', 'selesai')
        .gte('tanggal', dateRange.start)
        .lte('tanggal', dateRange.end);

      if (selectedDivision !== 'all') {
        bookedHargaBeliQuery = bookedHargaBeliQuery.eq('divisi', selectedDivision);
      }

      if (selectedCabang !== 'all') {
        bookedHargaBeliQuery = bookedHargaBeliQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // 4. Query untuk pembelian dari pembelian_combined
      let pembelianReadyQuery = supabase
        .from('pembelian_combined')
        .select('harga_beli, harga_final, divisi, tanggal_pembelian, id, cabang_id, status, data_source')
        .eq('status', 'ready')
        .gte('tanggal_pembelian', dateRange.start)
        .lte('tanggal_pembelian', dateRange.end);

      if (selectedDivision !== 'all') {
        pembelianReadyQuery = pembelianReadyQuery.eq('divisi', selectedDivision);
      }

      if (selectedCabang !== 'all') {
        pembelianReadyQuery = pembelianReadyQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // 5. Query untuk operational (masih dari tabel aktif karena belum ada combined view)
      let operasionalQuery = supabase
        .from('operational')
        .select('nominal, tanggal, divisi, cabang_id')
        .gte('tanggal', dateRange.start)
        .lte('tanggal', dateRange.end);

      if (selectedDivision !== 'all') {
        operasionalQuery = operasionalQuery.eq('divisi', selectedDivision);
      }

      if (selectedCabang !== 'all') {
        operasionalQuery = operasionalQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // 6. Query untuk pembukuan dari pembukuan_combined
      let pencatatanAssetQuery = supabase
        .from('pembukuan_combined')
        .select('debit, kredit, tanggal, divisi, cabang_id, keterangan, data_source')
        .or('keterangan.ilike.%asset%,keterangan.ilike.%aset%,keterangan.ilike.%pengeluaran%')
        .gte('tanggal', dateRange.start)
        .lte('tanggal', dateRange.end);

      if (selectedDivision !== 'all') {
        pencatatanAssetQuery = pencatatanAssetQuery.eq('divisi', selectedDivision);
      }

      if (selectedCabang !== 'all') {
        pencatatanAssetQuery = pencatatanAssetQuery.eq('cabang_id', parseInt(selectedCabang));
      }

      // Execute all queries
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

      // Process data (tidak perlu filter tanggal lagi karena sudah di query)
      const filteredKeuntungan = keuntunganResult.data || [];
      const filteredBooked = bookedResult.data?.filter(item => item.status === 'booked') || [];
      const filteredBookedHargaBeli = bookedHargaBeliResult.data?.filter(item => item.status === 'booked') || [];
      const filteredPembelianReady = pembelianReadyResult.data || [];
      const filteredOperasional = operasionalResult.data || [];
      const filteredPencatatanAsset = pencatatanAssetResult.data?.filter(item => {
        const isAssetExpense = item.keterangan?.toLowerCase().includes('asset') || 
                              item.keterangan?.toLowerCase().includes('aset') ||
                              (item.keterangan?.toLowerCase().includes('pengeluaran') && 
                               item.keterangan?.toLowerCase().includes('asset'));
        return isAssetExpense;
      }) || [];

      // Hitung totals
      const totalBooked = filteredBooked.reduce((sum, item) => sum + (item.dp || 0), 0);
      const totalBookedHargaBeli = filteredBookedHargaBeli.reduce((sum, item) => sum + (item.harga_beli || 0), 0);
      const totalPembelianReady = filteredPembelianReady.reduce((sum, item) => sum + (item.harga_final || item.harga_beli || 0), 0);
      const totalOperasional = filteredOperasional.reduce((sum, item) => sum + (item.nominal || 0), 0);
      const totalPencatatanAsset = filteredPencatatanAsset.reduce((sum, item) => sum + (item.debit || 0), 0);

      // Transform data keuntungan untuk display
      const keuntunganData: KeuntunganData[] = filteredKeuntungan.map(item => ({
        id: item.id,
        nama_motor: `${item.brands?.name || 'Unknown'} ${item.jenis_motor?.jenis_motor || 'Unknown'} ${item.tahun || ''} ${item.warna || ''}`.trim(),
        modal: item.harga_beli || 0,
        harga_jual: item.harga_jual || 0,
        profit: item.keuntungan || 0,
        tanggal_jual: item.tanggal,
        cabang: item.cabang?.nama || 'Unknown',
        divisi: item.divisi,
        data_source: item.data_source // ✅ TAMBAHAN: Sumber data
      }));

      const totalProfitFiltered = keuntunganData.reduce((sum, item) => sum + item.profit, 0);

      console.log('📊 Combined view data results:', {
        totalBooked,
        totalBookedHargaBeli,
        totalPembelianReady,
        totalOperasional,
        totalPencatatanAsset,
        totalProfitFiltered,
        keuntunganRecords: keuntunganData.length,
        bookedRecords: filteredBooked.length,
        pembelianReadyRecords: filteredPembelianReady.length,
        operasionalRecords: filteredOperasional.length,
        pencatatanAssetRecords: filteredPencatatanAsset.length
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

    } catch (error) {
      console.error('❌ Error fetching combined view data:', error);
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

    // 6. Query untuk pencatatan asset (PERBAIKAN: hapus jenis_transaksi, gunakan keterangan)
    let pencatatanAssetQuery = supabase
      .from('pembukuan')
      .select('debit, kredit, tanggal, divisi, cabang_id, keterangan')
      .or('keterangan.ilike.%asset%,keterangan.ilike.%aset%,keterangan.ilike.%pengeluaran%');

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

    // Filter data berdasarkan periode dan cabang di frontend
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
      // Filter berdasarkan keterangan yang mengandung kata kunci asset/pengeluaran
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
    const totalPencatatanAsset = filteredPencatatanAsset.reduce((sum, item) => {
      // Untuk pengeluaran asset, gunakan debit (keluar)
      return sum + (item.debit || 0);
    }, 0);

    // Transform data keuntungan untuk display
    const keuntunganData: KeuntunganData[] = filteredKeuntungan.map(item => ({
      id: item.id,
      nama_motor: `${item.brands?.name || 'Unknown'} ${item.jenis_motor?.jenis_motor || 'Unknown'} ${item.tahun || ''} ${item.warna || ''}`.trim(),
      modal: item.harga_beli || 0,
      harga_jual: item.harga_jual || 0,
      profit: item.keuntungan || 0,
      tanggal_jual: item.tanggal,
      cabang: item.cabang?.nama || 'Unknown',
      divisi: item.divisi,
      data_source: 'active' // ✅ TAMBAHAN: Sumber data
    }));

    const totalProfitFiltered = keuntunganData.reduce((sum, item) => sum + item.profit, 0);

    console.log('🔍 Active tables data results:', {
      totalBooked,
      totalBookedHargaBeli,
      totalPembelianReady,
      totalOperasional,
      totalPencatatanAsset,
      totalProfitFiltered,
      keuntunganRecords: keuntunganData.length,
      bookedRecords: filteredBooked.length,
      pembelianReadyRecords: filteredPembelianReady.length,
      operasionalRecords: filteredOperasional.length,
      pencatatanAssetRecords: filteredPencatatanAsset.length
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
      // ✅ STRATEGI BARU: Fetch dari combined views untuk periode panjang
      return await fetchFromCombinedViews(dateRange);
    } else {
      // ✅ STRATEGI LAMA: Fetch dari tabel aktif untuk periode pendek
      return await fetchFromActiveTables(dateRange);
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

    // ✅ PERBAIKAN: Gunakan combined view jika diperlukan
    const penjualansTable = shouldUseCombined ? 'penjualans_combined' : 'penjualans';
    const pembelianTable = shouldUseCombined ? 'pembelian_combined' : 'pembelian';

    // 1. Query untuk total unit YTD (penjualan selesai) - ambil semua data
    let unitYTDQuery = supabase
      .from(penjualansTable)
      .select('id, status, tanggal, cabang_id, divisi');

    if (selectedDivision !== 'all') {
      unitYTDQuery = unitYTDQuery.eq('divisi', selectedDivision);
    }

    // 2. Query untuk total pembelian YTD (pembelian ready) - ambil semua data
    let pembelianYTDQuery = supabase
      .from(pembelianTable)
      .select('harga_beli, harga_final, tanggal_pembelian, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      pembelianYTDQuery = pembelianYTDQuery.eq('divisi', selectedDivision);
    }

    // 2b. Query untuk total pembelian YTD dari penjualans (status booked) - ambil semua data
    let penjualansBookedYTDQuery = supabase
      .from(penjualansTable)
      .select('harga_beli, tanggal, cabang_id, divisi, status');

    if (selectedDivision !== 'all') {
      penjualansBookedYTDQuery = penjualansBookedYTDQuery.eq('divisi', selectedDivision);
    }

    // 3. Query untuk total booked YTD (DP dari penjualan booked) - ambil semua data
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

    // Error handling
    if (unitYTDResult.error) throw unitYTDResult.error;
    if (pembelianYTDResult.error) throw pembelianYTDResult.error;
    if (penjualansBookedYTDResult.error) throw penjualansBookedYTDResult.error;
    if (bookedYTDResult.error) throw bookedYTDResult.error;

    // Filter data berdasarkan cabang SAJA di frontend (TANPA FILTER TANGGAL)
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
      totalPembelianFromPembelian,
      totalPembelianFromPenjualans,
      totalBookedYTD,
      unitRecords: filteredUnits.length,
      pembelianRecords: filteredPembelian.length,
      penjualansBookedRecords: filteredPenjualansBooked.length,
      bookedRecords: filteredBooked.length,
      useCombined: shouldUseCombined
    });

    return {
      totalUnitYTD,
      totalPembelianYTD,
      totalBookedYTD
    };
  };

  // Fungsi untuk mengambil data kumulatif (modal perusahaan)
  const fetchCumulativeData = async (): Promise<CumulativeData> => {
    console.log('💰 Fetching cumulative data:', {
      division: selectedDivision,
      cabang: selectedCabang
    });

    // ✅ PERBAIKAN: Gunakan combined view jika diperlukan
    const pembukuanTable = shouldUseCombined ? 'pembukuan_combined' : 'pembukuan';

    // Query untuk modal perusahaan dari pembukuan (PERBAIKAN: hapus jenis_transaksi, gunakan keterangan)
    let modalQuery = supabase
      .from(pembukuanTable)
      .select('debit, kredit, divisi, cabang_id, keterangan')
      .or('keterangan.ilike.%modal%,keterangan.ilike.%pemasukan%,keterangan.ilike.%setoran%');

    if (selectedDivision !== 'all') {
      modalQuery = modalQuery.eq('divisi', selectedDivision);
    }

    const modalResult = await modalQuery;

    if (modalResult.error) throw modalResult.error;

    // Filter berdasarkan cabang di frontend
    const filteredModal = modalResult.data?.filter(item => {
      const matchesCabang = selectedCabang === 'all' || item.cabang_id.toString() === selectedCabang;
      // Filter berdasarkan keterangan yang mengandung kata kunci modal/pemasukan
      const isModalIncome = item.keterangan?.toLowerCase().includes('modal') || 
                           item.keterangan?.toLowerCase().includes('pemasukan') ||
                           item.keterangan?.toLowerCase().includes('setoran');
      return matchesCabang && isModalIncome;
    }) || [];

    // Hitung total modal perusahaan (kredit = pemasukan)
    const totalModalPerusahaan = filteredModal.reduce((sum, item) => sum + (item.kredit || 0), 0);

    console.log('💰 Cumulative data results:', {
      totalModalPerusahaan,
      modalRecords: filteredModal.length,
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
      // Dapatkan range tanggal untuk periode yang dipilih
      const periodDateRange = getDateRange(selectedPeriod);
      
      // Dapatkan range tanggal akumulatif (semua data)
      const accumulativeDateRange = getAccumulativeDateRange(selectedPeriod);

      // Fetch semua data secara paralel
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

  // Fungsi untuk export (placeholder)
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

  // Hitung profit margin
  const profitMargin = totalModalKalkulasi > 0 ? 
    ((keuntunganData.reduce((sum, item) => sum + item.profit, 0) / totalModalKalkulasi) * 100) : 0;

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
                            {/* ✅ TAMBAHAN: Info periode yang menggunakan combined view */}
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

            {/* Custom Date Range - hanya tampil jika period = custom */}
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