import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type DateFilterType =
  | "all"
  | "last_month"
  | "this_year"
  | "custom"
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_year";

interface DateRange {
  start: Date;
  end: Date;
}

// Fungsi helper untuk menghitung tanggal
const getDateRange = (
  filter: DateFilterType
): { start: string; end: string } | null => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return {
        start: today.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday.toISOString().split("T")[0],
        end: yesterday.toISOString().split("T")[0],
      };
    case "this_week":
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        start: startOfWeek.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
    case "last_week":
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      return {
        start: lastWeekStart.toISOString().split("T")[0],
        end: lastWeekEnd.toISOString().split("T")[0],
      };
    case "this_month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: startOfMonth.toISOString().split("T")[0],
        end: endOfMonth.toISOString().split("T")[0],
      };
    case "last_month":
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: lastMonthStart.toISOString().split("T")[0],
        end: lastMonthEnd.toISOString().split("T")[0],
      };
    case "this_year":
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      return {
        start: startOfYear.toISOString().split("T")[0],
        end: endOfYear.toISOString().split("T")[0],
      };
    case "last_year":
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
      return {
        start: lastYearStart.toISOString().split("T")[0],
        end: lastYearEnd.toISOString().split("T")[0],
      };
    default:
      return null;
  }
};

// Helper function untuk fetch data dengan relasi - DIPERBAIKI
const fetchPenjualanWithRelations = async (
  tableName: string,
  selectedDivision: string,
  dateFilter: DateFilterType,
  customDateRange?: DateRange,
  statusFilter?: string | string[] // ✅ NEW: Pass status filter
) => {
  let selectFields: string;

  // Gunakan relasi yang berbeda untuk tabel history vs active
  if (tableName === "penjualans_history") {
    // Untuk history table, fetch data tanpa relasi karena tidak ada foreign key constraints
    selectFields = "*";
  } else {
    // Untuk active table, gunakan relasi normal
    selectFields = `
      *,
      cabang:cabang_id(nama),
      brands:brand_id(name),
      jenis_motor:jenis_motor(jenis_motor),
      companies:company_id(nama_perusahaan)
    `;
  }

  let query = supabase.from(tableName as any).select(selectFields);

  // ✅ Apply status filter if provided
  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      query = query.in("status", statusFilter);
    } else {
      query = query.eq("status", statusFilter);
    }
  }

  // Filter berdasarkan divisi
  if (selectedDivision !== "all") {
    query = query.eq("divisi", selectedDivision);
  }

  // Filter tanggal
  if (dateFilter && dateFilter !== "all") {
    if (dateFilter === "custom" && customDateRange) {
      query = query.gte(
        "tanggal",
        customDateRange.start.toISOString().split("T")[0]
      );
      query = query.lte(
        "tanggal",
        customDateRange.end.toISOString().split("T")[0]
      );
    } else {
      const dateRange = getDateRange(dateFilter);
      if (dateRange) {
        query = query.gte("tanggal", dateRange.start);
        query = query.lte("tanggal", dateRange.end);
      }
    }
  }

  query = query.order("tanggal", { ascending: false });
  const result = await query;

  // Jika ini adalah history table dan berhasil, tambahkan informasi relasi secara manual jika diperlukan
  if (tableName === "penjualans_history" && result.data && !result.error) {
    // Untuk saat ini, kita biarkan data history tanpa relasi
    // Bisa ditambahkan fetch manual untuk relasi jika diperlukan di masa depan
    const enrichedData = (result.data as any[]).map((item: any) => ({
      ...item,
      // Tambahkan placeholder untuk relasi yang tidak bisa di-fetch
      cabang: { nama: `Cabang ID: ${item.cabang_id || "N/A"}` },
      brands: { name: `Brand ID: ${item.brand_id || "N/A"}` },
      jenis_motor: { jenis_motor: `Jenis ID: ${item.jenis_id || "N/A"}` },
      companies: { nama_perusahaan: `Company ID: ${item.company_id || "N/A"}` },
    }));

    return { ...result, data: enrichedData };
  }

  return result;
};

// Helper function untuk fetch relasi secara manual (opsional untuk optimasi masa depan)
const fetchRelationsManually = async (historyData: any[]) => {
  if (!historyData || historyData.length === 0) return historyData;

  try {
    // Ambil semua ID unik
    const cabangIds = [
      ...new Set(historyData.map((item) => item.cabang_id).filter(Boolean)),
    ];
    const brandIds = [
      ...new Set(historyData.map((item) => item.brand_id).filter(Boolean)),
    ];
    const jenisIds = [
      ...new Set(historyData.map((item) => item.jenis_id).filter(Boolean)),
    ];
    const companyIds = [
      ...new Set(historyData.map((item) => item.company_id).filter(Boolean)),
    ];

    // Fetch semua relasi sekaligus
    const [cabangResult, brandResult, jenisResult, companyResult] =
      await Promise.allSettled([
        cabangIds.length > 0
          ? supabase.from("cabang").select("id, nama").in("id", cabangIds)
          : Promise.resolve({ data: [] }),
        brandIds.length > 0
          ? supabase.from("brands").select("id, name").in("id", brandIds)
          : Promise.resolve({ data: [] }),
        jenisIds.length > 0
          ? supabase
              .from("jenis_motor")
              .select("id, jenis_motor")
              .in("id", jenisIds)
          : Promise.resolve({ data: [] }),
        companyIds.length > 0
          ? supabase
              .from("companies")
              .select("id, nama_perusahaan")
              .in("id", companyIds)
          : Promise.resolve({ data: [] }),
      ]);

    // Buat lookup maps
    const cabangMap = new Map();
    const brandMap = new Map();
    const jenisMap = new Map();
    const companyMap = new Map();

    if (cabangResult.status === "fulfilled" && cabangResult.value.data) {
      cabangResult.value.data.forEach((item) => cabangMap.set(item.id, item));
    }
    if (brandResult.status === "fulfilled" && brandResult.value.data) {
      brandResult.value.data.forEach((item) => brandMap.set(item.id, item));
    }
    if (jenisResult.status === "fulfilled" && jenisResult.value.data) {
      jenisResult.value.data.forEach((item) => jenisMap.set(item.id, item));
    }
    if (companyResult.status === "fulfilled" && companyResult.value.data) {
      companyResult.value.data.forEach((item) => companyMap.set(item.id, item));
    }

    // Enrich data dengan relasi
    return historyData.map((item) => ({
      ...item,
      cabang: cabangMap.get(item.cabang_id) || {
        nama: `Cabang ID: ${item.cabang_id}`,
      },
      brands: brandMap.get(item.brand_id) || {
        name: `Brand ID: ${item.brand_id}`,
      },
      jenis_motor: jenisMap.get(item.jenis_id) || {
        jenis_motor: `Jenis ID: ${item.jenis_id}`,
      },
      companies: companyMap.get(item.company_id) || {
        nama_perusahaan: `Company ID: ${item.company_id}`,
      },
    }));
  } catch (error) {
    console.warn("Failed to fetch relations manually:", error);
    return historyData;
  }
};

export const usePenjualanData = (
  selectedDivision: string,
  useCombined: boolean = false,
  dateFilter: DateFilterType = "all",
  customDateRange?: DateRange,
  statusFilter?: string | string[] // ✅ NEW: Optional status filter
) => {
  const [penjualanData, setPenjualanData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPenjualanData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (useCombined) {
        // Strategi baru: Fetch dari kedua tabel secara terpisah dengan penanganan yang berbeda
        const [activeResult, historyResult] = await Promise.allSettled([
          fetchPenjualanWithRelations(
            "penjualans",
            selectedDivision,
            dateFilter,
            customDateRange,
            statusFilter // ✅ Pass status filter
          ),
          fetchPenjualanWithRelations(
            "penjualans_history",
            selectedDivision,
            dateFilter,
            customDateRange,
            statusFilter // ✅ Pass status filter
          ),
        ]);

        let combinedData: any[] = [];

        // Process active data
        if (activeResult.status === "fulfilled" && !activeResult.value.error) {
          const activeDataWithSource = (activeResult.value.data || []).map(
            (item) => ({
              ...item,
              data_source: "active",
              closed_month: null,
              closed_year: null,
            })
          );
          combinedData = [...combinedData, ...activeDataWithSource];
        } else if (activeResult.status === "rejected") {
          console.warn("Failed to fetch active data:", activeResult.reason);
        } else if (activeResult.value.error) {
          console.warn("Error in active data:", activeResult.value.error);
        }

        // Process history data
        if (
          historyResult.status === "fulfilled" &&
          !historyResult.value.error
        ) {
          const historyDataWithSource = (historyResult.value.data || []).map(
            (item) => ({
              ...item,
              data_source: "history",
            })
          );
          combinedData = [...combinedData, ...historyDataWithSource];
        } else if (historyResult.status === "rejected") {
          console.warn("Failed to fetch history data:", historyResult.reason);
        } else if (historyResult.value.error) {
          console.warn("Error in history data:", historyResult.value.error);
        }

        // Sort combined data by tanggal
        combinedData.sort(
          (a, b) =>
            new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
        );

        setPenjualanData(combinedData);

        // Handle errors - hanya set error jika kedua fetch gagal
        if (
          activeResult.status === "rejected" &&
          historyResult.status === "rejected"
        ) {
          setError("Failed to fetch both active and history data");
        } else if (
          activeResult.status === "fulfilled" &&
          activeResult.value.error &&
          historyResult.status === "fulfilled" &&
          historyResult.value.error
        ) {
          setError(
            activeResult.value.error.message ||
              historyResult.value.error.message
          );
        } else if (combinedData.length === 0) {
          setError("No data available");
        }
      } else {
        // Fetch hanya dari tabel penjualans biasa
        const result = await fetchPenjualanWithRelations(
          "penjualans",
          selectedDivision,
          dateFilter,
          customDateRange,
          statusFilter // ✅ Pass status filter
        );

        if (result.error) {
          console.error("Error fetching penjualan data:", result.error);
          setError(result.error.message);
          return;
        }

        const dataWithSource = (result.data || []).map((item) => ({
          ...item,
          data_source: "active",
          closed_month: null,
          closed_year: null,
        }));

        setPenjualanData(dataWithSource);
      }
    } catch (error: any) {
      console.error("Error:", error);
      setError(error.message || "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPenjualanData();
  }, [
    selectedDivision,
    useCombined,
    dateFilter,
    customDateRange,
    statusFilter,
  ]); // ✅ Add statusFilter to dependencies

  return {
    penjualanData,
    isLoading,
    error,
    refetch: fetchPenjualanData,
  };
};
