import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Search, Filter, History, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency } from '@/utils/formatUtils';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface HistoryTabProps {
  type: 'pembelian' | 'penjualans';
  selectedDivision: string;
}

const HistoryTab = ({ type, selectedDivision }: HistoryTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all"); // active, history, all
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [pageSize, setPageSize] = useState(10);

  // Query untuk data gabungan
  const { data: historyData = [], isLoading } = useQuery({
    queryKey: [`${type}_combined`, selectedDivision, selectedMonth, selectedYear, selectedSource],
    queryFn: async () => {
      let query = supabase.from(`${type}_combined`).select('*');
      
      // Filter by divisi
      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }
      
      // Filter by data source (active/history)
      if (selectedSource !== 'all') {
        query = query.eq('data_source', selectedSource);
      }
      
      // Filter by month/year
      if (selectedMonth !== 'all' && selectedYear !== 'all') {
        const dateColumn = type === 'pembelian' ? 'tanggal_pembelian' : 'tanggal';
        query = query.gte(dateColumn, `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`);
        query = query.lt(dateColumn, `${selectedYear}-${(parseInt(selectedMonth) + 1).toString().padStart(2, '0')}-01`);
      }
      
      const { data, error } = await query.order(
        type === 'pembelian' ? 'tanggal_pembelian' : 'tanggal', 
        { ascending: false }
      );
      
      if (error) throw error;
      return data || [];
    }
  });

  // Filter data berdasarkan search term dan date range
  const filteredData = useMemo(() => {
    return historyData.filter((item: any) => {
      const matchesSearch = !searchTerm || 
        item.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.plat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.warna?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Custom date range filter
      let matchesDateRange = true;
      if (customStartDate && customEndDate) {
        const itemDate = new Date(type === 'pembelian' ? item.tanggal_pembelian : item.tanggal);
        matchesDateRange = itemDate >= startOfDay(customStartDate) && itemDate <= endOfDay(customEndDate);
      }
      
      return matchesSearch && matchesDateRange;
    });
  }, [historyData, searchTerm, customStartDate, customEndDate, type]);

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
    totalItems
  } = usePagination(filteredData, pageSize);

  // Generate month and year options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: new Date(2024, i, 1).toLocaleDateString('id-ID', { month: 'long' })
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - i).toString(),
    label: (currentYear - i).toString()
  }));

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedMonth("all");
    setSelectedYear("all");
    setSelectedSource("all");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    resetPage();
  };

  const renderTableRow = (item: any, index: number) => {
    if (type === 'pembelian') {
      return (
        <TableRow key={`${item.id}-${item.data_source}`}>
          <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
          <TableCell>{format(new Date(item.tanggal_pembelian), 'dd/MM/yyyy')}</TableCell>
          <TableCell>{item.plat_nomor}</TableCell>
          <TableCell>{item.warna}</TableCell>
          <TableCell>{formatCurrency(item.harga_beli)}</TableCell>
          <TableCell>{formatCurrency(item.harga_final || item.harga_beli)}</TableCell>
          <TableCell>
            <Badge variant={item.status === 'ready' ? 'default' : 'secondary'}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={item.data_source === 'active' ? 'default' : 'outline'}>
              {item.data_source === 'active' ? 'Aktif' : 'History'}
            </Badge>
          </TableCell>
          {item.data_source === 'history' && (
            <TableCell>
              {item.closed_month}/{item.closed_year}
            </TableCell>
          )}
        </TableRow>
      );
    } else {
      return (
        <TableRow key={`${item.id}-${item.data_source}`}>
          <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
          <TableCell>{format(new Date(item.tanggal), 'dd/MM/yyyy')}</TableCell>
          <TableCell>{item.plat}</TableCell>
          <TableCell>{item.warna}</TableCell>
          <TableCell>{formatCurrency(item.harga_beli)}</TableCell>
          <TableCell>{formatCurrency(item.harga_jual)}</TableCell>
          <TableCell>
            <Badge variant={item.status === 'selesai' ? 'default' : 'secondary'}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant={item.data_source === 'active' ? 'default' : 'outline'}>
              {item.data_source === 'active' ? 'Aktif' : 'History'}
            </Badge>
          </TableCell>
          {item.data_source === 'history' && (
            <TableCell>
              {item.closed_month}/{item.closed_year}
            </TableCell>
          )}
        </TableRow>
      );
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h2 className="text-2xl font-bold">
          Data History {type === 'pembelian' ? 'Pembelian' : 'Penjualan'}
        </h2>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter History
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
                  placeholder="Cari plat nomor, warna..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="month">Bulan</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Tahun</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {yearOptions.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="source">Sumber Data</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Sumber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Data</SelectItem>
                  <SelectItem value="active">Data Aktif</SelectItem>
                  <SelectItem value="history">Data History</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <Label>Tanggal Mulai (Custom)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Pilih tanggal mulai"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
              <Label>Tanggal Selesai (Custom)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Pilih tanggal selesai"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Plat Nomor</TableHead>
                <TableHead>Warna</TableHead>
                <TableHead>Harga Beli</TableHead>
                <TableHead>{type === 'pembelian' ? 'Harga Final' : 'Harga Jual'}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Bulan Ditutup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Tidak ada data yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map(renderTableRow)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
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

export default HistoryTab;