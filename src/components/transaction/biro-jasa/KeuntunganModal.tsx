import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { BiroJasaItem, KeuntunganFormData } from "./types";
import { getCurrentDate, formatCurrency, parseCurrency, handleCurrencyInput } from "./utils";

interface KeuntunganModalProps {
  biroJasa: BiroJasaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDivision: string;
}

export const KeuntunganModal = ({ biroJasa, isOpen, onClose, onSuccess, selectedDivision }: KeuntunganModalProps) => {
  const [formData, setFormData] = useState<KeuntunganFormData>({
    biaya_modal: formatCurrency(biroJasa?.biaya_modal?.toString() || "0"),
    keuntungan: "0",
  });
  const { toast } = useToast();

  // Calculate profit when biaya_modal changes
  useEffect(() => {
    if (biroJasa) {
      const estimasiBiaya = biroJasa.estimasi_biaya || 0;
      const biayaModal = parseCurrency(formData.biaya_modal) || 0;
      const keuntungan = estimasiBiaya - biayaModal;
      
      console.log('Debug keuntungan calculation:', {
        estimasiBiaya_raw: biroJasa.estimasi_biaya,
        biaya_modal_raw: formData.biaya_modal,
        estimasiBiaya_parsed: estimasiBiaya,
        biaya_modal_parsed: biayaModal,
        keuntungan_calculated: keuntungan
      });
      
      setFormData(prev => ({ ...prev, keuntungan: formatCurrency(keuntungan.toString()) }));
    }
  }, [formData.biaya_modal, biroJasa]);

  useEffect(() => {
    if (biroJasa) {
      setFormData({
        biaya_modal: formatCurrency(biroJasa.biaya_modal?.toString() || "0"),
        keuntungan: formatCurrency(biroJasa.keuntungan?.toString() || "0"),
      });
    }
  }, [biroJasa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biroJasa) return;

    try {
      const biayaModal = parseCurrency(formData.biaya_modal);
      const keuntungan = parseCurrency(formData.keuntungan);

      // Update biro jasa with cost and profit (HANYA simpan di tabel biro_jasa)
      const { error: updateError } = await supabase
        .from("biro_jasa")
        .update({
          biaya_modal: biayaModal,
          keuntungan: keuntungan,
        })
        .eq("id", biroJasa.id);

      if (updateError) throw updateError;

      // HAPUS: Pencatatan keuntungan ke pembukuan untuk menghindari duplikasi
      // Keuntungan hanya disimpan di tabel biro_jasa untuk tracking

      toast({
        title: "Berhasil",
        description: "Data keuntungan berhasil disimpan",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving profit:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data keuntungan",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keuntungan - {biroJasa?.jenis_pengurusan}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Detail Biro Jasa */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">Detail Biro Jasa</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Brand:</span>
                <span className="ml-2">{biroJasa?.brands?.name || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Jenis Motor:</span>
                <span className="ml-2">{biroJasa?.jenis_motor?.jenis_motor || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Plat Nomor:</span>
                <span className="ml-2">{biroJasa?.plat_nomor || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Warna:</span>
                <span className="ml-2">{biroJasa?.warna || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tahun:</span>
                <span className="ml-2">{biroJasa?.tahun || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2">{biroJasa?.status}</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Estimasi Biaya</Label>
            <Input
              type="text"
              value={formatCurrency(biroJasa?.estimasi_biaya?.toString() || "0")}
              readOnly
              className="bg-muted"
            />
          </div>
          <div>
            <Label htmlFor="biaya_modal">Biaya Modal *</Label>
            <Input
              id="biaya_modal"
              type="text"
              value={formData.biaya_modal}
              onChange={(e) => setFormData(prev => ({ ...prev, biaya_modal: handleCurrencyInput(e.target.value) }))}
              placeholder="0"
              required
            />
          </div>
          <div>
            <Label>Keuntungan</Label>
            <Input
              type="text"
              value={formData.keuntungan}
              readOnly
              className="bg-muted"
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