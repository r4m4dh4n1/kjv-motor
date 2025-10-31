import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatUtils";
import { getDateRange } from "@/utils/dateUtils";

interface LabaRugiPageProps {
  selectedDivision: string;
}

interface LabaRugiData {
  totalPenjualan: number;
  totalPendapatanLain: number;
  totalKeuntunganBiroJasa: number; // ✅ Keuntungan dari biro jasa
  totalPendapatan: number;
  totalHargaBeli: number;
  totalBiayaPembelian: number;
  totalHPP: number;
  labaKotor: number;
  totalBiayaOperasional: number;
  totalBiayaAdministrasi: number;
  totalBiayaPenjualan: number;
  biayaPerKategori: {
    [key: string]: number;
  };
  labaBersih: number;
  marginKotor: number;
  marginBersih: number;
  penjualanDetail?: any[];
  operationalDetail?: any[];
  biroJasaDetail?: any[]; // ✅ Detail transaksi biro jasa
}

const LabaRugiPage = ({ selectedDivision }: LabaRugiPageProps) => {
  const [labaRugiData, setLabaRugiData] = useState<LabaRugiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedCabang, setSelectedCabang] = useState("all");
  const [cabangList, setCabangList] = useState([]);

  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  const [detailData, setDetailData] = useState<{
    penjualanDetail: any[];
    operationalDetail: any[];
    pendapatanLainDetail: any[];
    hargaBeliDetail: any[];
  }>({
    penjualanDetail: [],
    operationalDetail: [],
    pendapatanLainDetail: [],
    hargaBeliDetail: [],
  });

  const shouldUseCombined = ["this_month", "last_month", "this_year"].includes(
    selectedPeriod
  );

  const shouldUseOperationalCombined = useMemo(() => {
    const periodsRequiringCombined = [
      "this_month",
      "last_month",
      "this_year",
      "last_year",
    ];

    if (periodsRequiringCombined.includes(selectedPeriod)) {
      return true;
    }

    if (selectedPeriod === "custom" && customStartDate && customEndDate) {
      const currentDate = new Date(2025, 9, 30);
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const startDate = new Date(customStartDate);

      return (
        startDate.getMonth() < currentMonth ||
        startDate.getFullYear() < currentYear
      );
    }

    return false;
  }, [selectedPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchLabaRugiData();
  }, [
    selectedPeriod,
    customStartDate,
    customEndDate,
    selectedDivision,
    selectedCabang,
  ]);

  useEffect(() => {
    if (labaRugiData?.biayaPerKategori) {
      const newExpandedSections: { [key: string]: boolean } = {
        penjualan: false,
        pendapatanLain: false,
        biroJasa: false, // ✅ Tambah section biro jasa
        hargaBeli: false,
        biayaPembelian: false,
      };

      Object.keys(labaRugiData.biayaPerKategori).forEach((kategori) => {
        newExpandedSections[`biaya_${kategori}`] = false;
      });

      setExpandedSections((prev) => ({ ...prev, ...newExpandedSections }));
    }
  }, [labaRugiData]);

  const fetchInitialData = async () => {
    try {
      const { data: cabangData } = await supabase
        .from("cabang")
        .select("id, nama")
        .order("nama");

      setCabangList(cabangData || []);
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchLabaRugiData = async () => {
    console.log("🚀 === FETCH LABA RUGI DATA START ===");
    setLoading(true);
    try {
      const dateRange = getDateRange(
        selectedPeriod,
        customStartDate,
        customEndDate
      );

      console.log("?? LabaRugi Debug Info:", {
        selectedPeriod,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
          startLocal: dateRange.start.toLocaleDateString("id-ID"),
          endLocal: dateRange.end.toLocaleDateString("id-ID"),
        },
        shouldUseCombined,
        currentDate: new Date().toLocaleDateString("id-ID"),
      });

      const [pendapatanData, biayaData, biroJasaData] = await Promise.all([
        fetchPendapatanData(dateRange),
        fetchBiayaData(dateRange),
        fetchBiroJasaKeuntungan(dateRange), // ✅ Fetch keuntungan biro jasa
      ]);

      console.log("📊 Data fetched from Promise.all:", {
        biayaData_biayaPerKategori: biayaData.biayaPerKategori,
        biayaData_biayaPerKategori_keys: Object.keys(
          biayaData.biayaPerKategori || {}
        ),
        biayaData_totalBiayaOperasional: biayaData.totalBiayaOperasional,
        biroJasaData_totalKeuntungan:
          biroJasaData?.totalKeuntunganBiroJasa || 0, // ✅ Log biro jasa
      });

      const calculatedData = calculateLabaRugi(
        pendapatanData,
        biayaData,
        biroJasaData
      );

      console.log("📊 Calculated data:", {
        biayaPerKategori: calculatedData.biayaPerKategori,
        biayaPerKategori_keys: Object.keys(
          calculatedData.biayaPerKategori || {}
        ),
        biayaPerKategori_length: Object.keys(
          calculatedData.biayaPerKategori || {}
        ).length,
        totalBiayaOperasional: calculatedData.totalBiayaOperasional,
      });

      setLabaRugiData(calculatedData);

      console.log("🚀 === FETCH LABA RUGI DATA END ===");

      setDetailData({
        penjualanDetail: pendapatanData.penjualanDetail || [],
        operationalDetail: biayaData.operationalDetail || [],
        pendapatanLainDetail: [],
        hargaBeliDetail: pendapatanData.penjualanDetail || [],
      });
    } catch (error) {
      console.error("Error fetching laba rugi data:", error);
      toast({
        title: "Error",
        description: "Gagal mengambil data laba rugi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendapatanData = async (dateRange: { start: Date; end: Date }) => {
    const startDate = dateRange.start.toISOString();
    const endDate = dateRange.end.toISOString();

    console.log("?? Fetching pendapatan data:", {
      startDate,
      endDate,
      shouldUseCombined,
      selectedPeriod,
      startLocal: dateRange.start.toLocaleDateString("id-ID"),
      endLocal: dateRange.end.toLocaleDateString("id-ID"),
    });

    try {
      if (shouldUseCombined) {
        let query = supabase
          .from("penjualans_combined")
          .select(
            `
            harga_jual, 
            harga_beli, 
            keuntungan, 
            divisi, 
            cabang_id,
            data_source,
            tanggal,
            catatan,
            id,
            plat,
            brand_id,
            jenis_id
          `
          )
          .eq("status", "selesai")
          .gte("tanggal", startDate)
          .lte("tanggal", endDate);

        if (selectedDivision !== "all") {
          query = query.eq("divisi", selectedDivision);
        }

        if (selectedCabang !== "all") {
          query = query.eq("cabang_id", parseInt(selectedCabang));
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching combined penjualan data:", error);
          throw error;
        }

        const penjualanData = data || [];
        console.log(
          `?? Fetched ${penjualanData.length} combined penjualan records`
        );

        console.log(
          "?? Sample penjualan data (first 3):",
          penjualanData.slice(0, 3).map((p) => ({
            id: p.id,
            tanggal: p.tanggal,
            harga_jual: p.harga_jual,
            divisi: p.divisi,
          }))
        );

        // ✅ PERBAIKAN: Tidak perlu filter lagi karena query database sudah filter berdasarkan tanggal
        // Query database sudah menggunakan .gte() dan .lte() dengan range yang benar
        const filteredData = penjualanData;

        console.log(`?? After date filtering: ${filteredData.length} records`);

        const brandIds = [
          ...new Set(filteredData.map((item) => item.brand_id).filter(Boolean)),
        ];
        const jenisIds = [
          ...new Set(filteredData.map((item) => item.jenis_id).filter(Boolean)),
        ];

        const [brandsResult, jenisMotorResult] = await Promise.all([
          brandIds.length > 0
            ? supabase.from("brands").select("id, name").in("id", brandIds)
            : Promise.resolve({ data: [] }),
          jenisIds.length > 0
            ? supabase
                .from("jenis_motor")
                .select("id, jenis_motor")
                .in("id", jenisIds)
            : Promise.resolve({ data: [] }),
        ]);

        const brandMap = new Map(
          (brandsResult.data || []).map((brand) => [brand.id, brand])
        );
        const jenisMap = new Map(
          (jenisMotorResult.data || []).map((jenis) => [jenis.id, jenis])
        );

        const enrichedData = filteredData.map((item) => ({
          ...item,
          brands: brandMap.get(item.brand_id) || {
            name: `Brand ID: ${item.brand_id}`,
          },
          jenis_motor: jenisMap.get(item.jenis_id) || {
            jenis_motor: `Jenis ID: ${item.jenis_id}`,
          },
        }));

        return {
          totalPenjualan: enrichedData.reduce(
            (sum, item) => sum + (item.harga_jual || 0),
            0
          ),
          totalHargaBeli: enrichedData.reduce(
            (sum, item) => sum + (item.harga_beli || 0),
            0
          ),
          totalKeuntungan: enrichedData.reduce(
            (sum, item) => sum + (item.keuntungan || 0),
            0
          ),
          jumlahTransaksi: enrichedData.length,
          penjualanDetail: enrichedData,
        };
      } else {
        let query = supabase
          .from("penjualans")
          .select(
            `
            harga_jual, 
            harga_beli, 
            keuntungan, 
            divisi, 
            cabang_id, 
            tanggal, 
            catatan, 
            id,
            plat,
            brand_id,
            jenis_id
          `
          )
          .eq("status", "selesai")
          .gte("tanggal", startDate)
          .lte("tanggal", endDate);

        if (selectedDivision !== "all") {
          query = query.eq("divisi", selectedDivision);
        }

        if (selectedCabang !== "all") {
          query = query.eq("cabang_id", parseInt(selectedCabang));
        }

        const { data: penjualanData, error } = await query;
        if (error) {
          console.error("Error fetching penjualan data:", error);
          throw error;
        }

        console.log(`Fetched ${penjualanData?.length || 0} penjualan records`);

        const brandIds = [
          ...new Set(
            (penjualanData || []).map((item) => item.brand_id).filter(Boolean)
          ),
        ];
        const jenisIds = [
          ...new Set(
            (penjualanData || []).map((item) => item.jenis_id).filter(Boolean)
          ),
        ];

        const [brandsResult, jenisMotorResult] = await Promise.all([
          brandIds.length > 0
            ? supabase.from("brands").select("id, name").in("id", brandIds)
            : Promise.resolve({ data: [] }),
          jenisIds.length > 0
            ? supabase
                .from("jenis_motor")
                .select("id, jenis_motor")
                .in("id", jenisIds)
            : Promise.resolve({ data: [] }),
        ]);

        const brandMap = new Map(
          (brandsResult.data || []).map((brand) => [brand.id, brand])
        );
        const jenisMap = new Map(
          (jenisMotorResult.data || []).map((jenis) => [jenis.id, jenis])
        );

        const enrichedData = (penjualanData || []).map((item) => ({
          ...item,
          brands: brandMap.get(item.brand_id) || {
            name: `Brand ID: ${item.brand_id}`,
          },
          jenis_motor: jenisMap.get(item.jenis_id) || {
            jenis_motor: `Jenis ID: ${item.jenis_id}`,
          },
        }));

        return {
          totalPenjualan: enrichedData.reduce(
            (sum, item) => sum + (item.harga_jual || 0),
            0
          ),
          totalHargaBeli: enrichedData.reduce(
            (sum, item) => sum + (item.harga_beli || 0),
            0
          ),
          totalKeuntungan: enrichedData.reduce(
            (sum, item) => sum + (item.keuntungan || 0),
            0
          ),
          jumlahTransaksi: enrichedData.length,
          penjualanDetail: enrichedData,
        };
      }
    } catch (error) {
      console.error("Error in fetchPendapatanData:", error);
      throw error;
    }
  };

  const fetchBiayaData = async (dateRange: { start: Date; end: Date }) => {
    console.log("💰 === FETCH BIAYA DATA START ===");
    try {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const operationalTable = shouldUseOperationalCombined
        ? "operational_combined"
        : "operational";

      // ? PERBAIKAN UTAMA: This Month pakai tanggal, Last Month & This Year pakai original_month
      // ✅ FIX: this_month TIDAK pakai original_month, hanya pakai tanggal biasa
      const shouldQueryByOriginalMonth = ["last_month", "this_year"].includes(
        selectedPeriod
      );

      console.log("?? Query Configuration:", {
        operationalTable,
        shouldUseOperationalCombined,
        shouldQueryByOriginalMonth,
        selectedPeriod,
        queryField: shouldQueryByOriginalMonth ? "original_month" : "tanggal",
      });

      let operationalData: any[] = [];

      try {
        let data: any[] = [];
        let error: any = null;

        if (operationalTable === "operational") {
          let operationalQuery = supabase
            .from("operational")
            .select(
              "kategori, nominal, deskripsi, tanggal, divisi, cabang_id, is_retroactive, original_month"
            );

          // ? KUNCI: Query berdasarkan periode
          if (shouldQueryByOriginalMonth) {
            // Last Month & This Year ? Query pakai original_month
            operationalQuery = operationalQuery
              .gte("original_month", startDate)
              .lte("original_month", endDate);
            console.log("?? Query using: original_month");
          } else {
            // This Month ? Query pakai tanggal
            operationalQuery = operationalQuery
              .gte("tanggal", startDate)
              .lte("tanggal", endDate);
            console.log("?? Query using: tanggal");
          }

          if (selectedDivision !== "all") {
            operationalQuery = operationalQuery.eq("divisi", selectedDivision);
          }

          if (selectedCabang !== "all") {
            operationalQuery = operationalQuery.eq(
              "cabang_id",
              parseInt(selectedCabang)
            );
          }

          const result = await operationalQuery;
          data = result.data || [];
          error = result.error;
        } else {
          console.log("?? Using operational_combined");

          let operationalQuery = supabase
            .from("operational_combined")
            .select(
              "kategori, nominal, deskripsi, tanggal, divisi, cabang_id, is_retroactive, original_month, data_source"
            );

          // ? KUNCI: Query berdasarkan periode
          if (shouldQueryByOriginalMonth) {
            // Last Month & This Year ? Query pakai original_month
            operationalQuery = operationalQuery
              .gte("original_month", startDate)
              .lte("original_month", endDate);
            console.log("?? Query using: original_month");
          } else {
            // This Month ? Query pakai tanggal
            operationalQuery = operationalQuery
              .gte("tanggal", startDate)
              .lte("tanggal", endDate);
            console.log("?? Query using: tanggal");
          }

          if (selectedDivision !== "all") {
            operationalQuery = operationalQuery.eq("divisi", selectedDivision);
          }

          if (selectedCabang !== "all") {
            operationalQuery = operationalQuery.eq(
              "cabang_id",
              parseInt(selectedCabang)
            );
          }

          const result = await operationalQuery;
          data = result.data || [];
          error = result.error;
        }

        console.log("?? Query completed:", {
          recordsFetched: data?.length || 0,
          hasError: !!error,
        });

        if (error) {
          console.error(`Error fetching ${operationalTable} data:`, error);
          if (operationalTable === "operational_combined") {
            console.log("?? Fallback to operational table");

            let fallbackQuery = supabase
              .from("operational")
              .select(
                "kategori, nominal, deskripsi, tanggal, divisi, cabang_id, is_retroactive, original_month"
              );

            // Fallback juga ikuti logika yang sama
            if (shouldQueryByOriginalMonth) {
              fallbackQuery = fallbackQuery
                .gte("original_month", startDate)
                .lte("original_month", endDate);
            } else {
              fallbackQuery = fallbackQuery
                .gte("tanggal", startDate)
                .lte("tanggal", endDate);
            }

            if (selectedDivision !== "all") {
              fallbackQuery = fallbackQuery.eq("divisi", selectedDivision);
            }

            if (selectedCabang !== "all") {
              fallbackQuery = fallbackQuery.eq(
                "cabang_id",
                parseInt(selectedCabang)
              );
            }

            const { data: fallbackData, error: fallbackError } =
              await fallbackQuery;

            if (!fallbackError) {
              operationalData = fallbackData || [];
              console.log(
                "? Fallback successful:",
                operationalData.length,
                "records"
              );
            }
          }
        } else {
          operationalData = data || [];
          console.log(
            `?? Operational data loaded: ${operationalData.length} records`
          );
        }
      } catch (err) {
        console.error("? Error in operational query:", err);
        operationalData = [];
      }

      console.log(`Fetched ${operationalData.length} operational records`);

      console.log(
        "?? Raw operational data sample (first 5 records):",
        operationalData.slice(0, 5).map((item) => ({
          kategori: item.kategori,
          tanggal: item.tanggal,
          original_month: item.original_month,
          is_retroactive: item.is_retroactive,
          nominal: item.nominal,
        }))
      );

      // ✅ NEW FIX: Untuk this_month, filter out transaksi retroaktif yang original_month nya bukan bulan ini
      let filteredOperationalData = operationalData;

      if (selectedPeriod === "this_month") {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 1-12
        const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(
          2,
          "0"
        )}`;

        filteredOperationalData = operationalData.filter((item) => {
          // Jika bukan retroaktif, include
          if (!item.is_retroactive) return true;

          // Jika retroaktif, cek apakah original_month sama dengan bulan ini
          if (item.original_month) {
            const originalMonthStr = item.original_month
              .toString()
              .substring(0, 7); // YYYY-MM
            return originalMonthStr === currentMonthStr;
          }

          // Default: exclude jika retroaktif tapi tidak ada original_month
          return false;
        });

        console.log(
          "?? Filtered out retroactive transactions from previous months:",
          {
            beforeFilter: operationalData.length,
            afterFilter: filteredOperationalData.length,
            removed: operationalData.length - filteredOperationalData.length,
          }
        );
      }

      console.log(
        `?? Operational records after query: ${filteredOperationalData.length}`,
        filteredOperationalData.slice(0, 3).map((item) => ({
          kategori: item.kategori,
          tanggal: item.tanggal,
          nominal: item.nominal,
        }))
      );

      const gajiKurangModal = filteredOperationalData.filter(
        (item) => item.kategori && item.kategori.includes("Gaji Kurang Modal")
      );
      console.log(
        "? Gaji Kurang Modal included:",
        gajiKurangModal.length,
        "records"
      );
      if (gajiKurangModal.length > 0) {
        console.log(
          "   Sample:",
          gajiKurangModal.slice(0, 3).map((item) => ({
            tanggal: item.tanggal,
            original_month: item.original_month,
            nominal: item.nominal,
          }))
        );
      }

      const biayaPerKategori: { [key: string]: number } = {};
      filteredOperationalData.forEach((item) => {
        const kategori = item.kategori || "Lainnya";
        // ✅ OP GLOBAL: Untuk kategori OP Global di divisi START, gunakan nominal setengah untuk laporan laba rugi
        const isOpGlobalStart =
          kategori === "OP Global" &&
          item.divisi &&
          item.divisi.toLowerCase() === "start";
        const nominalToUse = isOpGlobalStart
          ? (item.nominal || 0) / 2
          : item.nominal || 0;

        // Debug log untuk OP Global
        if (kategori === "OP Global") {
          console.log("🔵 OP Global item:", {
            divisi: item.divisi,
            isOpGlobalStart,
            originalNominal: item.nominal,
            nominalToUse,
          });
        }

        biayaPerKategori[kategori] =
          (biayaPerKategori[kategori] || 0) + nominalToUse;
      });

      console.log("?? Biaya per kategori:", biayaPerKategori);
      console.log("?? Biaya per kategori keys:", Object.keys(biayaPerKategori));
      console.log(
        "?? Biaya per kategori length:",
        Object.keys(biayaPerKategori).length
      );

      const totalOperasional = Object.values(biayaPerKategori).reduce(
        (sum, value) => sum + value,
        0
      );

      console.log("💰 === FETCH BIAYA DATA END ===");
      console.log("💰 Total Biaya Operasional:", totalOperasional);
      console.log("💰 Kategori Count:", Object.keys(biayaPerKategori).length);

      return {
        biayaPerKategori,
        totalBiayaOperasional: totalOperasional,
        operationalDetail: filteredOperationalData,
      };
    } catch (error) {
      console.error("? Error in fetchBiayaData:", error);
      return {
        biayaPerKategori: {},
        totalBiayaOperasional: 0,
        operationalDetail: [],
      };
    }
  };

  // ✅ Fungsi untuk mengambil keuntungan dari biro jasa
  const fetchBiroJasaKeuntungan = async (dateRange: {
    start: Date;
    end: Date;
  }) => {
    console.log("🏢 === FETCH BIRO JASA START ===");
    try {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      let query = supabase
        .from("biro_jasa")
        .select(
          "id, keuntungan, total_bayar, biaya_modal, tanggal, plat_nomor, jenis_pengurusan, divisi"
        )
        .in("status", ["Selesai", "selesai"])
        .gte("tanggal", startDate)
        .lte("tanggal", endDate)
        .order("tanggal", { ascending: false });

      if (selectedDivision !== "all") {
        query = query.eq("divisi", selectedDivision);
      }

      // Note: biro_jasa tidak memiliki cabang_id, filter hanya berdasarkan divisi

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching biro jasa data:", error);
        return {
          totalKeuntunganBiroJasa: 0,
          biroJasaDetail: [],
        };
      }

      const biroJasaDetail = (data || []).map((item: any) => {
        // Hitung keuntungan = total_bayar - biaya_modal
        const calculated =
          (item.keuntungan ??
            (item.total_bayar || 0) - (item.biaya_modal || 0)) ||
          0;
        return { ...item, keuntungan: calculated };
      });

      const totalKeuntunganBiroJasa = biroJasaDetail.reduce(
        (sum: number, item: any) => sum + (item.keuntungan || 0),
        0
      );

      console.log("🏢 Biro Jasa Data:", {
        recordCount: biroJasaDetail.length,
        totalKeuntungan: totalKeuntunganBiroJasa,
      });
      console.log("🏢 === FETCH BIRO JASA END ===");

      return {
        totalKeuntunganBiroJasa,
        biroJasaDetail,
      };
    } catch (error) {
      console.error("Error in fetchBiroJasaKeuntungan:", error);
      return {
        totalKeuntunganBiroJasa: 0,
        biroJasaDetail: [],
      };
    }
  };

  const calculateLabaRugi = (
    pendapatanData: any,
    biayaData: any,
    biroJasaData: any
  ): LabaRugiData => {
    console.log("🧮 === CALCULATE LABA RUGI START ===");
    console.log("🧮 Input biayaData:", {
      biayaPerKategori: biayaData.biayaPerKategori,
      biayaPerKategori_keys: Object.keys(biayaData.biayaPerKategori || {}),
      biayaPerKategori_entries: Object.entries(
        biayaData.biayaPerKategori || {}
      ),
      totalBiayaOperasional: biayaData.totalBiayaOperasional,
    });

    console.log("🧮 Input biroJasaData:", {
      totalKeuntunganBiroJasa: biroJasaData?.totalKeuntunganBiroJasa || 0,
      biroJasaDetailCount: biroJasaData?.biroJasaDetail?.length || 0,
    });

    const totalBiayaOperasional = biayaData.totalBiayaOperasional || 0;
    const totalKeuntunganBiroJasa = biroJasaData?.totalKeuntunganBiroJasa || 0;

    // ✅ Total Pendapatan = Penjualan + Keuntungan Biro Jasa
    const totalPendapatan =
      (pendapatanData.totalPenjualan || 0) + totalKeuntunganBiroJasa;

    // ✅ Laba Kotor = Keuntungan Penjualan + Keuntungan Biro Jasa
    const labaKotor =
      (pendapatanData.totalKeuntungan || 0) + totalKeuntunganBiroJasa;

    // ✅ Laba Bersih = Laba Kotor - Biaya Operasional
    const labaBersih = labaKotor - totalBiayaOperasional;

    const result = {
      totalPenjualan: pendapatanData.totalPenjualan || 0,
      totalPendapatanLain: 0,
      totalKeuntunganBiroJasa, // ✅ Tambah keuntungan biro jasa
      totalPendapatan, // ✅ Penjualan + Biro Jasa
      totalHargaBeli: pendapatanData.totalHargaBeli || 0,
      totalBiayaPembelian: 0,
      totalHPP: pendapatanData.totalHargaBeli || 0,
      labaKotor, // ✅ Include biro jasa
      totalBiayaOperasional,
      totalBiayaAdministrasi: 0,
      totalBiayaPenjualan: 0,
      biayaPerKategori: biayaData.biayaPerKategori || {},
      labaBersih,
      marginKotor:
        totalPendapatan > 0 ? (labaKotor / totalPendapatan) * 100 : 0,
      marginBersih:
        totalPendapatan > 0 ? (labaBersih / totalPendapatan) * 100 : 0,
      penjualanDetail: pendapatanData.penjualanDetail || [],
      operationalDetail: biayaData.operationalDetail || [],
      biroJasaDetail: biroJasaData?.biroJasaDetail || [], // ✅ Tambah detail biro jasa
    };

    console.log("🧮 Result biayaPerKategori:", {
      biayaPerKategori: result.biayaPerKategori,
      biayaPerKategori_keys: Object.keys(result.biayaPerKategori),
      biayaPerKategori_length: Object.keys(result.biayaPerKategori).length,
    });
    console.log("🧮 Result Keuntungan Biro Jasa:", totalKeuntunganBiroJasa);
    console.log("🧮 === CALCULATE LABA RUGI END ===");

    return result;
  };

  const getBiayaDetailByKategori = (kategori: string) => {
    const filtered = detailData.operationalDetail.filter(
      (item) => (item.kategori || "Lainnya") === kategori
    );

    // ✅ Apply OP Global START logic: adjust nominal to half for display consistency
    return filtered.map((item) => {
      const isOpGlobalStart =
        kategori === "OP Global" &&
        item.divisi &&
        item.divisi.toLowerCase() === "start";

      return {
        ...item,
        nominal: isOpGlobalStart ? (item.nominal || 0) / 2 : item.nominal,
        // Keep original for reference if needed
        originalNominal: item.nominal,
      };
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast({
      title: "Export",
      description: "Fitur export akan segera tersedia",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Laporan Laba Rugi
          </h1>
          <p className="text-muted-foreground">
            Analisis profitabilitas untuk divisi {selectedDivision}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">Bulan Ini</SelectItem>
                  <SelectItem value="last_month">Bulan Lalu</SelectItem>
                  <SelectItem value="this_year">Tahun Ini</SelectItem>
                  <SelectItem value="last_year">Tahun Lalu</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === "custom" && (
              <>
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="cabang">Cabang</Label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {cabangList.map((cabang: any) => (
                    <SelectItem key={cabang.id} value={cabang.id.toString()}>
                      {cabang.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {labaRugiData && (
        <Card>
          <CardHeader>
            <CardTitle>Laporan Laba Rugi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow className="font-semibold bg-blue-50">
                  <TableCell colSpan={2} className="text-blue-700">
                    PENDAPATAN
                  </TableCell>
                </TableRow>
                <TableRow
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection("penjualan")}
                >
                  <TableCell className="pl-4 flex items-center">
                    <ChevronDown
                      className={`h-4 w-4 mr-2 transition-transform ${
                        expandedSections.penjualan ? "rotate-180" : ""
                      }`}
                    />
                    Penjualan
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalPenjualan)}
                  </TableCell>
                </TableRow>

                {expandedSections.penjualan &&
                  detailData.penjualanDetail.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="pl-8">
                        <div className="max-h-40 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">
                                  Tanggal
                                </TableHead>
                                <TableHead className="text-xs">ID</TableHead>
                                <TableHead className="text-xs">
                                  Harga Jual
                                </TableHead>
                                <TableHead className="text-xs">Motor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailData.penjualanDetail
                                .slice(0, 5)
                                .map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-xs">
                                      {new Date(
                                        item.tanggal
                                      ).toLocaleDateString("id-ID")}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.id}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {formatCurrency(item.harga_jual || 0)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.brands?.name || "-"}{" "}
                                      {item.jenis_motor?.jenis_motor || "-"}{" "}
                                      {item.plat || "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          {detailData.penjualanDetail.length > 5 && (
                            <div className="text-xs text-gray-500 mt-2">
                              ... dan {detailData.penjualanDetail.length - 5}{" "}
                              data lainnya
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                {/* ✅ Keuntungan Biro Jasa */}
                <TableRow
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection("biroJasa")}
                >
                  <TableCell className="pl-4 flex items-center">
                    <ChevronDown
                      className={`h-4 w-4 mr-2 transition-transform ${
                        expandedSections.biroJasa ? "rotate-180" : ""
                      }`}
                    />
                    Keuntungan Biro Jasa
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalKeuntunganBiroJasa)}
                  </TableCell>
                </TableRow>

                {expandedSections.biroJasa &&
                  labaRugiData.biroJasaDetail &&
                  labaRugiData.biroJasaDetail.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="pl-8">
                        <div className="max-h-40 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">
                                  Tanggal
                                </TableHead>
                                <TableHead className="text-xs">
                                  Plat Nomor
                                </TableHead>
                                <TableHead className="text-xs">Jenis</TableHead>
                                <TableHead className="text-xs">
                                  Keuntungan
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {labaRugiData.biroJasaDetail
                                .slice(0, 5)
                                .map((item: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-xs">
                                      {new Date(
                                        item.tanggal
                                      ).toLocaleDateString("id-ID")}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.plat_nomor || "-"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.jenis_pengurusan || "-"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {formatCurrency(item.keuntungan || 0)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          {labaRugiData.biroJasaDetail.length > 5 && (
                            <div className="text-xs text-gray-500 mt-2">
                              ... dan {labaRugiData.biroJasaDetail.length - 5}{" "}
                              data lainnya
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                <TableRow>
                  <TableCell className="pl-4">Pendapatan Lain-lain</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalPendapatanLain)}
                  </TableCell>
                </TableRow>

                <TableRow className="font-semibold border-t">
                  <TableCell className="pl-4">Total Pendapatan</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalPendapatan)}
                  </TableCell>
                </TableRow>

                <TableRow className="font-semibold bg-red-50">
                  <TableCell colSpan={2} className="text-red-700">
                    HARGA POKOK PENJUALAN
                  </TableCell>
                </TableRow>
                <TableRow
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection("hargaBeli")}
                >
                  <TableCell className="pl-4 flex items-center">
                    <ChevronDown
                      className={`h-4 w-4 mr-2 transition-transform ${
                        expandedSections.hargaBeli ? "rotate-180" : ""
                      }`}
                    />
                    Harga Beli
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalHargaBeli)}
                  </TableCell>
                </TableRow>

                {expandedSections.hargaBeli &&
                  detailData.penjualanDetail.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="pl-8">
                        <div className="max-h-40 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">
                                  Tanggal
                                </TableHead>
                                <TableHead className="text-xs">ID</TableHead>
                                <TableHead className="text-xs">
                                  Harga Beli
                                </TableHead>
                                <TableHead className="text-xs">Motor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {detailData.penjualanDetail
                                .slice(0, 5)
                                .map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-xs">
                                      {new Date(
                                        item.tanggal
                                      ).toLocaleDateString("id-ID")}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.id}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {formatCurrency(item.harga_beli || 0)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {item.brands?.name || "-"}{" "}
                                      {item.jenis_motor?.jenis_motor || "-"}{" "}
                                      {item.plat || "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          {detailData.penjualanDetail.length > 5 && (
                            <div className="text-xs text-gray-500 mt-2">
                              ... dan {detailData.penjualanDetail.length - 5}{" "}
                              data lainnya
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                <TableRow
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSection("biayaPembelian")}
                >
                  <TableCell className="pl-4 flex items-center">
                    <ChevronDown
                      className={`h-4 w-4 mr-2 transition-transform ${
                        expandedSections.biayaPembelian ? "rotate-180" : ""
                      }`}
                    />
                    Biaya Pembelian
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalBiayaPembelian)}
                  </TableCell>
                </TableRow>

                {expandedSections.biayaPembelian && (
                  <TableRow>
                    <TableCell colSpan={2} className="pl-8">
                      <div className="text-xs text-gray-500">
                        Detail biaya pembelian belum tersedia
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                <TableRow className="font-semibold border-t">
                  <TableCell className="pl-4">Total HPP</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalHPP)}
                  </TableCell>
                </TableRow>

                <TableRow className="font-semibold bg-green-50">
                  <TableCell className="text-green-700">LABA KOTOR</TableCell>
                  <TableCell className="text-right text-green-700">
                    {formatCurrency(labaRugiData.labaKotor)}
                  </TableCell>
                </TableRow>

                <TableRow className="font-semibold bg-orange-50">
                  <TableCell colSpan={2} className="text-orange-700">
                    BIAYA OPERASIONAL
                  </TableCell>
                </TableRow>

                {/* Debug Info */}
                {console.log("🔍 DEBUG RENDER - labaRugiData:", labaRugiData)}
                {console.log(
                  "🔍 DEBUG RENDER - biayaPerKategori:",
                  labaRugiData?.biayaPerKategori
                )}
                {console.log(
                  "🔍 DEBUG RENDER - biayaPerKategori entries:",
                  Object.entries(labaRugiData?.biayaPerKategori || {})
                )}

                {!labaRugiData?.biayaPerKategori ||
                Object.keys(labaRugiData.biayaPerKategori).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-center text-gray-500 italic py-4"
                    >
                      ⚠️ Tidak ada data biaya operasional untuk periode ini
                    </TableCell>
                  </TableRow>
                ) : null}

                {Object.entries(labaRugiData.biayaPerKategori).map(
                  ([kategori, nominal]) => {
                    const detailBiaya = getBiayaDetailByKategori(kategori);
                    const sectionKey = `biaya_${kategori}`;

                    return (
                      <React.Fragment key={kategori}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleSection(sectionKey)}
                        >
                          <TableCell className="pl-4 flex items-center">
                            <ChevronDown
                              className={`h-4 w-4 mr-2 transition-transform ${
                                expandedSections[sectionKey] ? "rotate-180" : ""
                              }`}
                            />
                            <span className="capitalize">{kategori}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(nominal)}
                          </TableCell>
                        </TableRow>

                        {expandedSections[sectionKey] && (
                          <TableRow>
                            <TableCell colSpan={2} className="pl-8">
                              {detailBiaya.length > 0 ? (
                                <div className="space-y-2">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs">
                                          Tanggal
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Deskripsi
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Nominal
                                        </TableHead>
                                        <TableHead className="text-xs">
                                          Divisi
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {detailBiaya
                                        .slice(0, 5)
                                        .map((item, index) => (
                                          <TableRow key={index}>
                                            <TableCell className="text-xs">
                                              {new Date(
                                                item.tanggal
                                              ).toLocaleDateString("id-ID")}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                              {item.deskripsi || "-"}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                              {formatCurrency(
                                                item.nominal || 0
                                              )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                              {item.divisi || "-"}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                  {detailBiaya.length > 5 && (
                                    <div className="text-xs text-gray-500 mt-2">
                                      ... dan {detailBiaya.length - 5} transaksi
                                      lainnya
                                    </div>
                                  )}
                                  <div className="text-xs font-medium text-gray-700 mt-2">
                                    Total {detailBiaya.length} transaksi:{" "}
                                    {formatCurrency(nominal)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  Tidak ada detail transaksi untuk kategori{" "}
                                  {kategori}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  }
                )}

                <TableRow className="font-semibold border-t">
                  <TableCell className="pl-4">
                    Total Biaya Operasional
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(labaRugiData.totalBiayaOperasional)}
                  </TableCell>
                </TableRow>

                <TableRow className="font-bold bg-gray-100 text-lg">
                  <TableCell className="text-gray-800">LABA BERSIH</TableCell>
                  <TableCell
                    className={`text-right ${
                      labaRugiData.labaBersih >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(labaRugiData.labaBersih)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {labaRugiData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Pendapatan
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(labaRugiData.totalPendapatan)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Laba Kotor
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(labaRugiData.labaKotor)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Biaya Operasional
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(labaRugiData.totalBiayaOperasional)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                {labaRugiData.labaBersih >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Laba Bersih
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      labaRugiData.labaBersih >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(labaRugiData.labaBersih)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LabaRugiPage;
