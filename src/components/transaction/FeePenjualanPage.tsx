import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2 } from "lucide-react";

interface FeePenjualan {
  id: number;
  penjualan_id: number;
  tanggal_fee: string;
  jumlah_fee: number;
  keterangan: string;
  divisi: string;
  created_at: string;
  updated_at: string;
  penjualans?: {
    plat: string;
    brands: { name: string };
    jenis_motor: { jenis_motor: string };
  };
}

interface Penjualan {
  id: number;
  plat: string;
  brands: { name: string };
  jenis_motor: { jenis_motor: string };
}

interface FeePenjualanPageProps {
  selectedDivision: string;
}

const FeePenjualanPage = ({ selectedDivision }: FeePenjualanPageProps) => {
  const [feeData, setFeeData] = useState<FeePenjualan[]>([]);
  const [penjualanData, setPenjualanData] = useState<Penjualan[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeePenjualan | null>(null);
  const [formData, setFormData] = useState({
    penjualan_id: "",
    tanggal_fee: new Date().toISOString().split('T')[0],
    jumlah_fee: "",
    keterangan: "",
    divisi: selectedDivision === 'all' ? 'bekas' : selectedDivision,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchFeeData();
    fetchEligiblePenjualanData();
  }, [selectedDivision]);

  const fetchFeeData = async () => {
    try {
      let query = supabase
        .from('fee_penjualan')
        .select(`
          *,
          penjualans!inner(
            plat,
            brands!inner(name),
            jenis_motor:jenis_id(jenis_motor)
          )
        `)
        .order('tanggal_fee', { ascending: false });

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFeeData(data || []);
    } catch (error) {
      console.error('Error fetching fee data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data fee penjualan",
        variant: "destructive"
      });
    }
  };

  const fetchEligiblePenjualanData = async () => {
    try {
      // Fetch only completed sales (status: selesai) with sold motorcycles
      let query = supabase
        .from('penjualans')
        .select(`
          id,
          plat,
          divisi,
          brands!inner(name),
          jenis_motor:jenis_id!inner(jenis_motor, divisi),
          pembelian!inner(status)
        `)
        .eq('status', 'selesai')
        .eq('pembelian.status', 'sold');

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Additional filter to ensure jenis_motor divisi matches selected division
      const filteredData = selectedDivision !== 'all' 
        ? (data || []).filter(item => item.jenis_motor?.divisi === selectedDivision)
        : (data || []);
      
      setPenjualanData(filteredData);
    } catch (error) {
      console.error('Error fetching eligible penjualan data:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (value: string) => {
    const number = value.replace(/\D/g, '');
    return new Intl.NumberFormat('id-ID').format(parseInt(number) || 0);
  };

  const parseFormattedNumber = (formattedValue: string) => {
    return parseInt(formattedValue.replace(/\./g, '')) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.penjualan_id || !formData.jumlah_fee) {
      toast({
        title: "Error",
        description: "Harap lengkapi semua field yang wajib diisi",
        variant: "destructive"
      });
      return;
    }

    try {
      const submitData = {
        penjualan_id: parseInt(formData.penjualan_id),
        tanggal_fee: formData.tanggal_fee,
        jumlah_fee: parseFormattedNumber(formData.jumlah_fee),
        keterangan: formData.keterangan,
        divisi: formData.divisi,
      };

      if (editingFee) {
        const { error } = await supabase
          .from('fee_penjualan')
          .update(submitData)
          .eq('id', editingFee.id);

        if (error) throw error;

        toast({
          title: "Sukses",
          description: "Fee penjualan berhasil diperbarui"
        });
      } else {
        const { error } = await supabase
          .from('fee_penjualan')
          .insert([submitData]);

        if (error) throw error;

        toast({
          title: "Sukses",
          description: "Fee penjualan berhasil ditambahkan"
        });
      }

      resetForm();
      fetchFeeData();
    } catch (error) {
      console.error('Error saving fee:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan fee penjualan",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (fee: FeePenjualan) => {
    setEditingFee(fee);
    setFormData({
      penjualan_id: fee.penjualan_id.toString(),
      tanggal_fee: fee.tanggal_fee,
      jumlah_fee: formatNumber(fee.jumlah_fee.toString()),
      keterangan: fee.keterangan,
      divisi: fee.divisi,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('fee_penjualan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Fee penjualan berhasil dihapus"
      });

      fetchFeeData();
    } catch (error) {
      console.error('Error deleting fee:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus fee penjualan",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      penjualan_id: "",
      tanggal_fee: new Date().toISOString().split('T')[0],
      jumlah_fee: "",
      keterangan: "",
      divisi: selectedDivision === 'all' ? 'bekas' : selectedDivision,
    });
    setEditingFee(null);
    setIsDialogOpen(false);
  };

  const filteredFeeData = feeData.filter((fee) =>
    fee.penjualans?.plat.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.penjualans?.brands?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.penjualans?.jenis_motor?.jenis_motor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.keterangan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fee Penjualan</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Fee Penjualan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingFee ? "Edit Fee Penjualan" : "Tambah Fee Penjualan"}
              </DialogTitle>
              <DialogDescription>
                {editingFee ? "Ubah data fee penjualan" : "Tambahkan fee penjualan baru"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="penjualan_id">Penjualan</Label>
                <Select
                  value={formData.penjualan_id}
                  onValueChange={(value) => setFormData({ ...formData, penjualan_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih penjualan yang selesai" />
                  </SelectTrigger>
                  <SelectContent>
                    {penjualanData.map((penjualan) => (
                      <SelectItem key={penjualan.id} value={penjualan.id.toString()}>
                        {penjualan.plat} - {penjualan.brands?.name} {penjualan.jenis_motor?.jenis_motor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tanggal_fee">Tanggal Fee</Label>
                <div className="mt-1">
                  <DatePicker
                    id="tanggal_fee"
                    value={formData.tanggal_fee}
                    onChange={(value) => setFormData({ ...formData, tanggal_fee: value })}
                    placeholder="Pilih tanggal fee"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="jumlah_fee">Jumlah Fee</Label>
                <Input
                  id="jumlah_fee"
                  value={formData.jumlah_fee}
                  onChange={(e) => setFormData({ ...formData, jumlah_fee: formatNumber(e.target.value) })}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="divisi">Divisi</Label>
                <Select
                  value={formData.divisi}
                  onValueChange={(value) => setFormData({ ...formData, divisi: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bekas">Bekas</SelectItem>
                    <SelectItem value="baru">Baru</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Keterangan fee penjualan..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
                <Button type="submit">
                  {editingFee ? "Perbarui" : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center">
        <Input
          placeholder="Cari berdasarkan plat nomor, brand, jenis motor, atau keterangan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Tanggal Fee</TableHead>
              <TableHead>Motor</TableHead>
              <TableHead>Plat Nomor</TableHead>
              <TableHead>Jumlah Fee</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeeData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Tidak ada data fee penjualan
                </TableCell>
              </TableRow>
            ) : (
              filteredFeeData.map((fee, index) => (
                <TableRow key={fee.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{new Date(fee.tanggal_fee).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>
                    {fee.penjualans?.brands?.name} {fee.penjualans?.jenis_motor?.jenis_motor}
                  </TableCell>
                  <TableCell>{fee.penjualans?.plat}</TableCell>
                  <TableCell>{formatCurrency(fee.jumlah_fee)}</TableCell>
                  <TableCell className="capitalize">{fee.divisi}</TableCell>
                  <TableCell>{fee.keterangan || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(fee)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Fee Penjualan</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus fee penjualan ini? Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(fee.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FeePenjualanPage;