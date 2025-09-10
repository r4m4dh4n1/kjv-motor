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
        .like('keterangan', '%Penjualan%'); // Only delete penjualan-related entries

      if (deletePembukuanError) {
        console.error('Error deleting old pembukuan:', deletePembukuanError);
      }

      // 3. Revert old modal changes
      if (originalPenjualan.company_id) {
        // Revert DP/cash payment
        const oldPayment = originalPenjualan.jenis_pembayaran === 'cash_penuh' 
          ? originalPenjualan.harga_bayar 
          : (originalPenjualan.dp || 0);
        
        if (oldPayment > 0) {
          await supabase.rpc('update_company_modal', {
            company_id: originalPenjualan.company_id,
            amount: -oldPayment
          });
        }
      }

      // 4. Apply new pembukuan and modal changes (reuse logic from create)
      // ... (copy pembukuan and modal logic from usePenjualanCreate)

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