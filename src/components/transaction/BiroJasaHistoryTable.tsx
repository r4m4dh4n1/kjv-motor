import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';
import { formatCurrency } from '@/utils/formatUtils';
import { cascadingSearch, getDateColumn } from '@/utils/cascadingSearchUtils';
import { useQuery } from '@tanstack/react-query';

interface BiroJasaHistoryTableProps {
  selectedDivision: string;
}

const BiroJasaHistoryTable = ({ selectedDivision }: BiroJasaHistoryTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);

  // Enhanced query with cascading search
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ['biro_jasa_cascading', selectedDivision, selectedMonth, selectedYear],
    queryFn: async () => {
      console.log('🔍 BiroJasa cascading search starting...', {
        selectedDivision,
        selectedMonth,
        selectedYear
      });

      const result = await cascadingSearch({
        tableName: 'biro_jasa',
        selectedDivision,
        selectedMonth,
        selectedYear,
        dateColumn: getDateColumn('biro_jasa')
      });
      
      console.log('✅ BiroJasa cascading search completed:', {
        source: result.source,
        totalFound: result.totalFound
      });
      
      return result;
    }
  });

  const historyData = queryResult?.data || [];
  const dataSource = queryResult?.source || 'master';

  // Filter data berdasarkan search term
  const filteredData = historyData.filter((item: any) => {
    const matchesSearch = !searchTerm || 
      item.plat_nomor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jenis_pengurusan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keterangan?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const [currentPage, setCurrentPage] = useState(1);
  
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const resetPage = () => setCurrentPage(1);
  const totalItems = filteredData.length;

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
    resetPage();
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter History Biro Jasa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari plat nomor, jenis pengurusan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="month">Bulan Tutup</Label>
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
              <Label htmlFor="year">Tahun Tutup</Label>
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
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filter
            </Button>
            <div className="text-sm text-muted-foreground">
              Menampilkan {paginatedData.length} dari {totalItems} data
              <Badge variant="outline" className="ml-2">
                Sumber: {dataSource === 'master' ? 'Aktif' : dataSource === 'history' ? 'History' : 'Gabungan'}
              </Badge>
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
                <TableHead>Jenis Pengurusan</TableHead>
                <TableHead>Biaya</TableHead>
                <TableHead>Keuntungan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bulan Tutup</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Tidak ada data history yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item: any, index: number) => (
                  <TableRow key={item.id}>
                    <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                    <TableCell>{format(new Date(item.tanggal), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{item.plat_nomor}</TableCell>
                    <TableCell>{item.jenis_pengurusan}</TableCell>
                    <TableCell>{formatCurrency(item.biaya)}</TableCell>
                    <TableCell>{formatCurrency(item.keuntungan)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'Selesai' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.closed_month}/{item.closed_year}</TableCell>
                  </TableRow>
                ))
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

export default BiroJasaHistoryTable;