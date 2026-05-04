import React, { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
  CheckCircle,
  DollarSign,
  Truck,
  CalendarIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePenjualanData } from "./hooks/usePenjualanData";
import { useCabangData } from "./hooks/usePembelianData";
import { useCompaniesData } from "@/hooks/useCompaniesData";
import PenjualanSoldTable from "./PenjualanSoldTable";
import { formatCurrency, parseFormattedNumber } from "@/utils/formatUtils";
import { usePagination } from "@/hooks/usePagination";
import { calculateStandardProfitTotals } from "@/utils/profitCalculationUtils";

interface PenjualanSoldPageEnhancedProps {
  selectedDivision: string;
}

const PenjualanSoldPageEnhanced = ({
  selectedDivision,
}: PenjualanSoldPageEnhancedProps) => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCabang, setSelectedCabang] = useState("all");
  const [dateFilter, setDateFilter] = useState("this_month"); // ✅ DEFAULT: Bulan ini, auto-hide bulan lalu saat pergantian bulan
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    undefined
  );
  const [dataSourceFilter, setDataSourceFilter] = useState("all");

  // Pagination
  const [pageSize, setPageSize] = useState(10);

  // Keluar Ongkir states
  const [isOngkirDialogOpen, setIsOngkirDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ongkirFormData, setOngkirFormData] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    penjualan_id: "",
    titip_ongkir: "",
    keterangan: "",
    company_id: "",
  });

  // Tentukan apakah menggunakan combined view berdasarkan filter
  const shouldUseCombined = ["last_month", "this_year", "custom"].includes(
    dateFilter
  );

  // ✅ PERBAIKAN: Siapkan customDateRange untuk hook
  const customDateRangeForHook =
    dateFilter === "custom" && customStartDate && customEndDate
      ? { start: customStartDate, end: customEndDate }
      : undefined;

  // ✅ PERBAIKAN: Panggil hook dengan parameter yang lengkap
  const { penjualanData, refetch: refetchPenjualan } = usePenjualanData(
    selectedDivision,
    shouldUseCombined,
    dateFilter as any, // ✅ Fix type issue
    customDateRangeForHook, // ✅ Tambahkan parameter customDateRange
    "selesai" // ✅ NEW: Only fetch sold items (status = selesai)
  );

  const { data: cabangData = [] } = useCabangData();
  const { companiesData } = useCompaniesData(selectedDivision);
  const { toast } = useToast();

  // Date range calculation based on filter (untuk UI display saja, tidak untuk filtering data)
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

  // ✅ PERBAIKAN: Simplifikasi filter - filtering tanggal sudah dilakukan di hook
  const filteredData = penjualanData
    .filter((item: any) => {
      // Filter utama: hanya yang sudah selesai (Sold)
      if (item.status !== "selesai") {
        return false;
      }

      // Filter data source (untuk combined view)
      if (shouldUseCombined && dataSourceFilter !== "all") {
        if (dataSourceFilter === "active" && item.data_source !== "active") {
          return false;
        }
        if (dataSourceFilter === "history" && item.data_source !== "history") {
          return false;
        }
      }

      // Filter search
      const matchesSearch =
        !searchTerm ||
        item.plat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenis_motor?.jenis_motor
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      // Filter cabang
      const matchesCabang =
        selectedCabang === "all" ||
        item.cabang_id.toString() === selectedCabang;

      // ✅ PERBAIKAN: Tidak perlu filter tanggal lagi karena sudah dihandle di hook
      return matchesSearch && matchesCabang;
    })
    .sort((a: any, b: any) => {
      // Sort by tanggal_lunas (newest first), fallback to tanggal if tanggal_lunas is null
      const dateA = new Date(a.tanggal_lunas || a.tanggal);
      const dateB = new Date(b.tanggal_lunas || b.tanggal);
      return dateB.getTime() - dateA.getTime(); // Newest first (descending)
    });

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
    totalItems,
  } = usePagination(filteredData, pageSize);

  // Calculate totals using shared utility function
  const { totalPenjualan, totalKeuntungan, totalUnit } =
    calculateStandardProfitTotals(filteredData);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCabang("all");
    setDateFilter("all");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setDataSourceFilter("all");
    resetPage();
  };

  const resetOngkirForm = () => {
    setOngkirFormData({
      tanggal: new Date().toISOString().split("T")[0],
      penjualan_id: "",
      titip_ongkir: "",
      keterangan: "",
      company_id: "",
    });
  };

  const handleOngkirSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Validasi input
      if (
        !ongkirFormData.penjualan_id ||
        !ongkirFormData.titip_ongkir ||
        !ongkirFormData.company_id
      ) {
        toast({
          title: "Error",
          description: "Mohon lengkapi semua field yang wajib diisi",
          variant: "destructive",
        });
        return;
      }

      const titipOngkirAmount = parseFormattedNumber(
        ongkirFormData.titip_ongkir
      );
      if (titipOngkirAmount <= 0) {
        toast({
          title: "Error",
          description: "Nominal titip ongkir harus lebih dari 0",
          variant: "destructive",
        });
        return;
      }

      const selectedPenjualan = filteredData.find(
        (p) => p.id.toString() === ongkirFormData.penjualan_id
      );
      if (!selectedPenjualan) {
        toast({
          title: "Error",
          description: "Data penjualan tidak ditemukan",
          variant: "destructive",
        });
        return;
      }

      // Generate keterangan dengan format: "pengeluaran dana titip ongkir brand-jenis_motor-plat"
      const brand = selectedPenjualan.brands?.name || "Unknown";
      const jenisMotor =
        selectedPenjualan.jenis_motor?.jenis_motor || "Unknown";
      const plat = selectedPenjualan.plat || "Unknown";
      const generatedKeterangan = `pengeluaran dana titip ongkir ${brand}-${jenisMotor}-${plat}`;
      const finalKeterangan =
        ongkirFormData.keterangan.trim() || generatedKeterangan;

      // Insert ke tabel pembukuan
      const pembukuanData = {
        tanggal: ongkirFormData.tanggal,
        divisi: selectedDivision,
        cabang_id: selectedPenjualan.cabang_id,
        keterangan: finalKeterangan,
        debit: titipOngkirAmount,
        kredit: 0,
        company_id: parseInt(ongkirFormData.company_id),
        pembelian_id: selectedPenjualan.pembelian_id,
      };

      const { error: pembukuanError } = await supabase
        .from("pembukuan")
        .insert([pembukuanData]);

      if (pembukuanError) {
        console.error("Error inserting pembukuan:", pembukuanError);
        throw pembukuanError;
      }

      // Update modal perusahaan (mengurangi modal sebesar titip ongkir)
      const { error: modalError } = await supabase.rpc("update_company_modal", {
        company_id: parseInt(ongkirFormData.company_id),
        amount: -titipOngkirAmount,
      });

      if (modalError) {
        console.error("Error updating company modal:", modalError);
        toast({
          title: "Warning",
          description: "Data tersimpan tapi gagal mengurangi modal perusahaan",
          variant: "destructive",
        });
      }

      toast({
        title: "Berhasil",
        description: "Data keluar ongkir berhasil disimpan",
      });

      // Reset form dan tutup dialog
      resetOngkirForm();
      setIsOngkirDialogOpen(false);
      refetchPenjualan();
    } catch (error: any) {
      console.error("Error saving keluar ongkir:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan data keluar ongkir",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePenjualanSelect = (penjualanId: string) => {
    const selectedPenjualan = filteredData.find(
      (p) => p.id.toString() === penjualanId
    );
    if (selectedPenjualan) {
      setOngkirFormData((prev) => ({
        ...prev,
        penjualan_id: penjualanId,
        company_id: selectedPenjualan.company_id?.toString() || "",
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Penjualan - Sold</h1>
        <Dialog open={isOngkirDialogOpen} onOpenChange={setIsOngkirDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={resetOngkirForm}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Truck className="mr-2 h-4 w-4" />
              Keluar Ongkir
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Keluar Ongkir</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleOngkirSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tanggal">Tanggal *</Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={ongkirFormData.tanggal}
                  onChange={(e) =>
                    setOngkirFormData((prev) => ({
                      ...prev,
                      tanggal: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="penjualan_id">Pilih Penjualan *</Label>
                <Select
                  value={ongkirFormData.penjualan_id}
                  onValueChange={handlePenjualanSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih penjualan" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredData.map((penjualan) => (
                      <SelectItem
                        key={penjualan.id}
                        value={penjualan.id.toString()}
                      >
                        {penjualan.brands?.name}{" "}
                        {penjualan.jenis_motor?.jenis_motor} - {penjualan.plat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="titip_ongkir">Nominal Titip Ongkir *</Label>
                <Input
                  id="titip_ongkir"
                  type="text"
                  placeholder="Masukkan nominal"
                  value={ongkirFormData.titip_ongkir}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    const formatted = value
                      ? parseInt(value).toLocaleString("id-ID")
                      : "";
                    setOngkirFormData((prev) => ({
                      ...prev,
                      titip_ongkir: formatted,
                    }));
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="company_id">No. Rekening (Company) *</Label>
                <Select
                  value={ongkirFormData.company_id}
                  onValueChange={(value) =>
                    setOngkirFormData((prev) => ({
                      ...prev,
                      company_id: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesData.map((company) => (
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
                <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
                <Input
                  id="keterangan"
                  type="text"
                  placeholder="Keterangan tambahan (opsional)"
                  value={ongkirFormData.keterangan}
                  onChange={(e) =>
                    setOngkirFormData((prev) => ({
                      ...prev,
                      keterangan: e.target.value,
                    }))
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Jika kosong, akan otomatis diisi: "pengeluaran dana titip
                  ongkir brand-jenis_motor-plat"
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOngkirDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Penjualan Sold
            {shouldUseCombined && (
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Data Combined (Aktif + History)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            {/* Filter Data Source (hanya muncul saat menggunakan combined view) */}
            {shouldUseCombined && (
              <div>
                <Label htmlFor="dataSource">Sumber Data</Label>
                <Select
                  value={dataSourceFilter}
                  onValueChange={setDataSourceFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sumber Data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Data</SelectItem>
                    <SelectItem value="active">Data Aktif</SelectItem>
                    <SelectItem value="history">Data History</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="dateFilter">Filter Tanggal</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Filter Tanggal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tanggal</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month 📊</SelectItem>
                  <SelectItem value="this_year">This Year 📊</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom 📊</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pageSize">Items per page</Label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => setPageSize(parseInt(value))}
              >
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

          {/* Custom Date Range */}
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
                        ? format(customStartDate, "PPP")
                        : "Pilih tanggal mulai"}
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
              <div>
                <Label>Tanggal Akhir</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate
                        ? format(customEndDate, "PPP")
                        : "Pilih tanggal akhir"}
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

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filter
            </Button>
            <div className="text-sm text-muted-foreground">
              Menampilkan {paginatedData.length} dari {totalItems} data (Status:
              Sold)
              {shouldUseCombined && " - Data Combined"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Penjualan Sold{" "}
                  {dateFilter !== "all"
                    ? `(${dateFilter.replace("_", " ")})`
                    : ""}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalPenjualan)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Keuntungan{" "}
                  {dateFilter !== "all"
                    ? `(${dateFilter.replace("_", " ")})`
                    : ""}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(totalKeuntungan)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Unit Sold{" "}
                  {dateFilter !== "all"
                    ? `(${dateFilter.replace("_", " ")})`
                    : ""}
                </p>
                <p className="text-2xl font-bold text-blue-600">{totalUnit}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Penjualan */}
      <PenjualanSoldTable
        penjualanData={paginatedData}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
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
    </div>
  );
};

export default PenjualanSoldPageEnhanced;
