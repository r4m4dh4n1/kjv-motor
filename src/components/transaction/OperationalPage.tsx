import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Settings, Edit, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";

interface OperationalPageProps {
  selectedDivision: string;
}

const OperationalPage = ({ selectedDivision }: OperationalPageProps) => {
  const [operationalData, setOperationalData] = useState([]);
  const [companiesData, setCompaniesData] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperational, setEditingOperational] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kategori: "",
    nominal: "",
    deskripsi: "",
    sumber_dana: ""
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const categories = [
    "Operasional Kantor",
    "Transportasi",
    "Komunikasi",
    "Listrik & Air",
    "Maintenance",
    "Marketing",
    "Gaji & Tunjangan",
    "Pajak & Retribusi",
    "Asuransi",
    "Lain-lain"
  ];

  useEffect(() => {
    fetchInitialData();
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchOperationalData();
    }
  }, [dateFrom, dateTo, selectedDivision, selectedCategory]);

  const fetchInitialData = async () => {
    try {
      let companiesQuery = supabase.from('companies').select('*').order('nama_perusahaan');
      
      if (selectedDivision !== 'all') {
        companiesQuery = companiesQuery.eq('divisi', selectedDivision);
      }

      const { data: companiesResult, error: companiesError } = await companiesQuery;
      if (companiesError) throw companiesError;

      setCompaniesData(companiesResult || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data awal",
        variant: "destructive",
      });
    }
  };

  const fetchOperationalData = async () => {
    setLoading(true);
    try {
      // PERUBAHAN: Gunakan operational_combined view untuk membaca data
      let query = supabase
        .from('operational_combined')
        .select(`
          *,
          companies:company_id(nama_perusahaan),
          cabang:cabang_id(nama)
        `)
        .gte('tanggal', dateFrom)
        .lte('tanggal', dateTo)
        .order('tanggal', { ascending: false });

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by category if selected
      const filteredData = selectedCategory !== 'all' 
        ? (data || []).filter(item => item.kategori === selectedCategory)
        : (data || []);

      setOperationalData(filteredData);
    } catch (error) {
      console.error('Error fetching operational data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data operasional",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const nominalAmount = parseFloat(formData.nominal.replace(/\./g, ''));
    if (isNaN(nominalAmount) || nominalAmount <= 0) {
      toast({
        title: "Error",
        description: "Nominal harus berupa angka yang valid dan lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get company data to check modal
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('modal, nama_perusahaan')
        .eq('id', parseInt(formData.sumber_dana))
        .single();

      if (companyError) throw companyError;

      if (company.modal < nominalAmount) {
        toast({
          title: "Error",
          description: `Modal ${company.nama_perusahaan} tidak mencukupi. Modal tersedia: ${formatCurrency(company.modal)}`,
          variant: "destructive",
        });
        return;
      }

      if (editingOperational) {
        // CATATAN: Untuk UPDATE, tetap gunakan tabel operational asli
        // karena operational_combined adalah view read-only
        const { error: updateError } = await supabase
          .from('operational')
          .update({
            tanggal: formData.tanggal,
            kategori: formData.kategori,
            deskripsi: formData.deskripsi,
            nominal: nominalAmount,
            company_id: parseInt(formData.sumber_dana),
            divisi: selectedDivision !== 'all' ? selectedDivision : 'sport'
          })
          .eq('id', editingOperational.id);

        if (updateError) throw updateError;

        // Update company modal (restore old amount and deduct new amount)
        const modalDifference = editingOperational.nominal - nominalAmount;
        const { error: modalUpdateError } = await supabase.rpc('update_company_modal', {
          company_id: parseInt(formData.sumber_dana),
          amount: modalDifference
        });

        if (modalUpdateError) throw modalUpdateError;

        // Update pembukuan entry - delete old and create new
        await supabase
          .from('pembukuan')
          .delete()
          .eq('keterangan', `like ${editingOperational.kategori} - ${editingOperational.deskripsi}%`);

        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert({
            tanggal: formData.tanggal,
            divisi: selectedDivision !== 'all' ? selectedDivision : 'sport',
            keterangan: `${formData.kategori} - ${formData.deskripsi}`,
            debit: nominalAmount,
            kredit: 0,
            cabang_id: 1,
            company_id: parseInt(formData.sumber_dana)
          });

        if (pembukuanError) {
          console.error('Error updating pembukuan entry:', pembukuanError);
          toast({
            title: "Warning",
            description: "Data operasional berhasil diubah tapi gagal mengupdate pembukuan",
            variant: "destructive"
          });
        }

        toast({
          title: "Berhasil",
          description: "Data operasional berhasil diperbarui",
        });
      } else {
        // CATATAN: Untuk INSERT, tetap gunakan tabel operational asli
        const { error: insertError } = await supabase
          .from('operational')
          .insert([{
            tanggal: formData.tanggal,
            kategori: formData.kategori,
            deskripsi: formData.deskripsi,
            nominal: nominalAmount,
            divisi: selectedDivision !== 'all' ? selectedDivision : 'sport',
            cabang_id: 1, // Default cabang
            company_id: parseInt(formData.sumber_dana)
          }]);

        if (insertError) throw insertError;

        // Update company modal using the database function
        const { error: modalUpdateError } = await supabase.rpc('update_company_modal', {
          company_id: parseInt(formData.sumber_dana),
          amount: -nominalAmount // Negative to deduct from modal
        });

        if (modalUpdateError) throw modalUpdateError;

        // Create pembukuan entry for operational expense
        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert({
            tanggal: formData.tanggal,
            divisi: selectedDivision !== 'all' ? selectedDivision : 'sport',
            keterangan: `${formData.kategori} - ${formData.deskripsi}`,
            debit: nominalAmount,
            kredit: 0,
            cabang_id: 1,
            company_id: parseInt(formData.sumber_dana)
          });

        if (pembukuanError) {
          console.error('Error creating pembukuan entry:', pembukuanError);
          toast({
            title: "Warning",
            description: "Data operasional berhasil ditambah tapi gagal mencatat pembukuan",
            variant: "destructive"
          });
        }

        toast({
          title: "Berhasil",
          description: "Data operasional berhasil ditambahkan",
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchOperationalData();
      fetchInitialData(); // Refresh companies data to show updated modal
    } catch (error) {
      console.error('Error saving operational data:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data operasional",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (operational) => {
    setEditingOperational(operational);
    setFormData({
      tanggal: operational.tanggal,
      kategori: operational.kategori,
      nominal: operational.nominal.toString(),
      deskripsi: operational.deskripsi,
      sumber_dana: operational.company_id?.toString() || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data operasional ini?")) {
      return;
    }

    try {
      const operationalToDelete = operationalData.find(item => item.id === id);
      if (!operationalToDelete) return;

      // CATATAN: Untuk DELETE, tetap gunakan tabel operational asli
      // Hanya data yang ada di tabel operational yang bisa dihapus
      // Data di operational_history tidak bisa dihapus
      if (operationalToDelete.data_source === 'history') {
        toast({
          title: "Error",
          description: "Data riwayat tidak dapat dihapus",
          variant: "destructive"
        });
        return;
      }

      const { error: deleteError } = await supabase
        .from('operational')
        .delete()
        .eq('id', id.toString());

      if (deleteError) throw deleteError;

      // Delete pembukuan entry first
      await supabase
        .from('pembukuan')
        .delete()
        .eq('keterangan', `like ${operationalToDelete.kategori} - ${operationalToDelete.deskripsi}%`);

      // Restore company modal using the database function
      if (operationalToDelete.company_id) {
        const { error: modalRestoreError } = await supabase.rpc('update_company_modal', {
          company_id: operationalToDelete.company_id,
          amount: operationalToDelete.nominal // Positive to restore modal
        });

        if (modalRestoreError) throw modalRestoreError;
      }

      toast({
        title: "Berhasil",
        description: "Data operasional berhasil dihapus",
      });

      fetchOperationalData();
      fetchInitialData(); // Refresh companies data
    } catch (error) {
      console.error('Error deleting operational data:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data operasional",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      kategori: "",
      nominal: "",
      deskripsi: "",
      sumber_dana: ""
    });
    setEditingOperational(null);
  };

  // PERBAIKAN UTAMA: Fungsi untuk membuka dialog baru
  const handleOpenNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Helper functions for numeric formatting
  const formatNumberInput = (value: string): string => {
    if (!value) return "";
    const numericValue = value.replace(/[^0-9]/g, "");
    if (!numericValue) return "";
    return parseInt(numericValue).toLocaleString("id-ID");
  };

  const parseNumericInput = (value: string): string => {
    return value.replace(/[^0-9]/g, "");
  };

  const handleNumericChange = (value: string) => {
    const numericValue = parseNumericInput(value);
    const formattedValue = formatNumberInput(numericValue);
    setFormData({ ...formData, nominal: numericValue });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getTotalOperational = () => {
    return operationalData.reduce((total, item) => total + item.nominal, 0);
  };

  const getCategoryStats = () => {
    const stats = {};
    operationalData.forEach(item => {
      stats[item.kategori] = (stats[item.kategori] || 0) + item.nominal;
    });
    return stats;
  };

  const filteredCompanies = companiesData.filter(company => 
    selectedDivision === 'all' || company.divisi.toLowerCase() === selectedDivision.toLowerCase()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-600" />
            Operasional
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola pengeluaran operasional harian
          </p>
        </div>
        
        {/* PERBAIKAN: Hapus DialogTrigger dan gunakan manual control */}
        <Button 
          onClick={handleOpenNewDialog}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Operasional
        </Button>
      </div>

      {/* PERBAIKAN: Dialog tanpa DialogTrigger */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOperational ? "Edit Operasional" : "Tambah Operasional Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tanggal">Tanggal *</Label>
              <div className="mt-1">
                <DatePicker
                  id="tanggal"
                  value={formData.tanggal}
                  onChange={(value) => setFormData({...formData, tanggal: value})}
                  placeholder="Pilih tanggal operasional"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="kategori">Kategori *</Label>
              <Select value={formData.kategori} onValueChange={(value) => setFormData({...formData, kategori: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nominal">Nominal *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
                <Input
                  id="nominal"
                  type="text"
                  value={formatNumberInput(formData.nominal)}
                  onChange={(e) => handleNumericChange(e.target.value)}
                  className="pl-10"
                  placeholder="1.000.000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="deskripsi">Deskripsi *</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                placeholder="Masukkan deskripsi pengeluaran operasional"
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="sumber_dana">Sumber Dana *</Label>
              <Select value={formData.sumber_dana} onValueChange={(value) => setFormData({...formData, sumber_dana: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih sumber dana" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.nama_perusahaan}
                      <br />
                      <small className="text-gray-500">
                        Modal: {formatCurrency(company.modal)}
                      </small>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {editingOperational ? "Update" : "Simpan"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateFrom">Tanggal Mulai</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Tanggal Selesai</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="selectedCategory">Kategori</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchOperationalData} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Filter"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Operasional</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalOperational())}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-purple-600">
                  {operationalData.length}
                </p>
              </div>
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rata-rata per Transaksi</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(operationalData.length > 0 ? getTotalOperational() / operationalData.length : 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Kategori Terbanyak</p>
                <p className="text-lg font-bold text-green-600">
                  {Object.entries(getCategoryStats()).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '-'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
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
            <div className="text-center py-8">Loading...</div>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operationalData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(item.tanggal)}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                        {item.kategori}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(item.nominal)}
                    </TableCell>
                    <TableCell>{item.deskripsi}</TableCell>
                    <TableCell>{item.companies?.nama_perusahaan}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.data_source === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.data_source === 'active' ? 'Aktif' : 'Riwayat'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {item.data_source === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {item.data_source === 'history' && (
                          <span className="text-sm text-gray-500">
                            Tidak dapat diedit
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {operationalData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Tidak ada data operasional
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalPage;