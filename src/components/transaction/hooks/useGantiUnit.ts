import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GantiUnitParams {
  penjualanId: number;
  oldPembelianId: number;
  newPembelianId: number;
  newHargaJual: number;
  oldHargaJual: number;
  newHargaBeli: number;
  newBrandId: number;
  newJenisId: number;
  newPlat: string;
  newWarna: string;
  newTahun: number;
  newKilometer: number;
  companyId: number;
  divisi: string;
  cabangId: number;
  tanggal: string;
  keterangan: string;
}

export const useGantiUnit = () => {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const mutateAsync = async (params: GantiUnitParams) => {
    setIsPending(true);
    try {
      const selisih = params.newHargaJual - params.oldHargaJual;

      // 1. Set old pembelian status back to 'tersedia'
      const { error: oldPembelianError } = await supabase
        .from("pembelian")
        .update({ status: "tersedia" })
        .eq("id", params.oldPembelianId);

      if (oldPembelianError) {
        console.error("Error updating old pembelian:", oldPembelianError);
        throw oldPembelianError;
      }

      // 2. Set new pembelian status to 'terjual'
      const { error: newPembelianError } = await supabase
        .from("pembelian")
        .update({ status: "terjual" })
        .eq("id", params.newPembelianId);

      if (newPembelianError) {
        console.error("Error updating new pembelian:", newPembelianError);
        throw newPembelianError;
      }

      // 3. Calculate new keuntungan
      const newKeuntungan = params.newHargaJual - params.newHargaBeli;

      // 4. Update penjualan with new unit data
      const { error: penjualanError } = await supabase
        .from("penjualans")
        .update({
          pembelian_id: params.newPembelianId,
          harga_beli: params.newHargaBeli,
          brand_id: params.newBrandId,
          jenis_id: params.newJenisId,
          plat: params.newPlat,
          warna: params.newWarna,
          tahun: params.newTahun,
          kilometer: params.newKilometer,
          harga_jual: params.newHargaJual,
          harga_bayar: params.newHargaJual,
          keuntungan: newKeuntungan,
          sisa_bayar: 0,
        })
        .eq("id", params.penjualanId);

      if (penjualanError) {
        console.error("Error updating penjualan:", penjualanError);
        throw penjualanError;
      }

      // 5. Insert pembukuan entry for the price difference (only if there IS a difference)
      if (selisih !== 0) {
        const pembukuanData = {
          tanggal: params.tanggal,
          keterangan: params.keterangan || `Ganti Unit - Selisih harga (${params.newPlat})`,
          debit: selisih < 0 ? Math.abs(selisih) : 0, // Kembalian (uang keluar)
          kredit: selisih > 0 ? selisih : 0, // Tambahan bayar (uang masuk)
          saldo: 0,
          divisi: params.divisi,
          company_id: params.companyId,
          cabang_id: params.cabangId,
          pembelian_id: params.newPembelianId,
        };

        const { error: pembukuanError } = await supabase
          .from("pembukuan")
          .insert([pembukuanData]);

        if (pembukuanError) {
          console.error("Error inserting pembukuan:", pembukuanError);
          toast({
            title: "Peringatan",
            description: `Unit berhasil diganti, tapi gagal mencatat pembukuan: ${pembukuanError.message}`,
            variant: "destructive",
          });
        }

        // 6. Update company modal
        // selisih > 0 = uang masuk (tambah modal), selisih < 0 = uang keluar (kurang modal)
        const { error: modalError } = await supabase.rpc("update_company_modal", {
          company_id: params.companyId,
          amount: selisih,
        });

        if (modalError) {
          console.error("Error updating company modal:", modalError);
        }
      }

      // 7. Save history to price_histories
      const { error: historyError } = await supabase
        .from("price_histories")
        .insert([{
          pembelian_id: params.newPembelianId,
          harga_jual_lama: params.oldHargaJual,
          harga_jual_baru: params.newHargaJual,
          reason: `Ganti Unit: Pembelian lama #${params.oldPembelianId} → baru #${params.newPembelianId}. Selisih: ${selisih >= 0 ? '+' : ''}${selisih}`,
          company_id: params.companyId,
        }]);

      if (historyError) {
        console.error("Error saving ganti unit history:", historyError);
      }

      toast({
        title: "Berhasil",
        description: selisih > 0
          ? `Unit berhasil diganti. Pembeli membayar tambahan Rp ${selisih.toLocaleString("id-ID")}`
          : selisih < 0
          ? `Unit berhasil diganti. Pembeli mendapat kembalian Rp ${Math.abs(selisih).toLocaleString("id-ID")}`
          : "Unit berhasil diganti. Tidak ada selisih harga.",
      });

      return { success: true, selisih };
    } catch (error: any) {
      console.error("Error ganti unit:", error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengganti unit",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsPending(false);
    }
  };

  return { mutateAsync, isPending };
};
