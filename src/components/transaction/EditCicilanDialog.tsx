import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatNumber, parseFormattedNumber } from '@/utils/formatUtils';

interface EditCicilanDialogProps {
  cicilan: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companiesData: any[];
}

const EditCicilanDialog = ({ cicilan, isOpen, onClose, onSuccess, companiesData }: EditCicilanDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tanggal_bayar: '',
    jumlah_bayar: '',
    keterangan: '',
    tujuan_pembayaran_id: '',
    jenis_pembayaran: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (cicilan && isOpen) {
      setFormData({
        tanggal_bayar: cicilan.tanggal_bayar || '',
        jumlah_bayar: formatNumber(cicilan.jumlah_bayar || 0),
        keterangan: cicilan.keterangan || '',
        tujuan_pembayaran_id: cicilan.tujuan_pembayaran_id?.toString() || '',
        jenis_pembayaran: cicilan.jenis_pembayaran || ''
      });
    }
  }, [cicilan, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jumlahBayar = parseFormattedNumber(formData.jumlah_bayar);
      const originalJumlahBayar = cicilan.jumlah_bayar || 0;
      const selisihPembayaran = jumlahBayar - originalJumlahBayar;

      // Update cicilan record
      const { error: cicilanError } = await supabase
        .from('cicilan')
        .update({
          tanggal_bayar: formData.tanggal_bayar,
          jumlah_bayar: jumlahBayar,
          keterangan: formData.keterangan,
          tujuan_pembayaran_id: formData.tujuan_pembayaran_id ? parseInt(formData.tujuan_pembayaran_id) : null,
          jenis_pembayaran: formData.jenis_pembayaran,
          updated_at: new Date().toISOString()
        })
        .eq('id', cicilan.id);

      if (cicilanError) throw cicilanError;

      // Update penjualan record - adjust harga_bayar and sisa_bayar
      const { data: penjualanData, error: penjualanFetchError } = await supabase
        .from('penjualans')
        .select('harga_bayar, sisa_bayar, harga_jual, status')
        .eq('id', cicilan.penjualan_id)
        .single();

      if (penjualanFetchError) throw penjualanFetchError;

      const newHargaBayar = (penjualanData.harga_bayar || 0) + selisihPembayaran;
      const newSisaBayar = penjualanData.harga_jual - newHargaBayar;
      const newStatus = newSisaBayar <= 0 ? 'selesai' : penjualanData.status;

      const { error: penjualanUpdateError } = await supabase
        .from('penjualans')
        .update({
          harga_bayar: newHargaBayar,
          sisa_bayar: newSisaBayar,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', cicilan.penjualan_id);

      if (penjualanUpdateError) throw penjualanUpdateError;

      // Update company modal if tujuan_pembayaran_id changed
      if (formData.tujuan_pembayaran_id && selisihPembayaran !== 0) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: parseInt(formData.tujuan_pembayaran_id),
          amount: Math.abs(selisihPembayaran) // UBAH: Selalu tambah (bukan kurangi)
        });

        if (modalError) {
          console.error('Error updating company modal:', modalError);
        }
      }

      toast({
        title: "Sukses",
        description: "Data cicilan berhasil diperbarui"
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating cicilan:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui data cicilan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Pembayaran Cicilan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tanggal_bayar">Tanggal Bayar</Label>
            <Input
              id="tanggal_bayar"
              type="date"
              value={formData.tanggal_bayar}
              onChange={(e) => handleInputChange('tanggal_bayar', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="jumlah_bayar">Jumlah Bayar</Label>
            <Input
              id="jumlah_bayar"
              value={formData.jumlah_bayar}
              onChange={(e) => handleInputChange('jumlah_bayar', formatNumber(parseFormattedNumber(e.target.value)))}
              placeholder="Masukkan jumlah pembayaran"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Tidak ada batasan nominal pembayaran
            </p>
          </div>

          <div>
            <Label htmlFor="jenis_pembayaran">Jenis Pembayaran</Label>
            <Select value={formData.jenis_pembayaran} onValueChange={(value) => handleInputChange('jenis_pembayaran', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis pembayaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash_bertahap">Cash Bertahap</SelectItem>
                <SelectItem value="kredit">Kredit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tujuan_pembayaran_id">Tujuan Pembayaran (Perusahaan)</Label>
            <Select value={formData.tujuan_pembayaran_id} onValueChange={(value) => handleInputChange('tujuan_pembayaran_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih perusahaan tujuan pembayaran" />
              </SelectTrigger>
              <SelectContent>
                {companiesData.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.nama_perusahaan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={formData.keterangan}
              onChange={(e) => handleInputChange('keterangan', e.target.value)}
              placeholder="Keterangan pembayaran (opsional)"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCicilanDialog;