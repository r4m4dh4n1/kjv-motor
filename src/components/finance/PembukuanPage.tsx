import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, TrendingUp, TrendingDown, DollarSign, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PembukuanPageProps {
  selectedDivision: string;
}

const PembukuanPage = ({ selectedDivision }: PembukuanPageProps) => {
  const [pembukuanData, setPembukuanData] = useState([]);
  const [cabangData, setCabangData] = useState([]);
  const [companiesData, setCompaniesData] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    divisi: selectedDivision !== 'all' ? selectedDivision : '',
    cabang_id: '',
    keterangan: '',
    debit: '',
    kredit: '',
    company_id: ''
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ✅ TAMBAHAN: Logika untuk menentukan penggunaan combined view
  const shouldUseCombined = ['last_month', 'this_year', 'last_year', 'custom'].includes(dateFilter);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchPembukuanData();
  }, [dateFilter, customStartDate, customEndDate, selectedDivision, selectedCompany]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      divisi: selectedDivision !== 'all' ? selectedDivision : prev.divisi
    }));
  }, [selectedDivision]);

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

  const getDateRange = () => {
    // Gunakan waktu Indonesia sebagai basis perhitungan
    const nowIndonesia = getIndonesiaDate();
    
    // Logging untuk debugging
    console.log('📅 Date range calculation (Indonesia Timezone):', {
      period: dateFilter,
      currentDateIndonesia: nowIndonesia.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      currentDateUTC: new Date().toISOString(),
      currentMonth: nowIndonesia.getMonth() + 1,
      currentYear: nowIndonesia.getFullYear(),
      timezone: 'Asia/Jakarta (UTC+7)',
      useCombined: shouldUseCombined // ✅ TAMBAHAN: Log penggunaan combined view
    });
    
    let dateRange;
    
    switch (dateFilter) {
      case "today": {
        const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 0, 0, 0));
        const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59));
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
        break;
      }
      
      case "yesterday": {
        const yesterday = new Date(nowIndonesia);
        yesterday.setDate(yesterday.getDate() - 1);
        const startUTC = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
        const endUTC = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59));
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
        break;
      }
      
      case "this_week": {
        const startOfWeek = new Date(nowIndonesia);
        startOfWeek.setDate(nowIndonesia.getDate() - nowIndonesia.getDay());
        const startUTC = new Date(Date.UTC(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 0, 0, 0));
        const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59));
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
        break;
      }
      
      case "last_week": {
        const startOfLastWeek = new Date(nowIndonesia);
        startOfLastWeek.setDate(nowIndonesia.getDate() - nowIndonesia.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        const startUTC = new Date(Date.UTC(startOfLastWeek.getFullYear(), startOfLastWeek.getMonth(), startOfLastWeek.getDate(), 0, 0, 0));
        const endUTC = new Date(Date.UTC(endOfLastWeek.getFullYear(), endOfLastWeek.getMonth(), endOfLastWeek.getDate(), 23, 59, 59));
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
        break;
      }
      
      case "this_month": {
        const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), 1, 0, 0, 0));
        const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth() + 1, 0, 23, 59, 59));
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
        break;
      }
      
      case "last_month": {
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
        }
        
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
        break;
      }
      
      case "this_year": {
        const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), 0, 1, 0, 0, 0));
        const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), 11, 31, 23, 59, 59));
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
        break;
      }
      
      case "last_year": {
        const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear() - 1, 0, 1, 0, 0, 0));
        const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear() - 1, 11, 31, 23, 59, 59));
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
        break;
      }
      
      case "custom": {
        if (customStartDate && customEndDate) {
          // Parse tanggal custom sebagai tanggal Indonesia, lalu konversi ke UTC
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
            start: startUTC.toISOString().split('T')[0], 
            end: endUTC.toISOString().split('T')[0] 
          };
        } else {
          // Fallback ke hari ini
          const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 0, 0, 0));
          const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59));
          dateRange = { 
            start: startUTC.toISOString().split('T')[0], 
            end: endUTC.toISOString().split('T')[0] 
          };
        }
        break;
      }
      
      case "all": {
        // Return a very wide range for "all"
        const veryOldDate = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));
        const futureDate = new Date(Date.UTC(nowIndonesia.getFullYear() + 1, 11, 31, 23, 59, 59));
        dateRange = { 
          start: veryOldDate.toISOString().split('T')[0], 
          end: futureDate.toISOString().split('T')[0] 
        };
        break;
      }
      
      default: {
        // Default ke hari ini
        const startUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 0, 0, 0));
        const endUTC = new Date(Date.UTC(nowIndonesia.getFullYear(), nowIndonesia.getMonth(), nowIndonesia.getDate(), 23, 59, 59));
        dateRange = { 
          start: startUTC.toISOString().split('T')[0], 
          end: endUTC.toISOString().split('T')[0] 
        };
      }
    }
    
    // Logging hasil perhitungan
    console.log(`📅 ${dateFilter.toUpperCase()} date range (Indonesia → UTC):`, {
      startUTC: dateRange.start,
      endUTC: dateRange.end,
      startIndonesia: new Date(`${dateRange.start}T00:00:00Z`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }),
      endIndonesia: new Date(`${dateRange.end}T23:59:59Z`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }),
      period: dateFilter,
      useCombined: shouldUseCombined // ✅ TAMBAHAN: Log penggunaan combined view
    });
    
    return dateRange;
  };

  const fetchInitialData = async () => {
    try {
      const [cabangResult, companiesResult] = await Promise.all([
        supabase.from('cabang').select('*').order('nama'),
        supabase.from('companies').select('*').order('nama_perusahaan')
      ]);

      if (cabangResult.error) throw cabangResult.error;
      if (companiesResult.error) throw companiesResult.error;

      setCabangData(cabangResult.data || []);
      setCompaniesData(companiesResult.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data awal",
        variant: "destructive",
      });
    }
  };

  // ✅ PERBAIKAN: Fungsi fetch dengan logika combined view
  const fetchPembukuanData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      if (!start || !end) {
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching pembukuan data:', {
        table: shouldUseCombined ? 'pembukuan_combined' : 'pembukuan',
        period: dateFilter,
        dateRange: { start, end },
        division: selectedDivision,
        company: selectedCompany
      });

      if (shouldUseCombined) {
        // ✅ STRATEGI BARU: Fetch dari kedua tabel secara terpisah untuk combined view
        const [activeResult, historyResult] = await Promise.allSettled([
          fetchPembukuanFromTable('pembukuan', start, end),
          fetchPembukuanFromTable('pembukuan_history', start, end)
        ]);

        let combinedData: any[] = [];

        // Process active data
        if (activeResult.status === 'fulfilled' && !activeResult.value.error) {
          const activeDataWithSource = (activeResult.value.data || []).map(item => ({
            ...item,
            data_source: 'active',
            closed_month: null,
            closed_year: null
          }));
          combinedData = [...combinedData, ...activeDataWithSource];
        } else if (activeResult.status === 'rejected') {
          console.warn('Failed to fetch active pembukuan data:', activeResult.reason);
        } else if (activeResult.value.error) {
          console.warn('Error in active pembukuan data:', activeResult.value.error);
        }

        // Process history data
        if (historyResult.status === 'fulfilled' && !historyResult.value.error) {
          const historyDataWithSource = (historyResult.value.data || []).map(item => ({
            ...item,
            data_source: 'history'
          }));
          combinedData = [...combinedData, ...historyDataWithSource];
        } else if (historyResult.status === 'rejected') {
          console.warn('Failed to fetch history pembukuan data:', historyResult.reason);
        } else if (historyResult.value.error) {
          console.warn('Error in history pembukuan data:', historyResult.value.error);
        }

        // Sort combined data by tanggal
        combinedData.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
        
        setPembukuanData(combinedData);
        
        console.log('✅ Combined pembukuan data loaded:', {
          activeCount: activeResult.status === 'fulfilled' ? (activeResult.value.data?.length || 0) : 0,
          historyCount: historyResult.status === 'fulfilled' ? (historyResult.value.data?.length || 0) : 0,
          totalCount: combinedData.length
        });
        
      } else {
        // ✅ Fetch hanya dari tabel pembukuan biasa
        const result = await fetchPembukuanFromTable('pembukuan', start, end);
        
        if (result.error) {
          console.error('Error fetching pembukuan data:', result.error);
          toast({
            title: "Error",
            description: "Gagal memuat data pembukuan",
            variant: "destructive",
          });
          return;
        }

        const dataWithSource = (result.data || []).map(item => ({
          ...item,
          data_source: 'active',
          closed_month: null,
          closed_year: null
        }));
        
        setPembukuanData(dataWithSource);
        
        console.log('✅ Active pembukuan data loaded:', {
          count: dataWithSource.length,
          table: 'pembukuan'
        });
      }
      
    } catch (error) {
      console.error('Error fetching pembukuan data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data pembukuan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ TAMBAHAN: Helper function untuk fetch dari tabel tertentu
  const fetchPembukuanFromTable = async (tableName: 'pembukuan' | 'pembukuan_combined' | 'pembukuan_history', start: string, end: string) => {
    try {
      let query: any;
      
      if (tableName === 'pembukuan') {
        query = supabase.from('pembukuan').select(`
          *,
          cabang:cabang_id(nama),
          companies:company_id(nama_perusahaan),
          pembelian:pembelian_id(plat_nomor)
        `);
      } else if (tableName === 'pembukuan_combined') {
        query = supabase.from('pembukuan_combined').select(`
          *,
          cabang:cabang_id(nama),
          companies:company_id(nama_perusahaan),
          pembelian:pembelian_id(plat_nomor)
        `);
      } else {
        query = supabase.from('pembukuan_history' as any).select(`
          *,
          cabang:cabang_id(nama),
          companies:company_id(nama_perusahaan),
          pembelian:pembelian_id(plat_nomor)
        `);
      }
      
      query = query
        .gte('tanggal', start)
        .lte('tanggal', end)
        .order('tanggal', { ascending: false });

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', parseInt(selectedCompany));
      }

      const { data, error } = await query;
      return { data: data as any, error };
    } catch (error) {
      return { data: null, error };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tanggal || !formData.divisi || !formData.cabang_id || !formData.keterangan) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const debitAmount = parseFloat(formData.debit) || 0;
    const kreditAmount = parseFloat(formData.kredit) || 0;

    if (debitAmount === 0 && kreditAmount === 0) {
      toast({
        title: "Error",
        description: "Minimal salah satu dari Debit atau Kredit harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      // ✅ CATATAN: Insert selalu ke tabel pembukuan aktif, bukan combined
      const { error } = await supabase
        .from('pembukuan')
        .insert([{
          tanggal: formData.tanggal,
          divisi: formData.divisi,
          cabang_id: parseInt(formData.cabang_id),
          keterangan: formData.keterangan,
          debit: debitAmount,
          kredit: kreditAmount,
          company_id: formData.company_id ? parseInt(formData.company_id) : null
        }]);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data pembukuan berhasil ditambahkan",
      });

      resetForm();
      setIsDialogOpen(false);
      fetchPembukuanData();
    } catch (error) {
      console.error('Error saving pembukuan:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data pembukuan",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      divisi: selectedDivision !== 'all' ? selectedDivision : '',
      cabang_id: '',
      keterangan: '',
      debit: '',
      kredit: '',
      company_id: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getTotalDebit = () => {
    return pembukuanData.reduce((total, item) => total + (item.debit || 0), 0);
  };

  const getTotalKredit = () => {
    return pembukuanData.reduce((total, item) => total + (item.kredit || 0), 0);
  };

  const getBalance = () => {
    return getTotalDebit() - getTotalKredit();
  };

  const getBalanceStatus = () => {
    const balance = getBalance();
    return {
      amount: Math.abs(balance),
      status: balance >= 0 ? 'surplus' : 'defisit',
      color: balance >= 0 ? 'text-green-600' : 'text-red-600'
    };
  };

  const filteredCompanies = companiesData.filter(company => 
    formData.divisi ? company.divisi.toLowerCase() === formData.divisi.toLowerCase() : true
  );

  // Fungsi untuk filter perusahaan berdasarkan divisi yang dipilih di sidebar
  const getFilteredCompanies = () => {
    if (selectedDivision === 'all') {
      return companiesData;
    }
    return companiesData.filter(company => 
      company.divisi && company.divisi.toLowerCase() === selectedDivision.toLowerCase()
    );
  };

  const handlePrint = () => {
    const { start, end } = getDateRange();
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Pembukuan</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .summary { margin-top: 20px; }
            .summary-item { display: inline-block; margin-right: 30px; }
            .divisi-sport { background-color: #dbeafe; color: #1e40af; }
            .divisi-start { background-color: #dcfce7; color: #166534; }
            .data-source { font-size: 10px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LAPORAN PEMBUKUAN</h1>
            <p>Periode: ${formatDate(start)} - ${formatDate(end)}</p>
            ${selectedDivision !== 'all' ? `<p>Divisi: ${selectedDivision.toUpperCase()}</p>` : ''}
            ${selectedCompany !== 'all' ? `<p>Perusahaan: ${getFilteredCompanies().find(c => c.id.toString() === selectedCompany)?.nama_perusahaan || ''}</p>` : ''}
            ${shouldUseCombined ? '<p class="data-source">📊 Data: Active + History (Combined View)</p>' : '<p class="data-source">📊 Data: Active Only</p>'}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Divisi</th>
                <th>Cabang</th>
                <th>Keterangan</th>
                <th>Debit</th>
                <th>Kredit</th>
                <th>Company</th>
                ${shouldUseCombined ? '<th>Source</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${pembukuanData.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${formatDate(item.tanggal)}</td>
                  <td><span class="${item.divisi === 'sport' ? 'divisi-sport' : 'divisi-start'}">${item.divisi}</span></td>
                  <td>${item.cabang?.nama || '-'}</td>
                  <td>${item.keterangan}</td>
                  <td class="text-right">${item.debit ? formatCurrency(item.debit) : '-'}</td>
                  <td class="text-right">${item.kredit ? formatCurrency(item.kredit) : '-'}</td>
                  <td>${item.companies?.nama_perusahaan || '-'}</td>
                  ${shouldUseCombined ? `<td class="data-source">${item.data_source === 'history' ? '📚 History' : '🔄 Active'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-item">
              <strong>Total Debit: ${formatCurrency(getTotalDebit())}</strong>
            </div>
            <div class="summary-item">
              <strong>Total Kredit: ${formatCurrency(getTotalKredit())}</strong>
            </div>
            <div class="summary-item">
              <strong>Saldo: ${formatCurrency(getBalance())}</strong>
            </div>
            <div class="summary-item">
              <strong>Total Transaksi: ${pembukuanData.length}</strong>
            </div>
          </div>
          
          <div style="margin-top: 40px; text-align: right;">
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-green-600" />
            Transaksi dan Mutasi Keuangan
            {/* ✅ TAMBAHAN: Indikator combined view */}
            {shouldUseCombined && (
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                📊 Combined View
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola catatan keuangan dan transaksi
            {shouldUseCombined && " (termasuk data history)"}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handlePrint} 
            variant="outline" 
            className="border-green-600 text-green-600 hover:bg-green-50"
            disabled={loading || pembukuanData.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Laporan
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Transaksi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Transaksi Pembukuan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="tanggal">Tanggal *</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="divisi">Divisi *</Label>
                  {selectedDivision === "all" ? (
                    <Select value={formData.divisi} onValueChange={(value) => setFormData({...formData, divisi: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih divisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sport">Sport</SelectItem>
                        <SelectItem value="start">Start</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.divisi === 'sport' ? 'Sport' : 'Start'}
                      readOnly
                      className="mt-1 bg-gray-100"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="cabang_id">Cabang *</Label>
                  <Select value={formData.cabang_id} onValueChange={(value) => setFormData({...formData, cabang_id: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {cabangData.map((cabang) => (
                        <SelectItem key={cabang.id} value={cabang.id.toString()}>
                          {cabang.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="company_id">Company (Opsional)</Label>
                  <Select value={formData.company_id} onValueChange={(value) => setFormData({...formData, company_id: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tidak Ada</SelectItem>
                      {filteredCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.nama_perusahaan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="debit">Debit (Rp)</Label>
                    <Input
                      id="debit"
                      type="number"
                      value={formData.debit}
                      onChange={(e) => setFormData({...formData, debit: e.target.value})}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="kredit">Kredit (Rp)</Label>
                    <Input
                      id="kredit"
                      type="number"
                      value={formData.kredit}
                      onChange={(e) => setFormData({...formData, kredit: e.target.value})}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="keterangan">Keterangan *</Label>
                  <Textarea
                    id="keterangan"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                    placeholder="Masukkan keterangan transaksi"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Simpan
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Filter Data
            {/* ✅ TAMBAHAN: Indikator tabel yang digunakan */}
            <span className={`text-xs px-2 py-1 rounded-full ${
              shouldUseCombined 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {shouldUseCombined ? '📊 pembukuan_combined' : '🔄 pembukuan'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dateFilter">Periode</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 Semua periode</SelectItem>
                  <SelectItem value="today">📅 Today</SelectItem>
                  <SelectItem value="yesterday">📅 Yesterday</SelectItem>
                  <SelectItem value="this_week">📅 This Week</SelectItem>
                  <SelectItem value="last_week">📅 Last Week</SelectItem>
                  <SelectItem value="this_month">📅 This Month</SelectItem>
                  <SelectItem value="last_month">📊 Last Month</SelectItem>
                  <SelectItem value="this_year">📊 This Year</SelectItem>
                  <SelectItem value="last_year">📊 Last Year</SelectItem>
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
            
            <div>
              <Label htmlFor="selectedCompany">Perusahaan</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Perusahaan</SelectItem>
                  {getFilteredCompanies().map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.nama_perusahaan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={fetchPembukuanData} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Filter"}
              </Button>
            </div>
          </div>
          
          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards - Menghapus card saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pemasukan</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalKredit())}
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
                <p className="text-sm font-medium text-gray-600">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalDebit())}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pembukuanData.length}
                </p>
                {shouldUseCombined && (
                  <p className="text-xs text-gray-500 mt-1">
                    📊 Active + History
                  </p>
                )}
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Data Pembukuan
            {/* ✅ TAMBAHAN: Badge untuk menunjukkan sumber data */}
            {shouldUseCombined && (
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                📊 Combined View
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Kredit</TableHead>
                  <TableHead>Company</TableHead>
                  {/* ✅ TAMBAHAN: Kolom source untuk combined view */}
                  {shouldUseCombined && <TableHead>Source</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pembukuanData.map((item, index) => (
                  <TableRow key={`${item.data_source}-${item.id}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(item.tanggal)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.divisi === 'sport' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.divisi}
                      </span>
                    </TableCell>
                    <TableCell>{item.cabang?.nama}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.keterangan}</TableCell>
                    <TableCell className="text-red-600 font-semibold">
                      {item.debit ? formatCurrency(item.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {item.kredit ? formatCurrency(item.kredit) : '-'}
                    </TableCell>
                    <TableCell>{item.companies?.nama_perusahaan || '-'}</TableCell>
                    {shouldUseCombined && (
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.data_source === 'history' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.data_source === 'history' ? '📚 History' : '🔄 Active'}
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                
                {/* Row Total di bagian bawah tabel */}
                {pembukuanData.length > 0 && (
                  <TableRow className="bg-gray-50 border-t-2 border-gray-300">
                    <TableCell colSpan={5} className="font-bold text-gray-700 text-right">
                      TOTAL:
                    </TableCell>
                    <TableCell className="text-red-600 font-bold text-lg">
                      {formatCurrency(getTotalDebit())}
                    </TableCell>
                    <TableCell className="text-green-600 font-bold text-lg">
                      {formatCurrency(getTotalKredit())}
                    </TableCell>
                    <TableCell></TableCell>
                    {shouldUseCombined && <TableCell></TableCell>}
                  </TableRow>
                )}
                
                {pembukuanData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={shouldUseCombined ? 9 : 8} className="text-center py-8 text-gray-500">
                      Tidak ada data pembukuan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          
          {/* Info periode - Menghapus summary cards di bawah tabel */}
          {!loading && pembukuanData.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 text-center">
                📅 Data berdasarkan periode: <span className="font-medium">
                  {dateFilter === 'today' && 'Hari Ini'}
                  {dateFilter === 'yesterday' && 'Kemarin'}
                  {dateFilter === 'this_week' && 'Minggu Ini'}
                  {dateFilter === 'last_week' && 'Minggu Lalu'}
                  {dateFilter === 'this_month' && 'Bulan Ini'}
                  {dateFilter === 'last_month' && 'Bulan Lalu'}
                  {dateFilter === 'this_year' && 'Tahun Ini'}
                  {dateFilter === 'last_year' && 'Tahun Lalu'}
                  {dateFilter === 'custom' && `${customStartDate} s/d ${customEndDate}`}
                </span>
                {shouldUseCombined && (
                  <span className="ml-2 text-blue-600 font-medium">• Combined View (Active + History)</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PembukuanPage;