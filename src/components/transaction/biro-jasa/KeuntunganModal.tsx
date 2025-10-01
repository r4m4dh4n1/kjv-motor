import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
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
    sumber_dana: "",
    tanggal: getCurrentDate(),
  });
  const [companiesData, setCompaniesData] = useState([]);
  const { toast } = useToast();

  // Fetch companies data for sumber dana dropdown
  useEffect(() => {
    if (isOpen) {
      fetchCompaniesData();
    }
  }, [isOpen, selectedDivision]);

  const fetchCompaniesData = async () => {
    let query = supabase
      .from('companies')
      .select('*')
      .eq('status', 'active')
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
        sumber_dana: "",
        tanggal: getCurrentDate(),
      });
    }
  }, [biroJasa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biroJasa) return;
  
    try {
      const biayaModal = parseCurrency(formData.biaya_modal);
      const keuntungan = parseCurrency(formData.keuntungan);
      
      // Validate required fields
      if (!formData.sumber_dana) {
        toast({
          title: "Error",
          description: "Sumber dana harus dipilih",
          variant: "destructive",
        });
        return;
      }

      if (biayaModal <= 0) {
        toast({
          title: "Error",
          description: "Biaya modal harus lebih dari 0",
          variant: "destructive",
        });
        return;
      }
      
      console.log('🚀 Starting biro jasa profit submission:', {
        biroJasaId: biroJasa.id,
        biayaModal,
        keuntungan,
        sumberDana: formData.sumber_dana,
        tanggal: formData.tanggal,
        selectedDivision
      });
  
      // Update biro jasa with cost and profit
      const { error: updateError } = await supabase
        .from("biro_jasa")
        .update({
          biaya_modal: biayaModal,
          keuntungan: keuntungan,
        })
        .eq("id", biroJasa.id);
  
      if (updateError) {
        console.error('❌ Error updating biro_jasa:', updateError);
        throw updateError;
      }

      console.log('✅ Biro jasa updated successfully');
  
      // Catat biaya modal ke pembukuan sebagai debit (pengeluaran)
      const pembukuanData = {
        tanggal: formData.tanggal,
        keterangan: `Biaya Modal Biro Jasa - ${biroJasa.jenis_pengurusan} - ${biroJasa.plat_nomor || 'N/A'}`,
        debit: biayaModal,
        kredit: 0,
        divisi: selectedDivision,
        company_id: parseInt(formData.sumber_dana),
        cabang_id: 1
      };

      console.log('💰 Inserting pembukuan entry:', pembukuanData);

      const { error: pembukuanError, data: pembukuanResult } = await supabase
        .from("pembukuan")
        .insert(pembukuanData)
        .select();

      if (pembukuanError) {
        console.error('❌ Error inserting pembukuan:', pembukuanError);
        toast({
          title: "Peringatan",
          description: `Data biro jasa tersimpan, namun gagal mencatat ke pembukuan: ${pembukuanError.message}`,
          variant: "destructive",
        });
      } else {
        console.log('✅ Pembukuan entry created:', pembukuanResult);
        toast({
          title: "Berhasil",
          description: "Data keuntungan dan pembukuan berhasil disimpan",
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("❌ Error saving profit:", error);
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
                <span className="ml-2">{biroJasa?.jenis_motor || '-'}</span>
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
            <Label htmlFor="tanggal">Tanggal *</Label>
            <div className="mt-1">
              <DatePicker
                id="tanggal"
                value={formData.tanggal}
                onChange={(value) => setFormData(prev => ({ ...prev, tanggal: value }))}
                placeholder="Pilih tanggal"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="sumber_dana">Sumber Dana *</Label>
            <Select value={formData.sumber_dana} onValueChange={(value) => setFormData(prev => ({ ...prev, sumber_dana: value }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Pilih sumber dana" />
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