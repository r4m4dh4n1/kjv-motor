import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Penjualan, PenjualanFormData } from "../penjualan-types";
import { UpdateHargaData } from "../UpdateHargaModal";
import { transformPenjualanToFormData } from "../utils/penjualanFormUtils";
import { createUpdateHargaPembukuanEntry } from "../utils/penjualanBusinessLogic";

export const usePenjualanActions = () => {
  const [isUpdateHargaOpen, setIsUpdateHargaOpen] = useState(false);
  const [selectedPenjualanForUpdate, setSelectedPenjualanForUpdate] = useState<any>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPenjualanForHistory, setSelectedPenjualanForHistory] = useState<any>(null);
  const { toast } = useToast();

  const handleUpdateHarga = (penjualan: any) => {
    setSelectedPenjualanForUpdate(penjualan);
    setIsUpdateHargaOpen(true);
  };

  const handleLihatDetail = (penjualan: any) => {
    // TODO: Implement detail view functionality
    console.log('Lihat detail untuk:', penjualan);
    toast({
      title: "Info",
      description: "Fitur lihat detail akan segera tersedia"
    });
  };

  const handleRiwayatHarga = (penjualan: any) => {
    setSelectedPenjualanForHistory(penjualan);
    setIsHistoryModalOpen(true);
  };

  const handleSubmitUpdateHarga = async (updateData: UpdateHargaData, onRefresh: () => void) => {
    try {
      // Logika baru: Update harga tidak mengubah harga jual, tapi mengurangi keuntungan perusahaan
      const totalBiayaTambahan = updateData.biaya_pajak + updateData.biaya_qc + updateData.biaya_lain_lain;
      const keuntunganLama = selectedPenjualanForUpdate.keuntungan;
      const keuntunganBaru = keuntunganLama - totalBiayaTambahan; // Mengurangi keuntungan
      
      // 1. Update penjualan table dengan biaya tambahan saja (tidak mengubah harga_jual)
      const { error: updateError } = await supabase
        .from('penjualans')
        .update({
          biaya_pajak: updateData.biaya_pajak,
          biaya_qc: updateData.biaya_qc,
          biaya_lain_lain: updateData.biaya_lain_lain,
          keterangan_biaya_lain: updateData.keterangan_biaya_lain,
          reason_update_harga: updateData.reason,
          keuntungan: keuntunganBaru // Update keuntungan baru
        })
        .eq('id', selectedPenjualanForUpdate.id);

      if (updateError) throw updateError;

      // 2. Kurangi modal company sebesar total biaya tambahan
      if (selectedPenjualanForUpdate.company_id && totalBiayaTambahan > 0) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: selectedPenjualanForUpdate.company_id,
          amount: -totalBiayaTambahan // Mengurangi modal sebesar biaya tambahan
        });

        if (modalError) {
          console.error('Error updating company modal:', modalError);
          // Don't throw error, just log it
        }
      }

      // 3. Insert into price_histories table (hanya simpan data yang ada di tabel)
      const { error: historyError } = await supabase
        .from('price_histories')
        .insert({
          pembelian_id: selectedPenjualanForUpdate.pembelian_id,
          harga_jual_lama: selectedPenjualanForUpdate.harga_jual, // Harga jual tidak berubah
          harga_jual_baru: selectedPenjualanForUpdate.harga_jual, // Harga jual tetap sama
          biaya_pajak: updateData.biaya_pajak,
          biaya_qc: updateData.biaya_qc,
          biaya_lain_lain: updateData.biaya_lain_lain,
          keterangan_biaya_lain: updateData.keterangan_biaya_lain,
          reason: updateData.reason
        });

      if (historyError) {
        console.error('Error saving price history:', historyError);
        // Don't throw error, just log it
      }

      // 4. TAMBAHAN: Catat ke pembukuan sebagai pengeluaran (debit)
      const pembukuanEntry = createUpdateHargaPembukuanEntry(updateData, selectedPenjualanForUpdate);
      
      if (pembukuanEntry) {
        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert([pembukuanEntry]);

        if (pembukuanError) {
          console.error('Error saving to pembukuan:', pembukuanError);
          // Don't throw error, just log it
        }
      }

      toast({
        title: "Berhasil",
        description: `Biaya tambahan berhasil disimpan. Keuntungan berkurang sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalBiayaTambahan)}`
      });

      setIsUpdateHargaOpen(false);
      setSelectedPenjualanForUpdate(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating harga:', error);
      toast({
        title: "Error",
        description: "Gagal mengupdate harga",
        variant: "destructive"
      });
    }
  };

  return {
    isUpdateHargaOpen,
    setIsUpdateHargaOpen,
    selectedPenjualanForUpdate,
    setSelectedPenjualanForUpdate,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    selectedPenjualanForHistory,
    setSelectedPenjualanForHistory,
    handleUpdateHarga,
    handleLihatDetail,
    handleRiwayatHarga,
    handleSubmitUpdateHarga
  };
};