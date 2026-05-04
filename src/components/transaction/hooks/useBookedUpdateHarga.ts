import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UpdateHargaData } from "../update-harga/UpdateHargaForm";

export const useBookedUpdateHarga = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ penjualanId, data }: { penjualanId: number; data: UpdateHargaData }) => {
      console.log('Starting booked update harga for penjualan:', penjualanId, data);

      // ✅ TAMBAHKAN VALIDASI DI SINI (setelah data tersedia)
      if (!data.sumber_dana_id) {
        throw new Error('Sumber dana wajib dipilih');
      }

      if (!data.reason?.trim()) {
        throw new Error('Alasan update harga wajib diisi');
      }

      // Get current penjualan data
      const { data: currentPenjualan, error: fetchError } = await supabase
        .from('penjualans')
        .select('*, pembelian:pembelian_id(id, harga_beli, harga_final)')
        .eq('id', penjualanId)
        .single();

      if (fetchError) {
        console.error('Error fetching current penjualan:', fetchError);
        throw fetchError;
      }

      if (!currentPenjualan.pembelian) {
        throw new Error('Pembelian data not found');
      }

      const originalHargaBeli = currentPenjualan.harga_beli || 0;
      const totalBiayaTambahan = data.biaya_qc + data.biaya_pajak + data.biaya_lain_lain;
      
      // ✅ TAMBAHKAN VALIDASI UNTUK totalBiayaTambahan DI SINI
      if (totalBiayaTambahan === 0) {
        console.warn('⚠️ Total biaya tambahan = 0, pembukuan tetap akan dibuat');
      }

      const newHargaBeli = originalHargaBeli + totalBiayaTambahan;

      // ✅ PERBAIKAN: Hitung ulang keuntungan setelah harga_beli berubah
      const hargaJual = currentPenjualan.harga_jual || 0;
      const newKeuntungan = hargaJual - newHargaBeli;

      // Update penjualan - update harga_beli DAN keuntungan
      const { error: penjualanError } = await supabase
        .from('penjualans')
        .update({
          harga_beli: newHargaBeli,
          keuntungan: newKeuntungan, // ✅ UPDATE: Hitung ulang keuntungan
          biaya_qc: data.biaya_qc,
          biaya_pajak: data.biaya_pajak,
          biaya_lain_lain: data.biaya_lain_lain,
          keterangan_biaya_lain: data.keterangan_biaya_lain,
          reason_update_harga: data.reason
        })
        .eq('id', penjualanId);

      if (penjualanError) {
        console.error('Error updating penjualan:', penjualanError);
        throw penjualanError;
      }

      // Update pembelian - update harga_final
      const originalHargaFinal = currentPenjualan.pembelian.harga_final || currentPenjualan.pembelian.harga_beli || 0;
      const newHargaFinal = originalHargaFinal + totalBiayaTambahan;

      const { error: pembelianError } = await supabase
        .from('pembelian')
        .update({
          harga_final: newHargaFinal
        })
        .eq('id', currentPenjualan.pembelian_id);

      if (pembelianError) {
        console.error('Error updating pembelian:', pembelianError);
        throw pembelianError;
      }

      // Create pembukuan entry for the additional costs
      // PERBAIKAN: Selalu buat entry pembukuan, tidak peduli positif atau negatif
      // Sebelum insert pembukuan
      const pembukuanData = {
        tanggal: data.tanggal_update,
        divisi: currentPenjualan.divisi,
        keterangan: `Update Harga Booked - ${currentPenjualan.plat} - ${data.reason}`,
        debit: totalBiayaTambahan > 0 ? totalBiayaTambahan : 0,
        kredit: totalBiayaTambahan < 0 ? Math.abs(totalBiayaTambahan) : 0,
        cabang_id: currentPenjualan.cabang_id,
        company_id: data.sumber_dana_id,
        pembelian_id: currentPenjualan.pembelian_id
      };
      
      console.log('📝 Attempting to insert pembukuan:', pembukuanData);
      console.log('💰 Total biaya tambahan:', totalBiayaTambahan);
      
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert(pembukuanData);
      
      if (pembukuanError) {
        console.error('❌ PEMBUKUAN ERROR DETAILS:', pembukuanError);
        console.error('❌ Error code:', pembukuanError.code);
        console.error('❌ Error message:', pembukuanError.message);
        console.error('❌ Error details:', pembukuanError.details);
        
        throw new Error(`Gagal menyimpan pembukuan: ${pembukuanError.message}`);
      } else {
        console.log('✅ Pembukuan berhasil disimpan');
      }
      
      // ❌ HAPUS BLOK INI - duplikasi
      // if (pembukuanError) {
      //   console.error('Error creating pembukuan entry:', pembukuanError);
      //   throw new Error(`Gagal menyimpan pembukuan: ${pembukuanError.message}`);
      // }
      
      // TAMBAHAN: Update modal perusahaan
      if (totalBiayaTambahan !== 0 && data.sumber_dana_id) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: data.sumber_dana_id,
          amount: -totalBiayaTambahan // Negative untuk mengurangi modal
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

      // Create price history record in price_histories_pembelian
      const { error: historyError } = await supabase
        .from('price_histories_pembelian')
        .insert({
          pembelian_id: currentPenjualan.pembelian_id,
          harga_beli_lama: originalHargaBeli,
          harga_beli_baru: newHargaBeli,
          biaya_qc: data.biaya_qc,
          biaya_pajak: data.biaya_pajak,
          biaya_lain_lain: data.biaya_lain_lain,
          keterangan_biaya_lain: data.keterangan_biaya_lain,
          reason: data.reason,
          company_id: currentPenjualan.company_id || 1
        });

      if (historyError) {
        console.error('Error creating price history:', historyError);
        // Don't throw error for history, just log it
        toast({
          title: "Warning",
          description: "Harga berhasil diupdate tapi history gagal disimpan",
          variant: "destructive"
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Harga berhasil diupdate",
      });
      queryClient.invalidateQueries({ queryKey: ['penjualan'] });
      queryClient.invalidateQueries({ queryKey: ['pembukuan'] });
    },
    onError: (error) => {
      console.error('Error updating harga:', error);
      toast({
        title: "Error",
        description: "Gagal mengupdate harga",
        variant: "destructive",
      });
    },
  });
};

// ❌ HAPUS KODE VALIDASI YANG ADA DI LUAR FUNGSI (baris 173-183)