import React, { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  addDays,
} from "date-fns";
import {
  Search,
  Filter,
  ShoppingCart,
  CheckCircle,
  DollarSign,
  CalendarIcon,
  Download,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HistoryTab from "./HistoryTab";
import PembelianForm from "./PembelianForm";
import PembelianTable from "./PembelianTable";
import PriceHistoryModal from "./PriceHistoryModal";
import QCReportDialog from "./QCReportDialog";
import { Pembelian, PembelianPageProps } from "./types";
import { formatCurrency } from "@/utils/formatUtils";
import { usePagination } from "@/hooks/usePagination";
import { useRBAC } from "@/hooks/useRBAC";

import {
  usePembelianData,
  useCabangData,
  useBrandsData,
  useJenisMotorData,
  useCompaniesData,
} from "./hooks/usePembelianData";
import { usePenjualanData } from "./hooks/usePenjualanData";
import {
  usePembelianCreate,
  usePembelianUpdate,
  usePembelianDelete,
} from "./hooks/usePembelianMutations";
import {
  createInitialFormData,
  validateFormData,
  transformFormDataForSubmit,
  transformPembelianToFormData,
} from "./utils/formUtils";
import { supabase } from "@/integrations/supabase/client";

const PembelianPageEnhanced = ({ selectedDivision }: PembelianPageProps) => {
  const { hasPermission } = useRBAC();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateHargaDialogOpen, setIsUpdateHargaDialogOpen] = useState(false);
  const [isQCDialogOpen, setIsQCDialogOpen] = useState(false);
  const [isQcHistoryDialogOpen, setIsQcHistoryDialogOpen] = useState(false);
  const [isPriceHistoryDialogOpen, setIsPriceHistoryDialogOpen] =
    useState(false);
  const [isQCReportDialogOpen, setIsQCReportDialogOpen] = useState(false);
  const [isViewQCReportDialogOpen, setIsViewQCReportDialogOpen] =
    useState(false);
  const [isUpdateHargaCalendarOpen, setIsUpdateHargaCalendarOpen] =
    useState(false);
  const [editingPembelian, setEditingPembelian] = useState<Pembelian | null>(
    null
  );
  const [viewingPembelian, setViewingPembelian] = useState<Pembelian | null>(
    null
  );
  const [updatingHargaPembelian, setUpdatingHargaPembelian] =
    useState<Pembelian | null>(null);
  const [qcPembelian, setQCPembelian] = useState<Pembelian | null>(null);
  const [qcReportPembelian, setQCReportPembelian] = useState<Pembelian | null>(
    null
  );
  const [formData, setFormData] = useState(
    createInitialFormData(selectedDivision)
  );
  const [qcHistory, setQcHistory] = useState([]);
  const [viewQCReportData, setViewQCReportData] = useState<any[]>([]);
  const [selectedQCReports, setSelectedQCReports] = useState<string[]>([]);
  const [currentQCPage, setCurrentQCPage] = useState(1);
  const qcReportPageSize = 5; // Ubah dari 10 menjadi 5 data per halaman
  const [qcReportSearchTerm, setQcReportSearchTerm] = useState("");
  const [qcReportSortBy, setQcReportSortBy] = useState("brand");
  const [qcReportSortOrder, setQcReportSortOrder] = useState<"asc" | "desc">(
    "asc"
  );
  const [isVerifyingQC, setIsVerifyingQC] = useState(false);

  // State untuk Update QC (Tanggal & Real Nominal)
  const [
    isUpdateTanggalSelesaiDialogOpen,
    setIsUpdateTanggalSelesaiDialogOpen,
  ] = useState(false);
  const [tanggalSelesaiQCForm, setTanggalSelesaiQCForm] = useState<{
    [key: string]: string;
  }>({});
  const [realNominalQCForm, setRealNominalQCForm] = useState<{
    [key: string]: string;
  }>({});
  const [isUpdatingTanggalSelesai, setIsUpdatingTanggalSelesai] =
    useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJenisPembelian, setSelectedJenisPembelian] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    undefined
  );

  // Sort states
  const [sortBy, setSortBy] = useState("tanggal_pembelian");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { toast } = useToast();

  // Pagination
  const [pageSize, setPageSize] = useState(10);

  // State untuk form QC yang lengkap
  const [qcForm, setQcForm] = useState({
    tanggal_qc: new Date().toISOString().split("T")[0],
    jenis_qc: "",
    total_pengeluaran: "",
    keterangan: "",
  });

  // State untuk form update harga yang lengkap
  const [updateHargaForm, setUpdateHargaForm] = useState({
    tanggal_update: new Date().toISOString().split("T")[0],
    harga_beli_dasar: "",
    biaya_pajak: "",
    biaya_qc: "",
    biaya_lain_lain: "",
    keterangan_biaya_lain: "",
    company_id: "",
    reason: "",
  });

  // Data queries
  const { data: pembelianDataRaw = [] } = usePembelianData(
    selectedDivision,
    "all"
  );
  const { data: cabangData = [] } = useCabangData();
  const { data: brandsData = [] } = useBrandsData();
  const { penjualanData: penjualanDataRaw = [] } =
    usePenjualanData(selectedDivision);
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
          return {
            start: startOfDay(customStartDate),
            end: endOfDay(customEndDate),
          };
        }
        return null;
      default:
        return null;
    }
  };

  // Filter and search logic - Only show ready items by default
  const filteredData = pembelianDataRaw.filter((item: any) => {
    // Only show ready status items
    const matchesStatus = item.status === "ready";

    const matchesSearch =
      !searchTerm ||
      item.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jenis_motor?.jenis_motor
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      item.cabangs?.nama?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesJenisPembelian =
      selectedJenisPembelian === "all" ||
      item.jenis_pembelian === selectedJenisPembelian;

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

    return (
      matchesStatus && matchesSearch && matchesJenisPembelian && matchesDate
    );
  });

  // Sort logic
  const sortedData = [...filteredData].sort((a: any, b: any) => {
    let compareA, compareB;

    switch (sortBy) {
      case "brand":
        compareA = a.brands?.name?.toLowerCase() || "";
        compareB = b.brands?.name?.toLowerCase() || "";
        break;
      case "jenis_motor":
        compareA = a.jenis_motor?.jenis_motor?.toLowerCase() || "";
        compareB = b.jenis_motor?.jenis_motor?.toLowerCase() || "";
        break;
      case "plat_nomor":
        compareA = a.plat_nomor?.toLowerCase() || "";
        compareB = b.plat_nomor?.toLowerCase() || "";
        break;
      case "tanggal_pembelian":
        compareA = new Date(a.tanggal_pembelian).getTime();
        compareB = new Date(b.tanggal_pembelian).getTime();
        break;
      case "harga_beli":
        compareA = a.harga_beli || 0;
        compareB = b.harga_beli || 0;
        break;
      case "cabang":
        compareA = a.cabangs?.nama?.toLowerCase() || "";
        compareB = b.cabangs?.nama?.toLowerCase() || "";
        break;
      default:
        return 0;
    }

    if (compareA < compareB) return sortOrder === "asc" ? -1 : 1;
    if (compareA > compareB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
    totalItems,
  } = usePagination(sortedData, pageSize);

  // Calculate totals - Menggabungkan data pembelian dan penjualan
  const calculateTotals = useMemo(() => {
    // Gabungkan data pembelian dan penjualan
    const combinedData = [
      ...pembelianDataRaw.map((item: any) => ({
        ...item,
        source: "pembelian",
      })),
      ...penjualanDataRaw.map((item: any) => ({
        ...item,
        source: "penjualan",
      })),
    ];

    // Filter gabungan berdasarkan kriteria yang sama
    const allDataFiltered = combinedData.filter((item: any) => {
      const matchesSearch =
        !searchTerm ||
        item.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.plat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenis_motor?.jenis_motor
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.cabangs?.nama?.toLowerCase().includes(searchTerm.toLowerCase());

      // Untuk penjualan, tidak ada jenis_pembelian, jadi skip filter ini
      const matchesJenisPembelian =
        selectedJenisPembelian === "all" ||
        (item.source === "pembelian" &&
          item.jenis_pembelian === selectedJenisPembelian) ||
        item.source === "penjualan";

      // TAMBAHKAN FILTER DIVISI
      const matchesDivisi = item.divisi === selectedDivision;

      // Date filter logic
      let matchesDate = true;
      if (dateFilter !== "all") {
        const dateRange = getDateRange();
        if (dateRange) {
          const itemDate = new Date(item.tanggal_pembelian || item.tanggal);
          matchesDate =
            itemDate >= dateRange.start && itemDate <= dateRange.end;
        } else if (dateFilter === "custom") {
          matchesDate = false;
        }
      }

      return (
        matchesSearch && matchesJenisPembelian && matchesDate && matchesDivisi
      );
    });

    // Total pembelian keseluruhan (ready + booked)
    const totalPembelian = allDataFiltered.filter(
      (item) =>
        item.status === "ready" ||
        item.status === "booked" ||
        item.status === "sold"
    ).length;

    // Total ready dari data yang sudah difilter dengan semua filter termasuk status
    const totalReady = filteredData.filter(
      (item) => item.status === "ready"
    ).length;

    // Total nilai keseluruhan (ready + booked)
    const totalNilai = allDataFiltered.reduce((sum, item) => {
      if (item.status === "ready" && item.source === "pembelian") {
        // Untuk pembelian status ready: prioritas harga_final, fallback ke harga_beli
        return sum + (item.harga_final || item.harga_beli || 0);
      } else if (item.status === "booked" && item.source === "penjualan") {
        // Untuk penjualan status booked: menggunakan harga_beli dari pembelian terkait
        return sum + (item.harga_beli || 0);
      } else {
        // Untuk status lainnya: tidak dihitung
        return sum;
      }
    }, 0);

    return { totalPembelian, totalReady, totalNilai };
  }, [
    pembelianDataRaw,
    penjualanDataRaw,
    filteredData,
    searchTerm,
    selectedJenisPembelian,
    dateFilter,
    customStartDate,
    customEndDate,
    selectedDivision,
  ]);

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
    setQcForm((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!validateFormData(formData)) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive",
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
          variant: "destructive",
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
          description:
            "Total sumber dana 1 dan sumber dana 2 tidak sama dengan harga beli",
          variant: "destructive",
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
      tanggal_update: new Date().toISOString().split("T")[0],
      harga_beli_dasar: (
        pembelian.harga_final || pembelian.harga_beli
      ).toString(),
      biaya_pajak: "",
      biaya_qc: "",
      biaya_lain_lain: "",
      keterangan_biaya_lain: "",
      reason: "",
      company_id: pembelian.sumber_dana_1_id?.toString() || "",
    });
    setIsUpdateHargaDialogOpen(true);
  };

  const handleQC = (pembelian: any) => {
    setQCPembelian(pembelian);
    setQcForm({
      tanggal_qc: new Date().toISOString().split("T")[0],
      jenis_qc: "",
      total_pengeluaran: "",
      keterangan: "",
    });
    setIsQCDialogOpen(true);
  };

  const loadQcHistory = async (pembelianId: number) => {
    try {
      const { data, error } = await supabase
        .from("qc_history")
        .select("*")
        .eq("pembelian_id", pembelianId)
        .order("tanggal_qc", { ascending: false });

      if (error) throw error;
      setQcHistory(data || []);
    } catch (error) {
      console.error("Error loading QC history:", error);
      toast({
        title: "Error",
        description: "Gagal memuat history QC",
        variant: "destructive",
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

  const handleQCReport = (pembelian: any) => {
    setQCReportPembelian(pembelian);
    setIsQCReportDialogOpen(true);
  };

  const closeAllDialogs = () => {
    setIsViewDialogOpen(false);
    setIsUpdateHargaDialogOpen(false);
    setIsUpdateHargaCalendarOpen(false);
    setIsQCDialogOpen(false);
    setIsQcHistoryDialogOpen(false);
    setIsPriceHistoryDialogOpen(false);
    setViewingPembelian(null);
    setUpdatingHargaPembelian(null);
    setQCPembelian(null);
    setUpdateHargaForm({
      tanggal_update: new Date().toISOString().split("T")[0],
      harga_beli_dasar: "",
      biaya_pajak: "",
      biaya_qc: "",
      biaya_lain_lain: "",
      keterangan_biaya_lain: "",
      company_id: "",
      reason: "",
    });
    setQcForm({
      tanggal_qc: new Date().toISOString().split("T")[0],
      jenis_qc: "",
      total_pengeluaran: "",
      keterangan: "",
    });
    setQcHistory([]);
  };

  const handleUpdateHargaSubmit = async () => {
    if (
      !updateHargaForm.harga_beli_dasar ||
      !updateHargaForm.reason ||
      !updateHargaForm.company_id ||
      !updateHargaForm.tanggal_update ||
      !updatingHargaPembelian
    ) {
      toast({
        title: "Error",
        description:
          "Mohon lengkapi field yang wajib diisi (Tanggal Update, Harga Beli Dasar, Perusahaan, dan Alasan Update)",
        variant: "destructive",
      });
      return;
    }

    const hargaBeliBaru = parseFloat(
      parseNumericInput(updateHargaForm.harga_beli_dasar)
    );
    const biayaPajak =
      parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || 0;
    const biayaQC =
      parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || 0;
    const biayaLainLain =
      parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || 0;

    if (isNaN(hargaBeliBaru) || hargaBeliBaru <= 0) {
      toast({
        title: "Error",
        description: "Harga Beli Dasar harus berupa angka yang valid",
        variant: "destructive",
      });
      return;
    }

    // Validasi keterangan biaya lain jika biaya lain-lain diisi
    if (biayaLainLain > 0 && !updateHargaForm.keterangan_biaya_lain.trim()) {
      toast({
        title: "Error",
        description:
          "Keterangan Biaya Lain wajib diisi jika Biaya Lain-Lain diisi",
        variant: "destructive",
      });
      return;
    }

    // Hitung harga final
    const hargaFinal = hargaBeliBaru + biayaPajak + biayaQC + biayaLainLain;
    const hargaLama =
      updatingHargaPembelian.harga_final ||
      updatingHargaPembelian.harga_beli ||
      0;
    const selisihHarga = hargaFinal - hargaLama;

    console.log("Debug Update Harga:", {
      hargaLama,
      hargaFinal,
      selisihHarga,
      updatingHargaPembelian: {
        harga_final: updatingHargaPembelian.harga_final,
        harga_beli: updatingHargaPembelian.harga_beli,
      },
    });

    try {
      // 1. Insert ke price_histories_pembelian dulu
      const { error: historyError } = await supabase
        .from("price_histories_pembelian")
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
          tanggal_update: updateHargaForm.tanggal_update,
          user_id: null,
        });

      if (historyError) throw historyError;

      // 2. Update harga_final di pembelian
      const { error: updateHargaError } = await supabase
        .from("pembelian")
        .update({ harga_final: hargaFinal })
        .eq("id", updatingHargaPembelian.id);

      if (updateHargaError) throw updateHargaError;

      // 3. Selalu buat entry pembukuan untuk tracking, tidak peduli selisih harga
      // Update modal company
      const { data: company, error: companyFetchError } = await supabase
        .from("companies")
        .select("modal")
        .eq("id", parseInt(updateHargaForm.company_id))
        .single();

      if (companyFetchError) throw companyFetchError;

      const { error: updateModalError } = await supabase
        .from("companies")
        .update({ modal: company.modal - selisihHarga })
        .eq("id", parseInt(updateHargaForm.company_id));

      if (updateModalError) throw updateModalError;

      // PERBAIKAN: Selalu insert ke pembukuan untuk tracking
      const pembukuanData = {
        tanggal: updateHargaForm.tanggal_update,
        divisi: updatingHargaPembelian.divisi,
        cabang_id: updatingHargaPembelian.cabang_id,
        keterangan: `Update harga motor ${
          updatingHargaPembelian.brands?.name || ""
        } ${updatingHargaPembelian.jenis_motor?.jenis_motor || ""} ${
          updatingHargaPembelian.plat_nomor
        } - ${updateHargaForm.reason}`,
        debit: selisihHarga > 0 ? selisihHarga : 0,
        kredit: selisihHarga < 0 ? Math.abs(selisihHarga) : 0,
        saldo: 0,
        pembelian_id: updatingHargaPembelian.id,
        company_id: parseInt(updateHargaForm.company_id),
      };

      const { data: insertResult, error: pembukuanError } = await supabase
        .from("pembukuan")
        .insert([pembukuanData])
        .select();

      if (pembukuanError) {
        console.error("Error insert pembukuan:", pembukuanError);
        throw pembukuanError;
      }

      console.log("Berhasil insert ke pembukuan:", insertResult);

      // Success toast
      toast({
        title: "Sukses",
        description:
          selisihHarga > 0
            ? "Harga berhasil diupdate, history tersimpan, dan modal telah dikurangi"
            : "Harga berhasil diupdate dan history tersimpan",
      });
      closeAllDialogs();
    } catch (error) {
      console.error("Error dalam update harga:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan history harga atau update pembukuan",
        variant: "destructive",
      });
    }
  };

  const handleQCSubmit = async () => {
    if (
      !qcForm.tanggal_qc ||
      !qcForm.jenis_qc ||
      !qcForm.total_pengeluaran ||
      !qcPembelian
    ) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const totalPengeluaran = parseFloat(
      parseNumericInput(qcForm.total_pengeluaran)
    );

    if (isNaN(totalPengeluaran) || totalPengeluaran <= 0) {
      toast({
        title: "Error",
        description: "Total pengeluaran harus berupa angka yang valid",
        variant: "destructive",
      });
      return;
    }

    try {
      // Insert ke tabel qc_history
      const { error: qcHistoryError } = await supabase
        .from("qc_history")
        .insert({
          pembelian_id: qcPembelian.id,
          tanggal_qc: qcForm.tanggal_qc,
          jenis_qc: qcForm.jenis_qc,
          total_pengeluaran: totalPengeluaran,
          keterangan: qcForm.keterangan || null,
          user_id: null,
        });

      if (qcHistoryError) throw qcHistoryError;

      // Catat ke pembukuan sebagai pengeluaran (debit)
      const pembukuanData = {
        tanggal: qcForm.tanggal_qc,
        divisi: qcPembelian.divisi,
        cabang_id: qcPembelian.cabang_id,
        keterangan: `QC ${qcForm.jenis_qc} - Motor ${
          qcPembelian.plat_nomor
        } - ${qcForm.keterangan || ""}`,
        debit: totalPengeluaran,
        pembelian_id: qcPembelian.id,
        company_id: qcPembelian.sumber_dana_1_id,
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
      const hargaFinalBaru =
        (qcPembelian.harga_final || qcPembelian.harga_beli) + totalPengeluaran;

      updateMutation.mutate(
        {
          id: qcPembelian.id,
          data: { harga_final: hargaFinalBaru },
        },
        {
          onSuccess: () => {
            toast({
              title: "Sukses",
              description:
                "QC berhasil disimpan, pembukuan tercatat, modal dikurangi, dan harga final diupdate",
            });
            closeAllDialogs();
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Gagal mengupdate harga final",
              variant: "destructive",
            });
          },
        }
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data QC atau update pembukuan",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedJenisPembelian("all");
    setDateFilter("all");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    resetPage();
  };

  // View Report QC - berdasarkan periode yang dipilih di filter pembelian
  const handleViewQcReport = async () => {
    try {
      // Dapatkan date range berdasarkan filter yang dipilih
      let start: Date;
      let end: Date;

      const now = new Date();

      switch (dateFilter) {
        case "today":
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case "tomorrow":
          const tomorrow = addDays(now, 1);
          start = startOfDay(tomorrow);
          end = endOfDay(tomorrow);
          break;
        case "yesterday":
          const yesterday = subDays(now, 1);
          start = startOfDay(yesterday);
          end = endOfDay(yesterday);
          break;
        case "this_week":
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case "last_week":
          const lastWeek = subWeeks(now, 1);
          start = startOfWeek(lastWeek, { weekStartsOn: 1 });
          end = endOfWeek(lastWeek, { weekStartsOn: 1 });
          break;
        case "this_month":
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case "last_month":
          const lastMonth = subMonths(now, 1);
          start = startOfMonth(lastMonth);
          end = endOfMonth(lastMonth);
          break;
        case "this_year":
          start = startOfYear(now);
          end = endOfYear(now);
          break;
        case "last_year":
          const lastYear = subYears(now, 1);
          start = startOfYear(lastYear);
          end = endOfYear(lastYear);
          break;
        case "custom":
          if (customStartDate && customEndDate) {
            start = startOfDay(customStartDate);
            end = endOfDay(customEndDate);
          } else {
            // Default ke bulan ini jika custom date belum dipilih
            start = startOfMonth(now);
            end = endOfMonth(now);
          }
          break;
        default:
          // Default ke semua tanggal
          start = new Date(2000, 0, 1);
          end = new Date(2099, 11, 31);
      }

      // Ambil qc_report berdasarkan range tanggal (tanpa join untuk avoid PGRST201)
      const { data: qcReportRaw, error } = await supabase
        .from("qc_report" as any)
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (error) throw error;

      // Ambil pembelian dengan join ke brands dan jenis_motor, filter berdasarkan divisi
      let pembelianQuery = supabase
        .from("pembelian")
        .select(
          `
          *,
          brands:brand_id(name),
          jenis_motor:jenis_motor_id(jenis_motor)
        `
        )
        .eq("status", "ready"); // Filter hanya motor dengan status ready

      // Filter berdasarkan divisi yang dipilih
      if (selectedDivision !== "all") {
        pembelianQuery = pembelianQuery.eq("divisi", selectedDivision);
      }

      const { data: pembelianAll, error: pembelianError } =
        await pembelianQuery;

      if (pembelianError) throw pembelianError;

      // Create map untuk quick lookup
      const pembelianMap = new Map();
      (pembelianAll || []).forEach((p: any) => {
        pembelianMap.set(p.id, p);
      });

      // Enrich qc_report dengan data pembelian (otomatis terfilter karena hanya pembelian dari divisi terpilih)
      const enrichedData = (qcReportRaw || [])
        .map((q: any) => {
          const pembelian = pembelianMap.get(q.pembelian_id);
          if (!pembelian) return null; // Skip jika pembelian tidak ada di divisi yang dipilih
          return {
            ...q,
            pembelian: pembelian,
          };
        })
        .filter(Boolean);

      // Sort: Brand A->Z, Jenis A->Z, Tanggal newest-first
      const sortedData = enrichedData.sort((a: any, b: any) => {
        const brandA = (a.pembelian?.brands?.name || "").toLowerCase();
        const brandB = (b.pembelian?.brands?.name || "").toLowerCase();
        const brandCompare = brandA.localeCompare(brandB);
        if (brandCompare !== 0) return brandCompare;

        const jenisA = (
          a.pembelian?.jenis_motor?.jenis_motor || ""
        ).toLowerCase();
        const jenisB = (
          b.pembelian?.jenis_motor?.jenis_motor || ""
        ).toLowerCase();
        const jenisCompare = jenisA.localeCompare(jenisB);
        if (jenisCompare !== 0) return jenisCompare;

        const dateA = new Date(
          a.pembelian?.tanggal_pembelian || a.created_at || 0
        ).getTime();
        const dateB = new Date(
          b.pembelian?.tanggal_pembelian || b.created_at || 0
        ).getTime();
        return dateB - dateA;
      });

      setViewQCReportData(sortedData);
      setSelectedQCReports([]);
      setCurrentQCPage(1);
      setQcReportSearchTerm("");
      setQcReportSortBy("brand");
      setQcReportSortOrder("asc");
      setIsViewQCReportDialogOpen(true);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Gagal memuat Report QC",
        variant: "destructive",
      });
    }
  };

  // Handle checkbox select all untuk QC Report (hanya select data yang terfilter)
  const handleSelectAllQCReports = (checked: boolean, filteredData: any[]) => {
    if (checked) {
      const allIds = filteredData.map((item) => item.id);
      setSelectedQCReports(allIds);
    } else {
      setSelectedQCReports([]);
    }
  };

  // Handle checkbox individual untuk QC Report
  const handleSelectQCReport = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedQCReports((prev) => [...prev, id]);
    } else {
      setSelectedQCReports((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  // Handle Verified QC
  const handleVerifiedQC = async () => {
    if (selectedQCReports.length === 0) {
      toast({
        title: "Peringatan",
        description: "Pilih minimal satu data untuk diverifikasi",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingQC(true);
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Get user profile untuk mendapatkan nama
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const verifiedBy =
        profile?.full_name || profile?.email || user.email || "Unknown User";

      // Update semua qc_report yang dipilih
      const { error: updateError } = await supabase
        .from("qc_report")
        .update({
          verified: true,
          verified_by: verifiedBy,
          verified_at: new Date().toISOString(),
        })
        .in("id", selectedQCReports);

      if (updateError) throw updateError;

      // Refresh data
      await handleViewQcReport();

      toast({
        title: "Sukses",
        description: `${selectedQCReports.length} data QC berhasil diverifikasi`,
      });

      setSelectedQCReports([]);
    } catch (error: any) {
      console.error("Error verifying QC:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal memverifikasi data QC",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingQC(false);
    }
  };

  // Handler untuk membuka dialog update QC (tanggal & real nominal)
  const handleOpenUpdateTanggalSelesai = () => {
    if (selectedQCReports.length === 0) {
      toast({
        title: "Peringatan",
        description: "Pilih minimal satu unit untuk diupdate",
        variant: "destructive",
      });
      return;
    }

    // Initialize form untuk tanggal dan real nominal
    const initialTanggalForm: { [key: string]: string } = {};
    const initialRealNominalForm: { [key: string]: string } = {};

    selectedQCReports.forEach((id) => {
      const qcData = viewQCReportData.find((item) => item.id === id);
      // Jika sudah ada tanggal_selesai_qc, gunakan itu. Jika belum, gunakan tanggal hari ini
      initialTanggalForm[id] =
        qcData?.tanggal_selesai_qc || new Date().toISOString().split("T")[0];
      // Set real_qc yang sudah ada atau kosongkan
      initialRealNominalForm[id] = qcData?.real_qc
        ? String(qcData.real_qc)
        : "";
    });

    setTanggalSelesaiQCForm(initialTanggalForm);
    setRealNominalQCForm(initialRealNominalForm);
    setIsUpdateTanggalSelesaiDialogOpen(true);
  };

  // Handler untuk save QC (tanggal selesai & real nominal)
  const handleSaveTanggalSelesaiQC = async () => {
    setIsUpdatingTanggalSelesai(true);
    try {
      // Update setiap QC report yang dipilih
      const updates = selectedQCReports.map((id) => {
        const updateData: any = {
          tanggal_selesai_qc: tanggalSelesaiQCForm[id],
        };

        // Tambahkan real_qc jika ada input
        if (realNominalQCForm[id] && realNominalQCForm[id].trim() !== "") {
          // Parse nominal, remove dots and convert to number
          const nominalStr = realNominalQCForm[id].replace(/\./g, "");
          const nominal = parseFloat(nominalStr);
          if (!isNaN(nominal)) {
            updateData.real_qc = nominal;
          }
        }

        return supabase.from("qc_report").update(updateData).eq("id", id);
      });

      const results = await Promise.all(updates);

      // Check for errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        throw new Error("Gagal mengupdate beberapa data");
      }

      // Refresh data
      await handleViewQcReport();

      toast({
        title: "Sukses",
        description: `${selectedQCReports.length} unit berhasil diupdate`,
      });

      setIsUpdateTanggalSelesaiDialogOpen(false);
      setSelectedQCReports([]);
      setTanggalSelesaiQCForm({});
      setRealNominalQCForm({});
    } catch (error: any) {
      console.error("Error updating QC:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate QC",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTanggalSelesai(false);
    }
  };

  // Helper untuk generate label periode
  const getQCReportPeriodLabel = () => {
    if (dateFilter === "today") return "Hari Ini";
    if (dateFilter === "yesterday") return "Kemarin";
    if (dateFilter === "tomorrow") return "Besok";
    if (dateFilter === "this_week") return "Minggu Ini";
    if (dateFilter === "last_week") return "Minggu Lalu";
    if (dateFilter === "this_month") return "Bulan Ini";
    if (dateFilter === "last_month") return "Bulan Lalu";
    if (dateFilter === "this_year") return "Tahun Ini";
    if (dateFilter === "last_year") return "Tahun Lalu";
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      return `${format(customStartDate, "dd/MM/yyyy")} - ${format(
        customEndDate,
        "dd/MM/yyyy"
      )}`;
    }
    return "Semua Periode";
  };

  // Filter dan Sort untuk QC Report
  const filteredAndSortedQCData = useMemo(() => {
    let filtered = [...viewQCReportData];

    // Filter berdasarkan search term
    if (qcReportSearchTerm.trim()) {
      const searchLower = qcReportSearchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        const brand = (item.pembelian?.brands?.name || "").toLowerCase();
        const jenis = (
          item.pembelian?.jenis_motor?.jenis_motor || ""
        ).toLowerCase();
        const plat = (item.pembelian?.plat_nomor || "").toLowerCase();
        return (
          brand.includes(searchLower) ||
          jenis.includes(searchLower) ||
          plat.includes(searchLower)
        );
      });
    }

    // Sort berdasarkan pilihan user
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (qcReportSortBy) {
        case "brand":
          const brandA = (a.pembelian?.brands?.name || "").toLowerCase();
          const brandB = (b.pembelian?.brands?.name || "").toLowerCase();
          compareValue = brandA.localeCompare(brandB);
          break;
        case "jenis_motor":
          const jenisA = (
            a.pembelian?.jenis_motor?.jenis_motor || ""
          ).toLowerCase();
          const jenisB = (
            b.pembelian?.jenis_motor?.jenis_motor || ""
          ).toLowerCase();
          compareValue = jenisA.localeCompare(jenisB);
          break;
        case "plat_nomor":
          const platA = (a.pembelian?.plat_nomor || "").toLowerCase();
          const platB = (b.pembelian?.plat_nomor || "").toLowerCase();
          compareValue = platA.localeCompare(platB);
          break;
        case "tanggal":
          const dateA = new Date(a.pembelian?.tanggal_pembelian || 0).getTime();
          const dateB = new Date(b.pembelian?.tanggal_pembelian || 0).getTime();
          compareValue = dateA - dateB;
          break;
        case "estimasi_tanggal":
          const estTanggalA = new Date(
            a.estimasi_tanggal_selesai || 0
          ).getTime();
          const estTanggalB = new Date(
            b.estimasi_tanggal_selesai || 0
          ).getTime();
          compareValue = estTanggalA - estTanggalB;
          break;
        case "estimasi":
          compareValue =
            (a.estimasi_nominal_qc ?? 0) - (b.estimasi_nominal_qc ?? 0);
          break;
        case "real":
          compareValue = (a.real_nominal_qc ?? 0) - (b.real_nominal_qc ?? 0);
          break;
        case "status":
          const statusA = (a.real_nominal_qc ?? 0) !== 0 ? 1 : 0;
          const statusB = (b.real_nominal_qc ?? 0) !== 0 ? 1 : 0;
          compareValue = statusA - statusB;
          break;
        default:
          compareValue = 0;
      }

      return qcReportSortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [viewQCReportData, qcReportSearchTerm, qcReportSortBy, qcReportSortOrder]);

  // Pagination untuk QC Report (menggunakan data yang sudah difilter dan disort)
  const totalQCPages = Math.ceil(
    filteredAndSortedQCData.length / qcReportPageSize
  );
  const startQCIndex = (currentQCPage - 1) * qcReportPageSize;
  const endQCIndex = startQCIndex + qcReportPageSize;
  const currentQCData = filteredAndSortedQCData.slice(startQCIndex, endQCIndex);

  // Debug: Check permission untuk View Report QC
  console.log("🔍 PembelianPage Debug: Checking view_report_qc permission...");
  const canViewReportQC = hasPermission("view_report_qc");
  console.log("🔍 PembelianPage Debug: canViewReportQC =", canViewReportQC);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Pembelian</h1>
        <div className="flex items-center gap-2">
          {/* Button View Report QC - Hanya untuk QC role atau yang punya permission view_report_qc */}
          {canViewReportQC && (
            <Button variant="outline" onClick={handleViewQcReport}>
              <Eye className="w-4 h-4 mr-2" />
              View Report QC
            </Button>
          )}
          {/* Button Tambah - Hanya untuk yang punya permission create_data */}
          {console.log(
            "🔍 PembelianPage Debug: Checking create_data permission..."
          )}
          {hasPermission("create_data") && (
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
          )}
        </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Cari plat nomor, brand, jenis motor, cabang..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Jenis Pembelian */}
                <div>
                  <Label htmlFor="jenisPembelian">Jenis Pembelian</Label>
                  <Select
                    value={selectedJenisPembelian}
                    onValueChange={setSelectedJenisPembelian}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jenis Transaksi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Jenis</SelectItem>
                      <SelectItem value="Tukar Tambah">Tukar Tambah</SelectItem>
                      <SelectItem value="Bukan Tukar Tambah">
                        Bukan Tukar Tambah
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Filter */}
                <div>
                  <Label htmlFor="dateFilter">Filter Periode</Label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Filter Tanggal" />
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
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customStartDate
                            ? format(customStartDate, "dd/MM/yyyy")
                            : "Pilih tanggal mulai"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customStartDate}
                          onSelect={(date) => date && setCustomStartDate(date)}
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
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customEndDate
                            ? format(customEndDate, "dd/MM/yyyy")
                            : "Pilih tanggal selesai"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customEndDate}
                          onSelect={(date) => date && setCustomEndDate(date)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Sort and Pagination Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                {/* Sort By */}
                <div>
                  <Label htmlFor="sortBy">Urutkan Berdasarkan</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Sorting" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tanggal_pembelian">
                        Tanggal Pembelian
                      </SelectItem>
                      <SelectItem value="brand">Brand</SelectItem>
                      <SelectItem value="jenis_motor">Jenis Motor</SelectItem>
                      <SelectItem value="plat_nomor">Plat Nomor</SelectItem>
                      <SelectItem value="harga_beli">Harga Beli</SelectItem>
                      <SelectItem value="cabang">Cabang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div>
                  <Label htmlFor="sortOrder">Urutan</Label>
                  <Select
                    value={sortOrder}
                    onValueChange={(value) =>
                      setSortOrder(value as "asc" | "desc")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Urutan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">
                        {sortBy === "tanggal_pembelian" ||
                        sortBy === "harga_beli"
                          ? "Terlama / Terendah"
                          : "A - Z"}
                      </SelectItem>
                      <SelectItem value="desc">
                        {sortBy === "tanggal_pembelian" ||
                        sortBy === "harga_beli"
                          ? "Terbaru / Tertinggi"
                          : "Z - A"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Page Size */}
                <div>
                  <Label htmlFor="pageSize">Items per halaman</Label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      resetPage();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per halaman</SelectItem>
                      <SelectItem value="25">25 per halaman</SelectItem>
                      <SelectItem value="50">50 per halaman</SelectItem>
                      <SelectItem value="100">100 per halaman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Data Summary and Reset */}
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
                      Total Unit{" "}
                      {dateFilter !== "all"
                        ? `(${dateFilter.replace("_", " ")})`
                        : ""}
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
                      Ready (Status Ready){" "}
                      {dateFilter !== "all"
                        ? `(${dateFilter.replace("_", " ")})`
                        : ""}
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
                      Total Nilai (Ready+Booked){" "}
                      {dateFilter !== "all"
                        ? `(${dateFilter.replace("_", " ")})`
                        : ""}
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
            handleQCReport={handleQCReport}
            handleViewQcHistory={handleViewQcHistory}
            handleViewPriceHistory={handleViewPriceHistory}
            handleViewQcReport={handleViewQcReport}
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

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => goToPage(page)}
                    size="sm"
                  >
                    {page}
                  </Button>
                )
              )}

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
                    <p>
                      {new Date(
                        viewingPembelian.tanggal_pembelian
                      ).toLocaleDateString("id-ID")}
                    </p>
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
                    <p>{viewingPembelian.keterangan || "-"}</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Update Harga Dialog */}
          <Dialog
            open={isUpdateHargaDialogOpen}
            onOpenChange={setIsUpdateHargaDialogOpen}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Update Harga Pembelian Motor</DialogTitle>
              </DialogHeader>
              {updatingHargaPembelian && (
                <div className="space-y-4">
                  {/* Motor Info - Compact */}
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="font-medium">
                      {updatingHargaPembelian.jenis_motor?.jenis_motor}
                    </p>
                    <p className="text-sm text-gray-600">
                      Plat: {updatingHargaPembelian.plat_nomor}
                    </p>
                  </div>

                  {/* Tanggal Update Field */}
                  <div>
                    <Label htmlFor="tanggal-update">Tanggal Update *</Label>
                    <Popover
                      open={isUpdateHargaCalendarOpen}
                      onOpenChange={setIsUpdateHargaCalendarOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {updateHargaForm.tanggal_update
                            ? format(
                                new Date(updateHargaForm.tanggal_update),
                                "dd/MM/yyyy"
                              )
                            : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            updateHargaForm.tanggal_update
                              ? new Date(updateHargaForm.tanggal_update)
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              // Gunakan format lokal tanpa konversi UTC
                              const year = date.getFullYear();
                              const month = String(
                                date.getMonth() + 1
                              ).padStart(2, "0");
                              const day = String(date.getDate()).padStart(
                                2,
                                "0"
                              );
                              const localDateString = `${year}-${month}-${day}`;

                              setUpdateHargaForm((prev) => ({
                                ...prev,
                                tanggal_update: localDateString,
                              }));
                              setIsUpdateHargaCalendarOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Form Fields - Grid Layout */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="harga-beli-dasar">
                        Harga Beli Dasar *
                      </Label>
                      <Input
                        id="harga-beli-dasar"
                        type="text"
                        value={formatNumberInput(
                          updateHargaForm.harga_beli_dasar
                        )}
                        onChange={(e) =>
                          setUpdateHargaForm((prev) => ({
                            ...prev,
                            harga_beli_dasar: parseNumericInput(e.target.value),
                          }))
                        }
                        placeholder="Harga beli dasar"
                      />
                    </div>
                    <div>
                      <Label htmlFor="biaya-pajak">Biaya Pajak</Label>
                      <Input
                        id="biaya-pajak"
                        type="text"
                        value={formatNumberInput(updateHargaForm.biaya_pajak)}
                        onChange={(e) =>
                          setUpdateHargaForm((prev) => ({
                            ...prev,
                            biaya_pajak: parseNumericInput(e.target.value),
                          }))
                        }
                        placeholder="Biaya pajak"
                      />
                    </div>
                    <div>
                      <Label htmlFor="biaya-qc">Biaya QC</Label>
                      <Input
                        id="biaya-qc"
                        type="text"
                        value={formatNumberInput(updateHargaForm.biaya_qc)}
                        onChange={(e) =>
                          setUpdateHargaForm((prev) => ({
                            ...prev,
                            biaya_qc: parseNumericInput(e.target.value),
                          }))
                        }
                        placeholder="Biaya QC"
                      />
                    </div>
                    <div>
                      <Label htmlFor="biaya-lain-lain">Biaya Lain-Lain</Label>
                      <Input
                        id="biaya-lain-lain"
                        type="text"
                        value={formatNumberInput(
                          updateHargaForm.biaya_lain_lain
                        )}
                        onChange={(e) =>
                          setUpdateHargaForm((prev) => ({
                            ...prev,
                            biaya_lain_lain: parseNumericInput(e.target.value),
                          }))
                        }
                        placeholder="Biaya lain-lain"
                      />
                    </div>
                  </div>

                  {/* Conditional Fields */}
                  {updateHargaForm.biaya_lain_lain && (
                    <div>
                      <Label htmlFor="keterangan-biaya-lain">
                        Keterangan Biaya Lain *
                      </Label>
                      <Input
                        id="keterangan-biaya-lain"
                        value={updateHargaForm.keterangan_biaya_lain}
                        onChange={(e) =>
                          setUpdateHargaForm((prev) => ({
                            ...prev,
                            keterangan_biaya_lain: e.target.value,
                          }))
                        }
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
                        onValueChange={(value) =>
                          setUpdateHargaForm((prev) => ({
                            ...prev,
                            company_id: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                          {companiesData?.map((company) => (
                            <SelectItem
                              key={company.id}
                              value={company.id.toString()}
                            >
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
                        onChange={(e) =>
                          setUpdateHargaForm((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                        placeholder="Alasan update harga"
                      />
                    </div>
                  </div>

                  {/* Preview - Compact */}
                  <div className="bg-green-50 p-3 rounded-md flex justify-between items-center">
                    <span className="text-sm font-medium">Harga Final:</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(
                        (parseFloat(
                          parseNumericInput(updateHargaForm.harga_beli_dasar)
                        ) || 0) +
                          (parseFloat(
                            parseNumericInput(updateHargaForm.biaya_pajak)
                          ) || 0) +
                          (parseFloat(
                            parseNumericInput(updateHargaForm.biaya_qc)
                          ) || 0) +
                          (parseFloat(
                            parseNumericInput(updateHargaForm.biaya_lain_lain)
                          ) || 0)
                      )}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={closeAllDialogs}>
                      Batal
                    </Button>
                    <Button onClick={handleUpdateHargaSubmit}>
                      Update Harga
                    </Button>
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
                    <p className="text-sm text-gray-600">
                      Plat: {qcPembelian.plat_nomor}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="tanggal-qc">Tanggal QC *</Label>
                    <Input
                      id="tanggal-qc"
                      type="date"
                      value={qcForm.tanggal_qc}
                      onChange={(e) =>
                        setQcForm((prev) => ({
                          ...prev,
                          tanggal_qc: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="jenis-qc">Jenis QC *</Label>
                    <Select
                      value={qcForm.jenis_qc}
                      onValueChange={(value) =>
                        setQcForm((prev) => ({ ...prev, jenis_qc: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Jenis QC" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Penggantian Sparepart">
                          Penggantian Sparepart
                        </SelectItem>
                        <SelectItem value="Service Mesin">
                          Service Mesin
                        </SelectItem>
                        <SelectItem value="Perbaikan Body">
                          Perbaikan Body
                        </SelectItem>
                        <SelectItem value="Penggantian Oli">
                          Penggantian Oli
                        </SelectItem>
                        <SelectItem value="Tune Up">Tune Up</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="total-pengeluaran">
                      Total Pengeluaran *
                    </Label>
                    <Input
                      id="total-pengeluaran"
                      type="text"
                      value={qcForm.total_pengeluaran}
                      onChange={(e) =>
                        handleQcNumericChange(
                          "total_pengeluaran",
                          e.target.value
                        )
                      }
                      placeholder="Contoh: 1.000.000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="keterangan-qc">Keterangan</Label>
                    <Textarea
                      id="keterangan-qc"
                      value={qcForm.keterangan}
                      onChange={(e) =>
                        setQcForm((prev) => ({
                          ...prev,
                          keterangan: e.target.value,
                        }))
                      }
                      placeholder="Masukkan keterangan QC..."
                      className="h-24"
                    />
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={closeAllDialogs}>
                      Batal
                    </Button>
                    <Button onClick={handleQCSubmit}>Simpan QC</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* QC History Dialog */}
          <Dialog
            open={isQcHistoryDialogOpen}
            onOpenChange={setIsQcHistoryDialogOpen}
          >
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>History Quality Control</DialogTitle>
              </DialogHeader>
              {viewingPembelian && (
                <div className="space-y-4">
                  <div>
                    <Label>
                      Motor: {viewingPembelian.jenis_motor?.jenis_motor}
                    </Label>
                    <p className="text-sm text-gray-600">
                      Plat: {viewingPembelian.plat_nomor}
                    </p>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {qcHistory.length > 0 ? (
                      <div className="space-y-3">
                        {qcHistory.map((qc: any, index: number) => (
                          <Card key={qc.id || index} className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">
                                  Tanggal QC:
                                </Label>
                                <p className="text-sm">
                                  {new Date(qc.tanggal_qc).toLocaleDateString(
                                    "id-ID"
                                  )}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">
                                  Jenis QC:
                                </Label>
                                <p className="text-sm">{qc.jenis_qc}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">
                                  Total Pengeluaran:
                                </Label>
                                <p className="text-sm font-semibold text-red-600">
                                  {formatCurrency(qc.total_pengeluaran)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">
                                  Keterangan:
                                </Label>
                                <p className="text-sm">
                                  {qc.keterangan || "-"}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        Belum ada history QC untuk motor ini
                      </p>
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

      {/* QC Report Dialog */}
      <QCReportDialog
        isOpen={isQCReportDialogOpen}
        onClose={() => setIsQCReportDialogOpen(false)}
        pembelian={qcReportPembelian}
      />

      {/* View All QC Report Dialog */}
      <Dialog
        open={isViewQCReportDialogOpen}
        onOpenChange={setIsViewQCReportDialogOpen}
      >
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-semibold">
                    {selectedDivision === "all"
                      ? "Semua Divisi"
                      : selectedDivision.toUpperCase()}
                  </span>
                  Report QC
                </DialogTitle>
                <DialogDescription className="mt-2">
                  Periode: {getQCReportPeriodLabel()} •{" "}
                  {viewQCReportData.length} unit total
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {viewQCReportData.length > 0 ? (
              <>
                {/* Search and Sort Controls - Modern Design */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Label
                        htmlFor="qcSearch"
                        className="text-sm font-semibold text-gray-700 mb-2 block"
                      >
                        🔍 Cari Data
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                        <Input
                          id="qcSearch"
                          placeholder="Ketik brand, jenis motor, atau plat nomor..."
                          value={qcReportSearchTerm}
                          onChange={(e) => {
                            setQcReportSearchTerm(e.target.value);
                            setCurrentQCPage(1);
                          }}
                          className="pl-11 h-11 border-blue-200 focus:border-blue-400 focus:ring-blue-400 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label
                          htmlFor="qcSortBy"
                          className="text-sm font-semibold text-gray-700 mb-2 block"
                        >
                          📊 Sort By
                        </Label>
                        <Select
                          value={qcReportSortBy}
                          onValueChange={setQcReportSortBy}
                        >
                          <SelectTrigger
                            id="qcSortBy"
                            className="h-11 border-blue-200 bg-white"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brand">Brand</SelectItem>
                            <SelectItem value="jenis_motor">
                              Jenis Motor
                            </SelectItem>
                            <SelectItem value="plat_nomor">
                              Plat Nomor
                            </SelectItem>
                            <SelectItem value="tanggal">
                              Tanggal Pembelian
                            </SelectItem>
                            <SelectItem value="estimasi_tanggal">
                              Estimasi Selesai
                            </SelectItem>
                            <SelectItem value="estimasi">
                              Estimasi QC
                            </SelectItem>
                            <SelectItem value="real">Real QC</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="qcSortOrder"
                          className="text-sm font-semibold text-gray-700 mb-2 block"
                        >
                          ⬍⬍ Urutan
                        </Label>
                        <Select
                          value={qcReportSortOrder}
                          onValueChange={(value: "asc" | "desc") =>
                            setQcReportSortOrder(value)
                          }
                        >
                          <SelectTrigger
                            id="qcSortOrder"
                            className="h-11 border-blue-200 bg-white"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">A → Z / ⬆</SelectItem>
                            <SelectItem value="desc">Z → A / ⬇</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Bar */}
                <div className="flex justify-between items-center px-4 py-3 bg-white rounded-lg border shadow-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">
                      Menampilkan{" "}
                      <span className="font-bold text-blue-600">
                        {startQCIndex + 1}-
                        {Math.min(endQCIndex, filteredAndSortedQCData.length)}
                      </span>{" "}
                      dari{" "}
                      <span className="font-bold text-blue-600">
                        {filteredAndSortedQCData.length}
                      </span>{" "}
                      data
                    </span>
                    {qcReportSearchTerm && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        Filtered dari {viewQCReportData.length} total
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      ✓ {selectedQCReports.length} dipilih
                    </span>
                  </span>
                </div>

                {/* Modern Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-blue-500 to-indigo-600">
                        <tr>
                          <th className="px-4 py-3 text-center">
                            <Checkbox
                              checked={
                                filteredAndSortedQCData.length > 0 &&
                                selectedQCReports.length ===
                                  filteredAndSortedQCData.length &&
                                filteredAndSortedQCData.every((item) =>
                                  selectedQCReports.includes(item.id)
                                )
                              }
                              onCheckedChange={(checked) =>
                                handleSelectAllQCReports(
                                  checked as boolean,
                                  filteredAndSortedQCData
                                )
                              }
                              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            No
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Jenis Motor
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Plat Nomor
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Tgl Pembelian
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Estimasi Selesai
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                            Tanggal Selesai QC
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                            Total Hari
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                            Estimasi QC
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                            Real QC
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                            Verified
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentQCData.map((item: any, idx: number) => {
                          const estimasi = item.estimasi_nominal_qc ?? 0;
                          const real = item.real_nominal_qc ?? 0;
                          const status = real !== 0 ? "Sudah QC" : "Belum QC";
                          const isSelected = selectedQCReports.includes(
                            item.id
                          );
                          const isVerified = item.verified === true;
                          const verifiedBy = item.verified_by || "";

                          return (
                            <tr
                              key={item.id || idx}
                              className={`transition-colors hover:bg-blue-50 ${
                                isSelected
                                  ? "bg-blue-100 border-l-4 border-l-blue-500"
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-3 text-center">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    handleSelectQCReport(
                                      item.id,
                                      checked as boolean
                                    )
                                  }
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {startQCIndex + idx + 1}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="font-semibold text-gray-900">
                                  {item.pembelian?.brands?.name || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {item.pembelian?.jenis_motor?.jenis_motor ||
                                  "-"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                  {item.pembelian?.plat_nomor || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {item.pembelian?.tanggal_pembelian
                                  ? new Date(
                                      item.pembelian.tanggal_pembelian
                                    ).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {item.estimasi_tanggal_selesai
                                  ? new Date(
                                      item.estimasi_tanggal_selesai
                                    ).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {item.tanggal_selesai_qc
                                  ? new Date(
                                      item.tanggal_selesai_qc
                                    ).toLocaleDateString("id-ID", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {(() => {
                                  // Hitung Total Hari: Tanggal Selesai QC - Estimasi Selesai
                                  if (
                                    !item.tanggal_selesai_qc ||
                                    !item.estimasi_tanggal_selesai
                                  ) {
                                    return (
                                      <span className="text-gray-400">-</span>
                                    );
                                  }

                                  const tanggalSelesai = new Date(
                                    item.tanggal_selesai_qc
                                  );
                                  const estimasiSelesai = new Date(
                                    item.estimasi_tanggal_selesai
                                  );
                                  const diffTime =
                                    tanggalSelesai.getTime() -
                                    estimasiSelesai.getTime();
                                  const totalHari = Math.ceil(
                                    diffTime / (1000 * 60 * 60 * 24)
                                  );

                                  // Ambil estimasi_hari_qc dari pembelian
                                  const estimasiHariQC =
                                    item.pembelian?.estimasi_hari_qc || 0;

                                  // Tentukan warna: merah jika > estimasi, hijau jika <= estimasi
                                  let colorClass = "text-green-600 font-bold";
                                  if (totalHari > estimasiHariQC) {
                                    colorClass = "text-red-600 font-bold";
                                  }

                                  return (
                                    <span className={`text-sm ${colorClass}`}>
                                      {totalHari} hari
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-orange-600">
                                Rp {estimasi.toLocaleString("id-ID")}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                                {real > 0
                                  ? `Rp ${real.toLocaleString("id-ID")}`
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {real !== 0 ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                    ✓ Sudah QC
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                    ⏳ Belum QC
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isVerified ? (
                                  <div className="flex flex-col items-center">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                      ✓ Verified
                                    </span>
                                    <span className="text-[10px] text-gray-500 mt-1">
                                      {verifiedBy}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">
                                    -
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border shadow-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentQCPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentQCPage === 1}
                    className="flex items-center gap-2"
                  >
                    ← Previous
                  </Button>
                  <span className="text-sm font-medium text-gray-700">
                    Page{" "}
                    <span className="font-bold text-blue-600">
                      {currentQCPage}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-blue-600">
                      {totalQCPages}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentQCPage((prev) =>
                        Math.min(totalQCPages, prev + 1)
                      )
                    }
                    disabled={currentQCPage === totalQCPages}
                    className="flex items-center gap-2"
                  >
                    Next →
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500 text-lg font-medium">
                  Tidak ada data QC untuk periode ini
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Silakan pilih periode lain atau tunggu data baru
                </p>
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4 bg-gray-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {selectedQCReports.length > 0 && (
                  <Button
                    variant="default"
                    onClick={handleOpenUpdateTanggalSelesai}
                    disabled={isUpdatingTanggalSelesai}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdatingTanggalSelesai ? (
                      <>
                        <span className="mr-2">⏳</span>
                        Mengupdate...
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Update QC ({selectedQCReports.length})
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="default"
                  onClick={handleVerifiedQC}
                  disabled={selectedQCReports.length === 0 || isVerifyingQC}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isVerifyingQC ? (
                    <>
                      <span className="mr-2">⏳</span>
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verified QC ({selectedQCReports.length})
                    </>
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsViewQCReportDialogOpen(false)}
                className="border-gray-300 hover:bg-gray-50"
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Update QC */}
      <Dialog
        open={isUpdateTanggalSelesaiDialogOpen}
        onOpenChange={setIsUpdateTanggalSelesaiDialogOpen}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update QC</DialogTitle>
            <DialogDescription>
              Mengupdate tanggal selesai QC dan real nominal QC untuk{" "}
              {selectedQCReports.length} unit yang dipilih
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">
                      No
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">
                      Brand
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">
                      Jenis Motor
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">
                      Plat Nomor
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">
                      Tanggal Selesai QC
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">
                      Real Nominal QC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQCReports.map((qcId, idx) => {
                    const qcData = viewQCReportData.find(
                      (item) => item.id === qcId
                    );
                    if (!qcData) return null;

                    return (
                      <tr key={qcId} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-sm">
                          {idx + 1}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm">
                          {qcData.pembelian?.brands?.name || "-"}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm">
                          {qcData.pembelian?.jenis_motor?.jenis_motor || "-"}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm font-semibold">
                          {qcData.pembelian?.plat_nomor || "-"}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Input
                            type="date"
                            value={tanggalSelesaiQCForm[qcId] || ""}
                            onChange={(e) =>
                              setTanggalSelesaiQCForm({
                                ...tanggalSelesaiQCForm,
                                [qcId]: e.target.value,
                              })
                            }
                            className="w-full"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Input
                            type="text"
                            placeholder="1.000.000"
                            value={realNominalQCForm[qcId] || ""}
                            onChange={(e) => {
                              // Format input dengan titik pemisah ribuan
                              const value = e.target.value.replace(/\D/g, "");
                              const formatted = value.replace(
                                /\B(?=(\d{3})+(?!\d))/g,
                                "."
                              );
                              setRealNominalQCForm({
                                ...realNominalQCForm,
                                [qcId]: formatted,
                              });
                            }}
                            className="w-full"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsUpdateTanggalSelesaiDialogOpen(false);
                setTanggalSelesaiQCForm({});
                setRealNominalQCForm({});
              }}
              disabled={isUpdatingTanggalSelesai}
            >
              Batal
            </Button>
            <Button
              variant="default"
              onClick={handleSaveTanggalSelesaiQC}
              disabled={isUpdatingTanggalSelesai}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpdatingTanggalSelesai ? (
                <>
                  <span className="mr-2">⏳</span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PembelianPageEnhanced;
