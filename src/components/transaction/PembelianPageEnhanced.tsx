import React, { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, addDays } from "date-fns";
import { Search, Filter, ShoppingCart, CheckCircle, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HistoryTab from "./HistoryTab";
import PembelianForm from "./PembelianForm";
import PembelianTable from "./PembelianTable";
import PriceHistoryModal from "./PriceHistoryModal";
import { Pembelian, PembelianPageProps } from "./types";
import { formatCurrency } from "@/utils/formatUtils";
import { usePagination } from "@/hooks/usePagination";

import { 
  usePembelianData,
  useCabangData,
  useBrandsData,
  useJenisMotorData,
  useCompaniesData
} from "./hooks/usePembelianData";
import { usePenjualanData } from "./hooks/usePenjualanData";
import {
  usePembelianCreate,
  usePembelianUpdate,
  usePembelianDelete
} from "./hooks/usePembelianMutations";
import {
  createInitialFormData,
  validateFormData,
  transformFormDataForSubmit,
  transformPembelianToFormData
} from "./utils/formUtils";
import { supabase } from "@/integrations/supabase/client";

const PembelianPageEnhanced = ({ selectedDivision }: PembelianPageProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateHargaDialogOpen, setIsUpdateHargaDialogOpen] = useState(false);
  const [isQCDialogOpen, setIsQCDialogOpen] = useState(false);
  const [isQcHistoryDialogOpen, setIsQcHistoryDialogOpen] = useState(false);
  const [isPriceHistoryDialogOpen, setIsPriceHistoryDialogOpen] = useState(false);
  const [editingPembelian, setEditingPembelian] = useState<Pembelian | null>(null);
  const [viewingPembelian, setViewingPembelian] = useState<Pembelian | null>(null);
  const [updatingHargaPembelian, setUpdatingHargaPembelian] = useState<Pembelian | null>(null);
  const [qcPembelian, setQCPembelian] = useState<Pembelian | null>(null);
  const [formData, setFormData] = useState(createInitialFormData(selectedDivision));
  const [qcHistory, setQcHistory] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCabang, setSelectedCabang] = useState("all");
  const [selectedJenisPembelian, setSelectedJenisPembelian] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("ready");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  
  const { toast } = useToast();
  
  // Pagination
  const [pageSize, setPageSize] = useState(10);

  // State untuk form QC yang lengkap
  const [qcForm, setQcForm] = useState({
    tanggal_qc: new Date().toISOString().split('T')[0],
    jenis_qc: "",
    total_pengeluaran: "",
    keterangan: ""
  });

  // State untuk form update harga yang lengkap dengan tanggal_update
  const [updateHargaForm, setUpdateHargaForm] = useState({
    harga_beli_dasar: "",
    biaya_pajak: "",
    biaya_qc: "",
    biaya_lain_lain: "",
    keterangan_biaya_lain: "",
    company_id: "",
    reason: "",
    tanggal_update: new Date().toISOString().split('T')[0] // Tambahan field tanggal
  });

  // Data queries
  const { data: pembelianDataRaw = [] } = usePembelianData(selectedDivision, "all");
  const { data: cabangData = [] } = useCabangData();
  const { data: brandsData = [] } = useBrandsData();
  const { penjualanData: penjualanDataRaw = [] } = usePenjualanData(selectedDivision);
  const { data: jenisMotorData = [] } = useJenisMotorData();
  const { data: companiesData = [] } = useCompaniesData(selectedDivision);

  // Mutations
  const createMutation = usePembelianCreate();
  const updateMutation = usePembelianUpdate();
  const deleteMutation = usePembelianDelete();

  // Date range calculation based on filter
  const getDateRange = () => {
    const now = new Date();
    
    switch (dateFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "tomorrow":
        const tomorrow = addDays(now, 1);
        return { start: startOfDay(tomorrow), end: endOfDay(tomorrow) };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case "this_week":
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case "last_week":
        const lastWeek = subWeeks(now, 1);
        return { start: startOfWeek(lastWeek), end: endOfWeek(lastWeek) };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "this_year":
        return { start: startOfYear(now), end: endOfYear(now) };
      case "last_year":
        const lastYear = subYears(now, 1);
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
        }
        return null;
      default:
        return null;
    }
  };

  // Filter and search logic
  const filteredData = pembelianDataRaw.filter((item: any) => {
    const matchesSearch = !searchTerm || 
      item.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jenis_motor?.jenis_motor?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCabang = selectedCabang === "all" || item.cabang_id.toString() === selectedCabang;
    
    const matchesJenisPembelian = selectedJenisPembelian === "all" || item.jenis_pembelian === selectedJenisPembelian;
    
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
    
    // Date filter logic
    let matchesDate = true;
    if (dateFilter !== "all") {
      const dateRange = getDateRange();
      if (dateRange) {
        const itemDate = new Date(item.tanggal_pembelian);
        matchesDate = itemDate >= dateRange.start && itemDate <= dateRange.end;
      } else if (dateFilter === "custom") {
        matchesDate = false; // If custom is selected but no dates are set
      }
    }
    
    return matchesSearch && matchesCabang && matchesJenisPembelian && matchesStatus && matchesDate;
  });

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
    totalItems
  } = usePagination(filteredData, pageSize);

  // Calculate totals - Menggabungkan data pembelian dan penjualan
  const calculateTotals = useMemo(() => {
    // Gabungkan data pembelian dan penjualan
    const combinedData = [
      ...pembelianDataRaw.map((item: any) => ({ ...item, source: 'pembelian' })),
      ...penjualanDataRaw.map((item: any) => ({ ...item, source: 'penjualan' }))
    ];

    // Filter gabungan berdasarkan kriteria yang sama
    const allDataFiltered = combinedData.filter((item: any) => {
      const matchesSearch = !searchTerm || 
        item.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.plat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenis_motor?.jenis_motor?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCabang = selectedCabang === "all" || item.cabang_id.toString() === selectedCabang;
      
      // Untuk penjualan, tidak ada jenis_pembelian, jadi skip filter ini
      const matchesJenisPembelian = selectedJenisPembelian === "all" || 
        (item.source === 'pembelian' && item.jenis_pembelian === selectedJenisPembelian) ||
        item.source === 'penjualan';
      
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
      
      // Date filter logic
      let matchesDate = true;
      if (dateFilter !== "all") {
        const dateRange = getDateRange();
        if (dateRange) {
          const itemDate = new Date(item.tanggal_pembelian || item.tanggal_penjualan);
          matchesDate = itemDate >= dateRange.start && itemDate <= dateRange.end;
        } else if (dateFilter === "custom") {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesCabang && matchesJenisPembelian && matchesStatus && matchesDate;
    });

    // Hitung total pembelian
    const totalPembelian = allDataFiltered
      .filter(item => item.source === 'pembelian')
      .reduce((sum, item) => sum + (item.harga_final || 0), 0);
    
    // Hitung total penjualan
    const totalPenjualan = allDataFiltered
      .filter(item => item.source === 'penjualan')
      .reduce((sum, item) => sum + (item.harga_jual || 0), 0);
    
    // Hitung profit
    const profit = totalPenjualan - totalPembelian;
    
    return {
      totalPembelian,
      totalPenjualan,
      profit,
      totalItems: allDataFiltered.length
    };
  }, [pembelianDataRaw, penjualanDataRaw, searchTerm, selectedCabang, selectedJenisPembelian, selectedStatus, dateFilter, customStartDate, customEndDate]);

  // Helper functions
  const formatNumberInput = (value: string | number) => {
    if (!value) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumericInput = (value: string) => {
    return value.replace(/\./g, "");
  };

  const handleSubmit = async (data: any) => {
    try {
      const transformedData = transformFormDataForSubmit(data);
      await createMutation.mutateAsync(transformedData);
      setIsDialogOpen(false);
      setFormData(createInitialFormData(selectedDivision));
      toast({
        title: "Sukses",
        description: "Data pembelian berhasil ditambahkan",
      });
    } catch (error) {
      console.error('Error creating pembelian:', error);
      toast({
        title: "Error",
        description: "Gagal menambahkan data pembelian",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (pembelian: Pembelian) => {
    setEditingPembelian(pembelian);
    setFormData(transformPembelianToFormData(pembelian));
    setIsDialogOpen(true);
  };

  const handleView = (pembelian: Pembelian) => {
    setViewingPembelian(pembelian);
    setIsViewDialogOpen(true);
  };

  const handleUpdateHarga = (pembelian: Pembelian) => {
    setUpdatingHargaPembelian(pembelian);
    setUpdateHargaForm({
      harga_beli_dasar: pembelian.harga_beli_dasar?.toString() || "",
      biaya_pajak: pembelian.biaya_pajak?.toString() || "",
      biaya_qc: pembelian.biaya_qc?.toString() || "",
      biaya_lain_lain: pembelian.biaya_lain_lain?.toString() || "",
      keterangan_biaya_lain: pembelian.keterangan_biaya_lain || "",
      company_id: pembelian.sumber_dana_1_id?.toString() || "",
      reason: "",
      tanggal_update: new Date().toISOString().split('T')[0] // Set tanggal default ke hari ini
    });
    setIsUpdateHargaDialogOpen(true);
  };

  const handleQC = (pembelian: Pembelian) => {
    setQCPembelian(pembelian);
    setQcForm({
      tanggal_qc: new Date().toISOString().split('T')[0],
      jenis_qc: "",
      total_pengeluaran: "",
      keterangan: ""
    });
    setIsQCDialogOpen(true);
  };

  const loadQcHistory = async (pembelianId: number) => {
    try {
      const { data, error } = await supabase
        .from('qc_histories')
        .select('*')
        .eq('pembelian_id', pembelianId)
        .order('tanggal_qc', { ascending: false });
      
      if (error) throw error;
      setQcHistory(data || []);
    } catch (error) {
      console.error('Error loading QC history:', error);
      toast({
        title: "Error",
        description: "Gagal memuat history QC",
        variant: "destructive",
      });
    }
  };

  const handleViewQcHistory = async (pembelian: Pembelian) => {
    setViewingPembelian(pembelian);
    await loadQcHistory(pembelian.id);
    setIsQcHistoryDialogOpen(true);
  };

  const handleViewPriceHistory = (pembelian: Pembelian) => {
    setViewingPembelian(pembelian);
    setIsPriceHistoryDialogOpen(true);
  };

  const handleUpdateHargaSubmit = async () => {
    try {
      // Validasi input
      if (!updateHargaForm.harga_beli_dasar || !updateHargaForm.reason || !updateHargaForm.company_id || !updateHargaForm.tanggal_update) {
        toast({
          title: "Error",
          description: "Harga beli dasar, alasan update, perusahaan, dan tanggal harus diisi",
          variant: "destructive",
        });
        return;
      }

      if (updateHargaForm.biaya_lain_lain && !updateHargaForm.keterangan_biaya_lain) {
        toast({
          title: "Error",
          description: "Keterangan biaya lain-lain harus diisi jika ada biaya lain-lain",
          variant: "destructive",
        });
        return;
      }

      const hargaFinal = 
        (parseFloat(parseNumericInput(updateHargaForm.harga_beli_dasar)) || 0) +
        (parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || 0) +
        (parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || 0) +
        (parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || 0);

      const selisihHarga = hargaFinal - (updatingHargaPembelian?.harga_final || 0);

      // Insert ke price_histories_pembelian
      const { error: historyError } = await supabase
        .from('price_histories_pembelian')
        .insert({
          pembelian_id: updatingHargaPembelian?.id,
          harga_beli_dasar_old: updatingHargaPembelian?.harga_beli_dasar,
          biaya_pajak_old: updatingHargaPembelian?.biaya_pajak,
          biaya_qc_old: updatingHargaPembelian?.biaya_qc,
          biaya_lain_lain_old: updatingHargaPembelian?.biaya_lain_lain,
          keterangan_biaya_lain_old: updatingHargaPembelian?.keterangan_biaya_lain,
          harga_final_old: updatingHargaPembelian?.harga_final,
          harga_beli_dasar_new: parseFloat(parseNumericInput(updateHargaForm.harga_beli_dasar)),
          biaya_pajak_new: parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || null,
          biaya_qc_new: parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || null,
          biaya_lain_lain_new: parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || null,
          keterangan_biaya_lain_new: updateHargaForm.keterangan_biaya_lain || null,
          harga_final_new: hargaFinal,
          selisih_harga: selisihHarga,
          reason: updateHargaForm.reason,
          company_id: parseInt(updateHargaForm.company_id)
        });

      if (historyError) throw historyError;

      // Jika ada selisih harga positif, catat ke pembukuan dan kurangi modal perusahaan
      if (selisihHarga > 0) {
        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert({
            tanggal: updateHargaForm.tanggal_update, // Gunakan tanggal yang dipilih user
            keterangan: `Update harga pembelian motor ${updatingHargaPembelian?.jenis_motor?.jenis_motor} (${updatingHargaPembelian?.plat_nomor}) - ${updateHargaForm.reason}`,
            debit: selisihHarga,
            kredit: 0,
            company_id: parseInt(updateHargaForm.company_id), // Gunakan company_id dari form
            kategori: 'Pembelian',
            jenis_transaksi: 'Update Harga Pembelian'
          });

        if (pembukuanError) throw pembukuanError;

        // Update modal perusahaan
        const { error: modalError } = await supabase
          .rpc('update_company_modal', {
            company_id: parseInt(updateHargaForm.company_id), // Gunakan company_id dari form
            amount: -selisihHarga
          });

        if (modalError) throw modalError;
      }

      // Update harga_final di tabel pembelian
      const { error: updateError } = await supabase
        .from('pembelian')
        .update({
          harga_beli_dasar: parseFloat(parseNumericInput(updateHargaForm.harga_beli_dasar)),
          biaya_pajak: parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || null,
          biaya_qc: parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || null,
          biaya_lain_lain: parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || null,
          keterangan_biaya_lain: updateHargaForm.keterangan_biaya_lain || null,
          harga_final: hargaFinal
        })
        .eq('id', updatingHargaPembelian?.id);

      if (updateError) throw updateError;

      toast({
        title: "Sukses",
        description: "Harga pembelian berhasil diupdate",
      });

      closeAllDialogs();
    } catch (error) {
      console.error('Error updating harga:', error);
      toast({
        title: "Error",
        description: "Gagal mengupdate harga pembelian",
        variant: "destructive",
      });
    }
  };

  const handleQCSubmit = async () => {
    try {
      if (!qcForm.tanggal_qc || !qcForm.jenis_qc || !qcForm.total_pengeluaran) {
        toast({
          title: "Error",
          description: "Tanggal QC, jenis QC, dan total pengeluaran harus diisi",
          variant: "destructive",
        });
        return;
      }

      const totalPengeluaran = parseFloat(qcForm.total_pengeluaran.replace(/\./g, ""));

      // Insert ke qc_histories
      const { error: qcError } = await supabase
        .from('qc_histories')
        .insert({
          pembelian_id: qcPembelian?.id,
          tanggal_qc: qcForm.tanggal_qc,
          jenis_qc: qcForm.jenis_qc,
          total_pengeluaran: totalPengeluaran,
          keterangan: qcForm.keterangan || null
        });

      if (qcError) throw qcError;

      // Insert ke pembukuan
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert({
          tanggal: qcForm.tanggal_qc,
          keterangan: `QC ${qcForm.jenis_qc} - ${qcPembelian?.jenis_motor?.jenis_motor} (${qcPembelian?.plat_nomor})${qcForm.keterangan ? ' - ' + qcForm.keterangan : ''}`,
          debit: totalPengeluaran,
          kredit: 0,
          company_id: qcPembelian?.sumber_dana_1_id,
          kategori: 'QC',
          jenis_transaksi: 'Quality Control'
        });

      if (pembukuanError) throw pembukuanError;

      // Update modal perusahaan
      const { error: modalError } = await supabase
        .rpc('update_company_modal', {
          company_id: qcPembelian?.sumber_dana_1_id,
          amount: -totalPengeluaran
        });

      if (modalError) throw modalError;

      toast({
        title: "Sukses",
        description: "Data QC berhasil disimpan",
      });

      closeAllDialogs();
    } catch (error) {
      console.error('Error saving QC:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data QC",
        variant: "destructive",
      });
    }
  };

  const handleQcNumericChange = (field: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setQcForm(prev => ({ ...prev, [field]: formattedValue }));
  };

  const closeAllDialogs = () => {
    setIsDialogOpen(false);
    setIsViewDialogOpen(false);
    setIsUpdateHargaDialogOpen(false);
    setIsQCDialogOpen(false);
    setIsQcHistoryDialogOpen(false);
    setIsPriceHistoryDialogOpen(false);
    setEditingPembelian(null);
    setViewingPembelian(null);
    setUpdatingHargaPembelian(null);
    setQCPembelian(null);
    setFormData(createInitialFormData(selectedDivision));
    setQcForm({
      tanggal_qc: new Date().toISOString().split('T')[0],
      jenis_qc: "",
      total_pengeluaran: "",
      keterangan: ""
    });
    setUpdateHargaForm({
      harga_beli_dasar: "",
      biaya_pajak: "",
      biaya_qc: "",
      biaya_lain_lain: "",
      keterangan_biaya_lain: "",
      company_id: "",
      reason: "",
      tanggal_update: new Date().toISOString().split('T')[0]
    });
  };

  const handleUpdateHargaNumericChange = (field: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setUpdateHargaForm(prev => ({ ...prev, [field]: formattedValue }));
  };

  const calculateHargaFinal = () => {
    const hargaBeli = parseFloat(parseNumericInput(updateHargaForm.harga_beli_dasar)) || 0;
    const biayaPajak = parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || 0;
    const biayaQc = parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || 0;
    const biayaLain = parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || 0;
    return hargaBeli + biayaPajak + biayaQc + biayaLain;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(calculateTotals.totalPembelian)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(calculateTotals.totalPenjualan)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              calculateTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(calculateTotals.profit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateTotals.totalItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari plat nomor, brand, jenis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={selectedCabang} onValueChange={setSelectedCabang}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {cabangData.map((cabang: any) => (
                  <SelectItem key={cabang.id} value={cabang.id.toString()}>
                    {cabang.nama_cabang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedJenisPembelian} onValueChange={setSelectedJenisPembelian}>
              <SelectTrigger>
                <SelectValue placeholder="Jenis Pembelian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="kredit">Kredit</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter Tanggal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tanggal</SelectItem>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="tomorrow">Besok</SelectItem>
                <SelectItem value="yesterday">Kemarin</SelectItem>
                <SelectItem value="this_week">Minggu Ini</SelectItem>
                <SelectItem value="last_week">Minggu Lalu</SelectItem>
                <SelectItem value="this_month">Bulan Ini</SelectItem>
                <SelectItem value="last_month">Bulan Lalu</SelectItem>
                <SelectItem value="this_year">Tahun Ini</SelectItem>
                <SelectItem value="last_year">Tahun Lalu</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Tambah Pembelian
            </Button>
          </div>

          {dateFilter === "custom" && (
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {customStartDate ? format(customStartDate, "PPP") : "Pilih tanggal mulai"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Tanggal Akhir</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {customEndDate ? format(customEndDate, "PPP") : "Pilih tanggal akhir"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="data">Data Pembelian</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="data" className="space-y-6">
          <PembelianTable
            data={paginatedData}
            onEdit={handleEdit}
            onView={handleView}
            onUpdateHarga={handleUpdateHarga}
            onQC={handleQC}
            onViewQcHistory={handleViewQcHistory}
            onViewPriceHistory={handleViewPriceHistory}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
          />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <HistoryTab type="pembelian" selectedDivision={selectedDivision} />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPembelian ? "Edit Pembelian" : "Tambah Pembelian Baru"}
            </DialogTitle>
          </DialogHeader>
          <PembelianForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={closeAllDialogs}
            isEditing={!!editingPembelian}
            editingPembelian={editingPembelian}
            selectedDivision={selectedDivision}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pembelian</DialogTitle>
          </DialogHeader>
          {viewingPembelian && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Tanggal Pembelian</Label>
                  <p>{format(new Date(viewingPembelian.tanggal_pembelian), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="font-semibold">Plat Nomor</Label>
                  <p>{viewingPembelian.plat_nomor}</p>
                </div>
                <div>
                  <Label className="font-semibold">Brand</Label>
                  <p>{viewingPembelian.brands?.name}</p>
                </div>
                <div>
                  <Label className="font-semibold">Jenis Motor</Label>
                  <p>{viewingPembelian.jenis_motor?.jenis_motor}</p>
                </div>
                <div>
                  <Label className="font-semibold">Tahun</Label>
                  <p>{viewingPembelian.tahun}</p>
                </div>
                <div>
                  <Label className="font-semibold">Warna</Label>
                  <p>{viewingPembelian.warna}</p>
                </div>
                <div>
                  <Label className="font-semibold">Harga Beli Dasar</Label>
                  <p>{formatCurrency(viewingPembelian.harga_beli_dasar)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Harga Final</Label>
                  <p>{formatCurrency(viewingPembelian.harga_final)}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <p className={`inline-block px-2 py-1 rounded text-sm ${
                    viewingPembelian.status === 'ready' ? 'bg-green-100 text-green-800' :
                    viewingPembelian.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {viewingPembelian.status}
                  </p>
                </div>
                <div>
                  <Label className="font-semibold">Jenis Pembelian</Label>
                  <p>{viewingPembelian.jenis_pembelian}</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={closeAllDialogs}>Tutup</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Harga Dialog */}
      <Dialog open={isUpdateHargaDialogOpen} onOpenChange={setIsUpdateHargaDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Harga Pembelian Motor</DialogTitle>
          </DialogHeader>
          {updatingHargaPembelian && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Harga Beli Dasar *</Label>
                  <Input
                    value={formatNumberInput(updateHargaForm.harga_beli_dasar)}
                    onChange={(e) => handleUpdateHargaNumericChange('harga_beli_dasar', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Biaya Pajak</Label>
                  <Input
                    value={formatNumberInput(updateHargaForm.biaya_pajak)}
                    onChange={(e) => handleUpdateHargaNumericChange('biaya_pajak', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Biaya QC</Label>
                  <Input
                    value={formatNumberInput(updateHargaForm.biaya_qc)}
                    onChange={(e) => handleUpdateHargaNumericChange('biaya_qc', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Biaya Lain-lain</Label>
                  <Input
                    value={formatNumberInput(updateHargaForm.biaya_lain_lain)}
                    onChange={(e) => handleUpdateHargaNumericChange('biaya_lain_lain', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              {updateHargaForm.biaya_lain_lain && (
                <div>
                  <Label>Keterangan Biaya Lain-lain *</Label>
                  <Input
                    value={updateHargaForm.keterangan_biaya_lain}
                    onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, keterangan_biaya_lain: e.target.value }))}
                    placeholder="Jelaskan biaya lain-lain"
                  />
                </div>
              )}
              
              <div>
                <Label>Perusahaan *</Label>
                <Select 
                  value={updateHargaForm.company_id} 
                  onValueChange={(value) => setUpdateHargaForm(prev => ({ ...prev, company_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih perusahaan" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesData.map((company: any) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.nama_perusahaan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tanggal Update *</Label>
                <Input
                  type="date"
                  value={updateHargaForm.tanggal_update}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, tanggal_update: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Alasan Update *</Label>
                <Textarea
                  value={updateHargaForm.reason}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Jelaskan alasan update harga"
                  rows={3}
                />
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <Label className="font-semibold">Preview Harga Final</Label>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(calculateHargaFinal())}
                </p>
                <p className="text-sm text-gray-600">
                  Selisih: {formatCurrency(calculateHargaFinal() - (updatingHargaPembelian?.harga_final || 0))}
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeAllDialogs}>Batal</Button>
                <Button onClick={handleUpdateHargaSubmit}>Update Harga</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QC Dialog */}
      <Dialog open={isQCDialogOpen} onOpenChange={setIsQCDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quality Control</DialogTitle>
          </DialogHeader>
          {qcPembelian && (
            <div className="space-y-4">
              <div>
                <Label>Tanggal QC *</Label>
                <Input
                  type="date"
                  value={qcForm.tanggal_qc}
                  onChange={(e) => setQcForm(prev => ({ ...prev, tanggal_qc: e.target.value }))}
                />
              </div>
              
              <div>
                <Label>Jenis QC *</Label>
                <Select 
                  value={qcForm.jenis_qc} 
                  onValueChange={(value) => setQcForm(prev => ({ ...prev, jenis_qc: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis QC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Service Rutin">Service Rutin</SelectItem>
                    <SelectItem value="Perbaikan Mesin">Perbaikan Mesin</SelectItem>
                    <SelectItem value="Ganti Oli">Ganti Oli</SelectItem>
                    <SelectItem value="Tune Up">Tune Up</SelectItem>
                    <SelectItem value="Perbaikan Body">Perbaikan Body</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Total Pengeluaran *</Label>
                <Input
                  value={qcForm.total_pengeluaran}
                  onChange={(e) => handleQcNumericChange('total_pengeluaran', e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label>Keterangan</Label>
                <Textarea
                  value={qcForm.keterangan}
                  onChange={(e) => setQcForm(prev => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Keterangan tambahan (opsional)"
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeAllDialogs}>Batal</Button>
                <Button onClick={handleQCSubmit}>Simpan QC</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QC History Dialog */}
      <Dialog open={isQcHistoryDialogOpen} onOpenChange={setIsQcHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>History Quality Control</DialogTitle>
          </DialogHeader>
          {viewingPembelian && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold">Motor: {viewingPembelian.jenis_motor?.jenis_motor}</h3>
                <p>Plat Nomor: {viewingPembelian.plat_nomor}</p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {qcHistory.length > 0 ? (
                  <div className="space-y-3">
                    {qcHistory.map((qc: any) => (
                      <div key={qc.id} className="border p-3 rounded">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Tanggal:</strong> {format(new Date(qc.tanggal_qc), "dd/MM/yyyy")}</div>
                          <div><strong>Jenis QC:</strong> {qc.jenis_qc}</div>
                          <div><strong>Total Pengeluaran:</strong> {formatCurrency(qc.total_pengeluaran)}</div>
                          <div><strong>Keterangan:</strong> {qc.keterangan || '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Belum ada history QC untuk motor ini</p>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button onClick={closeAllDialogs}>Tutup</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Price History Modal */}
      <PriceHistoryModal
        isOpen={isPriceHistoryDialogOpen}
        onClose={() => setIsPriceHistoryDialogOpen(false)}
        pembelian={viewingPembelian}
      />
    </div>
  );
};

export default PembelianPageEnhanced;