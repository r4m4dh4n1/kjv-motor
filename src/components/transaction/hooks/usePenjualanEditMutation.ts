import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PenjualanFormData } from "../penjualan-types";
import { createPenjualanData, createPembukuanEntries } from "../utils/penjualanBusinessLogic";
import { parseFormattedNumber } from "@/utils/formatUtils";
import { transformPenjualanFormDataForSubmit } from "../utils/penjualanFormUtils";

export const usePenjualanEdit = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      penjualanId, 
      formData, 
      pembelianData 
    }: { 
      penjualanId: number;
      formData: PenjualanFormData; 
      pembelianData: any[] 
    }) => {
      // Get original penjualan data
      const { data: originalPenjualan, error: fetchError } = await supabase
        .from('penjualans')
        .select('*')
        .eq('id', penjualanId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new values
      const hargaJual = parseFormattedNumber(formData.harga_jual);
      const hargaBayar = parseFormattedNumber(formData.harga_bayar || "0");
      const dp = parseFormattedNumber(formData.dp || "0");
      const selectedMotor = pembelianData.find(p => p.id === parseInt(formData.selected_motor_id));
      const hargaBeli = selectedMotor?.harga_final && selectedMotor.harga_final > 0 
        ? selectedMotor.harga_final 
        : (selectedMotor?.harga_beli || parseFormattedNumber(formData.harga_beli));
      const keuntungan = hargaJual - hargaBeli;
      
      const updatedFormData = { ...formData };
      const submitData = transformPenjualanFormDataForSubmit(updatedFormData);
      const penjualanData = createPenjualanData(submitData, updatedFormData, hargaBeli, hargaJual, keuntungan);

      // Check if company changed
      const companyChanged = originalPenjualan.company_id !== submitData.company_id;
      
      // Get original payment amounts
      const originalDp = originalPenjualan.dp || 0;
      const originalHargaBayar = originalPenjualan.harga_bayar || 0;
      const originalPayment = originalPenjualan.jenis_pembayaran === 'cash_penuh' 
        ? originalHargaBayar 
        : originalDp;

      // 1. Update penjualan record
      const { error: updateError } = await supabase
        .from('penjualans')
        .update(penjualanData)
        .eq('id', penjualanId);

      if (updateError) throw updateError;

      // 2. ✅ PERBAIKAN: Delete old pembukuan entries dengan logika yang lebih akurat
      // Hapus berdasarkan pembelian_id dan company_id untuk memastikan entry yang tepat terhapus
      const { error: deletePembukuanError } = await supabase
        .from('pembukuan')
        .delete()
        .eq('pembelian_id', originalPenjualan.pembelian_id)
        .eq('company_id', originalPenjualan.company_id);

      if (deletePembukuanError) {
        console.error('Error deleting old pembukuan:', deletePembukuanError);
        // ✅ PERBAIKAN: Jika gagal hapus entry lama, jangan lanjutkan untuk mencegah double entry
        throw new Error(`Gagal menghapus entry pembukuan lama: ${deletePembukuanError.message}`);
      }

      // 3. Handle modal changes based on company change
      if (companyChanged) {
        // 3a. Return funds to old company
        if (originalPenjualan.company_id && originalPayment > 0) {
          try {
            const { error: oldModalError } = await supabase.rpc('update_company_modal', {
              company_id: originalPenjualan.company_id,
              amount: originalPayment // Return original payment to old company
            });

            if (oldModalError) {
              console.error('Error returning funds to old company:', oldModalError);
              toast({
                title: "Warning",
                description: `Gagal mengembalikan dana ke perusahaan lama: ${oldModalError.message}`,
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Error returning funds to old company:', error);
          }
        }
      } else {
        // 3b. If company didn't change, revert old modal changes
        if (originalPenjualan.company_id && originalPayment > 0) {
          await supabase.rpc('update_company_modal', {
            company_id: originalPenjualan.company_id,
            amount: -originalPayment // Revert old payment
          });
        }
      }

      // 4. ✅ PERBAIKAN: Create new pembukuan entries dengan validasi
      if (selectedMotor) {
        try {
          const pembukuanEntries = createPembukuanEntries(submitData, updatedFormData, selectedMotor);
          
          if (pembukuanEntries.length > 0) {
            // ✅ PERBAIKAN: Validasi sebelum insert - pastikan tidak ada entry duplikat
            for (const entry of pembukuanEntries) {
              const { data: existingEntry } = await supabase
                .from('pembukuan')
                .select('id')
                .eq('pembelian_id', entry.pembelian_id)
                .eq('company_id', entry.company_id)
                .eq('keterangan', entry.keterangan)
                .eq('tanggal', entry.tanggal)
                .single();

              if (existingEntry) {
                console.warn('Entry pembukuan sudah ada, skip insert untuk mencegah duplikat');
                continue;
              }
            }

            const { error: pembukuanError } = await supabase
              .from('pembukuan')
              .insert(pembukuanEntries)
              .select();
          
            if (pembukuanError) {
              console.error('PEMBUKUAN ERROR:', pembukuanError);
              toast({
                title: "Warning",
                description: `Penjualan diupdate tapi pembukuan gagal: ${pembukuanError.message}`,
                variant: "destructive"
              });
            }
          }
        } catch (insertError) {
          console.error('CATCH ERROR saat insert pembukuan:', insertError);
          toast({
            title: "Error",
            description: "Terjadi kesalahan saat menyimpan pembukuan",
            variant: "destructive"
          });
        }
      }

      // 5. Add new modal to new company based on payment type
      if (submitData.company_id) {
        try {
          // For cash_bertahap/kredit: add DP to company modal
          if ((formData.jenis_pembayaran === 'cash_bertahap' || formData.jenis_pembayaran === 'kredit') && dp > 0) {
            const { error: dpModalError } = await supabase.rpc('update_company_modal', {
              company_id: submitData.company_id,
              amount: dp // Add DP to new company
            });

            if (dpModalError) {
              console.error('Error adding DP to company modal:', dpModalError);
              toast({
                title: "Warning",
                description: `Penjualan diupdate tapi gagal menambah modal dari DP: ${dpModalError.message}`,
                variant: "destructive"
              });
            }
          }

          // For cash_penuh: add full payment to company modal
          if (formData.jenis_pembayaran === 'cash_penuh' && hargaBayar > 0) {
            const { error: cashModalError } = await supabase.rpc('update_company_modal', {
              company_id: submitData.company_id,
              amount: Math.min(hargaBayar, hargaJual) // Add cash payment to new company
            });

            if (cashModalError) {
              console.error('Error adding cash payment to company modal:', cashModalError);
              toast({
                title: "Warning",
                description: `Penjualan diupdate tapi gagal menambah modal dari cash: ${cashModalError.message}`,
                variant: "destructive"
              });
            }
          }

          // For completed cash_bertahap/kredit: add remaining payment
          if ((submitData.status === 'selesai' || hargaBayar >= hargaJual) && 
              (formData.jenis_pembayaran === 'cash_bertahap' || formData.jenis_pembayaran === 'kredit')) {
            const sisaPembayaran = Math.min(hargaBayar, hargaJual) - dp;
            
            if (sisaPembayaran > 0) {
              const { error: modalError } = await supabase.rpc('update_company_modal', {
                company_id: submitData.company_id,
                amount: sisaPembayaran
              });

              if (modalError) {
                console.error('Error updating company modal for remaining payment:', modalError);
                toast({
                  title: "Warning",
                  description: `Penjualan diupdate tapi gagal menambah modal sisa pembayaran: ${modalError.message}`,
                  variant: "destructive"
                });
              }
            }
          }
        } catch (modalUpdateError) {
          console.error('CATCH ERROR saat update modal:', modalUpdateError);
          toast({
            title: "Warning",
            description: "Penjualan diupdate tapi gagal menambah modal perusahaan",
            variant: "destructive"
          });
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Sukses",
        description: "Data penjualan berhasil diupdate"
      });
    },
    onError: (error) => {
      console.error('Error updating penjualan:', error);
      toast({
        title: "Error",
        description: "Gagal mengupdate data penjualan",
        variant: "destructive"
      });
    },
  });
};