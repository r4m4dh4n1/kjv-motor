import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, handleCurrencyInput, parseCurrency } from "@/utils/formatUtils";
import { useCompaniesData } from "@/hooks/useCompaniesData";

interface OngkirPaymentModalProps {
  penjualan: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDivision: string;
}

interface OngkirPaymentFormData {
  jumlah_bayar: string;
  keterangan: string;
  tanggal_bayar: string;
  tujuan_pembayaran_id: string;
}

export const OngkirPaymentModal = ({ 
  penjualan, 
  isOpen, 
  onClose, 
  onSuccess, 
  selectedDivision 
}: OngkirPaymentModalProps) => {
  const [formData, setFormData] = useState<OngkirPaymentFormData>({
    jumlah_bayar: "",
    keterangan: "",
    tanggal_bayar: new Date().toISOString().split('T')[0],
    tujuan_pembayaran_id: "",
  });
  
  const { companiesData } = useCompaniesData(selectedDivision);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && penjualan) {
      setFormData(prev => ({
        ...prev,
        tujuan_pembayaran_id: penjualan.company_id?.toString() || ""
      }));
    }
  }, [isOpen, penjualan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!penjualan) return;

    try {
      const jumlahBayar = parseCurrency(formData.jumlah_bayar);
      const currentTitipOngkir = penjualan.titip_ongkir || 0;
      const newTitipOngkir = currentTitipOngkir + jumlahBayar;
      const newSisaOngkir = Math.max(0, (penjualan.total_ongkir || 0) - newTitipOngkir);
      const isOngkirLunas = newSisaOngkir <= 0;

      // 1. Insert payment record into ongkir_cicilan table for history
      const { error: paymentError } = await supabase
        .from("ongkir_cicilan")
        .insert([{
          penjualan_id: penjualan.id,
          jumlah_bayar: jumlahBayar,
          tanggal_bayar: formData.tanggal_bayar,
          tujuan_pembayaran_id: formData.tujuan_pembayaran_id ? parseInt(formData.tujuan_pembayaran_id) : null,
          keterangan: formData.keterangan,
          sisa_ongkir_setelah_bayar: newSisaOngkir
        }]);

      if (paymentError) throw paymentError;

      // 2. Update penjualan record
      const { error: updateError } = await supabase
        .from("penjualans")
        .update({
          titip_ongkir: newTitipOngkir,
          sisa_ongkir: newSisaOngkir,
          ongkir_dibayar: isOngkirLunas,
          ...(isOngkirLunas && { tanggal_lunas_ongkir: formData.tanggal_bayar })
        })
        .eq("id", penjualan.id);

      if (updateError) throw updateError;

      // 3. Insert pembukuan entry
      const brandName = penjualan.brands?.name || '';
      const jenisMotor = penjualan.jenis_motor?.jenis_motor || '';
      const platNomor = penjualan.plat;
      
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert([{
          tanggal: formData.tanggal_bayar,
          divisi: selectedDivision,
          keterangan: `Pembayaran Ongkir - ${brandName} - ${jenisMotor} - ${platNomor} - ${formData.keterangan || 'Pembayaran ongkir'}`,
          kredit: jumlahBayar,
          debit: 0,
          cabang_id: penjualan.cabang_id,
          company_id: formData.tujuan_pembayaran_id ? parseInt(formData.tujuan_pembayaran_id) : null,
          pembelian_id: penjualan.pembelian_id
        }]);

      if (pembukuanError) throw pembukuanError;

      // 4. Update company modal
      if (formData.tujuan_pembayaran_id) {
        const { error: modalError } = await supabase
          .rpc('update_company_modal', {
            company_id: parseInt(formData.tujuan_pembayaran_id),
            amount: jumlahBayar
          });

        if (modalError) {
          console.error('Modal Update Error:', modalError);
          toast({
            title: "Warning",
            description: `Pembayaran tersimpan tapi update modal perusahaan gagal: ${modalError.message}`,
            variant: "destructive"
          });
        }
      }

      const successMessage = isOngkirLunas 
        ? 'Pembayaran ongkir berhasil dicatat. Ongkir telah lunas!' 
        : 'Pembayaran ongkir berhasil dicatat.';

      toast({
        title: "Berhasil",
        description: successMessage,
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
      console.error("Error processing ongkir payment:", error);
      toast({
        title: "Error",
        description: "Gagal memproses pembayaran ongkir",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pembayaran Ongkir - {penjualan?.plat}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Total Ongkir: {formatCurrency(penjualan?.total_ongkir?.toString() || "0")}</Label>
          </div>
          <div>
            <Label>Sudah Dibayar: {formatCurrency(penjualan?.titip_ongkir?.toString() || "0")}</Label>
          </div>
          <div>
            <Label>Sisa Ongkir: {formatCurrency(penjualan?.sisa_ongkir?.toString() || "0")}</Label>
          </div>
          
          <div>
            <Label htmlFor="tanggal_bayar">Tanggal Pembayaran *</Label>
            <Input
              id="tanggal_bayar"
              type="date"
              value={formData.tanggal_bayar}
              onChange={(e) => setFormData(prev => ({ ...prev, tanggal_bayar: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="tujuan_pembayaran_id">Tujuan Pembayaran *</Label>
            <Select value={formData.tujuan_pembayaran_id} onValueChange={(value) => setFormData(prev => ({ ...prev, tujuan_pembayaran_id: value }))}>
              <SelectTrigger>
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