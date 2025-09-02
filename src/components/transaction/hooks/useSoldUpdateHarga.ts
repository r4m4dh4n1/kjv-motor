import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface SoldUpdateHargaData {
  penjualan_id: number;
  biaya_tambahan: number;
  reason: string;
  keterangan?: string;
  operation_mode: 'tambah' | 'kurang';
  tanggal_update: string;
  sumber_dana_id: number;
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
      const newHargaBeli = (currentPenjualan.harga_beli || 0) + updateData.biaya_tambahan;
      
      // Additional validation for reduction
      if (updateData.operation_mode === 'kurang' && newHargaBeli < 0) {
        throw new Error('Pengurangan tidak boleh membuat harga beli negatif');
      }

      // 2. Update penjualan
      const updateFields: any = {
        harga_beli: newHargaBeli,
        keuntungan: newKeuntungan,
        reason_update_harga: updateData.reason,
        keterangan_biaya_lain: updateData.keterangan || null,
      };

      // Update biaya_lain_lain field based on operation mode
      if (updateData.operation_mode === 'tambah') {
        updateFields.biaya_lain_lain = (currentPenjualan.biaya_lain_lain || 0) + Math.abs(updateData.biaya_tambahan);
      } else {
        // For reduction, we might want to track it differently or reduce existing biaya_lain_lain
        const currentBiayaLain = currentPenjualan.biaya_lain_lain || 0;
        const reduction = Math.abs(updateData.biaya_tambahan);
        updateFields.biaya_lain_lain = Math.max(0, currentBiayaLain - reduction);
      }
      
      const { error: updateError } = await supabase
        .from('penjualans')
        .update(updateFields)
        .eq('id', updateData.penjualan_id);

      if (updateError) {
        throw new Error(`Gagal mengupdate penjualan: ${updateError.message}`);
      }

      // 2b. Update harga_final in pembelian table if pembelian_id exists
      if (currentPenjualan.pembelian_id) {
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

      // 3. Update company modal
      if (updateData.biaya_tambahan !== 0 && companyId) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: companyId,
          amount: -updateData.biaya_tambahan // Negative for cost addition, positive for cost reduction
        });

        if (modalError) {
          console.error('Error updating company modal:', modalError);
          toast({
            title: "Warning",
            description: `Harga diupdate tapi gagal mengupdate modal perusahaan: ${modalError.message}`,
            variant: "destructive"
          });
        }
      }

      // Di dalam mutationFn:
      // 4. Create pembukuan entry
      if (updateData.biaya_tambahan !== 0) {
        const isAddition = updateData.operation_mode === 'tambah';
        const amount = Math.abs(updateData.biaya_tambahan);
        
        const pembukuanData = {
          tanggal: updateData.tanggal_update,
          divisi: currentPenjualan.divisi,
          keterangan: `${updateData.operation_mode === 'tambah' ? 'Biaya Tambahan' : 'Pengurangan Biaya'} - ${currentPenjualan.plat} - ${updateData.reason}`,
          debit: isAddition ? amount : 0,
          kredit: isAddition ? 0 : amount,
          cabang_id: currentPenjualan.cabang_id,
          company_id: updateData.sumber_dana_id,
          pembelian_id: currentPenjualan.pembelian_id
        };

        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert(pembukuanData);

        if (pembukuanError) {
          console.error('Error creating pembukuan entry:', pembukuanError);
          toast({
            title: "Warning",
            description: `Harga diupdate tapi gagal mencatat pembukuan: ${pembukuanError.message}`,
            variant: "destructive"
          });
        }
      }

      // 5. Create price history entry
      const historyData = {
        pembelian_id: currentPenjualan.pembelian_id,
        harga_beli_lama: currentPenjualan.harga_beli || 0,
        harga_beli_baru: newHargaBeli,
        biaya_qc: 0,
        biaya_pajak: 0,
        biaya_lain_lain: updateData.operation_mode === 'tambah' ? Math.abs(updateData.biaya_tambahan) : -Math.abs(updateData.biaya_tambahan),
        reason: `${updateData.operation_mode === 'tambah' ? 'Penambahan' : 'Pengurangan'} Biaya: ${updateData.reason}`,
        keterangan_biaya_lain: updateData.keterangan || null,
        company_id: updateData.sumber_dana_id
      };

      const { error: historyError } = await supabase
        .from('price_histories_pembelian')
        .insert(historyData);

      if (historyError) {
        console.error('Error creating price history:', historyError);
        toast({
          title: "Warning",
          description: `Harga diupdate tapi gagal mencatat riwayat: ${historyError.message}`,
          variant: "destructive"
        });
      }

      return { success: true, operation_mode: updateData.operation_mode };
    },
    onSuccess: (data) => {
      const message = data.operation_mode === 'tambah' 
        ? "Biaya berhasil ditambahkan, keuntungan berkurang dan modal perusahaan disesuaikan"
        : "Biaya berhasil dikurangi, keuntungan bertambah dan modal perusahaan disesuaikan";
        
      toast({
        title: "Sukses",
        description: message
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