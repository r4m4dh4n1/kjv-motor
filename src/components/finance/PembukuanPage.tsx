import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BookOpen, TrendingUp, TrendingDown, DollarSign, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PembukuanPageProps {
  selectedDivision: string;
}

const PembukuanPage = ({ selectedDivision }: PembukuanPageProps) => {
  const [pembukuanData, setPembukuanData] = useState([]);
  const [cabangData, setCabangData] = useState([]);
  const [companiesData, setCompaniesData] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    divisi: selectedDivision !== 'all' ? selectedDivision : '',
    cabang_id: '',
    keterangan: '',
    debit: '',
    kredit: '',
    company_id: ''
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchPembukuanData();
  }, [dateFilter, customStartDate, customEndDate, selectedDivision, selectedCompany]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      divisi: selectedDivision !== 'all' ? selectedDivision : prev.divisi
    }));
  }, [selectedDivision]);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case "today":
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday.toISOString().split('T')[0], end: yesterday.toISOString().split('T')[0] };
      
      case "this_week":
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { start: startOfWeek.toISOString().split('T')[0], end: endOfWeek.toISOString().split('T')[0] };
      
      case "last_week":
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        return { start: startOfLastWeek.toISOString().split('T')[0], end: endOfLastWeek.toISOString().split('T')[0] };
      
      case "this_month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: startOfMonth.toISOString().split('T')[0], end: endOfMonth.toISOString().split('T')[0] };
      
      case "last_month":
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: startOfLastMonth.toISOString().split('T')[0], end: endOfLastMonth.toISOString().split('T')[0] };
      
      case "this_year":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        return { start: startOfYear.toISOString().split('T')[0], end: endOfYear.toISOString().split('T')[0] };
      
      case "last_year":
        const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
        const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31);
        return { start: startOfLastYear.toISOString().split('T')[0], end: endOfLastYear.toISOString().split('T')[0] };
      
      case "custom":
        return { start: customStartDate, end: customEndDate };
      
      case "all":
        // Return a very wide range for "all"
        const veryOldDate = new Date(2020, 0, 1);
        const futureDate = new Date(now.getFullYear() + 1, 11, 31);
        return { start: veryOldDate.toISOString().split('T')[0], end: futureDate.toISOString().split('T')[0] };
      
      default:
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
    }
  };

  const fetchInitialData = async () => {
    try {
      const [cabangResult, companiesResult] = await Promise.all([
        supabase.from('cabang').select('*').order('nama'),
        supabase.from('companies').select('*').order('nama_perusahaan')
      ]);

      if (cabangResult.error) throw cabangResult.error;
      if (companiesResult.error) throw companiesResult.error;

      setCabangData(cabangResult.data || []);
      setCompaniesData(companiesResult.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data awal",
        variant: "destructive",
      });
    }
  };

  const fetchPembukuanData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      if (!start || !end) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('pembukuan')
        .select(`
          *,
          cabang:cabang_id(nama),
          companies:company_id(nama_perusahaan),
          pembelian:pembelian_id(plat_nomor)
        `)
        .gte('tanggal', start)
        .lte('tanggal', end)
        .order('tanggal', { ascending: false });

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      if (selectedCompany !== 'all') {
        query = query.eq('company_id', parseInt(selectedCompany));
      }

      const { data, error } = await query;
      if (error) throw error;

      setPembukuanData(data || []);
    } catch (error) {
      console.error('Error fetching pembukuan data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data pembukuan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tanggal || !formData.divisi || !formData.cabang_id || !formData.keterangan) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const debitAmount = parseFloat(formData.debit) || 0;
    const kreditAmount = parseFloat(formData.kredit) || 0;

    if (debitAmount === 0 && kreditAmount === 0) {
      toast({
        title: "Error",
        description: "Minimal salah satu dari Debit atau Kredit harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('pembukuan')
        .insert([{
          tanggal: formData.tanggal,
          divisi: formData.divisi,
          cabang_id: parseInt(formData.cabang_id),
          keterangan: formData.keterangan,
          debit: debitAmount,
          kredit: kreditAmount,
          company_id: formData.company_id ? parseInt(formData.company_id) : null
        }]);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data pembukuan berhasil ditambahkan",
      });

      resetForm();
      setIsDialogOpen(false);
      fetchPembukuanData();
    } catch (error) {
      console.error('Error saving pembukuan:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data pembukuan",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      divisi: selectedDivision !== 'all' ? selectedDivision : '',
      cabang_id: '',
      keterangan: '',
      debit: '',
      kredit: '',
      company_id: ''
    });
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

  const getTotalDebit = () => {
    return pembukuanData.reduce((total, item) => total + (item.debit || 0), 0);
  };

  const getTotalKredit = () => {
    return pembukuanData.reduce((total, item) => total + (item.kredit || 0), 0);
  };

  const getBalance = () => {
    return getTotalKredit() - getTotalDebit();
  };

  const filteredCompanies = companiesData.filter(company => 
    formData.divisi ? company.divisi.toLowerCase() === formData.divisi.toLowerCase() : true
  );

  // Fungsi untuk filter perusahaan berdasarkan divisi yang dipilih di sidebar
  const getFilteredCompanies = () => {
    if (selectedDivision === 'all') {
      return companiesData;
    }
    return companiesData.filter(company => 
      company.divisi && company.divisi.toLowerCase() === selectedDivision.toLowerCase()
    );
  };

  const handlePrint = () => {
    const { start, end } = getDateRange();
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laporan Pembukuan</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .summary { margin-top: 20px; }
            .summary-item { display: inline-block; margin-right: 30px; }
            .divisi-sport { background-color: #dbeafe; color: #1e40af; }
            .divisi-start { background-color: #dcfce7; color: #166534; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LAPORAN PEMBUKUAN</h1>
            <p>Periode: ${formatDate(start)} - ${formatDate(end)}</p>
            ${selectedDivision !== 'all' ? `<p>Divisi: ${selectedDivision.toUpperCase()}</p>` : ''}
            ${selectedCompany !== 'all' ? `<p>Perusahaan: ${getFilteredCompanies().find(c => c.id.toString() === selectedCompany)?.nama_perusahaan || ''}</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Divisi</th>
                <th>Cabang</th>
                <th>Keterangan</th>
                <th>Debit</th>
                <th>Kredit</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              ${pembukuanData.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${formatDate(item.tanggal)}</td>
                  <td><span class="${item.divisi === 'sport' ? 'divisi-sport' : 'divisi-start'}">${item.divisi}</span></td>
                  <td>${item.cabang?.nama || '-'}</td>
                  <td>${item.keterangan}</td>
                  <td class="text-right">${item.debit ? formatCurrency(item.debit) : '-'}</td>
                  <td class="text-right">${item.kredit ? formatCurrency(item.kredit) : '-'}</td>
                  <td>${item.companies?.nama_perusahaan || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-item">
              <strong>Total Debit: ${formatCurrency(getTotalDebit())}</strong>
            </div>
            <div class="summary-item">
              <strong>Total Kredit: ${formatCurrency(getTotalKredit())}</strong>
            </div>
            <div class="summary-item">
              <strong>Saldo: ${formatCurrency(getBalance())}</strong>
            </div>
            <div class="summary-item">
              <strong>Total Transaksi: ${pembukuanData.length}</strong>
            </div>
          </div>
          
          <div style="margin-top: 40px; text-align: right;">
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-green-600" />
            Transaksi dan Mutasi Keuangan
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola catatan keuangan dan transaksi
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handlePrint} 
            variant="outline" 
            className="border-green-600 text-green-600 hover:bg-green-50"
            disabled={loading || pembukuanData.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Laporan
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Transaksi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Transaksi Pembukuan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="tanggal">Tanggal *</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="divisi">Divisi *</Label>
                  {selectedDivision === "all" ? (
                    <Select value={formData.divisi} onValueChange={(value) => setFormData({...formData, divisi: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih divisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sport">Sport</SelectItem>
                        <SelectItem value="start">Start</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.divisi === 'sport' ? 'Sport' : 'Start'}
                      readOnly
                      className="mt-1 bg-gray-100"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="cabang_id">Cabang *</Label>
                  <Select value={formData.cabang_id} onValueChange={(value) => setFormData({...formData, cabang_id: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      {cabangData.map((cabang) => (
                        <SelectItem key={cabang.id} value={cabang.id.toString()}>
                          {cabang.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="company_id">Company (Opsional)</Label>
                  <Select value={formData.company_id} onValueChange={(value) => setFormData({...formData, company_id: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tidak Ada</SelectItem>
                      {filteredCompanies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.nama_perusahaan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="debit">Debit (Rp)</Label>
                    <Input
                      id="debit"
                      type="number"
                      value={formData.debit}
                      onChange={(e) => setFormData({...formData, debit: e.target.value})}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="kredit">Kredit (Rp)</Label>
                    <Input
                      id="kredit"
                      type="number"
                      value={formData.kredit}
                      onChange={(e) => setFormData({...formData, kredit: e.target.value})}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="keterangan">Keterangan *</Label>
                  <Textarea
                    id="keterangan"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                    placeholder="Masukkan keterangan transaksi"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Simpan
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
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dateFilter">Periode</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih periode" />
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
            
            <div>
              <Label htmlFor="selectedCompany">Perusahaan</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Perusahaan</SelectItem>
                  {getFilteredCompanies().map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.nama_perusahaan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={fetchPembukuanData} disabled={loading} className="w-full">
                {loading ? "Loading..." : "Filter"}
              </Button>
            </div>
          </div>
          
          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="customStartDate">Tanggal Mulai</Label>
                <Input
                  id="customStartDate"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="customEndDate">Tanggal Selesai</Label>
                <Input
                  id="customEndDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pemasukan</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalKredit())}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalDebit())}
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
                <p className="text-sm font-medium text-gray-600">Cash Flow Bersih</p>
                <p className={`text-2xl font-bold ${getBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(getBalance())}
                </p>
              </div>
              <DollarSign className={`w-8 h-8 ${getBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pembukuanData.length}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Pembukuan</CardTitle>
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
                  <TableHead>Divisi</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Debit</TableHead>
                  <TableHead>Kredit</TableHead>
                  <TableHead>Company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pembukuanData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(item.tanggal)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.divisi === 'sport' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.divisi}
                      </span>
                    </TableCell>
                    <TableCell>{item.cabang?.nama}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.keterangan}</TableCell>
                    <TableCell className="text-red-600 font-semibold">
                      {item.debit ? formatCurrency(item.debit) : '-'}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {item.kredit ? formatCurrency(item.kredit) : '-'}
                    </TableCell>
                    <TableCell>{item.companies?.nama_perusahaan || '-'}</TableCell>
                  </TableRow>
                ))}
                {pembukuanData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Tidak ada data pembukuan
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

export default PembukuanPage;