import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, addDays } from "date-fns";
import { Search, Filter, CheckCircle, DollarSign } from "lucide-react";
import { usePenjualanData } from "./hooks/usePenjualanData";
import { useCabangData } from "./hooks/usePembelianData";
import PenjualanSoldTable from "./PenjualanSoldTable";
import { formatCurrency } from "@/utils/formatUtils";
import { usePagination } from "@/hooks/usePagination";
import { calculateStandardProfitTotals } from '@/utils/profitCalculationUtils';

interface PenjualanSoldPageEnhancedProps {
  selectedDivision: string;
}

const PenjualanSoldPageEnhanced = ({ selectedDivision }: PenjualanSoldPageEnhancedProps) => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCabang, setSelectedCabang] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  
  // Pagination
  const [pageSize, setPageSize] = useState(10);

  // Data queries
  const { penjualanData } = usePenjualanData(selectedDivision);
  const { data: cabangData = [] } = useCabangData();

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

  // Filter data penjualan - hanya yang statusnya 'selesai' (Sold)
  const filteredData = penjualanData.filter((item: any) => {
    // Filter utama: hanya yang sudah selesai (Sold)
    if (item.status !== 'selesai') {
      return false;
    }

    const matchesSearch = !searchTerm || 
      item.plat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jenis_motor?.jenis_motor?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCabang = selectedCabang === "all" || item.cabang_id.toString() === selectedCabang;
    
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
    
    return matchesSearch && matchesCabang && matchesDate;
  }).sort((a: any, b: any) => {
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
    totalItems
  } = usePagination(filteredData, pageSize);

  // Calculate totals using shared utility function
  const { totalPenjualan, totalKeuntungan, totalUnit } = calculateStandardProfitTotals(filteredData);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCabang("all");
    setDateFilter("all");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    resetPage();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Penjualan - Sold</h1>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Penjualan Sold
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              Menampilkan {paginatedData.length} dari {totalItems} data (Status: Sold)
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
                  Total Penjualan Sold {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
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
                  Total Keuntungan {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
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
                  Total Unit Sold {dateFilter !== "all" ? `(${dateFilter.replace('_', ' ')})` : ''}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalUnit}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <PenjualanSoldTable
        penjualanData={paginatedData}
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