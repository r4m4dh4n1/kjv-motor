import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Filter, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface OperationalPageProps {
  selectedDivision: string;
}

interface OperationalData {
  id: number;
  tanggal: string;
  kategori: string;
  nominal: number;
  deskripsi: string;
  sumber_dana: string;
  data_source?: string;
}

interface CompanyData {
  id: number;
  name: string;
}

const OperationalPage = ({ selectedDivision }: OperationalPageProps) => {
  // State untuk data
  const [operationalData, setOperationalData] = useState<OperationalData[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State untuk dialog dan editing
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingOperational, setEditingOperational] = useState<OperationalData | null>(null);
  
  // State untuk filter periode
  const [dateFilter, setDateFilter] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // State untuk form data
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kategori: '',
    nominal: '',
    deskripsi: '',
    sumber_dana: '',
    company_id: ''
  });

  // ✅ PERBAIKAN: Pindahkan shouldUseCombined ke dalam useMemo
  const shouldUseCombined = useMemo(() => {
    return ['last_month', 'this_year', 'last_year'].includes(dateFilter) || 
           (dateFilter === 'custom' && customStartDate && customEndDate);
  }, [dateFilter, customStartDate, customEndDate]);

  // ✅ PERBAIKAN: Pindahkan getDateRange ke dalam useCallback
  const getDateRange = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        };
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'last_week':
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return {
          start: lastWeekStart.toISOString().split('T')[0],
          end: lastWeekEnd.toISOString().split('T')[0]
        };
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: lastMonthStart.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        };
      case 'this_year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return {
          start: startOfYear.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'last_year':
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        return {
          start: lastYearStart.toISOString().split('T')[0],
          end: lastYearEnd.toISOString().split('T')[0]
        };
      case 'custom':
        return {
          start: customStartDate ? customStartDate.toISOString().split('T')[0] : today.toISOString().split('T')[0],
          end: customEndDate ? customEndDate.toISOString().split('T')[0] : today.toISOString().split('T')[0]
        };
      default:
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // ✅ PERBAIKAN: Pindahkan fetchOperationalData ke dalam useCallback
  const fetchOperationalData = useCallback(async () => {
    try {
      setLoading(true);
      
      const dateRange = getDateRange();
      const startDate = new Date(`${dateRange.start}T00:00:00.000Z`);
      const endDate = new Date(`${dateRange.end}T23:59:59.999Z`);
      
      console.log('🔍 Fetching operational data:', {
        period: dateFilter,
        table: shouldUseCombined ? 'operational_combined' : 'operational',
        dateRange,
        division: selectedDivision,
        category: selectedCategory
      });

      // Pilih tabel berdasarkan periode
      const tableName = shouldUseCombined ? 'operational_combined' : 'operational';
      
      let query = supabase
        .from(tableName)
        .select(`
          id, tanggal, kategori, nominal, deskripsi, 
          companies!operational_company_id_fkey(name),
          ${shouldUseCombined ? 'data_source,' : ''}
          cabang_id
        `);

      // Filter berdasarkan divisi
      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      // Filter berdasarkan kategori
      if (selectedCategory !== 'all') {
        query = query.eq('kategori', selectedCategory);
      }

      // Filter berdasarkan tanggal
      query = query
        .gte('tanggal', dateRange.start)
        .lte('tanggal', dateRange.end)
        .order('tanggal', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      console.log('📊 Fetched data:', data);

      // Transform data untuk display
      const transformedData = data?.map((item: any) => ({
        id: item.id,
        tanggal: item.tanggal,
        kategori: item.kategori,
        nominal: item.nominal,
        deskripsi: item.deskripsi,
        sumber_dana: item.companies?.name || 'Unknown',
        data_source: item.data_source || 'active'
      })) || [];

      setOperationalData(transformedData);
    } catch (error: any) {
      console.error('Error fetching operational data:', error);
      toast({
        title: "Error",
        description: `Gagal mengambil data operasional: ${error.message}`,
        variant: "destructive",
      });
      // Set empty data on error to prevent infinite loading
      setOperationalData([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customStartDate, customEndDate, selectedDivision, selectedCategory, shouldUseCombined, getDateRange]);

  // ✅ PERBAIKAN: Fungsi fetchInitialData dengan useCallback
  const fetchInitialData = useCallback(async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);
    } catch (error: any) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data awal",
        variant: "destructive",
      });
    }
  }, []);

  // ✅ TAMBAHAN: Fungsi handleSubmit yang hilang
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.kategori || !formData.nominal || !formData.deskripsi || !formData.company_id) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const operationalPayload = {
        tanggal: formData.tanggal,
        kategori: formData.kategori,
        nominal: parseFloat(formData.nominal),
        deskripsi: formData.deskripsi,
        company_id: parseInt(formData.company_id),
        divisi: selectedDivision !== 'all' ? selectedDivision : 'umum'
      };

      if (editingId) {
        // Update existing record
        const { error } = await supabase
          .from('operational')
          .update(operationalPayload)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Sukses",
          description: "Data operasional berhasil diupdate",
        });
      } else {
        // Create new record
        const { error } = await supabase
          .from('operational')
          .insert([operationalPayload]);

        if (error) throw error;

        toast({
          title: "Sukses",
          description: "Data operasional berhasil ditambahkan",
        });
      }

      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);
      
      // Refresh data
      await fetchOperationalData();
      
    } catch (error: any) {
      console.error('Error saving operational data:', error);
      toast({
        title: "Error",
        description: `Gagal menyimpan data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [formData, editingId, selectedDivision, fetchOperationalData]);

  // ✅ TAMBAHAN: Fungsi handleDelete yang hilang
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('operational')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Data operasional berhasil dihapus",
      });

      // Refresh data
      await fetchOperationalData();
      
    } catch (error: any) {
      console.error('Error deleting operational data:', error);
      toast({
        title: "Error",
        description: `Gagal menghapus data: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchOperationalData]);

  // ✅ TAMBAHAN: Fungsi resetFilters yang hilang
  const resetFilters = useCallback(() => {
    setDateFilter('this_month');
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setSelectedCategory('all');
  }, []);

  // ✅ TAMBAHAN: Variabel summary yang hilang
  const totalOperational = useMemo(() => {
    return operationalData.reduce((sum, item) => sum + item.nominal, 0);
  }, [operationalData]);

  const totalTransactions = useMemo(() => {
    return operationalData.length;
  }, [operationalData]);

  const averagePerTransaction = useMemo(() => {
    return totalTransactions > 0 ? totalOperational / totalTransactions : 0;
  }, [totalOperational, totalTransactions]);

  const mostFrequentCategory = useMemo(() => {
    if (operationalData.length === 0) return 'N/A';
    
    const categoryCount = operationalData.reduce((acc, item) => {
      acc[item.kategori] = (acc[item.kategori] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCount).reduce((a, b) => 
      categoryCount[a[0]] > categoryCount[b[0]] ? a : b
    )[0];
  }, [operationalData]);

  // ✅ PERBAIKAN: useEffect dengan dependencies yang benar
  useEffect(() => {
    fetchInitialData();
  }, []); // Hanya sekali saat mount

  useEffect(() => {
    fetchOperationalData();
  }, [fetchOperationalData]); // Dependency pada callback yang sudah di-memoize

  const handleEdit = (operational: OperationalData) => {
    setEditingOperational(operational);
    setEditingId(operational.id);
    
    // Find company_id from companies array
    const company = companies.find(c => c.name === operational.sumber_dana);
    
    setFormData({
      tanggal: operational.tanggal,
      kategori: operational.kategori,
      nominal: operational.nominal.toString(),
      deskripsi: operational.deskripsi,
      sumber_dana: operational.sumber_dana,
      company_id: company ? company.id.toString() : ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      kategori: "",
      nominal: "",
      deskripsi: "",
      sumber_dana: "",
      company_id: ""
    });
    setEditingOperational(null);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Operational Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setEditingId(null);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Operasional
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Edit Operasional' : 'Tambah Operasional'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tanggal">Tanggal</Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="kategori">Kategori</Label>
                <Select value={formData.kategori} onValueChange={(value) => setFormData({ ...formData, kategori: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operasional">Operasional</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="administrasi">Administrasi</SelectItem>
                    <SelectItem value="lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nominal">Nominal</Label>
                <Input
                  id="nominal"
                  type="number"
                  value={formData.nominal}
                  onChange={(e) => setFormData({ ...formData, nominal: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Input
                  id="deskripsi"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="company_id">Sumber Dana</Label>
                <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sumber dana" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filter Periode */}
            <div className="space-y-2">
              <Label htmlFor="dateFilter">Periode</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
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
              {shouldUseCombined && (
                <p className="text-xs text-blue-600 mt-1">
                  📊 Menggunakan data gabungan (active + history)
                </p>
              )}
            </div>

            {/* Custom Date Range Picker */}
            {dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Selesai</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Filter Kategori */}
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="operasional">Operasional</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="administrasi">Administrasi</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Tombol Reset Filter */}
          <div className="mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operasional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalOperational.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata per Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {averagePerTransaction.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kategori Terbanyak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostFrequentCategory}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Operasional</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading...</div>
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
                  {shouldUseCombined && <TableHead>Source</TableHead>}
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationalData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{new Date(item.tanggal).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>{item.kategori}</TableCell>
                    <TableCell>Rp {item.nominal.toLocaleString('id-ID')}</TableCell>
                    <TableCell>{item.deskripsi}</TableCell>
                    <TableCell>{item.sumber_dana}</TableCell>
                    {shouldUseCombined && (
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.data_source === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.data_source === 'active' ? 'Active' : 'History'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                          disabled={shouldUseCombined && item.data_source === 'history'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                          disabled={shouldUseCombined && item.data_source === 'history'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalPage;