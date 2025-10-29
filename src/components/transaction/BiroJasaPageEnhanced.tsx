import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, Clock, CheckCircle, DollarSign, Search, Filter, Calendar, Building2 } from "lucide-react";
import { useBiroJasaData } from "./biro-jasa/hooks/useBiroJasaData";
import { useBiroJasaForm } from "./biro-jasa/hooks/useBiroJasaForm";
import { BiroJasaForm } from "./biro-jasa/BiroJasaForm";
import { BiroJasaTableEnhanced } from "./biro-jasa/BiroJasaTableEnhanced";
import { formatCurrency } from "./biro-jasa/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BiroJasaHistoryTable from "./BiroJasaHistoryTable";

const BiroJasaPageEnhanced = ({ selectedDivision }: { selectedDivision: string }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Enhanced Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCabang, setSelectedCabang] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedJenisPengurusan, setSelectedJenisPengurusan] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { biroJasaData, brandsData, companiesData, jenisMotorData, fetchData, handleDelete } = useBiroJasaData(selectedDivision);
  
  const { 
    formData, 
    setFormData, 
    editingBiroJasa, 
    handleSubmit, 
    handleEdit, 
    resetForm 
  } = useBiroJasaForm(() => {
    fetchData();
    setIsDialogOpen(false);
  }, selectedDivision);

  // Enhanced filtering function
  const getFilteredData = () => {
    const filtered = biroJasaData.filter((item) => {
      const matchesSearch = 
        item.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenis_motor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenis_pengurusan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCabang = selectedCabang === "all" || item.cabang === selectedCabang;
      
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
      
      const matchesJenisPengurusan = selectedJenisPengurusan === "all" || item.jenis_pengurusan === selectedJenisPengurusan;

      // Date filtering
      let matchesDate = true;
      if (dateFilter !== "all") {
  const itemDate = new Date(item.tanggal);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  
  switch (dateFilter) {
    case "today":
      matchesDate = itemDate >= startOfToday && itemDate <= endOfToday;
      break;
    case "tomorrow":
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);
      matchesDate = itemDate >= startOfTomorrow && itemDate <= endOfTomorrow;
      break;
    case "yesterday":
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      matchesDate = itemDate >= startOfYesterday && itemDate <= endOfYesterday;
      break;
    case "this_week":
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      matchesDate = itemDate >= startOfWeek && itemDate <= endOfWeek;
      break;
    case "last_week":
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      matchesDate = itemDate >= lastWeekStart && itemDate <= lastWeekEnd;
      break;
    case "this_month":
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      matchesDate = itemDate >= startOfMonth && itemDate <= endOfMonth;
      break;
    case "last_month":
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      matchesDate = itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
      break;
    case "this_year":
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      matchesDate = itemDate >= startOfYear && itemDate <= endOfYear;
      break;
    case "last_year":
      const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      matchesDate = itemDate >= lastYearStart && itemDate <= lastYearEnd;
      break;
    case "custom":
      if (customStartDate && customEndDate) {
        const startDate = new Date(customStartDate);
        const endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = itemDate >= startDate && itemDate <= endDate;
      }
      break;
  }
}

      return matchesSearch && matchesCabang && matchesStatus && matchesJenisPengurusan && matchesDate;
    });

    return filtered;
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate enhanced statistics
  const statistics = useMemo(() => {
    const totalKeuntungan = filteredData.reduce((sum, item) => {
      return sum + (item.keuntungan || 0);
    }, 0);

    const dalamProses = filteredData.filter(item => 
      item.status === 'Dalam Proses' || item.status === 'belum_lunas'
    ).length;

    const selesai = filteredData.filter(item => 
      item.status === 'Selesai' || item.status === 'lunas'
    ).length;

    const totalTransaksi = filteredData.length;

    return {
      totalKeuntungan,
      dalamProses,
      selesai,
      totalTransaksi
    };
  }, [filteredData]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCabang("all");
    setSelectedStatus("all");
    setSelectedJenisPengurusan("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setCurrentPage(1);
  };

  const handleEditClick = (item: any) => {
    handleEdit(item);
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Biro Jasa</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Biro Jasa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBiroJasa ? "Edit Biro Jasa" : "Tambah Biro Jasa"}
              </DialogTitle>
            </DialogHeader>
            <BiroJasaForm
              formData={formData}
              setFormData={setFormData}
              companiesData={companiesData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEditing={!!editingBiroJasa}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Data Aktif</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <Label>Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari plat, brand, jenis pengurusan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Cabang Filter */}
            <div>
              <Label>Cabang</Label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger>
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {/* Add cabang options based on data */}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                  <SelectItem value="Selesai">Selesai</SelectItem>
                  <SelectItem value="Batal">Batal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Jenis Pengurusan Filter */}
            <div>
              <Label>Jenis Pengurusan</Label>
              <Select value={selectedJenisPengurusan} onValueChange={setSelectedJenisPengurusan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {/* Add jenis pengurusan options based on data */}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Filter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Filter Tanggal</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
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

            {dateFilter === "custom" && (
              <>
                <div>
                  <Label>Tanggal Mulai</Label>
                  <DatePicker
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    placeholder="Pilih tanggal mulai"
                  />
                </div>
                <div>
                  <Label>Tanggal Akhir</Label>
                  <DatePicker
                    value={customEndDate}
                    onChange={setCustomEndDate}
                    placeholder="Pilih tanggal akhir"
                  />
                </div>
              </>
            )}
          </div>

          {/* Filter Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filter
            </Button>
            <div className="text-sm text-gray-500 flex items-center">
              Menampilkan {filteredData.length} dari {biroJasaData.length} data
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keuntungan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(statistics.totalKeuntungan.toString())}
            </div>
            <p className="text-xs text-muted-foreground">
              Dari {statistics.totalTransaksi} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dalam Proses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statistics.dalamProses}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi berlangsung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.selesai}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi selesai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.totalTransaksi}
            </div>
            <p className="text-xs text-muted-foreground">
              Data terfilter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Table with Pagination */}
      <BiroJasaTableEnhanced
        data={paginatedData}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        onRefresh={fetchData}
        selectedDivision={selectedDivision}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>History Biro Jasa</CardTitle>
              <p className="text-sm text-muted-foreground">
                Data biro jasa yang sudah ditutup dalam proses close month
              </p>
            </CardHeader>
            <CardContent>
              <BiroJasaHistoryTable selectedDivision={selectedDivision} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BiroJasaPageEnhanced;