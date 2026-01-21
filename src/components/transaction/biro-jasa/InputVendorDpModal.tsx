import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { BiroJasaItem } from "./types";
import { getCurrentDate, formatCurrency, parseCurrency, handleCurrencyInput } from "./utils";

interface InputVendorDpModalProps {
  biroJasa: BiroJasaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDivision: string;
}

export const InputVendorDpModal = ({ 
  biroJasa, 
  isOpen, 
  onClose, 
  onSuccess, 
  selectedDivision 
}: InputVendorDpModalProps) => {
  const [formData, setFormData] = useState({
    dp_vendor: "0",
    sumber_dana: "",
    tanggal: getCurrentDate(),
    keterangan: ""
  });
  const [companiesData, setCompaniesData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch companies data for sumber dana dropdown
  useEffect(() => {
    if (isOpen) {
      fetchCompaniesData();
    }
  }, [isOpen, selectedDivision]);

  useEffect(() => {
    if (biroJasa && isOpen) {
      // Initialize form with existing data or defaults
      setFormData({
        dp_vendor: formatCurrency(biroJasa.dp_vendor?.toString() || "0"),
        sumber_dana: "",
        tanggal: getCurrentDate(),
        keterangan: `DP Biro Jasa - ${biroJasa.jenis_pengurusan} - ${biroJasa.plat_nomor || ''}`
      });
    }
  }, [biroJasa, isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biroJasa) return;
  
    setIsSubmitting(true);
    try {
      const dpVendor = parseCurrency(formData.dp_vendor);
      
      // Validate required fields
      if (!formData.sumber_dana) {
        toast({
          title: "Error",
          description: "Sumber dana haru dipilih",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      if (dpVendor <= 0) {
        toast({
          title: "Error",
          description: "Nominal DP harus lebih dari 0",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      // 1. Update biro_jasa record
      const { error: updateError } = await supabase
        .from("biro_jasa")
        .update({
          dp_vendor: dpVendor,
          dp_vendor_date: formData.tanggal.includes('/') ? 
            new Date(formData.tanggal.split('/').reverse().join('-')).toISOString() : 
            new Date(formData.tanggal).toISOString(),
        })
        .eq("id", biroJasa.id);
  
      if (updateError) throw updateError;
  
      // 2. Insert into pembukuan (Credit: Cash/Bank, Debit implicit as Expense/Prepayment)
      // Since 'pembukuan' stores 'kredit' for money out:
      const pembukuanData = {
        tanggal: formData.tanggal.includes('/') ? 
          new Date(formData.tanggal.split('/').reverse().join('-')).toISOString().split('T')[0] : 
          formData.tanggal,
        keterangan: formData.keterangan || `DP Vendor Biro Jasa - ${biroJasa.plat_nomor}`,
        debit: dpVendor, // Recorded as expense/asset (debit)
        kredit: 0,
        saldo: 0,
        divisi: selectedDivision,
        company_id: parseInt(formData.sumber_dana),
        cabang_id: 1 // Default to center or user's branch if available
      };

      const { error: pembukuanError } = await supabase
        .from("pembukuan")
        .insert([pembukuanData]);

      if (pembukuanError) {
        console.error('Error inserting pembukuan:', pembukuanError);
        toast({
          title: "Peringatan",
          description: `Data DP tersimpan, namun gagal mencatat ke pembukuan: ${pembukuanError.message}`,
          variant: "destructive",
        });
      } else {
        // Also update company balance (decrement modal)
        // Since we are paying, money leaves the company
         const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: parseInt(formData.sumber_dana),
          amount: -dpVendor // Negative amount to decrease modal
        });

        if (modalError) {
             console.error('Error updating company balance:', modalError);
        }

        toast({
          title: "Berhasil",
          description: "DP Vendor berhasil disimpan dan dicatat",
        });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving vendor DP:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan data DP Vendor",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Input DP Vendor - {biroJasa?.jenis_pengurusan}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
             <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground mr-2">Plat Nomor:</span>{biroJasa?.plat_nomor}</div>
                <div><span className="text-muted-foreground mr-2">Brand:</span>{biroJasa?.brand_name}</div>
             </div>
          </div>

          <div>
            <Label htmlFor="tanggal">Tanggal Bayar *</Label>
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
            <Label htmlFor="sumber_dana">Sumber Dana (Rekening Asal) *</Label>
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
            <Label htmlFor="dp_vendor">Nominal DP *</Label>
            <Input
              id="dp_vendor"
              type="text"
              value={formData.dp_vendor}
              onChange={(e) => setFormData(prev => ({ ...prev, dp_vendor: handleCurrencyInput(e.target.value) }))}
              placeholder="0"
              required
            />
          </div>

          <div>
             <Label htmlFor="keterangan">Keterangan</Label>
             <Input 
                id="keterangan"
                value={formData.keterangan}
                onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
             />
          </div>

          <div className="flex gap-2 pt-4 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
