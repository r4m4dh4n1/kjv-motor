import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNumber, parseFormattedNumber } from "@/utils/formatUtils";
import { DatePicker } from "@/components/ui/date-picker";

interface CicilanPageProps {
  selectedDivision: string;
}

const CicilanPage = ({ selectedDivision }: CicilanPageProps) => {
  const [cicilanData, setCicilanData] = useState([]);
  const [penjualanData, setPenjualanData] = useState([]);
  const [companiesData, setCompaniesData] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPenjualan, setSelectedPenjualan] = useState(null);
  const [formData, setFormData] = useState({
    penjualan_id: '',
    tanggal_bayar: new Date().toISOString().split('T')[0],
    jumlah_bayar: '',
    keterangan: '',
    jenis_pembayaran: 'cash',
    tujuan_pembayaran_id: ''
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedDivision]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCicilanData(),
        fetchPenjualanData(),
        fetchCompaniesData()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Updated: Ambil semua companies aktif tanpa filter divisi
  const fetchCompaniesData = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('status', 'active')
      .order('nama_perusahaan');

    if (error) throw error;
    setCompaniesData(data || []);
  };

  const fetchCicilanData = async () => {
    let query = supabase
      .from('cicilan')
      .select(`
        *,
        penjualans:penjualan_id(
          plat,
          harga_jual,
          sisa_bayar,
          brands:brand_id(name),
          jenis_motor:jenis_id(jenis_motor)
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Just use all data since filtering by division should be done via the penjualans table
    const filteredData = data;

    setCicilanData(filteredData || []);
  };

  const fetchPenjualanData = async () => {
    let query = supabase
      .from('penjualans')
      .select(`
        *,
        brands:brand_id(name),
        jenis_motor:jenis_id(jenis_motor)
      `)
      .in('jenis_pembayaran', ['cash_bertahap', 'kredit'])
      .gt('sisa_bayar', 0)
      .order('created_at', { ascending: false });

    if (selectedDivision !== 'all') {
      query = query.eq('divisi', selectedDivision);
    }

    const { data, error } = await query;
    if (error) throw error;

    setPenjualanData(data || []);
  };

  // New: Helper function untuk filter companies berdasarkan penjualan
  const getCompaniesForPenjualan = () => {
    if (!selectedPenjualan) return [];
    
    // Filter companies berdasarkan divisi dari penjualan yang dipilih
    return companiesData.filter(company => 
      company.divisi === selectedPenjualan.divisi
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.penjualan_id || !formData.tanggal_bayar || !formData.jumlah_bayar) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const jumlahBayar = parseFloat(formData.jumlah_bayar);
    if (isNaN(jumlahBayar) || jumlahBayar <= 0) {
      toast({
        title: "Error",
        description: "Jumlah bayar harus berupa angka yang valid",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPenjualan) {
      toast({
        title: "Error",
        description: "Data penjualan tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    if (jumlahBayar > selectedPenjualan.sisa_bayar) {
      toast({
        title: "Error",
        description: "Jumlah bayar tidak boleh melebihi sisa bayar",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the latest batch number for this penjualan
      const { data: existingCicilan, error: fetchError } = await supabase
        .from('cicilan')
        .select('batch_ke')
        .eq('penjualan_id', parseInt(formData.penjualan_id))
        .order('batch_ke', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextBatch = existingCicilan.length > 0 ? existingCicilan[0].batch_ke + 1 : 1;
      const sisaBayarBaru = selectedPenjualan.sisa_bayar - jumlahBayar;

      // Insert cicilan record
      const { error: insertError } = await supabase
        .from('cicilan')
        .insert([{
          penjualan_id: parseInt(formData.penjualan_id),
          batch_ke: nextBatch,
          tanggal_bayar: formData.tanggal_bayar,
          jumlah_bayar: jumlahBayar,
          sisa_bayar: sisaBayarBaru,
          keterangan: formData.keterangan,
          jenis_pembayaran: formData.jenis_pembayaran,
          tujuan_pembayaran_id: formData.tujuan_pembayaran_id ? parseInt(formData.tujuan_pembayaran_id) : null,
          status: sisaBayarBaru === 0 ? 'completed' : 'pending'
        }]);

      if (insertError) throw insertError;

      // Update sisa_bayar in penjualans table
      const { error: updateError } = await supabase
        .from('penjualans')
        .update({ 
          sisa_bayar: sisaBayarBaru,
          status: sisaBayarBaru === 0 ? 'selesai' : 'proses'
        })
        .eq('id', parseInt(formData.penjualan_id));

      if (updateError) throw updateError;

      // Insert pembukuan entry for cicilan payment
      const brandName = selectedPenjualan.brands?.name || '';
      const jenisMotor = selectedPenjualan.jenis_motor?.jenis_motor || '';
      const platNomor = selectedPenjualan.plat;
      
      // Determine keterangan based on transaction type and payment method
      let keterangan = '';
      if (selectedPenjualan.tt !== 'tukar_tambah') {
        // Non tukar tambah
        if (selectedPenjualan.jenis_pembayaran === 'cash_bertahap') {
          keterangan = `cash bertahap ke ${nextBatch} dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        } else if (selectedPenjualan.jenis_pembayaran === 'kredit') {
          keterangan = `cicilan ke ${nextBatch} dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        }
      } else {
        // Tukar tambah
        if (selectedPenjualan.jenis_pembayaran === 'cash_bertahap') {
          keterangan = `cash bertahap ke ${nextBatch} Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        } else if (selectedPenjualan.jenis_pembayaran === 'kredit') {
          keterangan = `cicilan ke ${nextBatch} Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`;
        }
      }
      
      const pembukuanEntry = {
        tanggal: formData.tanggal_bayar,
        divisi: selectedPenjualan.divisi,
        cabang_id: selectedPenjualan.cabang_id,
        keterangan: keterangan,
        debit: 0,
        kredit: jumlahBayar,
        saldo: 0,
        pembelian_id: selectedPenjualan.pembelian_id,
        company_id: selectedPenjualan.company_id
      };

      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert([pembukuanEntry]);

      if (pembukuanError) {
        console.error('Pembukuan Error:', pembukuanError);
        toast({
          title: "Warning",
          description: `Cicilan tersimpan tapi pembukuan gagal: ${pembukuanError.message}`,
          variant: "destructive"
        });
      }

      toast({
        title: "Berhasil",
        description: `Pembayaran cicilan berhasil dicatat. ${sisaBayarBaru === 0 ? 'Pembayaran telah lunas!' : ''}`,
      });

      resetForm();
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving cicilan:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data cicilan",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      penjualan_id: '',
      tanggal_bayar: new Date().toISOString().split('T')[0],
      jumlah_bayar: '',
      keterangan: '',
      jenis_pembayaran: 'cash',
      tujuan_pembayaran_id: ''
    });
    setSelectedPenjualan(null);
  };

  // Updated: Auto-set tujuan pembayaran ketika penjualan dipilih
  const handlePenjualanSelect = (penjualanId: string) => {
    const penjualan = penjualanData.find(p => p.id.toString() === penjualanId);
    setSelectedPenjualan(penjualan);
    setFormData(prev => ({ 
      ...prev, 
      penjualan_id: penjualanId,
      // Auto-set tujuan pembayaran ke company dari penjualan
      tujuan_pembayaran_id: penjualan?.company_id?.toString() || ''
    }));
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending" },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Selesai" },
      overdue: { color: "bg-red-100 text-red-800", icon: AlertCircle, label: "Terlambat" }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTotalCicilan = () => {
    return cicilanData.reduce((total, item) => total + item.jumlah_bayar, 0);
  };

  const getPendingCount = () => {
    return cicilanData.filter(item => item.status === 'pending').length;
  };

  const getCompletedCount = () => {
    return cicilanData.filter(item => item.status === 'completed').length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            Manajemen Cash Bertahap
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola pembayaran kredi dan cash bertahap
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pembayaran
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Pembayaran Cicilan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="penjualan_id">Pilih Penjualan *</Label>
                <Select value={formData.penjualan_id} onValueChange={handlePenjualanSelect}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih penjualan" />
                  </SelectTrigger>
                  <SelectContent>
                    {penjualanData.map((penjualan) => (
                      <SelectItem key={penjualan.id} value={penjualan.id.toString()}>
                        {penjualan.plat} - {penjualan.brands?.name} {penjualan.jenis_motor?.jenis_motor}
                        <br />
                        <small className="text-gray-500">
                          Sisa: {formatCurrency(penjualan.sisa_bayar)}
                        </small>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPenjualan && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Detail Penjualan:</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Motor:</strong> {selectedPenjualan.brands?.name} {selectedPenjualan.jenis_motor?.jenis_motor}</p>
                    <p><strong>Plat:</strong> {selectedPenjualan.plat}</p>
                    <p><strong>Harga Jual:</strong> {formatCurrency(selectedPenjualan.harga_jual)}</p>
                    <p><strong>Sisa Bayar:</strong> <span className="text-red-600 font-semibold">{formatCurrency(selectedPenjualan.sisa_bayar)}</span></p>
                    <p><strong>Divisi:</strong> {selectedPenjualan.divisi}</p>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="tanggal_bayar">Tanggal Bayar *</Label>
                <div className="mt-1">
                  <DatePicker
                    id="tanggal_bayar"
                    value={formData.tanggal_bayar}
                    onChange={(value) => setFormData({...formData, tanggal_bayar: value})}
                    placeholder="Pilih tanggal bayar"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="jumlah_bayar">Jumlah Bayar *</Label>
                <Input
                  id="jumlah_bayar"
                  type="text"
                  value={formatNumber(formData.jumlah_bayar)}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({...formData, jumlah_bayar: rawValue});
                  }}
                  placeholder="Masukkan jumlah pembayaran"
                  className="mt-1"
                />
                {selectedPenjualan && (
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimal: {formatCurrency(selectedPenjualan.sisa_bayar)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="jenis_pembayaran">Jenis Pembayaran *</Label>
                <Select value={formData.jenis_pembayaran} onValueChange={(value) => setFormData({...formData, jenis_pembayaran: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih jenis pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="check">Cek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Updated: Dropdown tujuan pembayaran dengan filter dan auto-set */}
              <div>
                <Label htmlFor="tujuan_pembayaran_id">Tujuan Pembayaran *</Label>
                <Select 
                  value={formData.tujuan_pembayaran_id} 
                  onValueChange={(value) => setFormData({...formData, tujuan_pembayaran_id: value})}
                  disabled={!selectedPenjualan}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih perusahaan tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCompaniesForPenjualan().map((company) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.nama_perusahaan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPenjualan && (
                  <p className="text-xs text-gray-500 mt-1">
                    Divisi: {selectedPenjualan.divisi} • Companies: {getCompaniesForPenjualan().length}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  placeholder="Catatan pembayaran (opsional)"
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4 sticky bottom-0 bg-white border-t mt-6 pt-4">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Simpan Pembayaran
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cicilan</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(getTotalCicilan())}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pembayaran Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {getPendingCount()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pembayaran Selesai</p>
                <p className="text-2xl font-bold text-blue-600">
                  {getCompletedCount()}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transaksi</p>
                <p className="text-2xl font-bold text-purple-600">
                  {cicilanData.length}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pembayaran Cicilan</CardTitle>
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
                  <TableHead>Motor</TableHead>
                  <TableHead>Plat</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Jumlah Bayar</TableHead>
                  <TableHead>Sisa Bayar</TableHead>
                  <TableHead>Jenis Bayar</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cicilanData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(item.tanggal_bayar)}</TableCell>
                    <TableCell>
                      {item.penjualans?.brands?.name} {item.penjualans?.jenis_motor?.jenis_motor}
                    </TableCell>
                    <TableCell>{item.penjualans?.plat}</TableCell>
                    <TableCell>
                      <Badge variant="outline">#{item.batch_ke}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(item.jumlah_bayar)}
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(item.sisa_bayar)}
                    </TableCell>
                    <TableCell className="capitalize">{item.jenis_pembayaran}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.keterangan || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {cicilanData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      Tidak ada data cicilan
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

export default CicilanPage;