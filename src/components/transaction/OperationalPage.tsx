import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Settings,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ProfitAdjustmentSummary from "@/components/finance/ProfitAdjustmentSummary";
import { isMonthClosed, formatMonthYear } from "@/utils/monthValidation";
import RetroactiveOperationalDialog from "@/components/operational/RetroactiveOperationalDialog";
import DeleteOperationalHistoryDialog from "@/components/operational/DeleteOperationalHistoryDialog";

interface OperationalPageProps {
  selectedDivision: string;
}

interface DateRange {
  start: string;
  end: string;
}

const OperationalPage = ({ selectedDivision }: OperationalPageProps) => {
  const [operationalData, setOperationalData] = useState([]);
  const [companiesData, setCompaniesData] = useState([]);
  const [assetsData, setAssetsData] = useState([]); // ✅ NEW: For asset dropdown
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperational, setEditingOperational] = useState(null);

  // ✅ PERBAIKAN: Ganti dateFrom/dateTo dengan filter periode
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    kategori: "",
    nominal: "",
    deskripsi: "",
    sumber_dana: "",
    asset_id: "", // ✅ NEW: For special categories
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ✅ NEW: Special categories for divisi START only
  const specialCategories = [
    "Kasbon",
    "STARGAZER",
    "ASET LAINNYA",
    "Sewa Ruko",
  ];

  // ✅ NEW: Check if current category is special
  const isSpecialCategory = specialCategories.includes(formData.kategori);

  // ✅ NEW: Filter assets based on selected category
  const getFilteredAssets = () => {
    if (!formData.kategori || !isSpecialCategory) return [];

    console.log("🔍 Filtering assets for category:", formData.kategori);
    console.log(
      "🔍 Available assets:",
      assetsData.map((a) => ({ id: a.id, nama: a.nama }))
    );

    let filtered = [];

    switch (formData.kategori) {
      case "Kasbon":
        filtered = assetsData.filter(
          (asset) => asset.nama && asset.nama.toLowerCase().includes("kasbon")
        );
        break;
      case "STARGAZER":
        filtered = assetsData.filter(
          (asset) =>
            asset.nama && asset.nama.toLowerCase().includes("stargazer")
        );
        break;
      case "ASET LAINNYA":
        filtered = assetsData.filter(
          (asset) =>
            asset.nama && asset.nama.toLowerCase().includes("aset lainnya")
        );
        break;
      case "Sewa Ruko":
        filtered = assetsData.filter(
          (asset) =>
            asset.nama && asset.nama.toLowerCase().includes("sewa ruko")
        );
        break;
      default:
        filtered = [];
    }

    console.log(
      "🔍 Filtered result:",
      filtered.map((a) => ({ id: a.id, nama: a.nama }))
    );

    // ✅ FALLBACK: Jika tidak ada yang match, tampilkan semua assets sebagai opsi
    if (filtered.length === 0 && assetsData.length > 0) {
      console.warn(
        "⚠️ No matching assets found, showing all assets as fallback"
      );
      return assetsData;
    }

    return filtered;
  };

  const filteredAssets = getFilteredAssets();

  // ✅ Debug logs
  console.log("🔍 Special Category Debug:", {
    selectedCategory: formData.kategori,
    isSpecialCategory,
    assetsDataLength: assetsData.length,
    filteredAssetsLength: filteredAssets.length,
    filteredAssets: filteredAssets.map((a) => ({
      id: a.id,
      nama: a.nama,
    })),
  });

  // ✅ UPDATED: Categories based on division
  const categories =
    selectedDivision === "start"
      ? [
          "Operasional Kantor",
          "Transportasi",
          "Komunikasi",
          "Listrik & Air",
          "Maintenance",
          "Marketing",
          "Gaji Kurang Profit",
          "Gaji Kurang Modal",
          "Bonus Kurang Profit",
          "Bonus Kurang Modal",
          "Ops Bulanan Kurang Profit",
          "Ops Bulanan Kurang Modal",
          "OP Global",
          "Pajak & Retribusi",
          "Asuransi",
          "Kasbon", // ✅ NEW for START
          "STARGAZER", // ✅ NEW for START
          "ASET LAINNYA", // ✅ NEW for START
          "Sewa Ruko", // ✅ NEW for START
          "Lain-lain",
        ]
      : [
          "Operasional Kantor",
          "Transportasi",
          "Komunikasi",
          "Listrik & Air",
          "Maintenance",
          "Marketing",
          "Gaji Kurang Profit",
          "Gaji Kurang Modal",
          "Bonus Kurang Profit",
          "Bonus Kurang Modal",
          "Ops Bulanan Kurang Profit",
          "Ops Bulanan Kurang Modal",
          "OP Global",
          "Pajak & Retribusi",
          "Asuransi",
          "Lain-lain",
        ];

  // ✅ PERBAIKAN: Fungsi untuk mendapatkan range tanggal berdasarkan periode
  const getDateRange = (period: string): DateRange => {
    // Gunakan timezone lokal Indonesia (WIB/WITA/WIT)
    const now = new Date();

    // ✅ FIXED: Use actual current date instead of hardcoded test date
    const currentDate = now; // Use real current date

    // ✅ PERBAIKAN: Gunakan format YYYY-MM-DD langsung tanpa ISO conversion
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const todayFormatted = formatDate(currentDate);

    console.log("🕐 Current date calculation (FIXED):", {
      originalNow: now.toISOString(),
      currentDate: currentDate.toString(),
      todayFormatted,
      localDate: currentDate.toLocaleDateString("id-ID"),
      currentMonth: currentDate.getMonth() + 1, // +1 karena getMonth() dimulai dari 0
      currentYear: currentDate.getFullYear(),
    });

    switch (period) {
      case "today":
        return {
          start: todayFormatted,
          end: todayFormatted,
        };
      case "yesterday":
        const yesterday = new Date(currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: formatDate(yesterday),
          end: formatDate(yesterday),
        };
      case "this_week":
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        return {
          start: formatDate(startOfWeek),
          end: todayFormatted,
        };
      case "last_week":
        const lastWeekEnd = new Date(currentDate);
        lastWeekEnd.setDate(currentDate.getDate() - currentDate.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return {
          start: formatDate(lastWeekStart),
          end: formatDate(lastWeekEnd),
        };
      case "this_month":
        const startOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const result = {
          start: formatDate(startOfMonth),
          end: todayFormatted,
        };
        console.log("📅 THIS_MONTH date range:", {
          period: "this_month",
          startOfMonth: startOfMonth.toString(),
          today: currentDate.toString(),
          result,
          currentMonth: currentDate.getMonth() + 1,
          currentYear: currentDate.getFullYear(),
        });
        return result;
      case "last_month":
        const lastMonthStart = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          1
        );
        const lastMonthEnd = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          0
        );
        return {
          start: formatDate(lastMonthStart),
          end: formatDate(lastMonthEnd),
        };
      case "this_year":
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
        return {
          start: formatDate(startOfYear),
          end: todayFormatted,
        };
      case "last_year":
        const lastYearStart = new Date(currentDate.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(currentDate.getFullYear() - 1, 11, 31);
        return {
          start: formatDate(lastYearStart),
          end: formatDate(lastYearEnd),
        };
      case "custom":
        return {
          start: customStartDate || todayFormatted,
          end: customEndDate || todayFormatted,
        };
      default:
        return {
          start: todayFormatted,
          end: todayFormatted,
        };
    }
  };

  // ✅ PERBAIKAN: Update logika shouldUseCombined berdasarkan periode
  const shouldUseCombined = useMemo(() => {
    const periodsRequiringCombined = ["last_month", "this_year", "last_year"];

    if (periodsRequiringCombined.includes(selectedPeriod)) {
      return true;
    }

    if (selectedPeriod === "custom" && customStartDate && customEndDate) {
      const currentDate = new Date(2025, 9, 30); // Oktober 2025 (month 9 = Oktober)
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const startDate = new Date(customStartDate);

      // Gunakan combined jika tanggal mulai dari bulan/tahun sebelumnya
      return (
        startDate.getMonth() < currentMonth ||
        startDate.getFullYear() < currentYear
      );
    }

    return false;
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Helper function to check if category is "Kurang Profit"
  const isKurangProfitCategory = (kategori: string) => {
    return kategori.includes("Kurang Profit");
  };

  // Helper function to check if category is "Kurang Modal"
  const isKurangModalCategory = (kategori: string) => {
    return kategori.includes("Kurang Modal");
  };

  // Helper function to check if category is "OP Global"
  const isOPGlobalCategory = (kategori: string) => {
    return kategori === "OP Global";
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchOperationalData();
  }, [
    selectedPeriod,
    customStartDate,
    customEndDate,
    selectedDivision,
    selectedCategory,
  ]);

  const fetchInitialData = async () => {
    try {
      // Fetch companies data
      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .order("nama_perusahaan");

      if (companiesError) throw companiesError;
      setCompaniesData(companies || []);

      // ✅ NEW: Fetch assets data for special categories
      const { data: assets, error: assetsError } = await supabase
        .from("pencatatan_asset")
        .select("*")
        .order("nama");

      if (assetsError) throw assetsError;
      setAssetsData(assets || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data awal",
        variant: "destructive",
      });
    }
  };

  const fetchOperationalData = async () => {
    try {
      setLoading(true);

      // ✅ PERBAIKAN: Dapatkan range tanggal berdasarkan periode
      const dateRange = getDateRange(selectedPeriod);

      console.log("🔍 Fetching operational data:", {
        table: shouldUseCombined ? "operational_combined" : "operational",
        period: selectedPeriod,
        dateRange,
        division: selectedDivision,
        category: selectedCategory,
        willFilterByDivision: selectedDivision !== "all",
        willFilterByCategory: selectedCategory !== "all",
      });

      // ✅ PERBAIKAN: Gunakan tabel yang sesuai berdasarkan periode
      let operationalQuery: any;

      if (shouldUseCombined) {
        operationalQuery = supabase
          .from("operational_combined" as any)
          .select("*")
          .gte("tanggal", dateRange.start)
          .lte("tanggal", dateRange.end)
          .order("tanggal", { ascending: false });
      } else {
        operationalQuery = supabase
          .from("operational")
          .select(
            `
            *,
            companies:company_id (
              id,
              nama_perusahaan,
              modal
            ),
            pencatatan_asset:asset_id (
              id,
              nama,
              nominal
            )
          `
          )
          .gte("tanggal", dateRange.start)
          .lte("tanggal", dateRange.end)
          .order("tanggal", { ascending: false });
      }

      // Filter by division if not 'all'
      if (selectedDivision !== "all") {
        operationalQuery = operationalQuery.eq("divisi", selectedDivision);
      }

      // Filter by category if not 'all'
      if (selectedCategory !== "all") {
        operationalQuery = operationalQuery.eq("kategori", selectedCategory);
      }

      const { data: operationalData, error: operationalError } =
        await operationalQuery;

      if (operationalError) throw operationalError;

      // ✅ DEBUGGING: Log data yang dikembalikan
      console.log("📊 Query results:", {
        totalRecords: operationalData?.length || 0,
        dateRange,
        sampleData: operationalData?.slice(0, 3).map((item) => ({
          tanggal: item.tanggal,
          kategori: item.kategori,
          nominal: item.nominal,
        })),
        allDates: operationalData?.map((item) => item.tanggal).sort(),
      });

      // Then, fetch companies data separately
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("id, nama_perusahaan, modal");

      if (companiesError) throw companiesError;

      // ✅ NEW: Fetch asset data for special categories
      const { data: assetsDataForList, error: assetsError } = await supabase
        .from("pencatatan_asset")
        .select("id, nama, nominal");

      if (assetsError) console.error("Error fetching assets:", assetsError);

      // Create a map for quick company lookup
      const companiesMap = new Map();
      companiesData?.forEach((company) => {
        companiesMap.set(company.id, company);
      });

      // ✅ NEW: Create a map for quick asset lookup
      const assetsMap = new Map();
      assetsDataForList?.forEach((asset) => {
        assetsMap.set(asset.id, asset);
      });

      // Combine operational data with company and asset information
      const combinedData =
        operationalData?.map((item) => ({
          ...item,
          company_info:
            item.companies || companiesMap.get(item.company_id) || null,
          pencatatan_asset:
            item.pencatatan_asset || assetsMap.get(item.asset_id) || null,
          data_source: shouldUseCombined ? "history" : "active",
        })) || [];

      setOperationalData(combinedData);
    } catch (error) {
      console.error("Error fetching operational data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data operasional",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nominalAmount = parseFloat(formData.nominal.replace(/\./g, ""));
    if (isNaN(nominalAmount) || nominalAmount <= 0) {
      toast({
        title: "Error",
        description: "Nominal harus berupa angka yang valid dan lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    // ✅ NEW: Check if category is special (asset-based)
    const isAssetBased = specialCategories.includes(formData.kategori);

    // ✅ NEW: Validate asset_id for special categories
    if (isAssetBased && !formData.asset_id) {
      toast({
        title: "Error",
        description: "Nama Asset harus dipilih untuk kategori ini",
        variant: "destructive",
      });
      return;
    }

    // ✅ NEW: Validate sumber_dana for non-special categories
    if (!isAssetBased && !formData.sumber_dana) {
      toast({
        title: "Error",
        description: "Sumber Dana harus dipilih",
        variant: "destructive",
      });
      return;
    }

    // ✅ VALIDASI BULAN CLOSE: Cek apakah bulan transaksi sudah di-close
    const transactionDate = new Date(formData.tanggal);
    const monthClosed = await isMonthClosed(transactionDate);

    if (monthClosed) {
      toast({
        title: "Bulan Sudah Di-Close",
        description: `Bulan ${formatMonthYear(
          transactionDate
        )} sudah di-close. Gunakan fitur "Transaksi Retroaktif" untuk mencatat transaksi di bulan yang sudah di-close.`,
        variant: "destructive",
      });
      return;
    }

    // ✅ LOGIKA BARU: Cek kategori berdasarkan aturan baru
    const isKurangProfit = isKurangProfitCategory(formData.kategori);
    const isKurangModal = isKurangModalCategory(formData.kategori);
    const isOPGlobal = isOPGlobalCategory(formData.kategori);

    try {
      // ✅ NEW: For asset-based categories, skip company modal validation
      // ✅ LOGIKA BARU: Validasi modal untuk semua kategori kecuali "Kurang Profit" dan asset-based
      if (!isKurangProfit && !isAssetBased) {
        // Get company data to check modal
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("modal, nama_perusahaan")
          .eq("id", parseInt(formData.sumber_dana))
          .single();

        if (companyError) throw companyError;

        if (company.modal < nominalAmount) {
          toast({
            title: "Error",
            description: `Modal ${
              company.nama_perusahaan
            } tidak mencukupi. Modal tersedia: ${formatCurrency(
              company.modal
            )}`,
            variant: "destructive",
          });
          return;
        }
      }

      if (editingOperational) {
        // ✅ VALIDASI BULAN CLOSE UNTUK EDIT: Cek apakah bulan transaksi yang akan diedit sudah di-close
        const editTransactionDate = new Date(formData.tanggal);
        const editMonthClosed = await isMonthClosed(editTransactionDate);

        if (editMonthClosed) {
          toast({
            title: "Bulan Sudah Di-Close",
            description: `Tidak dapat mengedit transaksi untuk bulan ${formatMonthYear(
              editTransactionDate
            )} karena sudah di-close. Gunakan "Transaksi Retroaktif" untuk koreksi.`,
            variant: "destructive",
          });
          return;
        }

        // CATATAN: Untuk UPDATE, tetap gunakan tabel operational asli
        const { error: updateError } = await supabase
          .from("operational")
          .update({
            tanggal: formData.tanggal,
            kategori: formData.kategori,
            deskripsi: formData.deskripsi,
            nominal: nominalAmount,
            // ✅ NEW: Set company_id or asset_id based on category type
            company_id: isAssetBased
              ? null
              : isKurangProfit
              ? null
              : parseInt(formData.sumber_dana),
            asset_id: isAssetBased ? parseInt(formData.asset_id) : null,
            divisi: selectedDivision !== "all" ? selectedDivision : "sport",
          })
          .eq("id", editingOperational.id);

        if (updateError) throw updateError;

        // ✅ NEW: Handle asset nominal update for asset-based categories
        if (isAssetBased) {
          const oldAssetId = editingOperational.asset_id;
          const newAssetId = formData.asset_id
            ? parseInt(formData.asset_id)
            : null;
          const oldNominal = editingOperational.nominal;
          const newNominal = nominalAmount;

          // If asset changed OR nominal changed
          if (oldAssetId !== newAssetId || oldNominal !== newNominal) {
            // Restore old asset nominal (add back old amount)
            if (oldAssetId) {
              const { error: restoreError } = await (supabase.rpc as any)(
                "update_asset_nominal",
                {
                  p_asset_id: oldAssetId,
                  p_amount: oldNominal, // Positive to add back
                }
              );

              if (restoreError) {
                console.error(
                  "Error restoring old asset nominal:",
                  restoreError
                );
              }
            }

            // Deduct from new asset nominal
            if (newAssetId) {
              const { error: deductError } = await (supabase.rpc as any)(
                "update_asset_nominal",
                {
                  p_asset_id: newAssetId,
                  p_amount: -newNominal, // Negative to deduct
                }
              );

              if (deductError) {
                console.error("Error updating new asset nominal:", deductError);
                toast({
                  title: "Warning",
                  description:
                    "Data operasional berhasil diubah tapi gagal mengupdate nominal asset",
                  variant: "destructive",
                });
              }
            }
          }
        }

        // ✅ NEW: Skip company modal update for asset-based categories
        // ✅ LOGIKA BARU: Update modal perusahaan untuk semua kategori kecuali "Kurang Profit" dan asset-based
        if (!isKurangProfit && !isAssetBased) {
          // ✅ OP GLOBAL: Hitung modal difference dengan logika yang benar
          const oldModalAmount = isOPGlobalCategory(editingOperational.kategori)
            ? editingOperational.nominal
            : editingOperational.nominal;
          const newModalAmount = isOPGlobal ? nominalAmount : nominalAmount;
          const modalDifference = oldModalAmount - newModalAmount;

          const { error: modalUpdateError } = await supabase.rpc(
            "update_company_modal",
            {
              company_id: parseInt(formData.sumber_dana),
              amount: modalDifference,
            }
          );

          if (modalUpdateError) throw modalUpdateError;
        }

        // ✅ LOGIKA BARU: Pembukuan untuk semua kategori kecuali "Kurang Profit"
        if (!isKurangProfit) {
          // ✅ OP GLOBAL: Gunakan nominal penuh untuk pembukuan
          const pembukuanAmount = isOPGlobal ? nominalAmount : nominalAmount;

          // Update pembukuan entry - delete old and create new
          const oldKeterangan = `${editingOperational.kategori} - ${editingOperational.deskripsi}`;

          const { error: deletePembukuanError } = await supabase
            .from("pembukuan")
            .delete()
            .eq("keterangan", oldKeterangan)
            .eq("debit", editingOperational.nominal)
            .eq("company_id", editingOperational.company_id);

          if (deletePembukuanError) {
            console.error(
              "Error deleting old pembukuan entry:",
              deletePembukuanError
            );
          }

          const { error: pembukuanError } = await supabase
            .from("pembukuan")
            .insert({
              tanggal: formData.tanggal,
              divisi: selectedDivision !== "all" ? selectedDivision : "sport",
              keterangan: `${formData.kategori} - ${formData.deskripsi}${
                isOPGlobal ? " (OP Global - Nominal Penuh)" : ""
              }`,
              debit: pembukuanAmount,
              kredit: 0,
              cabang_id: 1,
              company_id: parseInt(formData.sumber_dana),
            });

          if (pembukuanError) {
            console.error("Error updating pembukuan entry:", pembukuanError);
            toast({
              title: "Warning",
              description:
                "Data operasional berhasil diubah tapi gagal mengupdate pembukuan",
              variant: "destructive",
            });
          }
        }

        // ✅ IMPLEMENTASI BARU: Update profit adjustment untuk kategori "Kurang Profit"
        if (isKurangProfit) {
          // First restore the old profit adjustment
          const { error: restoreError } = await supabase.rpc(
            "restore_profit" as any,
            {
              p_operational_id: editingOperational.id,
            }
          );

          if (restoreError) {
            console.error(
              "Error restoring old profit adjustment:",
              restoreError
            );
          }

          // Then create new profit deduction
          const { error: deductError } = await supabase.rpc(
            "deduct_profit" as any,
            {
              p_operational_id: editingOperational.id,
              p_tanggal: formData.tanggal,
              p_divisi: selectedDivision !== "all" ? selectedDivision : "sport",
              p_kategori: formData.kategori,
              p_deskripsi: formData.deskripsi,
              p_nominal: nominalAmount,
            }
          );

          if (deductError) {
            console.error("Error creating new profit deduction:", deductError);
            toast({
              title: "Warning",
              description:
                "Data operasional berhasil diubah tapi gagal mengupdate pengurangan keuntungan",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Berhasil",
          description: "Data operasional berhasil diperbarui",
        });
      } else {
        // CATATAN: Untuk INSERT, tetap gunakan tabel operational asli
        const dataToInsert = {
          tanggal: formData.tanggal,
          kategori: formData.kategori,
          deskripsi: formData.deskripsi,
          nominal: nominalAmount,
          divisi: selectedDivision !== "all" ? selectedDivision : "sport",
          cabang_id: 1, // Default cabang
          // ✅ NEW: Set company_id or asset_id based on category type
          company_id: isAssetBased
            ? null
            : isKurangProfit
            ? null
            : parseInt(formData.sumber_dana),
          asset_id: isAssetBased ? parseInt(formData.asset_id) : null,
        };

        console.log("💾 Data to insert:", dataToInsert);

        const { data: insertedData, error: insertError } = await supabase
          .from("operational")
          .insert([dataToInsert])
          .select()
          .single();

        if (insertError) throw insertError;

        console.log("✅ Data inserted successfully:", insertedData);

        // ✅ NEW: Update asset nominal for asset-based categories
        if (isAssetBased && formData.asset_id) {
          const { error: assetUpdateError } = await (supabase.rpc as any)(
            "update_asset_nominal",
            {
              p_asset_id: parseInt(formData.asset_id),
              p_amount: -nominalAmount, // Negative to deduct from asset nominal
            }
          );

          if (assetUpdateError) {
            console.error("Error updating asset nominal:", assetUpdateError);
            toast({
              title: "Warning",
              description:
                "Data operasional berhasil ditambah tapi gagal mengupdate nominal asset",
              variant: "destructive",
            });
          }
        }

        // ✅ NEW: Skip company modal update for asset-based categories
        // ✅ LOGIKA BARU: Update modal perusahaan untuk semua kategori kecuali "Kurang Profit" dan asset-based
        if (!isKurangProfit && !isAssetBased) {
          // ✅ OP GLOBAL: Modal dikurangi nominal penuh, pembukuan juga nominal penuh
          const modalAmount = isOPGlobal ? nominalAmount : nominalAmount;

          // Update company modal using the database function
          const { error: modalUpdateError } = await supabase.rpc(
            "update_company_modal",
            {
              company_id: parseInt(formData.sumber_dana),
              amount: -modalAmount, // Negative to deduct from modal
            }
          );

          if (modalUpdateError) throw modalUpdateError;
        }

        // ✅ LOGIKA BARU: Pembukuan untuk semua kategori kecuali "Kurang Profit"
        if (!isKurangProfit) {
          // ✅ OP GLOBAL: Gunakan nominal penuh untuk pembukuan
          const pembukuanAmount = isOPGlobal ? nominalAmount : nominalAmount;

          // Create pembukuan entry for operational expense
          const { error: pembukuanError } = await supabase
            .from("pembukuan")
            .insert({
              tanggal: formData.tanggal,
              divisi: selectedDivision !== "all" ? selectedDivision : "sport",
              keterangan: `${formData.kategori} - ${formData.deskripsi}${
                isOPGlobal ? " (OP Global - Nominal Penuh)" : ""
              }`,
              debit: pembukuanAmount,
              kredit: 0,
              cabang_id: 1,
              company_id: parseInt(formData.sumber_dana),
            });

          if (pembukuanError) {
            console.error("Error creating pembukuan entry:", pembukuanError);
            toast({
              title: "Warning",
              description:
                "Data operasional berhasil ditambah tapi gagal mencatat pembukuan",
              variant: "destructive",
            });
          }
        }

        // ✅ IMPLEMENTASI BARU: Untuk kategori "Kurang Profit", kurangi keuntungan
        if (isKurangProfit) {
          const { error: deductError } = await supabase.rpc(
            "deduct_profit" as any,
            {
              p_operational_id: insertedData.id,
              p_tanggal: formData.tanggal,
              p_divisi: selectedDivision !== "all" ? selectedDivision : "sport",
              p_kategori: formData.kategori,
              p_deskripsi: formData.deskripsi,
              p_nominal: nominalAmount,
            }
          );

          if (deductError) {
            console.error("Error deducting profit:", deductError);
            toast({
              title: "Warning",
              description:
                "Data operasional berhasil ditambah tapi gagal mengurangi keuntungan",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Berhasil",
          description: "Data operasional berhasil ditambahkan",
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchOperationalData();
      fetchInitialData(); // Refresh companies data to show updated modal
    } catch (error) {
      console.error("Error saving operational data:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data operasional",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (operational) => {
    setEditingOperational(operational);
    setFormData({
      tanggal: operational.tanggal,
      kategori: operational.kategori,
      nominal: operational.nominal.toString(),
      deskripsi: operational.deskripsi,
      sumber_dana: operational.company_id?.toString() || "",
      asset_id: operational.asset_id?.toString() || "", // ✅ NEW: Load asset_id if exists
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data operasional ini?")) {
      return;
    }

    try {
      const operationalToDelete = operationalData.find(
        (item) => item.id === id
      );
      if (!operationalToDelete) return;

      // ✅ VALIDASI BULAN CLOSE UNTUK DELETE: Cek apakah bulan transaksi yang akan dihapus sudah di-close
      const deleteTransactionDate = new Date(operationalToDelete.tanggal);
      const deleteMonthClosed = await isMonthClosed(deleteTransactionDate);

      if (deleteMonthClosed) {
        toast({
          title: "Bulan Sudah Di-Close",
          description: `Tidak dapat menghapus transaksi untuk bulan ${formatMonthYear(
            deleteTransactionDate
          )} karena sudah di-close. Gunakan "Transaksi Retroaktif" untuk koreksi.`,
          variant: "destructive",
        });
        return;
      }

      // CATATAN: Untuk DELETE, tetap gunakan tabel operational asli
      if (operationalToDelete.data_source === "history") {
        toast({
          title: "Error",
          description: "Data riwayat tidak dapat dihapus",
          variant: "destructive",
        });
        return;
      }

      // ✅ LOGIKA BARU: Cek kategori berdasarkan aturan baru
      const isKurangProfit = isKurangProfitCategory(
        operationalToDelete.kategori
      );
      const isOPGlobal = isOPGlobalCategory(operationalToDelete.kategori);
      const isAssetBased = specialCategories.includes(
        operationalToDelete.kategori
      );

      const { error: deleteError } = await supabase
        .from("operational")
        .delete()
        .eq("id", id.toString());

      if (deleteError) throw deleteError;

      // ✅ NEW: Restore asset nominal for asset-based categories
      if (isAssetBased && operationalToDelete.asset_id) {
        const { error: restoreAssetError } = await (supabase.rpc as any)(
          "update_asset_nominal",
          {
            p_asset_id: operationalToDelete.asset_id,
            p_amount: operationalToDelete.nominal, // Positive to restore
          }
        );

        if (restoreAssetError) {
          console.error("Error restoring asset nominal:", restoreAssetError);
          toast({
            title: "Warning",
            description:
              "Data operasional berhasil dihapus tapi gagal mengembalikan nominal asset",
            variant: "destructive",
          });
        }
      }

      // ✅ LOGIKA BARU: Penghapusan pembukuan untuk semua kategori kecuali "Kurang Profit" dan asset-based
      if (!isKurangProfit && !isAssetBased) {
        // ✅ OP GLOBAL: Hitung nominal pembukuan yang benar untuk delete
        const pembukuanAmount = isOPGlobal
          ? operationalToDelete.nominal
          : operationalToDelete.nominal;

        // Delete pembukuan entry dengan query yang lebih akurat
        const keteranganToDelete = `${operationalToDelete.kategori} - ${operationalToDelete.deskripsi}`;

        const { error: pembukuanDeleteError } = await supabase
          .from("pembukuan")
          .delete()
          .eq("keterangan", keteranganToDelete)
          .eq("debit", pembukuanAmount)
          .eq("company_id", operationalToDelete.company_id);

        if (pembukuanDeleteError) {
          console.error(
            "Error deleting pembukuan entry:",
            pembukuanDeleteError
          );
          toast({
            title: "Warning",
            description:
              "Data operasional berhasil dihapus tapi gagal menghapus pembukuan",
            variant: "destructive",
          });
        }
      }

      // ✅ LOGIKA BARU: Restore modal perusahaan untuk semua kategori kecuali "Kurang Profit" dan asset-based
      if (!isKurangProfit && !isAssetBased && operationalToDelete.company_id) {
        // ✅ OP GLOBAL: Restore modal dengan logika yang benar
        const restoreModalAmount = isOPGlobal
          ? operationalToDelete.nominal
          : operationalToDelete.nominal;

        // Restore company modal using the database function
        const { error: modalRestoreError } = await supabase.rpc(
          "update_company_modal",
          {
            company_id: operationalToDelete.company_id,
            amount: restoreModalAmount, // Positive to restore modal
          }
        );

        if (modalRestoreError) throw modalRestoreError;
      }

      // ✅ IMPLEMENTASI BARU: Untuk kategori "Kurang Profit", kembalikan keuntungan
      if (isKurangProfit) {
        const { error: restoreError } = await supabase.rpc(
          "restore_profit" as any,
          {
            p_operational_id: id,
          }
        );

        if (restoreError) {
          console.error("Error restoring profit:", restoreError);
          toast({
            title: "Warning",
            description:
              "Data operasional berhasil dihapus tapi gagal mengembalikan keuntungan",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Berhasil",
        description: "Data operasional berhasil dihapus",
      });

      fetchOperationalData();
      fetchInitialData(); // Refresh companies data
    } catch (error) {
      console.error("Error deleting operational data:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus data operasional",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split("T")[0],
      kategori: "",
      nominal: "",
      deskripsi: "",
      sumber_dana: "",
      asset_id: "", // ✅ Fix: Include asset_id in reset
    });
    setEditingOperational(null);
  };

  const handleOpenNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const formatNumberInput = (value: string): string => {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumericInput = (value: string): string => {
    return value.replace(/\./g, "");
  };

  const handleNumericChange = (value: string) => {
    const numericValue = parseNumericInput(value);
    setFormData({ ...formData, nominal: numericValue });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID");
  };

  const getTotalOperational = () => {
    return operationalData.reduce((total, item) => total + item.nominal, 0);
  };

  const getCategoryStats = () => {
    return operationalData.reduce((stats, item) => {
      stats[item.kategori] = (stats[item.kategori] || 0) + 1;
      return stats;
    }, {});
  };

  const filteredCompanies = companiesData.filter(
    (company) =>
      selectedDivision === "all" ||
      company.divisi.toLowerCase() === selectedDivision.toLowerCase()
  );

  // ✅ LOGIKA BARU: Fungsi untuk menentukan apakah field Sumber Dana harus ditampilkan
  const shouldShowSumberDana = (kategori: string) => {
    return !isKurangProfitCategory(kategori);
  };

  // ✅ LOGIKA BARU: Fungsi untuk mendapatkan pesan informasi berdasarkan kategori
  const getCategoryInfoMessage = (kategori: string) => {
    if (isKurangProfitCategory(kategori)) {
      return "Kategori ini tidak memerlukan sumber dana dan tidak akan mengurangi modal perusahaan. Pengeluaran ini akan mengurangi keuntungan.";
    } else if (isOPGlobalCategory(kategori)) {
      return "Kategori OP Global: Modal perusahaan akan dikurangi sebesar nominal penuh, dan yang dicatat di pembukuan juga nominal penuh.";
    } else {
      return "Kategori ini akan mengurangi modal perusahaan dan dicatat dalam pembukuan sebagai debit.";
    }
    return "Kategori operasional standar yang akan mengurangi modal perusahaan dan dicatat dalam pembukuan.";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-600" />
            Operasional
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola pengeluaran operasional harian
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleOpenNewDialog}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Operasional
          </Button>

          <RetroactiveOperationalDialog
            selectedDivision={selectedDivision}
            onSuccess={() => {
              fetchOperationalData();
            }}
            trigger={
              <Button
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <Clock className="w-4 h-4 mr-2" />
                Transaksi Retroaktif
              </Button>
            }
          />

          <DeleteOperationalHistoryDialog
            selectedDivision={selectedDivision}
            onSuccess={() => {
              fetchOperationalData();
            }}
          />
        </div>
      </div>

      {/* ✅ TAMBAHAN BARU: Ringkasan Penyesuaian Keuntungan */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          Dampak Terhadap Keuntungan
        </h3>
        <ProfitAdjustmentSummary
          selectedDivision={selectedDivision}
          dateRange={getDateRange(selectedPeriod)}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOperational
                ? "Edit Operasional"
                : "Tambah Operasional Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tanggal">Tanggal *</Label>
              <Input
                id="tanggal"
                type="date"
                value={formData.tanggal}
                onChange={(e) =>
                  setFormData({ ...formData, tanggal: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="kategori">Kategori *</Label>
              <Select
                value={formData.kategori}
                onValueChange={(value) => {
                  // ✅ NEW: Reset sumber_dana and asset_id when category changes
                  setFormData({
                    ...formData,
                    kategori: value,
                    sumber_dana: "",
                    asset_id: "",
                  });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nominal">Nominal *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  Rp
                </span>
                <Input
                  id="nominal"
                  type="text"
                  value={formatNumberInput(formData.nominal)}
                  onChange={(e) => handleNumericChange(e.target.value)}
                  className="pl-10"
                  placeholder="1.000.000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="deskripsi">Deskripsi *</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) =>
                  setFormData({ ...formData, deskripsi: e.target.value })
                }
                placeholder="Masukkan deskripsi pengeluaran operasional"
                className="mt-1"
                rows={3}
              />
            </div>

            {/* ✅ NEW: Conditional rendering - Sumber Dana OR Nama Asset */}
            {isSpecialCategory ? (
              <div>
                <Label htmlFor="asset_id">Nama Asset *</Label>
                <Select
                  value={formData.asset_id}
                  onValueChange={(value) => {
                    setFormData({ ...formData, asset_id: value });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Nama Asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAssets.length > 0 ? (
                      filteredAssets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id.toString()}>
                          {asset.nama}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-asset" disabled>
                        Tidak ada asset untuk kategori ini
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-700">
                    <strong>Catatan:</strong> Kategori ini tidak tercatat ke
                    pembukuan dan tidak mengurangi modal perusahaan.
                  </p>
                </div>
              </div>
            ) : shouldShowSumberDana(formData.kategori) ? (
              <div>
                <Label htmlFor="sumber_dana">Sumber Dana *</Label>
                <Select
                  value={formData.sumber_dana}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sumber_dana: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih sumber dana" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCompanies.map((company) => (
                      <SelectItem
                        key={company.id}
                        value={company.id.toString()}
                      >
                        {company.nama_perusahaan}
                        <br />
                        <small className="text-gray-500">
                          Modal: {formatCurrency(company.modal)}
                        </small>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div
                className={`p-3 border rounded-md ${
                  isKurangProfitCategory(formData.kategori)
                    ? "bg-blue-50 border-blue-200"
                    : "bg-green-50 border-green-200"
                }`}
              >
                <p
                  className={`text-sm ${
                    isKurangProfitCategory(formData.kategori)
                      ? "text-blue-700"
                      : "text-green-700"
                  }`}
                >
                  <strong>Catatan:</strong>{" "}
                  {getCategoryInfoMessage(formData.kategori)}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {editingOperational ? "Update" : "Simpan"}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Filter Data
            {/* ✅ TAMBAHAN: Indikator tabel yang digunakan */}
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                shouldUseCombined
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {shouldUseCombined ? "📊 operational_combined" : "🔄 operational"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ✅ PERBAIKAN: Filter Periode */}
            <div>
              <Label htmlFor="period">Periode</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="mt-1">
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

            {/* Filter Kategori */}
            <div>
              <Label htmlFor="selectedCategory">Kategori</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tombol Filter */}
            <div className="flex items-end">
              <Button
                onClick={fetchOperationalData}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Loading..." : "Filter"}
              </Button>
            </div>
          </div>

          {/* ✅ TAMBAHAN: Custom Date Range untuk periode custom */}
          {selectedPeriod === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endDate">Tanggal Akhir</Label>
                <Input
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Operasional
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalOperational())}
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
                <p className="text-sm font-medium text-gray-600">
                  Total Transaksi
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {operationalData.length}
                </p>
              </div>
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Rata-rata per Transaksi
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    operationalData.length > 0
                      ? getTotalOperational() / operationalData.length
                      : 0
                  )}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Kategori Terbanyak
                </p>
                <p className="text-lg font-bold text-green-600">
                  {Object.entries(getCategoryStats()).sort(
                    ([, a], [, b]) => (b as number) - (a as number)
                  )[0]?.[0] || "-"}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Operasional</CardTitle>
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
                  <TableHead>Kategori</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Sumber Dana</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationalData.map((item, index) => (
                  <TableRow key={`${item.data_source}-${item.id}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(item.tanggal)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          isKurangProfitCategory(item.kategori)
                            ? "bg-blue-100 text-blue-800"
                            : isKurangModalCategory(item.kategori)
                            ? "bg-green-100 text-green-800"
                            : isOPGlobalCategory(item.kategori)
                            ? "bg-orange-100 text-orange-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {item.kategori}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(item.nominal)}
                    </TableCell>
                    <TableCell>{item.deskripsi}</TableCell>
                    <TableCell>
                      {/* ✅ Show asset name for special categories, company name for others */}
                      {item.pencatatan_asset?.nama ? (
                        <span className="text-blue-600 font-medium">
                          {item.pencatatan_asset.nama}
                        </span>
                      ) : item.company_info?.nama_perusahaan ? (
                        item.company_info.nama_perusahaan
                      ) : (
                        <span className="text-gray-500 italic">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.data_source === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.data_source === "active" ? "Aktif" : "Riwayat"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {item.data_source === "active" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {item.data_source === "history" && (
                          <span className="text-sm text-gray-500">
                            Tidak dapat diedit
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {operationalData.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      Tidak ada data operasional
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalPage;
