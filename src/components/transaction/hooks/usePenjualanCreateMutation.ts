import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PenjualanFormData } from "../penjualan-types";
import { createPenjualanData, createPembukuanEntries } from "../utils/penjualanBusinessLogic";
import { parseFormattedNumber } from "@/utils/formatUtils";
import { transformPenjualanFormDataForSubmit } from "../utils/penjualanFormUtils";

export const usePenjualanCreate = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ formData, pembelianData }: { formData: PenjualanFormData; pembelianData: any[] }) => {
      const submitData = transformPenjualanFormDataForSubmit(formData);
      
      // Calculate keuntungan
      const hargaJual = parseFormattedNumber(formData.harga_jual);
      // Get selected motor data
      const selectedMotor = pembelianData.find(p => p.id === parseInt(formData.selected_motor_id));
      // Use harga_final if available and > 0, otherwise use harga_beli
      const hargaBeli = selectedMotor?.harga_final && selectedMotor.harga_final > 0 
        ? selectedMotor.harga_final 
        : (selectedMotor?.harga_beli || parseFormattedNumber(formData.harga_beli));
      const keuntungan = hargaJual - hargaBeli;
      
      // Auto update status based on payment
      let status = formData.status;
      const hargaBayar = parseFormattedNumber(formData.harga_bayar || "0");
      const sisaBayar = parseFormattedNumber(formData.sisa_bayar || "0");
      
      // If payment is complete (harga_bayar >= harga_jual OR sisa_bayar = 0), set status to 'selesai'
      if (hargaBayar >= hargaJual || sisaBayar === 0) {
        status = 'selesai';
      }
      
      // Prepare penjualan data
      const penjualanData = createPenjualanData(submitData, formData, hargaBeli, hargaJual, keuntungan);
      penjualanData.status = status;

      // 1. Insert into penjualans table
      const { data: penjualanResult, error: penjualanError } = await supabase
        .from('penjualans')
        .insert([penjualanData])
        .select()
        .single();

      if (penjualanError) {
        console.error('Penjualan Error Details:', penjualanError);
        throw penjualanError;
      }

      // 2. Update qty in jenis_motor table (reduce by 1) 
      const { error: stockError } = await supabase
        .rpc('decrement_qty', { 
          jenis_motor_id: submitData.jenis_motor_id 
        });

      if (stockError) {
        console.error('Stock Error:', stockError);
      }

      // 3. Update status in pembelian table to 'sold'
      const { error: pembelianError } = await supabase
        .from('pembelian')
        .update({ status: 'sold' })
        .eq('id', parseInt(formData.selected_motor_id));

      if (pembelianError) {
        console.error('Pembelian Error:', pembelianError);
      }

      // 4. Insert into pembukuan table
      const pembukuanEntries = createPembukuanEntries(submitData, formData, selectedMotor);
      
      if (pembukuanEntries.length > 0) {
        try {
          const { error: pembukuanError } = await supabase
            .from('pembukuan')
            .insert(pembukuanEntries)
            .select();
        
          if (pembukuanError) {
            console.error('PEMBUKUAN ERROR:', pembukuanError);
            toast({
              title: "Warning",
              description: `Penjualan tersimpan tapi pembukuan gagal: ${pembukuanError.message}`,
              variant: "destructive"
            });
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

      return penjualanResult;
    },
    onSuccess: () => {
      toast({
        title: "Sukses",
        description: "Data penjualan berhasil disimpan"
      });
    },
    onError: (error) => {
      console.error('Error saving penjualan:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data penjualan",
        variant: "destructive"
      });
    },
  });
};