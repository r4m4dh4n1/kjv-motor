import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface SoldUpdateHargaData {
  penjualan_id: number;
  biaya_tambahan: number;
  reason: string;
  keterangan?: string;
}

export const useSoldUpdateHarga = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updateData: SoldUpdateHargaData) => {
      // 1. Get current penjualan data
      const { data: currentPenjualan, error: fetchError } = await supabase
        .from('penjualans')
        .select('*')
        .eq('id', updateData.penjualan_id)
        .single();

      if (fetchError) {
        throw new Error(`Gagal mengambil data penjualan: ${fetchError.message}`);
      }

      if (currentPenjualan.status !== 'selesai') {
        throw new Error('Hanya penjualan dengan status "selesai" yang bisa diupdate');
      }

      const newKeuntungan = (currentPenjualan.keuntungan || 0) - updateData.biaya_tambahan;
      const companyId = currentPenjualan.company_id;

      // 2. Update penjualan - reduce profit, add notes, increase harga_beli
      const newHargaBeli = (currentPenjualan.harga_beli || 0) + updateData.biaya_tambahan;
      
      const { error: updateError } = await supabase
        .from('penjualans')
        .update({
          harga_beli: newHargaBeli,
          keuntungan: newKeuntungan,
          biaya_lain_lain: (currentPenjualan.biaya_lain_lain || 0) + updateData.biaya_tambahan,
          reason_update_harga: updateData.reason,
          keterangan_biaya_lain: updateData.keterangan || null,
        })
        .eq('id', updateData.penjualan_id);

      if (updateError) {
        throw new Error(`Gagal mengupdate penjualan: ${updateError.message}`);
      }

      // 2b. Update harga_final in pembelian table if pembelian_id exists
      if (currentPenjualan.pembelian_id && updateData.biaya_tambahan > 0) {
        const { error: pembelianError } = await supabase
          .from('pembelian')
          .update({
            harga_final: newHargaBeli
          })
          .eq('id', currentPenjualan.pembelian_id);

        if (pembelianError) {
          console.error('Error updating pembelian harga_final:', pembelianError);
          toast({
            title: "Warning",
            description: `Harga diupdate tapi gagal mengupdate harga final pembelian: ${pembelianError.message}`,
            variant: "destructive"
          });
        }
      }

      // 3. Reduce company modal
      if (updateData.biaya_tambahan > 0 && companyId) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: companyId,
          amount: -updateData.biaya_tambahan // Negative to reduce modal
        });

        if (modalError) {
          console.error('Error updating company modal:', modalError);
          toast({
            title: "Warning",
            description: `Harga diupdate tapi gagal mengurangi modal perusahaan: ${modalError.message}`,
            variant: "destructive"
          });
        }
      }

      // 4. Create pembukuan entry for the additional cost
      if (updateData.biaya_tambahan > 0) {
        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert({
            tanggal: new Date().toISOString().split('T')[0],
            divisi: currentPenjualan.divisi,
            keterangan: `Biaya Tambahan - ${updateData.reason} (${currentPenjualan.plat})`,
            debit: updateData.biaya_tambahan,
            kredit: 0,
            cabang_id: currentPenjualan.cabang_id,
            company_id: companyId,
            pembelian_id: currentPenjualan.pembelian_id
          });

        if (pembukuanError) {
          console.error('Error creating pembukuan entry:', pembukuanError);
          toast({
            title: "Warning",
            description: `Harga diupdate tapi gagal mencatat pembukuan: ${pembukuanError.message}`,
            variant: "destructive"
          });
        }
      }

      // 5. Create price history entry in price_histories_pembelian
      const { error: historyError } = await supabase
        .from('price_histories_pembelian')
        .insert({
          pembelian_id: currentPenjualan.pembelian_id,
          harga_beli_lama: currentPenjualan.harga_beli || 0,
          harga_beli_baru: newHargaBeli,
          biaya_qc: 0,
          biaya_pajak: 0,
          biaya_lain_lain: updateData.biaya_tambahan,
          reason: updateData.reason,
          keterangan_biaya_lain: updateData.keterangan || null,
          company_id: companyId
        });

      if (historyError) {
        console.error('Error creating price history:', historyError);
        toast({
          title: "Warning",
          description: `Harga diupdate tapi gagal mencatat riwayat: ${historyError.message}`,
          variant: "destructive"
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Sukses",
        description: "Harga berhasil diupdate, keuntungan berkurang dan modal perusahaan disesuaikan"
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['penjualan'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['pembukuan'] });
    },
    onError: (error: any) => {
      console.error('Error updating sold price:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate harga",
        variant: "destructive"
      });
    },
  });
};