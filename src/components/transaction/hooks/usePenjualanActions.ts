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
      // Logika untuk booked: Update harga_beli di penjualans dan harga_final di pembelian
      const totalBiayaTambahan = updateData.biaya_pajak + updateData.biaya_qc + updateData.biaya_lain_lain;
      const hargaBeliLama = selectedPenjualanForUpdate.harga_beli;
      const hargaBeliBaru = hargaBeliLama + totalBiayaTambahan;
      const keuntunganLama = selectedPenjualanForUpdate.keuntungan;
      const keuntunganBaru = keuntunganLama - totalBiayaTambahan; // Mengurangi keuntungan
      
      // 1. Update penjualan table dengan harga_beli baru dan biaya tambahan
      const { error: updateError } = await supabase
        .from('penjualans')
        .update({
          harga_beli: hargaBeliBaru, // Update harga_beli
          biaya_pajak: updateData.biaya_pajak,
          biaya_qc: updateData.biaya_qc,
          biaya_lain_lain: updateData.biaya_lain_lain,
          keterangan_biaya_lain: updateData.keterangan_biaya_lain,
          reason_update_harga: updateData.reason,
          keuntungan: keuntunganBaru // Update keuntungan baru
        })
        .eq('id', selectedPenjualanForUpdate.id);

      if (updateError) throw updateError;

      // 1.1. Update harga_final di tabel pembelian
      if (selectedPenjualanForUpdate.pembelian_id) {
        const { error: pembelianError } = await supabase
          .from('pembelian')
          .update({
            harga_final: hargaBeliBaru // Update harga_final di pembelian
          })
          .eq('id', selectedPenjualanForUpdate.pembelian_id);

        if (pembelianError) {
          console.error('Error updating pembelian harga_final:', pembelianError);
          // Don't throw error, just log it
        }
      }

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

      // 3. Simpan ke price_histories
      const { error: historyError } = await supabase
        .from('price_histories')
        .insert({
          pembelian_id: selectedPenjualanForUpdate.pembelian_id,
          old_harga_beli: selectedPenjualanForUpdate.harga_beli,
          new_harga_beli: newHargaBeli,
          old_harga_final: selectedPenjualanForUpdate.harga_final,
          new_harga_final: newHargaFinal,
          biaya_tambahan: totalBiayaTambahan,
          reason: updateData.reason,
          tanggal_update: updateData.tanggal_update,
          company_id: updateData.sumber_dana_id
        });
      
      if (historyError) {
        console.error('Error saving price history:', historyError);
        // Don't throw error, just log it
      }
      
      // 4. PERBAIKAN: Selalu buat entry pembukuan untuk tracking (tanpa kondisi)
      const pembukuanEntry = {
        tanggal: updateData.tanggal_update,
        divisi: selectedPenjualanForUpdate.divisi,
        cabang_id: selectedPenjualanForUpdate.cabang_id,
        keterangan: `Update Harga Penjualan Booked - ${selectedPenjualanForUpdate.brands?.name || ''} - ${selectedPenjualanForUpdate.jenis_motor?.jenis_motor || ''} - ${selectedPenjualanForUpdate.plat} - ${updateData.reason}`,
        debit: totalBiayaTambahan > 0 ? totalBiayaTambahan : 0,
        kredit: totalBiayaTambahan < 0 ? Math.abs(totalBiayaTambahan) : 0,
        company_id: updateData.sumber_dana_id,
        pembelian_id: selectedPenjualanForUpdate.pembelian_id
      };
      
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert([pembukuanEntry]);
      
      if (pembukuanError) {
        console.error('Error creating pembukuan entry:', pembukuanError);
      }
      
      // 5. Update modal perusahaan jika ada biaya tambahan
      if (totalBiayaTambahan !== 0) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: updateData.sumber_dana_id,
          amount: -totalBiayaTambahan // Negatif untuk mengurangi modal
        });
      
        if (modalError) {
          console.error('Error updating company modal:', modalError);
        }
      }
      toast({
        title: "Berhasil",
        description: `Harga beli dan harga final berhasil diupdate. Biaya tambahan: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalBiayaTambahan)}`
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