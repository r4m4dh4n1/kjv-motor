import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, addDays } from "date-fns";
import { Search, Filter, BookOpen, DollarSign } from "lucide-react";
import PenjualanForm from "./PenjualanForm";
import PenjualanTable from "./PenjualanTable";
import UpdateHargaModal from "./UpdateHargaModal";
import PriceHistoryModal from "./PriceHistoryModal";
import DpCancellationModal from "./DpCancellationModal";
import TitipOngkirPayoutModal from "./TitipOngkirPayoutModal";
import { Penjualan, PenjualanFormData } from "./penjualan-types";
import { formatCurrency } from "@/utils/formatUtils";
import { usePagination } from "@/hooks/usePagination";
import { 
  usePembelianData,
  useCabangData,
  useCompaniesData
} from "./hooks/usePembelianData";
import { usePenjualanData } from "./hooks/usePenjualanData";
import { usePenjualanCreate, usePenjualanDelete } from "./hooks/usePenjualanMutations";
import { usePenjualanEdit } from "./hooks/usePenjualanEditMutation"; // ✅ Tambahkan ini
import { usePenjualanActions } from "./hooks/usePenjualanActions";
import { useDpCancellation } from "./hooks/useDpCancellation";
import { supabase } from "@/integrations/supabase/client";
import {
  createInitialPenjualanFormData,
  validatePenjualanFormData,
  transformPenjualanToFormData
} from "./utils/penjualanFormUtils";
import { useBookedUpdateHarga } from "./hooks/useBookedUpdateHarga";

interface PenjualanBookedPageEnhancedProps {
  selectedDivision: string;
}

const PenjualanBookedPageEnhanced = ({ selectedDivision }: PenjualanBookedPageEnhancedProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPenjualan, setEditingPenjualan] = useState<Penjualan | null>(null);
  const [formData, setFormData] = useState<PenjualanFormData>(createInitialPenjualanFormData(selectedDivision));
  
  // DP Cancellation states
  const [isDpCancelModalOpen, setIsDpCancelModalOpen] = useState(false);
  const [selectedPenjualanForCancel, setSelectedPenjualanForCancel] = useState<any>(null);
  
  // Titip Ongkir Payout states
  const [isTitipOngkirModalOpen, setIsTitipOngkirModalOpen] = useState(false);
  const [selectedPenjualanForOngkir, setSelectedPenjualanForOngkir] = useState<any>(null);
  const [ongkirPaymentStatus, setOngkirPaymentStatus] = useState<Record<number, boolean>>({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCabang, setSelectedCabang] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  
  const { toast } = useToast();
  
  // Pagination
  const [pageSize, setPageSize] = useState(10);

  // Update formData when selectedDivision changes
  useEffect(() => {
    if (!editingPenjualan) {
      setFormData(createInitialPenjualanFormData(selectedDivision));
    }
  }, [selectedDivision, editingPenjualan]);

  // Data queries
  const { data: cabangData = [] } = useCabangData();
  const { data: pembelianData = [] } = usePembelianData(selectedDivision, "all");
  const { data: companiesData = [] } = useCompaniesData(selectedDivision);
  const { penjualanData, refetch: refetchPenjualan } = usePenjualanData(selectedDivision);
  
  // Mutations
  const createPenjualanMutation = usePenjualanCreate();
  const deletePenjualanMutation = usePenjualanDelete();
  const editPenjualanMutation = usePenjualanEdit(); // ✅ Tambahkan ini
  const dpCancellationMutation = useDpCancellation();

  const checkOngkirPaymentStatus = async (penjualanIds: number[]) => {
    try {
      if (penjualanIds.length === 0) return;

      const { data, error } = await supabase
        .from('ongkir_payments')
        .select('penjualan_id')
        .in('penjualan_id', penjualanIds);

      if (error) throw error;

      const paymentStatusMap: Record<number, boolean> = {};
      data?.forEach((payment) => {
        paymentStatusMap[payment.penjualan_id] = true;
      });
      setOngkirPaymentStatus(paymentStatusMap);
    } catch (error) {
      console.error('Error checking ongkir payment status:', error);
    }
  };
  
  // Actions
  // Ganti usePenjualanActions dengan useBookedUpdateHarga untuk update harga
  const bookedUpdateHarga = useBookedUpdateHarga();
  
  // Actions untuk modal dan state management
  const {
    isUpdateHargaOpen,
    setIsUpdateHargaOpen,
    selectedPenjualanForUpdate,
    setSelectedPenjualanForUpdate,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    selectedPenjualanForHistory,
    setSelectedPenjualanForHistory,
    handleUpdateHarga,
    handleLihatDetail,
    handleRiwayatHarga,
    // HAPUS handleSubmitUpdateHarga dari sini
  } = usePenjualanActions();
  
  // Buat fungsi handleSubmitUpdateHarga baru yang menggunakan useBookedUpdateHarga
  const handleSubmitUpdateHarga = async (updateData: any, onRefresh: () => void) => {
    if (!selectedPenjualanForUpdate) return;
    
    try {
      await bookedUpdateHarga.mutateAsync({
        penjualanId: selectedPenjualanForUpdate.id,  // ✅ PERBAIKAN
        data: {  // ✅ PERBAIKAN: wrap dalam object 'data'
          harga_jual_baru: updateData.harga_jual_baru,
          biaya_pajak: updateData.biaya_pajak,
          biaya_qc: updateData.biaya_qc,
          biaya_lain_lain: updateData.biaya_lain_lain,
          keterangan_biaya_lain: updateData.keterangan_biaya_lain,
          reason: updateData.reason,
          tanggal_update: updateData.tanggal_update,
          sumber_dana_id: updateData.sumber_dana_id
        }
      });
      
      setIsUpdateHargaOpen(false);
      setSelectedPenjualanForUpdate(null);
      onRefresh();
    } catch (error) {
      // Error handling sudah ada di hook
    }
  };

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

  // Filter and search logic - only for BOOKED status (not 'selesai' or 'cancelled_dp_hangus')
  const filteredData = penjualanData.filter((item: any) => {
    // Filter utama: hanya yang belum selesai (status: booked, proses, cancelled, etc but not 'selesai/sold' or 'cancelled_dp_hangus')
    if (item.status === 'selesai' || item.status === 'sold' || item.status === 'cancelled_dp_hangus') {
      return false;
    }

    const matchesSearch = !searchTerm || 
      item.plat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jenis_motor?.jenis_motor?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCabang = selectedCabang === "all" || item.cabang_id.toString() === selectedCabang;
    
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
    
    // Date filter logic
    let matchesDate = true;
    if (dateFilter !== "all") {
      const dateRange = getDateRange();
      if (dateRange) {
        const itemDate = new Date(item.tanggal);
        matchesDate = itemDate >= dateRange.start && itemDate <= dateRange.end;
      } else if (dateFilter === "custom") {
        matchesDate = false; // If custom is selected but no dates are set
      }
    }
    
    return matchesSearch && matchesCabang && matchesStatus && matchesDate;
  }).sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
    totalItems
  } = usePagination(filteredData, pageSize);

  // Fetch ongkir payment status for filtered data
  useEffect(() => {
    if (filteredData.length > 0) {
      const penjualanIds = filteredData.map((item: any) => item.id);
      checkOngkirPaymentStatus(penjualanIds);
    }
  }, [filteredData.length]);

  // Calculate totals
  const calculateTotals = () => {
    const totalPenjualan = filteredData.reduce((sum, item) => sum + (item.harga_jual || 0), 0);
    const totalDP = filteredData.reduce((sum, item) => sum + (item.dp || 0), 0);
    const totalUnit = filteredData.length;

    return { totalPenjualan, totalDP, totalUnit };
  };

  const { totalPenjualan, totalDP, totalUnit } = calculateTotals();

  // Fungsi-fungsi yang sama dengan PenjualanPage
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePenjualanFormData(formData)) {
      toast({ 
        title: "Error", 
        description: "Harap lengkapi semua field yang wajib diisi", 
        variant: "destructive" 
      });
      return;
    }
  
    try {
      if (editingPenjualan) {
        // ✅ Use edit mutation for existing penjualan
        await editPenjualanMutation.mutateAsync({ 
          penjualanId: editingPenjualan.id,
          formData, 
          pembelianData 
        });
      } else {
        // ✅ Use create mutation for new penjualan
        await createPenjualanMutation.mutateAsync({ formData, pembelianData });
      }
      resetForm();
      refetchPenjualan();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const resetForm = () => {
    setFormData(createInitialPenjualanFormData(selectedDivision));
    setEditingPenjualan(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePenjualanMutation.mutateAsync(id);
      refetchPenjualan();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleEdit = (penjualan: any) => {
    setEditingPenjualan(penjualan);
    setFormData(transformPenjualanToFormData(penjualan));
    setIsDialogOpen(true);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCabang("all");
    setSelectedStatus("all");
    setDateFilter("all");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    resetPage();
  };

  const handleCancelDp = (penjualan: any) => {
    setSelectedPenjualanForCancel(penjualan);
    setIsDpCancelModalOpen(true);
  };

  const handleDpCancellationConfirm = async (cancellationData: any) => {
    if (!selectedPenjualanForCancel) return;

    try {
      await dpCancellationMutation.mutateAsync({
        penjualanId: selectedPenjualanForCancel.id,
        cancellationData
      });
      setIsDpCancelModalOpen(false);
      setSelectedPenjualanForCancel(null);
      refetchPenjualan();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleTitipOngkirPayout = (penjualan: any) => {
    setSelectedPenjualanForOngkir(penjualan);
    setIsTitipOngkirModalOpen(true);
  };

  const handleTitipOngkirPayoutSuccess = () => {
    setIsTitipOngkirModalOpen(false);
    setSelectedPenjualanForOngkir(null);
    const penjualanIds = filteredData.map((item: any) => item.id);
    checkOngkirPaymentStatus(penjualanIds); // Refresh payment status
    refetchPenjualan();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Penjualan - Booked</h1>
        <PenjualanForm
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          editingPenjualan={editingPenjualan}
          formData={formData}
          setFormData={setFormData}
          cabangData={cabangData}
          pembelianData={pembelianData}
          companiesData={companiesData}
          handleSubmit={handleSubmit}
          resetForm={resetForm}
          selectedDivision={selectedDivision}
        />
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Penjualan Booked
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

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="proses">Proses</SelectItem>
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
              Menampilkan {paginatedData.length} dari {totalItems} data (Status: Booked)
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
                  Total DP Booked {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalDP)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Penjualan Booked {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
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
                  Total Unit Booked {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalUnit}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <PenjualanTable
        penjualanData={paginatedData}
        handleEdit={handleEdit}
        deleteMutation={{ mutate: handleDelete }}
        handleUpdateHarga={handleUpdateHarga}
        handleRiwayatHarga={handleRiwayatHarga}
        handleCancelDp={handleCancelDp}
        handleTitipOngkirPayout={handleTitipOngkirPayout}
        ongkirPaymentStatus={ongkirPaymentStatus}
        showCancelDp={true}
        showTitipOngkirPayout={true}
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

      <UpdateHargaModal
        isOpen={isUpdateHargaOpen}
        onClose={() => {
          setIsUpdateHargaOpen(false);
          setSelectedPenjualanForUpdate(null);
        }}
        penjualan={selectedPenjualanForUpdate}
        onSubmit={(updateData) => handleSubmitUpdateHarga(updateData, refetchPenjualan)}
      />

      <PriceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedPenjualanForHistory(null);
        }}
        penjualan={selectedPenjualanForHistory}
      />

      <DpCancellationModal
        isOpen={isDpCancelModalOpen}
        onClose={() => {
          setIsDpCancelModalOpen(false);
          setSelectedPenjualanForCancel(null);
        }}
        penjualan={selectedPenjualanForCancel}
        onConfirm={handleDpCancellationConfirm}
        isLoading={dpCancellationMutation.isPending}
      />

      <TitipOngkirPayoutModal
        isOpen={isTitipOngkirModalOpen}
        onClose={() => {
          setIsTitipOngkirModalOpen(false);
          setSelectedPenjualanForOngkir(null);
        }}
        penjualan={selectedPenjualanForOngkir}
        onPayoutSuccess={handleTitipOngkirPayoutSuccess}
      />
    </div>
  );
};

export default PenjualanBookedPageEnhanced;