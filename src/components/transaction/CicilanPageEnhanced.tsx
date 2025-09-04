import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, CheckCircle, Clock, AlertCircle, Search, Filter, RotateCcw, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNumber, parseFormattedNumber } from "@/utils/formatUtils";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CicilanHistoryTable from "./CicilanHistoryTable";
import EditCicilanDialog from "./EditCicilanDialog";
import { handleCurrencyInput, parseCurrency } from '@/utils/formatUtils';

interface CicilanPageEnhancedProps {
  selectedDivision: string;
}

const CicilanPageEnhanced = ({ selectedDivision }: CicilanPageEnhancedProps) => {
  // State untuk data
  const [cicilanData, setCicilanData] = useState([]);
  const [penjualanData, setPenjualanData] = useState([]);
  const [companiesData, setCompaniesData] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPenjualan, setSelectedPenjualan] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCicilan, setSelectedCicilan] = useState(null);
  const [overpaymentConfirmed, setOverpaymentConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    penjualan_id: '',
    tanggal_bayar: new Date().toISOString().split('T')[0],
    jumlah_bayar: '',
    keterangan: '',
    jenis_pembayaran: 'cash',
    tujuan_pembayaran_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // State untuk filter yang ditingkatkan
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCabang, setSelectedCabang] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedJenisPembayaran, setSelectedJenisPembayaran] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [cabangOptions, setCabangOptions] = useState([]);

  useEffect(() => {
    fetchData();
  }, [selectedDivision]);

  const fetchData = async () => {
    setLoading(true);

    try {
      await Promise.all([
        fetchCicilanData(),
        fetchPenjualanData(),
        fetchCompaniesData(),
        fetchCabangOptions()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const fetchCabangOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('cabang')
        .select('id, nama')
        .order('nama');
      
      if (error) throw error;
      setCabangOptions(data || []);
    } catch (error) {
      console.error('Error fetching cabang options:', error);
    }
  };

  const fetchCompaniesData = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('status', 'active')
      .order('nama_perusahaan');

    if (error) throw error;
    setCompaniesData(data || []);
  };

  const fetchCicilanData = async () => {
    let query = supabase
      .from('cicilan')
      .select(`
        *,
        penjualans:penjualan_id(
          plat,
          harga_jual,
          sisa_bayar,
          tt,
          jenis_pembayaran,
          divisi,
          cabang_id,
          pembelian_id,
          company_id,
          cabang:cabang_id(nama),
          brands:brand_id(name),
          jenis_motor:jenis_id(jenis_motor)
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    setCicilanData(data || []);
  };

  const fetchPenjualanData = async () => {
    let query = supabase
      .from('penjualans')
      .select(`
        *,
        brands:brand_id(name),
        jenis_motor:jenis_id(jenis_motor)
      `)
      .in('jenis_pembayaran', ['cash_bertahap', 'kredit'])
      .gt('sisa_bayar', 0)
      .order('created_at', { ascending: false });

    if (selectedDivision !== 'all') {
      query = query.eq('divisi', selectedDivision);
    }

    const { data, error } = await query;
    if (error) throw error;

    setPenjualanData(data || []);
  };

  // Fungsi filter yang ditingkatkan
  const getFilteredData = () => {
    let filtered = [...cicilanData];

    // Filter divisi
    if (selectedDivision !== 'all') {
      filtered = filtered.filter(item => 
        item.penjualans?.divisi === selectedDivision
      );
    }

    // Filter pencarian
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const plat = item.penjualans?.plat?.toLowerCase() || '';
        const brand = item.penjualans?.brands?.name?.toLowerCase() || '';
        const jenisMotor = item.penjualans?.jenis_motor?.jenis_motor?.toLowerCase() || '';
        const keterangan = item.keterangan?.toLowerCase() || '';
        
        return plat.includes(search) || 
               brand.includes(search) || 
               jenisMotor.includes(search) || 
               keterangan.includes(search);
      });
    }

    // Filter cabang
    if (selectedCabang !== 'all') {
      filtered = filtered.filter(item => 
        item.penjualans?.cabang_id?.toString() === selectedCabang
      );
    }

    // Filter status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    // Filter jenis pembayaran
    if (selectedJenisPembayaran !== 'all') {
      filtered = filtered.filter(item => item.jenis_pembayaran === selectedJenisPembayaran);
    }

    // Filter tanggal
    if (dateFilter !== 'all') {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      filtered = filtered.filter(item => {
        const itemDate = new Date(item.tanggal_bayar);
        
        switch (dateFilter) {
          case 'today':
            return itemDate >= startOfToday && itemDate <= endOfToday;
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
            const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);
            return itemDate >= startOfTomorrow && itemDate <= endOfTomorrow;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
            const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
            return itemDate >= startOfYesterday && itemDate <= endOfYesterday;
          case 'this_week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);
            return itemDate >= startOfWeek && itemDate <= endOfWeek;
          case 'last_week':
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
            lastWeekStart.setHours(0, 0, 0, 0);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            lastWeekEnd.setHours(23, 59, 59, 999);
            return itemDate >= lastWeekStart && itemDate <= lastWeekEnd;
          case 'this_month':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            return itemDate >= startOfMonth && itemDate <= endOfMonth;
          case 'last_month':
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
            return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
          case 'this_year':
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
            return itemDate >= startOfYear && itemDate <= endOfYear;
          case 'last_year':
            const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
            const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            return itemDate >= lastYearStart && itemDate <= lastYearEnd;
          case 'custom':
            if (customStartDate && customEndDate) {
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999);
              return itemDate >= start && itemDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  // Perhitungan paginasi
  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Perhitungan statistik berdasarkan data yang terfilter
  const getTotalCicilan = () => {
    return filteredData.reduce((total, item) => total + item.jumlah_bayar, 0);
  };

  const getPendingCount = () => {
    return filteredData.filter(item => item.status === 'pending').length;
  };

  const getCompletedCount = () => {
    return filteredData.filter(item => item.status === 'completed').length;
  };

  const getCicilanHariIni = () => {
    const today = new Date().toISOString().split('T')[0];
    return filteredData
      .filter(item => item.tanggal_bayar === today)
      .reduce((total, item) => total + item.jumlah_bayar, 0);
  };

  // Fungsi reset filter
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCabang('all');
    setSelectedStatus('all');
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedJenisPembayaran('all');
    setCurrentPage(1);
  };

  // Helper function untuk filter companies berdasarkan penjualan
  const getCompaniesForPenjualan = () => {
    if (!selectedPenjualan) return [];
    
    return companiesData.filter(company => 
      company.divisi === selectedPenjualan.divisi
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    if (!formData.penjualan_id || !formData.tanggal_bayar || !formData.jumlah_bayar) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive",
      });
      return;
    }

    // Validasi tujuan pembayaran wajib diisi
    if (!formData.tujuan_pembayaran_id) {
      toast({
        title: "Error",
        description: "Tujuan pembayaran (perusahaan) wajib dipilih",
        variant: "destructive",
      });
      return;
    }

    const jumlahBayar = parseCurrency(formData.jumlah_bayar);
  
    if (isNaN(jumlahBayar) || jumlahBayar <= 0) {
      toast({
        title: "Error",
        description: "Jumlah bayar harus berupa angka yang valid",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPenjualan) {
      toast({
        title: "Error",
        description: "Data penjualan tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    // Konfirmasi overpayment jika pembayaran melebihi sisa bayar
    if (jumlahBayar > selectedPenjualan.sisa_bayar && !overpaymentConfirmed) {
      const overpayment = jumlahBayar - selectedPenjualan.sisa_bayar;
      const confirmed = window.confirm(
        `Pembayaran melebihi sisa bayar sebesar ${formatCurrency(overpayment)}.\n\nApakah Anda yakin ingin melanjutkan?`
      );
      
      if (!confirmed) {
        return;
      }
      setOverpaymentConfirmed(true);
    }

    try {
      // Get the latest batch number for this penjualan
      const { data: existingCicilan, error: fetchError } = await supabase
        .from('cicilan')
        .select('batch_ke')
        .eq('penjualan_id', parseInt(formData.penjualan_id))
        .order('batch_ke', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextBatch = existingCicilan.length > 0 ? existingCicilan[0].batch_ke + 1 : 1;
      const sisaBayarBaru = selectedPenjualan.sisa_bayar - jumlahBayar;
      
      // Pastikan sisa bayar tidak negatif untuk tampilan di tabel penjualan
      const sisaBayarDisplay = Math.max(0, sisaBayarBaru);

      // Insert cicilan record
      const { error: insertError } = await supabase
        .from('cicilan')
        .insert([{
          penjualan_id: parseInt(formData.penjualan_id),
          batch_ke: nextBatch,
          tanggal_bayar: formData.tanggal_bayar,
          jumlah_bayar: jumlahBayar,
          sisa_bayar: sisaBayarBaru, // Bisa negatif jika overpayment
          keterangan: formData.keterangan,
          jenis_pembayaran: formData.jenis_pembayaran,
          tujuan_pembayaran_id: formData.tujuan_pembayaran_id ? parseInt(formData.tujuan_pembayaran_id) : null,
          status: sisaBayarBaru <= 0 ? 'completed' : 'pending'
        }]);

      if (insertError) throw insertError;

      // Update sisa_bayar in penjualans table
      const { error: updateError } = await supabase
        .from('penjualans')
        .update({ 
          sisa_bayar: sisaBayarDisplay,
          status: sisaBayarBaru <= 0 ? 'selesai' : 'booked',
          ...(sisaBayarBaru <= 0 && { tanggal_lunas: formData.tanggal_bayar })
        })
        .eq('id', parseInt(formData.penjualan_id));

      if (updateError) throw updateError;

      // Insert pembukuan entry for cicilan payment - PERBAIKAN: gunakan tujuan_pembayaran_id
      const brandName = selectedPenjualan.brands?.name || '';
      const jenisMotor = selectedPenjualan.jenis_motor?.jenis_motor || '';
      const platNomor = selectedPenjualan.plat;
      
      let keterangan = '';
      if (selectedPenjualan.tt !== 'tukar_tambah') {
        if (selectedPenjualan.jenis_pembayaran === 'cash_bertahap') {
          keterangan = `cash bertahap ke ${nextBatch} dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        } else if (selectedPenjualan.jenis_pembayaran === 'kredit') {
          keterangan = `cicilan ke ${nextBatch} dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        }
      } else {
        if (selectedPenjualan.jenis_pembayaran === 'cash_bertahap') {
          keterangan = `cash bertahap ke ${nextBatch} Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        } else if (selectedPenjualan.jenis_pembayaran === 'kredit') {
          keterangan = `cicilan ke ${nextBatch} Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        }
      }
      
      const pembukuanEntry = {
        tanggal: formData.tanggal_bayar,
        divisi: selectedPenjualan.divisi,
        cabang_id: selectedPenjualan.cabang_id,
        keterangan: keterangan,
        debit: 0,
        kredit: jumlahBayar,
        saldo: 0,
        pembelian_id: selectedPenjualan.pembelian_id,
        company_id: parseInt(formData.tujuan_pembayaran_id) // PERBAIKAN: gunakan tujuan_pembayaran_id
      };

      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert([pembukuanEntry]);

      if (pembukuanError) {
        console.error('Pembukuan Error:', pembukuanError);
        toast({
          title: "Warning",
          description: `Cicilan tersimpan tapi pembukuan gagal: ${pembukuanError.message}`,
          variant: "destructive"
        });
      }

      // PERBAIKAN: Update modal perusahaan tujuan
      const { error: modalError } = await supabase
        .rpc('update_company_modal', {
          company_id: parseInt(formData.tujuan_pembayaran_id),
          amount: jumlahBayar
        });

      if (modalError) {
        console.error('Modal Update Error:', modalError);
        toast({
          title: "Warning",
          description: `Cicilan tersimpan tapi update modal perusahaan gagal: ${modalError.message}`,
          variant: "destructive"
        });
      }

      // Pesan sukses yang menangani overpayment
      let successMessage = 'Pembayaran cicilan berhasil dicatat.';
      if (sisaBayarBaru <= 0) {
        if (sisaBayarBaru < 0) {
          const overpayment = Math.abs(sisaBayarBaru);
          successMessage += ` Pembayaran telah lunas dengan kelebihan bayar ${formatCurrency(overpayment)}!`;
        } else {
          successMessage += ' Pembayaran telah lunas!';
        }
      }

      toast({
        title: "Berhasil",
        description: successMessage,
      });

      resetForm();
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving cicilan:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data cicilan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };

  // Fungsi untuk menghapus cicilan
  const handleDelete = async (cicilan: any) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus cicilan batch ke-${cicilan.batch_ke} untuk motor ${cicilan.penjualans?.plat}?\n\nTindakan ini akan:\n- Menghapus data cicilan\n- Menghapus pembukuan terkait\n- Mengubah status penjualan kembali ke 'Booked'\n- Mengembalikan sisa bayar`
    );

    if (!confirmed) return;

    try {
      // 1. Hapus pembukuan terkait cicilan ini
      const brandName = cicilan.penjualans?.brands?.name || '';
      const jenisMotor = cicilan.penjualans?.jenis_motor?.jenis_motor || '';
      const platNomor = cicilan.penjualans?.plat;
      
      let keteranganPembukuan = '';
      if (cicilan.penjualans?.tt !== 'tukar_tambah') {
        if (cicilan.penjualans?.jenis_pembayaran === 'cash_bertahap') {
          keteranganPembukuan = `cash bertahap ke ${cicilan.batch_ke} dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        } else if (cicilan.penjualans?.jenis_pembayaran === 'kredit') {
          keteranganPembukuan = `cicilan ke ${cicilan.batch_ke} dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        }
      } else {
        if (cicilan.penjualans?.jenis_pembayaran === 'cash_bertahap') {
          keteranganPembukuan = `cash bertahap ke ${cicilan.batch_ke} Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        } else if (cicilan.penjualans?.jenis_pembayaran === 'kredit') {
          keteranganPembukuan = `cicilan ke ${cicilan.batch_ke} Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        }
      }

      // Hapus pembukuan berdasarkan keterangan dan tanggal
      const { error: pembukuanDeleteError } = await supabase
        .from('pembukuan')
        .delete()
        .eq('tanggal', cicilan.tanggal_bayar)
        .eq('keterangan', keteranganPembukuan)
        .eq('kredit', cicilan.jumlah_bayar);

      if (pembukuanDeleteError) {
        console.error('Error deleting pembukuan:', pembukuanDeleteError);
        toast({
          title: "Warning",
          description: `Gagal menghapus pembukuan: ${pembukuanDeleteError.message}`,
          variant: "destructive"
        });
      }

      // PERBAIKAN: Kurangi modal perusahaan jika ada tujuan_pembayaran_id
      if (cicilan.tujuan_pembayaran_id) {
        const { error: modalError } = await supabase
          .rpc('update_company_modal', {
            company_id: cicilan.tujuan_pembayaran_id,
            amount: -cicilan.jumlah_bayar // Negatif untuk mengurangi modal
          });

        if (modalError) {
          console.error('Error updating company modal:', modalError);
          toast({
            title: "Warning",
            description: `Gagal mengurangi modal perusahaan: ${modalError.message}`,
            variant: "destructive"
          });
        }
      }

      // 2. Hitung ulang sisa bayar setelah menghapus cicilan ini
      const sisaBayarBaru = cicilan.sisa_bayar + cicilan.jumlah_bayar;
      
      // 3. Update status penjualan kembali ke 'booked' dan kembalikan sisa bayar
      const { error: updatePenjualanError } = await supabase
        .from('penjualans')
        .update({ 
          sisa_bayar: sisaBayarBaru,
          status: 'Booked' // Kembalikan status ke booked
        })
        .eq('id', cicilan.penjualan_id);

      if (updatePenjualanError) throw updatePenjualanError;

      // 4. Hapus data cicilan
      const { error: deleteCicilanError } = await supabase
        .from('cicilan')
        .delete()
        .eq('id', cicilan.id);

      if (deleteCicilanError) throw deleteCicilanError;

      // 5. Update batch_ke untuk cicilan yang batch-nya lebih tinggi
      const { data: higherBatches } = await supabase
        .from('cicilan')
        .select('id, batch_ke')
        .eq('penjualan_id', cicilan.penjualan_id)
        .gt('batch_ke', cicilan.batch_ke);

      if (higherBatches && higherBatches.length > 0) {
        for (const batch of higherBatches) {
          await supabase
            .from('cicilan')
            .update({ batch_ke: batch.batch_ke - 1 })
            .eq('id', batch.id);
        }
      }

      toast({
        title: "Berhasil",
        description: "Cicilan berhasil dihapus dan status penjualan dikembalikan ke 'booked'",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting cicilan:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus cicilan",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      penjualan_id: '',
      tanggal_bayar: new Date().toISOString().split('T')[0],
      jumlah_bayar: '',
      keterangan: '',
      jenis_pembayaran: 'cash',
      tujuan_pembayaran_id: ''
    });
    setSelectedPenjualan(null);
    setOverpaymentConfirmed(false);
  };

  const handlePenjualanSelect = (penjualanId: string) => {
    const penjualan = penjualanData.find(p => p.id.toString() === penjualanId);
    setSelectedPenjualan(penjualan);
    setFormData(prev => ({ 
      ...prev, 
      penjualan_id: penjualanId,
      tujuan_pembayaran_id: penjualan?.company_id?.toString() || ''
    }));
    setOverpaymentConfirmed(false);
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Selesai" },
      overdue: { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "Terlambat" }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            Manajemen Cash Bertahap
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola pembayaran kredit dan cash bertahap
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pembayaran
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Pembayaran Cicilan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="penjualan">Pilih Penjualan *</Label>
                  <Select value={formData.penjualan_id} onValueChange={handlePenjualanSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih penjualan" />
                    </SelectTrigger>
                    <SelectContent>
                      {penjualanData.map((penjualan) => (
                        <SelectItem key={penjualan.id} value={penjualan.id.toString()}>
                          {penjualan.brands?.name} {penjualan.jenis_motor?.jenis_motor} - {penjualan.plat} 
                          (Sisa: {formatCurrency(penjualan.sisa_bayar)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPenjualan && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Sisa Bayar:</strong> {formatCurrency(selectedPenjualan.sisa_bayar)}
                      </p>
                      <p className="text-sm text-blue-600">
                        <strong>Harga Jual:</strong> {formatCurrency(selectedPenjualan.harga_jual)}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="tanggal_bayar">Tanggal Bayar *</Label>
                  <Input
                    id="tanggal_bayar"
                    type="date"
                    value={formData.tanggal_bayar}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal_bayar: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="jumlah_bayar">Jumlah Bayar *</Label>
                  <Input
                    id="jumlah_bayar"
                    type="text"
                    placeholder="Masukkan jumlah bayar"
                    value={formData.jumlah_bayar}
                    onChange={(e) => {
                      const formattedValue = handleCurrencyInput(e.target.value);
                      setFormData(prev => ({ ...prev, jumlah_bayar: formattedValue }));
                    }}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="jenis_pembayaran">Jenis Pembayaran</Label>
                  <Select value={formData.jenis_pembayaran} onValueChange={(value) => setFormData(prev => ({ ...prev, jenis_pembayaran: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="tujuan_pembayaran">Tujuan Pembayaran (Perusahaan) *</Label>
                  <Select value={formData.tujuan_pembayaran_id} onValueChange={(value) => setFormData(prev => ({ ...prev, tujuan_pembayaran_id: value }))} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih perusahaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {getCompaniesForPenjualan().map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.nama_perusahaan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="keterangan">Keterangan</Label>
                  <Textarea
                    id="keterangan"
                    placeholder="Masukkan keterangan (opsional)"
                    value={formData.keterangan}
                    onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Pembayaran"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Data Aktif</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">
          {/* Filter yang Ditingkatkan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter & Pencarian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Baris pertama filter */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Pencarian</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="search"
                      placeholder="Cari plat, brand, jenis motor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="cabang-filter">Cabang</Label>
                  <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Cabang</SelectItem>
                      {cabangOptions.map((cabang) => (
                        <SelectItem key={cabang.id} value={cabang.id.toString()}>
                          {cabang.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                      <SelectItem value="overdue">Terlambat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="jenis-pembayaran-filter">Jenis Pembayaran</Label>
                  <Select value={selectedJenisPembayaran} onValueChange={setSelectedJenisPembayaran}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Jenis</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Baris kedua filter - Periode Tanggal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="date-filter">Periode Tanggal</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Tanggal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tanggal</SelectItem>
                      <SelectItem value="today">Hari Ini</SelectItem>
                      <SelectItem value="yesterday">Kemarin</SelectItem>
                      <SelectItem value="tomorrow">Besok</SelectItem>
                      <SelectItem value="this_week">Minggu Ini</SelectItem>
                      <SelectItem value="last_week">Minggu Lalu</SelectItem>
                      <SelectItem value="this_month">Bulan Ini</SelectItem>
                      <SelectItem value="last_month">Bulan Lalu</SelectItem>
                      <SelectItem value="this_year">Tahun Ini</SelectItem>
                      <SelectItem value="last_year">Tahun Lalu</SelectItem>
                      <SelectItem value="custom">Kustom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Tanggal Mulai</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Tanggal Akhir</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Tombol Reset dan Info */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Filter
                </Button>
                <div className="text-sm text-gray-600">
                  Menampilkan {filteredData.length} dari {cicilanData.length} data
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kartu Ringkasan yang Ditingkatkan */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Cicilan</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(getTotalCicilan())}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Dari {filteredData.length} transaksi
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cicilan Hari Ini</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(getCicilanHariIni())}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pembayaran Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {getPendingCount()}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pembayaran Selesai</p>
                    <p className="text-2xl font-bold text-green-600">
                      {getCompletedCount()}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabel Data dengan Paginasi */}
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pembayaran Cicilan</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Motor</TableHead>
                        <TableHead>Plat</TableHead>
                        <TableHead>Cabang</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Jumlah Bayar</TableHead>
                        <TableHead>Sisa Bayar</TableHead>
                        <TableHead>Jenis Bayar</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{startIndex + index + 1}</TableCell>
                          <TableCell>{formatDate(item.tanggal_bayar)}</TableCell>
                          <TableCell>
                            {item.penjualans?.brands?.name} {item.penjualans?.jenis_motor?.jenis_motor}
                          </TableCell>
                          <TableCell>{item.penjualans?.plat}</TableCell>
                          <TableCell>{item.penjualans?.cabang?.nama || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">#{item.batch_ke}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(item.jumlah_bayar)}
                          </TableCell>
                          <TableCell className={`font-semibold ${
                            item.sisa_bayar < 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {item.sisa_bayar < 0 ? 
                              `+${formatCurrency(Math.abs(item.sisa_bayar))}` : 
                              formatCurrency(item.sisa_bayar)
                            }
                          </TableCell>
                          <TableCell className="capitalize">{item.jenis_pembayaran}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.keterangan || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCicilan(item);
                                  setEditDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(item)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {paginatedData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                            {filteredData.length === 0 ? 'Tidak ada data yang sesuai dengan filter' : 'Tidak ada data cicilan'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Kontrol Paginasi */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} dari {filteredData.length} data
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Sebelumnya
                        </Button>
                        
                        <span className="text-sm text-gray-600">
                          Halaman {currentPage} dari {totalPages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Selanjutnya
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Kontrol Items per Page */}
                  <div className="flex items-center justify-end mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="items-per-page" className="text-sm">Items per halaman:</Label>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>History Cicilan</CardTitle>
              <p className="text-sm text-muted-foreground">
                Data cicilan yang sudah ditutup dalam proses close month
              </p>
            </CardHeader>
            <CardContent>
              <CicilanHistoryTable selectedDivision={selectedDivision} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditCicilanDialog
        cicilan={selectedCicilan}
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedCicilan(null);
        }}
        onSuccess={() => {
          fetchData();
          setEditDialogOpen(false);
          setSelectedCicilan(null);
        }}
        companiesData={companiesData}
      />
    </div>
  );
};

export default CicilanPageEnhanced;