import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeletePriceHistoryParams {
  historyId: number;
  pembelianId: number;
  companyId: number | null;
  totalBiaya: number;
  onSuccess?: () => void;
}

export const useDeletePriceHistory = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const deletePriceHistory = async ({
    historyId,
    pembelianId,
    companyId,
    totalBiaya,
    onSuccess,
  }: DeletePriceHistoryParams) => {
    setIsDeleting(true);

    try {
      // 1. Delete from price_histories_pembelian
      const { error: deleteHistoryError } = await supabase
        .from("price_histories_pembelian")
        .delete()
        .eq("id", historyId);

      if (deleteHistoryError) {
        throw new Error(`Gagal menghapus riwayat harga: ${deleteHistoryError.message}`);
      }

      // 2. Delete from pembukuan (match by keterangan pattern)
      // Note: We'll try to match by pembelian_id and nominal
      const { error: deletePembukuanError } = await supabase
        .from("pembukuan")
        .delete()
        .eq("pembelian_id", pembelianId)
        .eq("nominal", totalBiaya);

      if (deletePembukuanError) {
        console.warn("Warning: Gagal menghapus dari pembukuan:", deletePembukuanError);
        // Don't throw error, just warn - pembukuan might not exist
      }

      // 3. Restore company modal if company_id exists
      if (companyId && totalBiaya > 0) {
        const { error: updateModalError } = await supabase.rpc(
          "update_company_modal",
          {
            p_company_id: companyId,
            p_amount: totalBiaya, // Positive amount to add back
          }
        );

        if (updateModalError) {
          console.warn("Warning: Gagal mengembalikan modal company:", updateModalError);
          // Don't throw error, continue with recalculation
        }
      }

      // 4. Recalculate harga_final for pembelian
      // Fetch all remaining price histories for this pembelian
      const { data: remainingHistories, error: fetchError } = await supabase
        .from("price_histories_pembelian")
        .select("biaya_qc, biaya_pajak, biaya_lain_lain")
        .eq("pembelian_id", pembelianId);

      if (fetchError) {
        throw new Error(`Gagal mengambil riwayat harga: ${fetchError.message}`);
      }

      // Calculate total biaya from remaining histories
      const totalRemainingBiaya = (remainingHistories || []).reduce(
        (sum, history) =>
          sum +
          (history.biaya_qc || 0) +
          (history.biaya_pajak || 0) +
          (history.biaya_lain_lain || 0),
        0
      );

      // Get original harga_beli
      const { data: pembelianData, error: pembelianError } = await supabase
        .from("pembelian")
        .select("harga_beli")
        .eq("id", pembelianId)
        .single();

      if (pembelianError) {
        throw new Error(`Gagal mengambil data pembelian: ${pembelianError.message}`);
      }

      // Update harga_final = harga_beli + total remaining biaya
      const newHargaFinal = (pembelianData.harga_beli || 0) + totalRemainingBiaya;

      const { error: updatePembelianError } = await supabase
        .from("pembelian")
        .update({ harga_final: newHargaFinal })
        .eq("id", pembelianId);

      if (updatePembelianError) {
        throw new Error(`Gagal update harga final: ${updatePembelianError.message}`);
      }

      toast({
        title: "Berhasil",
        description: "Riwayat harga berhasil dihapus dan modal dikembalikan",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error deleting price history:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus riwayat harga",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deletePriceHistory,
    isDeleting,
  };
};
