import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { BiroJasaItem, UpdateBiayaFormData } from "./types";
import { formatCurrency, parseCurrency, handleCurrencyInput } from "./utils";

interface UpdateBiayaModalProps {
  biroJasa: BiroJasaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDivision: string;
}

export const UpdateBiayaModal = ({ biroJasa, isOpen, onClose, onSuccess, selectedDivision }: UpdateBiayaModalProps) => {
  const [formData, setFormData] = useState<UpdateBiayaFormData>({
    jumlah_bayar: "",
    keterangan: "",
    tanggal_bayar: new Date().toISOString().split('T')[0],
    tujuan_pembayaran_id: "",
  });
  const [companiesData, setCompaniesData] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchCompaniesData();
    }
  }, [isOpen, selectedDivision]);

  const fetchCompaniesData = async () => {
    let query = supabase
      .from('companies')
      .select('*')
      .eq('status', 'active') // PERBAIKAN: gunakan 'active' bukan 'aktif'
      .order('nama_perusahaan');

    if (selectedDivision !== 'all') {
      query = query.eq('divisi', selectedDivision);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching companies:', error);
      return;
    }

    setCompaniesData(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biroJasa) return;

    try {
      const jumlahBayar = parseCurrency(formData.jumlah_bayar);
      const newTotalBayar = (biroJasa.total_bayar || 0) + jumlahBayar;
      const newSisa = biroJasa.estimasi_biaya - newTotalBayar;
      const newStatus = newSisa <= 0 ? "Selesai" : biroJasa.status;

      // Insert payment record into biro_jasa_cicilan table for history
      const { error: paymentError } = await supabase
        .from("biro_jasa_cicilan")
        .insert([{
          biro_jasa_id: biroJasa.id,
          jumlah_bayar: jumlahBayar,
          tanggal_bayar: formData.tanggal_bayar,
          tujuan_pembayaran_id: formData.tujuan_pembayaran_id ? parseInt(formData.tujuan_pembayaran_id) : null,
          keterangan: formData.keterangan,
        }]);

      if (paymentError) throw paymentError;

      // TAMBAHAN: Insert cicilan ke pembukuan sebagai penerimaan kas
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert([{
          tanggal: formData.tanggal_bayar,
          divisi: selectedDivision,
          keterangan: `Cicilan Biro Jasa - ${biroJasa.jenis_pengurusan} (${biroJasa.plat_nomor}) - ${formData.keterangan || 'Pembayaran cicilan'}`,
          kredit: jumlahBayar,
          debit: 0,
          cabang_id: 1,
          company_id: formData.tujuan_pembayaran_id ? parseInt(formData.tujuan_pembayaran_id) : null,
        }]);

      if (pembukuanError) throw pembukuanError;

      // Update biro jasa record
      const { error: updateError } = await supabase
        .from("biro_jasa")
        .update({
          total_bayar: newTotalBayar,
          sisa: newSisa,
          status: newStatus,
        })
        .eq("id", biroJasa.id);

      if (updateError) throw updateError;

      toast({
        title: "Berhasil",
        description: "Pembayaran berhasil ditambahkan dan dicatat di pembukuan",
      });

      onSuccess();
      onClose();
      setFormData({ 
        jumlah_bayar: "", 
        keterangan: "", 
        tanggal_bayar: new Date().toISOString().split('T')[0],
        tujuan_pembayaran_id: ""
      });
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan pembayaran",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Biaya - {biroJasa?.jenis_pengurusan}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Total Biaya: {formatCurrency(biroJasa?.estimasi_biaya?.toString() || "0")}</Label>
          </div>
          <div>
            <Label>Sudah Dibayar: {formatCurrency(biroJasa?.total_bayar?.toString() || "0")}</Label>
          </div>
          <div>
            <Label>Sisa: {formatCurrency(biroJasa?.sisa?.toString() || "0")}</Label>
          </div>
          <div>
            <Label htmlFor="tanggal_bayar">Tanggal Pembayaran *</Label>
            <div className="mt-1">
              <DatePicker
                id="tanggal_bayar"
                value={formData.tanggal_bayar}
                onChange={(value) => setFormData(prev => ({ ...prev, tanggal_bayar: value }))}
                placeholder="Pilih tanggal pembayaran"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="tujuan_pembayaran_id">Tujuan Pembayaran *</Label>
            <Select value={formData.tujuan_pembayaran_id} onValueChange={(value) => setFormData(prev => ({ ...prev, tujuan_pembayaran_id: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Pilih perusahaan tujuan" />
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
            <Label htmlFor="jumlah_bayar">Jumlah Bayar *</Label>
            <Input
              id="jumlah_bayar"
              type="text"
              value={formData.jumlah_bayar}
              onChange={(e) => setFormData(prev => ({ ...prev, jumlah_bayar: handleCurrencyInput(e.target.value) }))}
              placeholder="0"
              required
            />
          </div>
          <div>
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={formData.keterangan}
              onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit">Simpan</Button>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};