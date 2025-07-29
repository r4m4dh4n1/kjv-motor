import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FeePenjualanTableEnhanced from "./FeePenjualanTableEnhanced";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Search, Filter, RefreshCw, Calendar, DollarSign, TrendingUp, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatUtils";

interface FeePenjualan {
  id: number;
  penjualan_id: number;
  jumlah_fee: number;
  divisi: string;
  tanggal_fee: string;
  keterangan?: string;
  created_at: string;
  updated_at: string;
  penjualans?: {
    id: number;
    plat: string;
    cabang_id: number;
    brand_id: number;
    jenis_id: number;
    harga_jual: number;
    tanggal: string;
    cabangs?: {
      nama: string;
    };
    brands?: {
      name: string;
    };
    jenis_motor?: {
      jenis_motor: string;
    };
  };
}

interface Penjualan {
  id: number;
  plat: string;
  cabang_id: number;
  brand_id: number;
  jenis_id: number;
  harga_jual: number;
  tanggal: string;
  cabangs?: {
    nama: string;
  };
  brands?: {
    name: string;
  };
  jenis_motor?: {
    jenis_motor: string;
  };
}

interface CabangOption {
  id: number;
  nama: string;
}

interface FeePenjualanPageEnhancedProps {
  selectedDivision?: string;
}

const FeePenjualanPageEnhanced: React.FC<FeePenjualanPageEnhancedProps> = ({ selectedDivision }) => {
  const [feeData, setFeeData] = useState<FeePenjualan[]>([]);
  const [penjualanData, setPenjualanData] = useState<Penjualan[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    penjualan_id: "",
    fee_amount: "",
    keterangan: ""
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCabang, setSelectedCabang] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedDivisiFilter, setSelectedDivisiFilter] = useState(selectedDivision || "all");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Options
  const [cabangOptions, setCabangOptions] = useState<CabangOption[]>([]);

  useEffect(() => {
    fetchFeeData();
    fetchEligiblePenjualanData();
    fetchCabangOptions();
  }, []);

  const fetchFeeData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('fee_penjualan')
        .select(`
          *,
          penjualans!inner(
            id,
            plat,
            cabang_id,
            brand_id,
            jenis_id,
            harga_jual,
            tanggal,
            cabangs:cabang_id(nama),
            brands!inner(name),
            jenis_motor:jenis_id(jenis_motor)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching fee data:', error);
        toast({
          title: "Error",
          description: "Gagal mengambil data fee penjualan: " + error.message,
          variant: "destructive",
        });
        return;
      }

      setFeeData(data || []);
    } catch (error) {
      console.error('Error in fetchFeeData:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data fee penjualan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEligiblePenjualanData = async () => {
    try {
      const { data, error } = await supabase
        .from('penjualans')
        .select(`
          id,
          plat,
          cabang_id,
          brand_id,
          jenis_id,
          harga_jual,
          tanggal,
          cabangs:cabang_id(nama),
          brands(name),
          jenis_motor:jenis_id(jenis_motor)
        `)
        .order('tanggal', { ascending: false });

      if (error) {
        console.error('Error fetching penjualan data:', error);
        toast({
          title: "Error",
          description: "Gagal mengambil data penjualan: " + error.message,
          variant: "destructive",
        });
        return;
      }

      setPenjualanData(data || []);
    } catch (error) {
      console.error('Error in fetchEligiblePenjualanData:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data penjualan",
        variant: "destructive",
      });
    }
  };

  const fetchCabangOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('cabang')
        .select('id, nama')
        .order('nama');

      if (error) {
        console.error('Error fetching cabang options:', error);
        toast({
          title: "Error",
          description: "Gagal mengambil data cabang: " + error.message,
          variant: "destructive",
        });
        return;
      }

      setCabangOptions(data || []);
    } catch (error) {
      console.error('Error in fetchCabangOptions:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil data cabang",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.penjualan_id || !formData.fee_amount) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const feeData = {
        penjualan_id: parseInt(formData.penjualan_id),
        jumlah_fee: parseFloat(formData.fee_amount),
        divisi: "default", // You may need to get this from form or context
        keterangan: formData.keterangan || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('fee_penjualan')
          .update(feeData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Sukses",
          description: "Fee penjualan berhasil diperbarui",
        });
      } else {
        const { error } = await supabase
          .from('fee_penjualan')
          .insert([feeData]);

        if (error) throw error;

        toast({
          title: "Sukses",
          description: "Fee penjualan berhasil ditambahkan",
        });
      }

      resetForm();
      fetchFeeData();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving fee data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan data fee penjualan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (fee: FeePenjualan) => {
    setFormData({
      penjualan_id: fee.penjualan_id.toString(),
      fee_amount: fee.jumlah_fee.toString(),
      keterangan: fee.keterangan || ""
    });
    setEditingId(fee.id);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus fee penjualan ini?')) {
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('fee_penjualan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Fee penjualan berhasil dihapus",
      });

      fetchFeeData();
    } catch (error: any) {
      console.error('Error deleting fee data:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus data fee penjualan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      penjualan_id: "",
      fee_amount: "",
      keterangan: ""
    });
    setEditingId(null);
  };

  // Enhanced filtering logic
  const getFilteredData = useMemo(() => {
    let filtered = [...feeData];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(fee => 
        fee.penjualans?.plat?.toLowerCase().includes(searchLower) ||
        fee.penjualans?.brands?.name?.toLowerCase().includes(searchLower) ||
        fee.penjualans?.jenis_motor?.jenis_motor?.toLowerCase().includes(searchLower) ||
        fee.keterangan?.toLowerCase().includes(searchLower)
      );
    }

    // Cabang filter
    if (selectedCabang && selectedCabang !== "all") {
      filtered = filtered.filter(fee => 
        fee.penjualans?.cabang_id === parseInt(selectedCabang)
      );
    }

    // Divisi filter
    if (selectedDivisiFilter && selectedDivisiFilter !== "all") {
      // Implement divisi filtering logic based on your business rules
      // This might need to be adjusted based on how divisi relates to your data
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      filtered = filtered.filter(fee => {
        const feeDate = new Date(fee.created_at);
        const feeDateOnly = new Date(feeDate.getFullYear(), feeDate.getMonth(), feeDate.getDate());

        switch (dateFilter) {
          case "today":
            return feeDateOnly.getTime() === today.getTime();
          case "tomorrow":
            return feeDateOnly.getTime() === tomorrow.getTime();
          case "yesterday":
            return feeDateOnly.getTime() === yesterday.getTime();
          case "this_week":
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return feeDateOnly >= startOfWeek && feeDateOnly <= endOfWeek;
          case "last_week":
            const startOfLastWeek = new Date(today);
            startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
            const endOfLastWeek = new Date(startOfLastWeek);
            endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
            return feeDateOnly >= startOfLastWeek && feeDateOnly <= endOfLastWeek;
          case "this_month":
            return feeDate.getMonth() === now.getMonth() && feeDate.getFullYear() === now.getFullYear();
          case "last_month":
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return feeDate.getMonth() === lastMonth.getMonth() && feeDate.getFullYear() === lastMonth.getFullYear();
          case "this_year":
            return feeDate.getFullYear() === now.getFullYear();
          case "last_year":
            return feeDate.getFullYear() === now.getFullYear() - 1;
          case "custom":
            if (customStartDate && customEndDate) {
              const startDate = new Date(customStartDate);
              const endDate = new Date(customEndDate);
              endDate.setHours(23, 59, 59, 999);
              return feeDate >= startDate && feeDate <= endDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [feeData, searchTerm, selectedCabang, dateFilter, customStartDate, customEndDate, selectedDivisiFilter]);

  // Pagination
  const totalPages = Math.ceil(getFilteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = getFilteredData.slice(startIndex, endIndex);

  // Statistics
  const totalFee = getFilteredData.reduce((sum, fee) => sum + fee.jumlah_fee, 0);
  const totalTransaksi = getFilteredData.length;
  
  const today = new Date();
  const feeHariIni = feeData
    .filter(fee => {
      const feeDate = new Date(fee.created_at);
      return feeDate.toDateString() === today.toDateString();
    })
    .reduce((sum, fee) => sum + fee.jumlah_fee, 0);

  const feeBulanIni = feeData
    .filter(fee => {
      const feeDate = new Date(fee.created_at);
      return feeDate.getMonth() === today.getMonth() && feeDate.getFullYear() === today.getFullYear();
    })
    .reduce((sum, fee) => sum + fee.jumlah_fee, 0);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCabang("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSelectedDivisiFilter(selectedDivision || "all");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Penjualan</h1>
          <p className="text-muted-foreground">Kelola fee penjualan motor</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Fee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Fee Penjualan" : "Tambah Fee Penjualan"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="penjualan_id">Penjualan *</Label>
                <Select
                  value={formData.penjualan_id}
                  onValueChange={(value) => setFormData({ ...formData, penjualan_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih penjualan" />
                  </SelectTrigger>
                  <SelectContent>
                    {penjualanData.map((penjualan) => (
                      <SelectItem key={penjualan.id} value={penjualan.id.toString()}>
                        {penjualan.plat} - {penjualan.brands?.name} - {formatCurrency(penjualan.harga_jual)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fee_amount">Jumlah Fee *</Label>
                <Input
                  id="fee_amount"
                  type="number"
                  step="0.01"
                  value={formData.fee_amount}
                  onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                  placeholder="Masukkan jumlah fee"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Masukkan keterangan (opsional)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari plat, brand, jenis, keterangan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cabang</Label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua cabang</SelectItem>
                  {cabangOptions.map((cabang) => (
                    <SelectItem key={cabang.id} value={cabang.id.toString()}>
                      {cabang.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Periode</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua periode</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
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

            {selectedDivision && (
              <div className="space-y-2">
                <Label>Divisi</Label>
                <Select value={selectedDivisiFilter} onValueChange={setSelectedDivisiFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua divisi</SelectItem>
                    <SelectItem value={selectedDivision}>{selectedDivision}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Akhir</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fee (Filtered)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFee)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi (Filtered)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransaksi}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Hari Ini</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(feeHariIni)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(feeBulanIni)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Fee Penjualan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada data fee penjualan yang ditemukan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">No</th>
                    <th className="text-left p-2">Plat</th>
                    <th className="text-left p-2">Brand</th>
                    <th className="text-left p-2">Jenis Motor</th>
                    <th className="text-left p-2">Cabang</th>
                    <th className="text-left p-2">Harga Jual</th>
                    <th className="text-left p-2">Fee Amount</th>
                    <th className="text-left p-2">Keterangan</th>
                    <th className="text-left p-2">Tanggal</th>
                    <th className="text-left p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((fee, index) => (
                    <tr key={fee.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{startIndex + index + 1}</td>
                      <td className="p-2">
                        <Badge variant="outline">{fee.penjualans?.plat}</Badge>
                      </td>
                      <td className="p-2">{fee.penjualans?.brands?.name}</td>
                      <td className="p-2">{fee.penjualans?.jenis_motor?.jenis_motor}</td>
                      <td className="p-2">{fee.penjualans?.cabangs?.nama}</td>
                      <td className="p-2">{formatCurrency(fee.penjualans?.harga_jual || 0)}</td>
                      <td className="p-2">
                        <Badge variant="secondary">{formatCurrency(fee.jumlah_fee)}</Badge>
                      </td>
                      <td className="p-2">{fee.keterangan || "-"}</td>
                      <td className="p-2">
                        {new Date(fee.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="p-2">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(fee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(fee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Menampilkan {startIndex + 1} - {Math.min(endIndex, getFilteredData.length)} dari {getFilteredData.length} data
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 py-1 text-sm">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))
                  }
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeePenjualanPageEnhanced;