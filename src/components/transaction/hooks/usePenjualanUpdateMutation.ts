import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PenjualanFormData } from "../penjualan-types";
import { createPenjualanData, createPembukuanEntries } from "../utils/penjualanBusinessLogic";
import { parseFormattedNumber } from "@/utils/formatUtils";
import { transformPenjualanFormDataForSubmit } from "../utils/penjualanFormUtils";

export const usePenjualanUpdate = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      penjualanId, 
      formData, 
      pembelianData, 
      originalPenjualan 
    }: { 
      penjualanId: number; 
      formData: PenjualanFormData; 
      pembelianData: any[]; 
      originalPenjualan: any;
    }) => {
      const submitData = transformPenjualanFormDataForSubmit(formData);
      
      // Calculate keuntungan
      const hargaJual = parseFormattedNumber(formData.harga_jual);
      const selectedMotor = pembelianData.find(p => p.id === parseInt(formData.selected_motor_id));
      const hargaBeli = selectedMotor?.harga_final && selectedMotor.harga_final > 0 
        ? selectedMotor.harga_final 
        : (selectedMotor?.harga_beli || parseFormattedNumber(formData.harga_beli));
      const keuntungan = hargaJual - hargaBeli;
      
      // Auto update status based on payment
      let status = formData.status;
      const hargaBayar = parseFormattedNumber(formData.harga_bayar || "0");
      const sisaBayar = parseFormattedNumber(formData.sisa_bayar || "0");
      const dp = parseFormattedNumber(formData.dp || "0");
      
      // If payment is complete, set status to 'selesai'
      if (hargaBayar >= hargaJual || sisaBayar === 0) {
        status = 'selesai';
      }
      
      // Prepare updated penjualan data
      const penjualanData = createPenjualanData(submitData, formData, hargaBeli, hargaJual, keuntungan);
      penjualanData.status = status;

      // Check if motor has changed (brand_id or jenis_motor_id different)
      const motorChanged = originalPenjualan.brand_id !== submitData.brand_id || 
                          originalPenjualan.jenis_id !== submitData.jenis_motor_id;
      
      // Check if company changed
      const companyChanged = originalPenjualan.company_id !== submitData.company_id;
      
      // Check if DP has been paid for cash_bertahap or kredit
      const isDpPaid = (formData.jenis_pembayaran === 'cash_bertahap' || formData.jenis_pembayaran === 'kredit') && dp > 0;

      // If motor changed and DP was paid, handle stock restoration
      if (motorChanged && isDpPaid) {
        // 1. Return old motor to stock (increment qty)
        const { error: oldStockError } = await supabase
          .rpc('increment_qty', { 
            jenis_motor_id: originalPenjualan.jenis_id 
          });

        if (oldStockError) {
          console.error('Error returning old motor to stock:', oldStockError);
        }

        // 2. Update old pembelian status back to 'ready'
        const { error: oldPembelianError } = await supabase
          .from('pembelian')
          .update({ status: 'ready' })
          .eq('id', originalPenjualan.pembelian_id);

        if (oldPembelianError) {
          console.error('Error updating old pembelian status:', oldPembelianError);
        }

        // 3. Reduce new motor stock
        const { error: newStockError } = await supabase
          .rpc('decrement_qty', { 
            jenis_motor_id: submitData.jenis_motor_id 
          });

        if (newStockError) {
          console.error('Error reducing new motor stock:', newStockError);
        }

        // 4. Update new motor pembelian status to 'sold'
        const { error: newPembelianError } = await supabase
          .from('pembelian')
          .update({ status: 'sold' })
          .eq('id', parseInt(formData.selected_motor_id));

        if (newPembelianError) {
          console.error('Error updating new pembelian status:', newPembelianError);
        }
      }

      // If company changed and DP was paid, handle modal transfer
      if (companyChanged && isDpPaid) {
        // Return funds to old company
        if (originalPenjualan.company_id && dp > 0) {
          try {
            const { error: oldModalError } = await supabase.rpc('update_company_modal', {
              company_id: originalPenjualan.company_id,
              amount: dp // Return DP amount to old company
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

        // Deduct funds from new company
        if (submitData.company_id && dp > 0) {
          try {
            const { error: newModalError } = await supabase.rpc('update_company_modal', {
              company_id: submitData.company_id,
              amount: -dp // Deduct DP amount from new company
            });

            if (newModalError) {
              console.error('Error deducting funds from new company:', newModalError);
              toast({
                title: "Warning",
                description: `Gagal mengurangi modal perusahaan baru: ${newModalError.message}`,
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('Error deducting funds from new company:', error);
          }
        }
      }

      // 1. Update penjualan record
      const { data: penjualanResult, error: penjualanError } = await supabase
        .from('penjualans')
        .update(penjualanData)
        .eq('id', penjualanId)
        .select()
        .single();

      if (penjualanError) {
        console.error('Penjualan Update Error:', penjualanError);
        throw penjualanError;
      }

      // 2. Handle company modal update when payment is complete
      if ((status === 'selesai' || hargaBayar >= hargaJual) && submitData.company_id) {
        const totalPembayaran = Math.min(hargaBayar, hargaJual);
        
        if (totalPembayaran > 0) {
          try {
            const { error: modalError } = await supabase.rpc('update_company_modal', {
              company_id: submitData.company_id,
              amount: totalPembayaran
            });

            if (modalError) {
              console.error('Error updating company modal:', modalError);
              toast({
                title: "Warning",
                description: `Penjualan tersimpan tapi gagal menambah modal perusahaan: ${modalError.message}`,
                variant: "destructive"
              });
            }
          } catch (modalUpdateError) {
            console.error('Error updating company modal:', modalUpdateError);
          }
        }
      }

      return penjualanResult;
    },
    onSuccess: () => {
      toast({
        title: "Sukses",
        description: "Data penjualan berhasil diperbarui"
      });
    },
    onError: (error) => {
      console.error('Error updating penjualan:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui data penjualan",
        variant: "destructive"
      });
    },
  });
};