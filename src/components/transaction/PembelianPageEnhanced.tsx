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

  // State untuk form update harga yang lengkap
  const [updateHargaForm, setUpdateHargaForm] = useState({
    harga_beli_dasar: "",
    biaya_pajak: "",
    biaya_qc: "",
    biaya_lain_lain: "",
    keterangan_biaya_lain: "",
    company_id: "",
    reason: ""
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

      // TAMBAHKAN FILTER DIVISI
     const matchesDivisi = item.divisi === selectedDivision;
    
      
      // Date filter logic
      let matchesDate = true;
      if (dateFilter !== "all") {
        const dateRange = getDateRange();
        if (dateRange) {
          const itemDate = new Date(item.tanggal_pembelian || item.tanggal);
          matchesDate = itemDate >= dateRange.start && itemDate <= dateRange.end;
        } else if (dateFilter === "custom") {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesCabang && matchesJenisPembelian && matchesDate && matchesDivisi;
    });

    // Total pembelian keseluruhan (ready + booked)
    const totalPembelian = allDataFiltered.filter(item => 
    item.status === 'ready' || item.status === 'booked' || item.status === 'sold'
  ).length;
    
    // Total ready dari data yang sudah difilter dengan semua filter termasuk status
    const totalReady = filteredData.filter(item => item.status === 'ready').length;
    
    // Total nilai keseluruhan (ready + booked)
    const totalNilai = allDataFiltered.reduce((sum, item) => {
      if (item.status === 'ready' && item.source === 'pembelian') {
        // Untuk pembelian status ready: prioritas harga_final, fallback ke harga_beli
        return sum + (item.harga_final || item.harga_beli || 0);
      } else if (item.status === 'booked' && item.source === 'penjualan') {
        // Untuk penjualan status booked: menggunakan harga_beli dari pembelian terkait
        return sum + (item.harga_beli || 0);
      } else {
        // Untuk status lainnya: tidak dihitung
        return sum;
      }
    }, 0);

    return { totalPembelian, totalReady, totalNilai };
  }, [pembelianDataRaw, penjualanDataRaw, filteredData, searchTerm, selectedCabang, selectedJenisPembelian, dateFilter, customStartDate, customEndDate, selectedDivision]);

  // Helper functions untuk format currency
  const formatNumberInput = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (!numericValue) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(numericValue));
  };

  const parseNumericInput = (value: string) => {
    return value.replace(/[^0-9]/g, "");
  };

  const handleQcNumericChange = (field: string, value: string) => {
    const formattedValue = formatNumberInput(value);
    setQcForm(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!validateFormData(formData)) {
      toast({ 
        title: "Error", 
        description: "Mohon lengkapi semua field yang wajib diisi", 
        variant: "destructive" 
      });
      return;
    }

    // Validasi nominal dana
    const hargaBeli = parseFloat(formData.harga_beli) || 0;
    const nominalDana1 = parseFloat(formData.nominal_dana_1) || 0;
    const nominalDana2 = parseFloat(formData.nominal_dana_2) || 0;

    // Jika hanya menggunakan nominal dana 1
    if (nominalDana2 === 0) {
      if (nominalDana1 !== hargaBeli) {
        toast({
          title: "Error",
          description: "Sumber dana 1 tidak sama dengan harga beli",
          variant: "destructive"
        });
        return;
      }
    } 
    // Jika menggunakan nominal dana 1 dan nominal dana 2
    else {
      const totalNominalDana = nominalDana1 + nominalDana2;
      if (totalNominalDana !== hargaBeli) {
        toast({
          title: "Error",
          description: "Total sumber dana 1 dan sumber dana 2 tidak sama dengan harga beli",
          variant: "destructive"
        });
        return;
      }
    }

    const submitData = transformFormDataForSubmit(formData);
    
    if (editingPembelian) {
      updateMutation.mutate({ id: editingPembelian.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
    
    setFormData(createInitialFormData(selectedDivision));
    setEditingPembelian(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (pembelian: any) => {
    setEditingPembelian(pembelian);
    setFormData(transformPembelianToFormData(pembelian));
    setIsDialogOpen(true);
  };

  const handleView = (pembelian: any) => {
    setViewingPembelian(pembelian);
    setIsViewDialogOpen(true);
  };

  const handleUpdateHarga = (pembelian: any) => {
    setUpdatingHargaPembelian(pembelian);
    setUpdateHargaForm({
      harga_beli_dasar: (pembelian.harga_final || pembelian.harga_beli).toString(),
      biaya_pajak: "",
      biaya_qc: "",
      biaya_lain_lain: "",
      keterangan_biaya_lain: "",
      reason: "",
     company_id: pembelian.sumber_dana_1_id?.toString() || ""
    });
    setIsUpdateHargaDialogOpen(true);
  };

  const handleQC = (pembelian: any) => {
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
        .from('qc_history')
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
        variant: "destructive"
      });
    }
  };

  const handleViewQcHistory = (pembelian: any) => {
    setViewingPembelian(pembelian);
    loadQcHistory(pembelian.id);
    setIsQcHistoryDialogOpen(true);
  };

  const handleViewPriceHistory = (pembelian: any) => {
    setViewingPembelian(pembelian);
    setIsPriceHistoryDialogOpen(true);
  };

  const closeAllDialogs = () => {
    setIsViewDialogOpen(false);
    setIsUpdateHargaDialogOpen(false);
    setIsQCDialogOpen(false);
    setIsQcHistoryDialogOpen(false);
    setIsPriceHistoryDialogOpen(false);
    setViewingPembelian(null);
    setUpdatingHargaPembelian(null);
    setQCPembelian(null);
    setUpdateHargaForm({
      harga_beli_dasar: "",
      biaya_pajak: "",
      biaya_qc: "",
      biaya_lain_lain: "",
      keterangan_biaya_lain: "",
      company_id: "",
      reason: ""
    });
    setQcForm({
      tanggal_qc: new Date().toISOString().split('T')[0],
      jenis_qc: "",
      total_pengeluaran: "",
      keterangan: ""
    });
    setQcHistory([]);
  };

  const handleUpdateHargaSubmit = async () => {
    if (!updateHargaForm.harga_beli_dasar || !updateHargaForm.reason || !updatingHargaPembelian) {
      toast({
        title: "Error",
        description: "Mohon lengkapi field yang wajib diisi (Harga Beli Dasar dan Alasan Update)",
        variant: "destructive"
      });
      return;
    }

    if (!updateHargaForm.harga_beli_dasar || !updateHargaForm.reason || !updateHargaForm.company_id || !updatingHargaPembelian) {
    toast({
      title: "Error",
      description: "Mohon lengkapi field yang wajib diisi (Harga Beli Dasar, Perusahaan, dan Alasan Update)",
      variant: "destructive"
    });
    return;
  }

    const hargaBeliBaru = parseFloat(parseNumericInput(updateHargaForm.harga_beli_dasar));
    const biayaPajak = parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || 0;
    const biayaQC = parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || 0;
    const biayaLainLain = parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || 0;
    
    if (isNaN(hargaBeliBaru) || hargaBeliBaru <= 0) {
      toast({
        title: "Error",
        description: "Harga Beli Dasar harus berupa angka yang valid",
        variant: "destructive"
      });
      return;
    }

    // Validasi keterangan biaya lain jika biaya lain-lain diisi
    if (biayaLainLain > 0 && !updateHargaForm.keterangan_biaya_lain.trim()) {
      toast({
        title: "Error",
        description: "Keterangan Biaya Lain wajib diisi jika Biaya Lain-Lain diisi",
        variant: "destructive"
      });
      return;
    }

    // Hitung harga final
    const hargaFinal = hargaBeliBaru + biayaPajak + biayaQC + biayaLainLain;
    const hargaLama = updatingHargaPembelian.harga_final || updatingHargaPembelian.harga_beli || 0;
    const selisihHarga = hargaFinal - hargaLama;

    try {
      // Insert ke price_histories_pembelian
      const { error: historyError } = await supabase
        .from('price_histories_pembelian')
        .insert({
          pembelian_id: updatingHargaPembelian.id,
          harga_beli_lama: hargaLama,
          harga_beli_baru: hargaFinal,
          biaya_qc: biayaQC,
          biaya_pajak: biayaPajak,
          biaya_lain_lain: biayaLainLain,
          keterangan_biaya_lain: updateHargaForm.keterangan_biaya_lain || null,
          reason: updateHargaForm.reason,
          company_id: parseInt(updateHargaForm.company_id),
          user_id: null
        });

      if (historyError) throw historyError;

      // Jika ada selisih harga (kenaikan), catat ke pembukuan dan kurangi modal
      if (selisihHarga > 0) {
        // Catat ke pembukuan sebagai pengeluaran tambahan
        const pembukuanData = {
          tanggal: new Date().toISOString().split('T')[0],
          divisi: updatingHargaPembelian.divisi,
          cabang_id: updatingHargaPembelian.cabang_id,
          keterangan: `Update harga motor ${updatingHargaPembelian.plat_nomor} - ${updateHargaForm.reason}`,
          debit: selisihHarga,
          pembelian_id: updatingHargaPembelian.id,
          company_id: updatingHargaPembelian.sumber_dana_1_id
        };

        const { error: pembukuanError } = await supabase
          .from("pembukuan")
          .insert([pembukuanData]);
        
        if (pembukuanError) throw pembukuanError;

        // Kurangi modal dari company yang menjadi sumber dana utama
        const { data: company, error: companyFetchError } = await supabase
          .from("companies")
          .select("modal")
          .eq("id", updatingHargaPembelian.sumber_dana_1_id)
          .single();
        
        if (companyFetchError) throw companyFetchError;

        const { error: updateModalError } = await supabase
          .from("companies")
          .update({ modal: company.modal - selisihHarga })
          .eq("id", updatingHargaPembelian.sumber_dana_1_id);
        
        if (updateModalError) throw updateModalError;
      }

      // Update harga_final di tabel pembelian
      updateMutation.mutate(
        { 
          id: updatingHargaPembelian.id, 
          data: { harga_final: hargaFinal } 
        },
        {
          onSuccess: () => {
            toast({
              title: "Sukses",
              description: selisihHarga > 0 
                ? "Harga berhasil diupdate, history tersimpan, dan modal telah dikurangi"
                : "Harga berhasil diupdate dan history tersimpan"
            });
            closeAllDialogs();
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Gagal mengupdate harga",
              variant: "destructive"
            });
          }
        }
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan history harga atau update pembukuan",
        variant: "destructive"
      });
      console.error(error);
    }
  };

  const handleQCSubmit = async () => {
    if (!qcForm.tanggal_qc || !qcForm.jenis_qc || !qcForm.total_pengeluaran || !qcPembelian) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive"
      });
      return;
    }

    const totalPengeluaran = parseFloat(parseNumericInput(qcForm.total_pengeluaran));
    
    if (isNaN(totalPengeluaran) || totalPengeluaran <= 0) {
      toast({
        title: "Error",
        description: "Total pengeluaran harus berupa angka yang valid",
        variant: "destructive"
      });
      return;
    }

    try {
      // Insert ke tabel qc_history
      const { error: qcHistoryError } = await supabase
        .from('qc_history')
        .insert({
          pembelian_id: qcPembelian.id,
          tanggal_qc: qcForm.tanggal_qc,
          jenis_qc: qcForm.jenis_qc,
          total_pengeluaran: totalPengeluaran,
          keterangan: qcForm.keterangan || null,
          user_id: null
        });

      if (qcHistoryError) throw qcHistoryError;

      // Catat ke pembukuan sebagai pengeluaran (debit)
      const pembukuanData = {
        tanggal: qcForm.tanggal_qc,
        divisi: qcPembelian.divisi,
        cabang_id: qcPembelian.cabang_id,
        keterangan: `QC ${qcForm.jenis_qc} - Motor ${qcPembelian.plat_nomor} - ${qcForm.keterangan || ''}`,
        debit: totalPengeluaran,
        pembelian_id: qcPembelian.id,
        company_id: qcPembelian.sumber_dana_1_id
      };

      const { error: pembukuanError } = await supabase
        .from("pembukuan")
        .insert([pembukuanData]);
      
      if (pembukuanError) throw pembukuanError;

      // Kurangi modal dari company
      const { data: company, error: companyFetchError } = await supabase
        .from("companies")
        .select("modal")
        .eq("id", qcPembelian.sumber_dana_1_id)
        .single();
      
      if (companyFetchError) throw companyFetchError;

      const { error: updateModalError } = await supabase
        .from("companies")
        .update({ modal: company.modal - totalPengeluaran })
        .eq("id", qcPembelian.sumber_dana_1_id);
      
      if (updateModalError) throw updateModalError;

      // Update harga_final di tabel pembelian (menambahkan biaya QC)
      const hargaFinalBaru = (qcPembelian.harga_final || qcPembelian.harga_beli) + totalPengeluaran;
      
      updateMutation.mutate(
        { 
          id: qcPembelian.id, 
          data: { harga_final: hargaFinalBaru } 
        },
        {
          onSuccess: () => {
            toast({
              title: "Sukses",
              description: "QC berhasil disimpan, pembukuan tercatat, modal dikurangi, dan harga final diupdate"
            });
            closeAllDialogs();
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Gagal mengupdate harga final",
              variant: "destructive"
            });
          }
        }
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data QC atau update pembukuan",
        variant: "destructive"
      });
      console.error(error);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCabang("all");
    setSelectedJenisPembelian("all");
    setSelectedStatus("ready");
    setDateFilter("all");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    resetPage();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Pembelian</h1>
        <PembelianForm
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          editingPembelian={editingPembelian}
          formData={formData}
          setFormData={setFormData}
          cabangData={cabangData}
          brandsData={brandsData}
          jenisMotorData={jenisMotorData}
          companiesData={companiesData}
          handleSubmit={handleSubmit}
          selectedDivision={selectedDivision}
        />
      </div>

      {/* Tabs untuk Data Aktif dan History */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Data Aktif</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">
          {/* Filter Section */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Pembelian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari plat, brand, jenis motor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="cabang">Cabang</Label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {cabangData.map((cabang) => (
                    <SelectItem key={cabang.id} value={cabang.id.toString()}>
                      {cabang.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="jenisPembelian">Jenis Pembelian</Label>
              <Select value={selectedJenisPembelian} onValueChange={setSelectedJenisPembelian}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jenis Transaksi" />
                </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  <SelectItem value="Tukar Tambah">Tukar Tambah</SelectItem>
                  <SelectItem value="Bukan Tukar Tambah">Bukan Tukar Tambah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFilter">Filter Tanggal</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Filter Tanggal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tanggal</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tommorow</SelectItem>
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

            <div>
              <Label htmlFor="pageSize">Items per page</Label>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <Label>Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Pilih tanggal mulai"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>Tanggal Selesai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Pilih tanggal selesai"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filter
            </Button>
            <div className="text-sm text-muted-foreground">
              Menampilkan {paginatedData.length} dari {totalItems} data
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Label yang jelas untuk ready + booked */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Pembelian {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {calculateTotals.totalPembelian}
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ready (Status Ready) {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {calculateTotals.totalReady}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Nilai (Ready+Booked) {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(calculateTotals.totalNilai)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <PembelianTable 
        pembelianData={paginatedData}
        handleEdit={handleEdit}
        handleView={handleView}
        handleUpdateHarga={handleUpdateHarga}
        handleQC={handleQC}
        handleViewQcHistory={handleViewQcHistory}
        handleViewPriceHistory={handleViewPriceHistory}
        deleteMutation={deleteMutation}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              onClick={() => goToPage(page)}
              size="sm"
            >
              {page}
            </Button>
          ))}
          
          <Button
            variant="outline"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pembelian</DialogTitle>
          </DialogHeader>
          {viewingPembelian && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Pembelian:</Label>
                <p>{new Date(viewingPembelian.tanggal_pembelian).toLocaleDateString('id-ID')}</p>
              </div>
              <div>
                <Label>Divisi:</Label>
                <p>{viewingPembelian.divisi}</p>
              </div>
              <div>
                <Label>Cabang:</Label>
                <p>{viewingPembelian.cabang?.nama}</p>
              </div>
              <div>
                <Label>Jenis Motor:</Label>
                <p>{viewingPembelian.jenis_motor?.jenis_motor}</p>
              </div>
              <div>
                <Label>Plat Nomor:</Label>
                <p>{viewingPembelian.plat_nomor}</p>
              </div>
              <div>
                <Label>Harga Beli:</Label>
                <p>{formatCurrency(viewingPembelian.harga_beli)}</p>
              </div>
              <div>
                <Label>Harga Final:</Label>
                <p>{formatCurrency(viewingPembelian.harga_final)}</p>
              </div>
              <div>
                <Label>Jenis Pembelian:</Label>
                <p>{viewingPembelian.jenis_pembelian}</p>
              </div>
              <div className="col-span-2">
                <Label>Keterangan:</Label>
                <p>{viewingPembelian.keterangan || '-'}</p>
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
            {/* Motor Info - Compact */}
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="font-medium">{updatingHargaPembelian.jenis_motor?.jenis_motor}</p>
              <p className="text-sm text-gray-600">Plat: {updatingHargaPembelian.plat_nomor}</p>
            </div>
            
            {/* Form Fields - Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="harga-beli-dasar">Harga Beli Dasar *</Label>
                <Input
                  id="harga-beli-dasar"
                  type="text"
                  value={formatNumberInput(updateHargaForm.harga_beli_dasar)}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, harga_beli_dasar: parseNumericInput(e.target.value) }))}
                  placeholder="Harga beli dasar"
                />
              </div>
              <div>
                <Label htmlFor="biaya-pajak">Biaya Pajak</Label>
                <Input
                  id="biaya-pajak"
                  type="text"
                  value={formatNumberInput(updateHargaForm.biaya_pajak)}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, biaya_pajak: parseNumericInput(e.target.value) }))}
                  placeholder="Biaya pajak"
                />
              </div>
              <div>
                <Label htmlFor="biaya-qc">Biaya QC</Label>
                <Input
                  id="biaya-qc"
                  type="text"
                  value={formatNumberInput(updateHargaForm.biaya_qc)}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, biaya_qc: parseNumericInput(e.target.value) }))}
                  placeholder="Biaya QC"
                />
              </div>
              <div>
                <Label htmlFor="biaya-lain-lain">Biaya Lain-Lain</Label>
                <Input
                  id="biaya-lain-lain"
                  type="text"
                  value={formatNumberInput(updateHargaForm.biaya_lain_lain)}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, biaya_lain_lain: parseNumericInput(e.target.value) }))}
                  placeholder="Biaya lain-lain"
                />
              </div>
            </div>
            
            {/* Conditional Fields */}
            {updateHargaForm.biaya_lain_lain && (
              <div>
                <Label htmlFor="keterangan-biaya-lain">Keterangan Biaya Lain *</Label>
                <Input
                  id="keterangan-biaya-lain"
                  value={updateHargaForm.keterangan_biaya_lain}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, keterangan_biaya_lain: e.target.value }))}
                  placeholder="Jelaskan biaya lain-lain"
                />
              </div>
            )}
            
            {/* Company and Reason - Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_id">Perusahaan *</Label>
                <Select
                  value={updateHargaForm.company_id}
                  onValueChange={(value) => setUpdateHargaForm(prev => ({ ...prev, company_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih perusahaan" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesData?.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.nama_perusahaan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">Alasan Update *</Label>
                <Input
                  id="reason"
                  value={updateHargaForm.reason}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Alasan update harga"
                />
              </div>
            </div>
            
            {/* Preview - Compact */}
            <div className="bg-green-50 p-3 rounded-md flex justify-between items-center">
              <span className="text-sm font-medium">Harga Final:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(
                  (parseFloat(parseNumericInput(updateHargaForm.harga_beli_dasar)) || 0) +
                  (parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || 0) +
                  (parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || 0) +
                  (parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || 0)
                )}
              </span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeAllDialogs}>Batal</Button>
              <Button onClick={handleUpdateHargaSubmit}>Update Harga</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

      {/* QC Dialog dengan field yang diperlukan */}
      <Dialog open={isQCDialogOpen} onOpenChange={setIsQCDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quality Control</DialogTitle>
          </DialogHeader>
          {qcPembelian && (
            <div className="space-y-4">
              <div>
                <Label>Motor: {qcPembelian.jenis_motor?.jenis_motor}</Label>
                <p className="text-sm text-gray-600">Plat: {qcPembelian.plat_nomor}</p>
              </div>
              
              <div>
                <Label htmlFor="tanggal-qc">Tanggal QC *</Label>
                <Input
                  id="tanggal-qc"
                  type="date"
                  value={qcForm.tanggal_qc}
                  onChange={(e) => setQcForm(prev => ({ ...prev, tanggal_qc: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="jenis-qc">Jenis QC *</Label>
                <Select value={qcForm.jenis_qc} onValueChange={(value) => setQcForm(prev => ({ ...prev, jenis_qc: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis QC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Penggantian Sparepart">Penggantian Sparepart</SelectItem>
                    <SelectItem value="Service Mesin">Service Mesin</SelectItem>
                    <SelectItem value="Perbaikan Body">Perbaikan Body</SelectItem>
                    <SelectItem value="Penggantian Oli">Penggantian Oli</SelectItem>
                    <SelectItem value="Tune Up">Tune Up</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="total-pengeluaran">Total Pengeluaran *</Label>
                <Input
                  id="total-pengeluaran"
                  type="text"
                  value={qcForm.total_pengeluaran}
                  onChange={(e) => handleQcNumericChange('total_pengeluaran', e.target.value)}
                  placeholder="Contoh: 1.000.000"
                />
              </div>
              
              <div>
                <Label htmlFor="keterangan-qc">Keterangan</Label>
                <Textarea 
                  id="keterangan-qc"
                  value={qcForm.keterangan}
                  onChange={(e) => setQcForm(prev => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Masukkan keterangan QC..."
                  className="h-24"
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
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
              <div>
                <Label>Motor: {viewingPembelian.jenis_motor?.jenis_motor}</Label>
                <p className="text-sm text-gray-600">Plat: {viewingPembelian.plat_nomor}</p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {qcHistory.length > 0 ? (
                  <div className="space-y-3">
                    {qcHistory.map((qc: any, index: number) => (
                      <Card key={qc.id || index} className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Tanggal QC:</Label>
                            <p className="text-sm">{new Date(qc.tanggal_qc).toLocaleDateString('id-ID')}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Jenis QC:</Label>
                            <p className="text-sm">{qc.jenis_qc}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Total Pengeluaran:</Label>
                            <p className="text-sm font-semibold text-red-600">{formatCurrency(qc.total_pengeluaran)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Keterangan:</Label>
                            <p className="text-sm">{qc.keterangan || '-'}</p>
                          </div>
                        </div>
                      </Card>
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
        
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <HistoryTab type="pembelian" selectedDivision={selectedDivision} />
        </TabsContent>
      </Tabs>

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