import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PenjualanFormData } from "../penjualan-types";
import { createPenjualanData } from "../utils/penjualanBusinessLogic";
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
      const selectedMotor = pembelianData.find(p => p.id === parseInt(formData.selected_motor_id));
      const hargaBeli = selectedMotor?.harga_final && selectedMotor.harga_final > 0 
        ? selectedMotor.harga_final 
        : (selectedMotor?.harga_beli || parseFormattedNumber(formData.harga_beli));
      const keuntungan = hargaJual - hargaBeli;
      
      const updatedFormData = { ...formData };
      const submitData = transformPenjualanFormDataForSubmit(updatedFormData);
      const penjualanData = createPenjualanData(submitData, updatedFormData, hargaBeli, hargaJual, keuntungan);

      // ✅ TAMBAHAN: Deteksi perubahan company
      const companyChanged = originalPenjualan.company_id !== submitData.company_id;
      const originalDp = originalPenjualan.dp || 0;
      const newDp = submitData.dp || 0;

      // 1. Update penjualan record
      const { error: updateError } = await supabase
        .from('penjualans')
        .update(penjualanData)
        .eq('id', penjualanId);

      if (updateError) throw updateError;

      // 2. Delete old pembukuan entries for this specific penjualan
      const { error: deletePembukuanError } = await supabase
        .from('pembukuan')
        .delete()
        .eq('pembelian_id', originalPenjualan.pembelian_id)
        .like('keterangan', '%Penjualan%');

      if (deletePembukuanError) {
        console.error('Error deleting old pembukuan:', deletePembukuanError);
      }

      // ✅ 3. Handle modal changes when company changed
      if (companyChanged) {
        // Return funds to old company
        if (originalPenjualan.company_id && originalDp > 0) {
          await supabase.rpc('update_company_modal', {
            company_id: originalPenjualan.company_id,
            amount: originalDp // Kembalikan DP ke perusahaan lama
          });
        }

        // Deduct funds from new company
        if (submitData.company_id && newDp > 0) {
          await supabase.rpc('update_company_modal', {
            company_id: submitData.company_id,
            amount: -newDp // Kurangi modal perusahaan baru
          });
        }
      } else {
        // ✅ 4. Handle DP changes when company doesn't change
        const dpDifference = newDp - originalDp;
        if (dpDifference !== 0 && submitData.company_id) {
          await supabase.rpc('update_company_modal', {
            company_id: submitData.company_id,
            amount: dpDifference // Sesuaikan modal berdasarkan selisih DP
          });
        }
      }

      // ✅ 5. Create new pembukuan entries
      const pembukuanEntries = createPembukuanEntries(submitData, updatedFormData);
      if (pembukuanEntries.length > 0) {
        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert(pembukuanEntries);
        
        if (pembukuanError) {
          console.error('Error creating new pembukuan:', pembukuanError);
          toast({
            title: "Warning",
            description: `Penjualan diupdate tapi pembukuan gagal: ${pembukuanError.message}`,
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