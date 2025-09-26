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
    "Gaji Kurang Profit",
    "Gaji Kurang Modal",
    "Bonus Kurang Profit",
    "Bonus Kurang Modal",
    "Ops Bulanan Kurang Profit",
    "Ops Bulanan Kurang Modal",
    "Pajak & Retribusi",
    "Asuransi",
    "Lain-lain"
  ];

  // Helper function to check if category is "Kurang Profit"
  const isKurangProfitCategory = (kategori: string) => {
    return kategori.includes("Kurang Profit");
  };

  // Helper function to check if category is "Kurang Modal"
  const isKurangModalCategory = (kategori: string) => {
    return kategori.includes("Kurang Modal");
  };

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
      // Fetch companies data
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('nama_perusahaan');

      if (companiesError) throw companiesError;
      setCompaniesData(companies || []);
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
    try {
      setLoading(true);
      
      // First, fetch operational data from the combined view
      let operationalQuery = supabase
        .from('operational_combined')
        .select('*')
        .gte('tanggal', dateFrom)
        .lte('tanggal', dateTo)
        .order('tanggal', { ascending: false });

      // Filter by division if not 'all'
      if (selectedDivision !== 'all') {
        operationalQuery = operationalQuery.eq('divisi', selectedDivision);
      }

      // Filter by category if not 'all'
      if (selectedCategory !== 'all') {
        operationalQuery = operationalQuery.eq('kategori', selectedCategory);
      }

      const { data: operationalData, error: operationalError } = await operationalQuery;

      if (operationalError) throw operationalError;

      // Then, fetch companies data separately
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, nama_perusahaan, modal');

      if (companiesError) throw companiesError;

      // Create a map for quick company lookup
      const companiesMap = new Map();
      companiesData?.forEach(company => {
        companiesMap.set(company.id, company);
      });

      // Join the data in JavaScript
      const enrichedData = operationalData?.map(item => ({
        ...item,
        companies: item.company_id ? companiesMap.get(item.company_id) : null
      })) || [];

      setOperationalData(enrichedData);
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

    // ✅ LOGIKA BARU: Cek kategori berdasarkan aturan baru
    const isKurangProfit = isKurangProfitCategory(formData.kategori);
    const isKurangModal = isKurangModalCategory(formData.kategori);

    try {
      // ✅ LOGIKA BARU: Validasi modal hanya untuk kategori "Kurang Modal"
      if (isKurangModal) {
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
      }

      if (editingOperational) {
        // CATATAN: Untuk UPDATE, tetap gunakan tabel operational asli
        const { error: updateError } = await supabase
          .from('operational')
          .update({
            tanggal: formData.tanggal,
            kategori: formData.kategori,
            deskripsi: formData.deskripsi,
            nominal: nominalAmount,
            // ✅ LOGIKA BARU: Set company_id berdasarkan kategori
            company_id: isKurangProfit ? null : parseInt(formData.sumber_dana),
            divisi: selectedDivision !== 'all' ? selectedDivision : 'sport'
          })
          .eq('id', editingOperational.id);

        if (updateError) throw updateError;

        // ✅ LOGIKA BARU: Update modal perusahaan hanya untuk kategori "Kurang Modal"
        if (isKurangModal) {
          // Update company modal (restore old amount and deduct new amount)
          const modalDifference = editingOperational.nominal - nominalAmount;
          const { error: modalUpdateError } = await supabase.rpc('update_company_modal', {
            company_id: parseInt(formData.sumber_dana),
            amount: modalDifference
          });

          if (modalUpdateError) throw modalUpdateError;
        }

        // ✅ LOGIKA BARU: Pembukuan hanya untuk kategori "Kurang Modal"
        if (isKurangModal) {
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
            // ✅ LOGIKA BARU: Set company_id berdasarkan kategori
            company_id: isKurangProfit ? null : parseInt(formData.sumber_dana)
          }]);

        if (insertError) throw insertError;

        // ✅ LOGIKA BARU: Update modal perusahaan hanya untuk kategori "Kurang Modal"
        if (isKurangModal) {
          // Update company modal using the database function
          const { error: modalUpdateError } = await supabase.rpc('update_company_modal', {
            company_id: parseInt(formData.sumber_dana),
            amount: -nominalAmount // Negative to deduct from modal
          });

          if (modalUpdateError) throw modalUpdateError;
        }

        // ✅ LOGIKA BARU: Pembukuan hanya untuk kategori "Kurang Modal"
        if (isKurangModal) {
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
        }

        // ✅ PLACEHOLDER: Untuk kategori "Kurang Profit", akan mengurangi keuntungan
        if (isKurangProfit) {
          // TODO: Implementasi pengurangan keuntungan
          console.log(`${formData.kategori}: ${nominalAmount} - akan mengurangi keuntungan`);
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
      if (operationalToDelete.data_source === 'history') {
        toast({
          title: "Error",
          description: "Data riwayat tidak dapat dihapus",
          variant: "destructive"
        });
        return;
      }

      // ✅ LOGIKA BARU: Cek kategori berdasarkan aturan baru
      const isKurangProfit = isKurangProfitCategory(operationalToDelete.kategori);
      const isKurangModal = isKurangModalCategory(operationalToDelete.kategori);

      const { error: deleteError } = await supabase
        .from('operational')
        .delete()
        .eq('id', id.toString());

      if (deleteError) throw deleteError;

      // ✅ LOGIKA BARU: Penghapusan pembukuan hanya untuk kategori "Kurang Modal"
      if (isKurangModal) {
        // Delete pembukuan entry first
        await supabase
          .from('pembukuan')
          .delete()
          .eq('keterangan', `like ${operationalToDelete.kategori} - ${operationalToDelete.deskripsi}%`);
      }

      // ✅ LOGIKA BARU: Restore modal perusahaan hanya untuk kategori "Kurang Modal"
      if (isKurangModal && operationalToDelete.company_id) {
        // Restore company modal using the database function
        const { error: modalRestoreError } = await supabase.rpc('update_company_modal', {
          company_id: operationalToDelete.company_id,
          amount: operationalToDelete.nominal // Positive to restore modal
        });

        if (modalRestoreError) throw modalRestoreError;
      }

      // ✅ PLACEHOLDER: Untuk kategori "Kurang Profit", akan mengembalikan keuntungan
      if (isKurangProfit) {
        // TODO: Implementasi pengembalian keuntungan
        console.log(`${operationalToDelete.kategori} dihapus: ${operationalToDelete.nominal} - akan mengembalikan keuntungan`);
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

  const handleOpenNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const formatNumberInput = (value: string): string => {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumericInput = (value: string): string => {
    return value.replace(/\./g, '');
  };

  const handleNumericChange = (value: string) => {
    const numericValue = parseNumericInput(value);
    setFormData({...formData, nominal: numericValue});
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getTotalOperational = () => {
    return operationalData.reduce((total, item) => total + item.nominal, 0);
  };

  const getCategoryStats = () => {
    return operationalData.reduce((stats, item) => {
      stats[item.kategori] = (stats[item.kategori] || 0) + 1;
      return stats;
    }, {});
  };

  const filteredCompanies = companiesData.filter(company => 
    selectedDivision === 'all' || company.divisi.toLowerCase() === selectedDivision.toLowerCase()
  );

  // ✅ LOGIKA BARU: Fungsi untuk menentukan apakah field Sumber Dana harus ditampilkan
  const shouldShowSumberDana = (kategori: string) => {
    return !isKurangProfitCategory(kategori);
  };

  // ✅ LOGIKA BARU: Fungsi untuk mendapatkan pesan informasi berdasarkan kategori
  const getCategoryInfoMessage = (kategori: string) => {
    if (isKurangProfitCategory(kategori)) {
      return "Kategori ini tidak memerlukan sumber dana dan tidak akan mengurangi modal perusahaan. Pengeluaran ini akan mengurangi keuntungan.";
    } else if (isKurangModalCategory(kategori)) {
      return "Kategori ini akan mengurangi modal perusahaan dan dicatat dalam pembukuan sebagai debit.";
    }
    return "Kategori operasional standar yang akan mengurangi modal perusahaan dan dicatat dalam pembukuan.";
  };

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

        <Button 
          onClick={handleOpenNewDialog}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Operasional
        </Button>
      </div>

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

            {/* ✅ LOGIKA BARU: Tampilkan field Sumber Dana berdasarkan kategori */}
            {shouldShowSumberDana(formData.kategori) ? (
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
            ) : (
              <div className={`p-3 border rounded-md ${
                isKurangProfitCategory(formData.kategori) 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <p className={`text-sm ${
                  isKurangProfitCategory(formData.kategori) 
                    ? 'text-blue-700' 
                    : 'text-green-700'
                }`}>
                  <strong>Catatan:</strong> {getCategoryInfoMessage(formData.kategori)}
                </p>
              </div>
            )}

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
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        isKurangProfitCategory(item.kategori) 
                          ? 'bg-blue-100 text-blue-800'
                          : isKurangModalCategory(item.kategori)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.kategori}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(item.nominal)}
                    </TableCell>
                    <TableCell>{item.deskripsi}</TableCell>
                    <TableCell>
                      {isKurangProfitCategory(item.kategori) 
                        ? <span className="text-gray-500 italic">Tidak ada</span>
                        : item.companies?.nama_perusahaan
                      }
                    </TableCell>
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