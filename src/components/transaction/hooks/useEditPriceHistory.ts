import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EditPriceHistoryData {
  id: number;
  biaya_qc: number;
  biaya_pajak: number;
  biaya_lain_lain: number;
  keterangan_biaya_lain?: string;
  reason: string;
  tanggal_update?: string;
}

export const useEditPriceHistory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EditPriceHistoryData) => {
      // 1. Get current price history record
      const { data: currentHistory, error: fetchError } = await supabase
        .from('price_histories_pembelian')
        .select('*')
        .eq('id', data.id)
        .single();

      if (fetchError) {
        throw new Error(`Gagal mengambil data history: ${fetchError.message}`);
      }

      // 2. Calculate old and new total additional costs
      const oldTotalBiaya = (currentHistory.biaya_qc || 0) + (currentHistory.biaya_pajak || 0) + (currentHistory.biaya_lain_lain || 0);
      const newTotalBiaya = data.biaya_qc + data.biaya_pajak + data.biaya_lain_lain;
      const biayaDifference = newTotalBiaya - oldTotalBiaya;

      // 3. Update price history record
      const { error: updateHistoryError } = await supabase
        .from('price_histories_pembelian')
        .update({
          biaya_qc: data.biaya_qc,
          biaya_pajak: data.biaya_pajak,
          biaya_lain_lain: data.biaya_lain_lain,
          keterangan_biaya_lain: data.keterangan_biaya_lain,
          reason: data.reason,
          tanggal_update: data.tanggal_update || currentHistory.tanggal_update,
          harga_beli_baru: currentHistory.harga_beli_lama + newTotalBiaya,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updateHistoryError) {
        throw new Error(`Gagal mengupdate history: ${updateHistoryError.message}`);
      }

      // 4. Update pembelian harga_final if there's a difference
      if (biayaDifference !== 0 && currentHistory.pembelian_id) {
        const { data: pembelianData, error: pembelianFetchError } = await supabase
          .from('pembelian')
          .select('harga_final, harga_beli')
          .eq('id', currentHistory.pembelian_id)
          .single();

        if (pembelianFetchError) {
          console.error('Error fetching pembelian:', pembelianFetchError);
        } else {
          const currentHargaFinal = pembelianData.harga_final || pembelianData.harga_beli || 0;
          const newHargaFinal = currentHargaFinal + biayaDifference;

          const { error: pembelianUpdateError } = await supabase
            .from('pembelian')
            .update({ harga_final: newHargaFinal })
            .eq('id', currentHistory.pembelian_id);

          if (pembelianUpdateError) {
            console.error('Error updating pembelian harga_final:', pembelianUpdateError);
            toast({
              title: "Warning",
              description: `History diupdate tapi gagal mengupdate harga final pembelian: ${pembelianUpdateError.message}`,
              variant: "destructive"
            });
          }
        }
      }

      // 5. Update related penjualan if exists
      if (biayaDifference !== 0 && currentHistory.pembelian_id) {
        const { data: penjualanData, error: penjualanFetchError } = await supabase
          .from('penjualans')
          .select('id, harga_beli, keuntungan, harga_jual')
          .eq('pembelian_id', currentHistory.pembelian_id);

        if (!penjualanFetchError && penjualanData && penjualanData.length > 0) {
          for (const penjualan of penjualanData) {
            const newHargaBeli = penjualan.harga_beli + biayaDifference;
            const newKeuntungan = penjualan.harga_jual - newHargaBeli;

            const { error: penjualanUpdateError } = await supabase
              .from('penjualans')
              .update({
                harga_beli: newHargaBeli,
                keuntungan: newKeuntungan
              })
              .eq('id', penjualan.id);

            if (penjualanUpdateError) {
              console.error('Error updating penjualan:', penjualanUpdateError);
            }
          }
        }
      }

      // 6. Update company modal if there's a difference
      if (biayaDifference !== 0 && currentHistory.company_id) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: currentHistory.company_id,
          amount: -biayaDifference // Negative untuk mengurangi modal jika biaya bertambah
        });

        if (modalError) {
          console.error('Error updating company modal:', modalError);
          toast({
            title: "Warning",
            description: `History diupdate tapi gagal mengupdate modal perusahaan: ${modalError.message}`,
            variant: "destructive"
          });
        }
        // Tambahkan setelah update company modal (sekitar baris 125)
        // 7. Create pembukuan entry for the edit
        if (biayaDifference !== 0 && currentHistory.pembelian_id) {
          const { data: pembelianData } = await supabase
            .from('pembelian')
            .select('divisi, cabang_id, plat_nomor, brands(name), jenis_motor(jenis_motor)')
            .eq('id', currentHistory.pembelian_id)
            .single();
        
          if (pembelianData) {
            const pembukuanData = {
              tanggal: data.tanggal_update || new Date().toISOString().split('T')[0],
              divisi: pembelianData.divisi,
              cabang_id: pembelianData.cabang_id,
              keterangan: `Edit Riwayat Harga - ${pembelianData.brands?.name || ''} - ${pembelianData.jenis_motor?.jenis_motor || ''} - ${pembelianData.plat_nomor} - ${data.reason}`,
              debit: biayaDifference > 0 ? biayaDifference : 0,
              kredit: biayaDifference < 0 ? Math.abs(biayaDifference) : 0,
              company_id: currentHistory.company_id,
              pembelian_id: currentHistory.pembelian_id
            };
        
            const { error: pembukuanError } = await supabase
              .from('pembukuan')
              .insert(pembukuanData);
        
            if (pembukuanError) {
              console.error('Error creating pembukuan entry:', pembukuanError);
              toast({
                title: "Warning",
                description: `History diupdate tapi gagal mencatat pembukuan: ${pembukuanError.message}`,
                variant: "destructive"
              });
            }
          }
        }
      }

      return { success: true, biayaDifference };
    },
    onSuccess: (result) => {
      toast({
        title: "Berhasil",
        description: `Riwayat harga berhasil diupdate. ${result.biayaDifference !== 0 ? `Selisih biaya: ${result.biayaDifference > 0 ? '+' : ''}${result.biayaDifference}` : 'Tidak ada perubahan biaya.'}`,
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['price-history'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};