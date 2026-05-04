import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit } from "lucide-react";

interface AssetPriceUpdateDialogProps {
  selectedDivision: string;
  onSuccess?: () => void;
}

interface AssetItem {
  id: number;
  nama: string;
  nominal: number;
  divisi: string;
}

export const AssetPriceUpdateDialog = ({ selectedDivision, onSuccess }: AssetPriceUpdateDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    asset_id: "",
    harga_baru: "",
    alasan: ""
  });

  // Fetch assets for the selected division
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ["assets_for_price_update", selectedDivision],
    queryFn: async (): Promise<AssetItem[]> => {
      const { data, error } = await supabase
        .from("pencatatan_asset")
        .select("id, nama, nominal, divisi")
        .eq("divisi", selectedDivision)
        .order("nama");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDivision
  });

  // Get selected asset details
  const selectedAsset = assets?.find(asset => asset.id === parseInt(formData.asset_id));

  // Update asset price mutation
  const updateMutation = useMutation({
    mutationFn: async (formData: any) => {
      const assetId = parseInt(formData.asset_id);
      const hargaBaru = parseFloat(formData.harga_baru.replace(/[^\d]/g, ''));
      
      if (!selectedAsset) throw new Error("Asset tidak ditemukan");

      // 1. Get current asset data
      const { data: currentAsset, error: fetchError } = await supabase
        .from("pencatatan_asset")
        .select("*")
        .eq("id", assetId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Calculate difference
      const hargaLama = currentAsset.nominal;
      const selisih = hargaBaru - hargaLama;

      // 3. Update asset nominal
      const { error: updateError } = await supabase
        .from("pencatatan_asset")
        .update({ nominal: hargaBaru })
        .eq("id", assetId);

      if (updateError) throw updateError;

      // 4. Update company modal if there's a difference
      if (selisih !== 0 && currentAsset.sumber_dana_id) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: currentAsset.sumber_dana_id,
          amount: selisih // Positive to add, negative to subtract
        });

        if (modalError) {
          console.error('Error updating company modal:', modalError);
          toast({
            title: "Warning",
            description: `Harga asset terupdate tapi modal perusahaan gagal: ${modalError.message}`,
            variant: "destructive"
          });
        }
      }

      // 5. Record price history
      const { error: historyError } = await supabase
        .from("asset_price_history")
        .insert([{
          asset_id: assetId,
          nama_asset: currentAsset.nama,
          harga_lama: hargaLama,
          harga_baru: hargaBaru,
          selisih: selisih,
          alasan: formData.alasan,
          tanggal_update: new Date().toISOString(),
          divisi: selectedDivision
        }]);

      if (historyError) {
        console.error('Error recording price history:', historyError);
        toast({
          title: "Warning",
          description: `Harga asset terupdate tapi history gagal: ${historyError.message}`,
          variant: "destructive"
        });
      }

      // 6. Update pembukuan entry if exists
      const { data: pembukuanData } = await supabase
        .from("pembukuan")
        .select("*")
        .eq("keterangan", `Asset - ${currentAsset.nama}`)
        .eq("company_id", currentAsset.sumber_dana_id);

      if (pembukuanData && pembukuanData.length > 0) {
        const pembukuanEntry = pembukuanData[0];
        const isPengeluaran = pembukuanEntry.debit > 0;
        
        const { error: pembukuanError } = await supabase
          .from("pembukuan")
          .update({
            debit: isPengeluaran ? hargaBaru : 0,
            kredit: !isPengeluaran ? hargaBaru : 0
          })
          .eq("id", pembukuanEntry.id);

        if (pembukuanError) {
          console.error('Error updating pembukuan:', pembukuanError);
          toast({
            title: "Warning",
            description: `Harga asset terupdate tapi pembukuan gagal: ${pembukuanError.message}`,
            variant: "destructive"
          });
        }
      }
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Harga asset berhasil diupdate",
      });
      setOpen(false);
      setFormData({ asset_id: "", harga_baru: "", alasan: "" });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate harga asset",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleCurrencyChange = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^\d]/g, '');
    const formattedValue = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(parseInt(numericValue) || 0);
    
    setFormData(prev => ({ ...prev, harga_baru: formattedValue }));
  };

  const resetForm = () => {
    setFormData({ asset_id: "", harga_baru: "", alasan: "" });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      setOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Edit className="w-4 h-4 mr-2" />
          Update Harga Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Harga Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="asset_id">Pilih Asset</Label>
            <Select
              value={formData.asset_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, asset_id: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Asset" />
              </SelectTrigger>
              <SelectContent>
                {assetsLoading ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : (
                  assets?.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.nama} - {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0
                      }).format(asset.nominal)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedAsset && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Harga Saat Ini:</p>
              <p className="font-medium">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0
                }).format(selectedAsset.nominal)}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="harga_baru">Harga Baru</Label>
            <Input
              id="harga_baru"
              value={formData.harga_baru}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              placeholder="Masukkan harga baru"
              required
            />
          </div>

          <div>
            <Label htmlFor="alasan">Alasan Update</Label>
            <Textarea
              id="alasan"
              value={formData.alasan}
              onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
              placeholder="Masukkan alasan update harga"
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !formData.asset_id}
            >
              {updateMutation.isPending ? "Mengupdate..." : "Update Harga"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
