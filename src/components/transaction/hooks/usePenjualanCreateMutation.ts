import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PenjualanFormData } from "../penjualan-types";
import {
  createPenjualanData,
  createPembukuanEntries,
} from "../utils/penjualanBusinessLogic";
import { parseFormattedNumber } from "@/utils/formatUtils";
import { transformPenjualanFormDataForSubmit } from "../utils/penjualanFormUtils";

export const usePenjualanCreate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formData,
      pembelianData,
    }: {
      formData: PenjualanFormData;
      pembelianData: any[];
    }) => {
      // Calculate keuntungan
      const hargaJual = parseFormattedNumber(formData.harga_jual);
      // Get selected motor data
      const selectedMotor = pembelianData.find(
        (p) => p.id === parseInt(formData.selected_motor_id)
      );
      // Use harga_final if available and > 0, otherwise use harga_beli
      const hargaBeli =
        selectedMotor?.harga_final && selectedMotor.harga_final > 0
          ? selectedMotor.harga_final
          : selectedMotor?.harga_beli ||
            parseFormattedNumber(formData.harga_beli);
      const keuntungan = hargaJual - hargaBeli;

      // Auto update status based on payment
      let status = formData.status;
      const hargaBayar = parseFormattedNumber(formData.harga_bayar || "0");
      const sisaBayar = parseFormattedNumber(formData.sisa_bayar || "0");

      // If payment is complete, set status to 'Sold':
      // - cash_penuh: always sold (payment equals selling price)
      // - cash_bertahap/kredit: sold if harga_bayar >= harga_jual OR sisa_bayar = 0
      if (formData.jenis_pembayaran === "cash_penuh") {
        status = "Sold"; // Cash penuh selalu langsung sold
      } else if (hargaBayar >= hargaJual || sisaBayar === 0) {
        status = "Sold"; // ✅ Gunakan 'Sold' yang akan di-mapping ke 'selesai'
      }

      // Update formData status untuk transformasi
      const updatedFormData = { ...formData, status };
      const submitData = transformPenjualanFormDataForSubmit(updatedFormData);

      // Prepare penjualan data
      const penjualanData = createPenjualanData(
        submitData,
        updatedFormData,
        hargaBeli,
        hargaJual,
        keuntungan
      );
      // Status sudah di-transform di submitData, tidak perlu override lagi

      // 1. Insert into penjualans table
      const { data: penjualanResult, error: penjualanError } = await supabase
        .from("penjualans")
        .insert([penjualanData])
        .select()
        .single();

      if (penjualanError) {
        console.error("Penjualan Error Details:", penjualanError);
        throw penjualanError;
      }

      // 2. Update qty in jenis_motor table (reduce by 1)
      const { error: stockError } = await supabase.rpc("decrement_qty", {
        jenis_motor_id: submitData.jenis_motor_id,
      });

      if (stockError) {
        console.error("Stock Error:", stockError);
      }

      // 3. Update status in pembelian table to 'sold'
      // 3. Update status in pembelian table
      // Logic: If sales status is 'selesai' -> pembelian status 'sold' (hidden)
      //        If sales status is 'booked' -> pembelian status 'booked' (visible but reserved)
      const targetPembelianStatus =
        submitData.status === "selesai" ? "sold" : "booked";

      const { error: pembelianError } = await supabase
        .from("pembelian")
        .update({ status: targetPembelianStatus })
        .eq("id", parseInt(formData.selected_motor_id));

      if (pembelianError) {
        console.error("Pembelian Error:", pembelianError);
      }

      // 4. Insert into pembukuan table
      const pembukuanEntries = createPembukuanEntries(
        submitData,
        updatedFormData,
        selectedMotor
      );

      if (pembukuanEntries.length > 0) {
        try {
          const { error: pembukuanError } = await supabase
            .from("pembukuan")
            .insert(pembukuanEntries)
            .select();

          if (pembukuanError) {
            console.error("PEMBUKUAN ERROR:", pembukuanError);
            toast({
              title: "Warning",
              description: `Penjualan tersimpan tapi pembukuan gagal: ${pembukuanError.message}`,
              variant: "destructive",
            });
          }
        } catch (insertError) {
          console.error("CATCH ERROR saat insert pembukuan:", insertError);
          toast({
            title: "Error",
            description: "Terjadi kesalahan saat menyimpan pembukuan",
            variant: "destructive",
          });
        }
      }

      // 5. TAMBAHAN: Untuk cash_bertahap/kredit, tambah DP + subsidi + titip ongkir ke modal perusahaan
      const dp = parseFormattedNumber(formData.dp || "0");
      const subsidiOngkir = parseFormattedNumber(
        formData.subsidi_ongkir || "0"
      );
      const titipOngkir = parseFormattedNumber(formData.titip_ongkir || "0");

      if (
        (formData.jenis_pembayaran === "cash_bertahap" ||
          formData.jenis_pembayaran === "kredit") &&
        submitData.company_id
      ) {
        const totalModal = dp + subsidiOngkir + titipOngkir;

        if (totalModal > 0) {
          try {
            const { error: dpModalError } = await supabase.rpc(
              "update_company_modal",
              {
                company_id: submitData.company_id,
                amount: totalModal, // DP + subsidi + titip ongkir (sesuai pembukuan)
              }
            );

            if (dpModalError) {
              console.error("Error adding DP to company modal:", dpModalError);
              toast({
                title: "Warning",
                description: `Penjualan tersimpan tapi gagal menambah modal dari DP: ${dpModalError.message}`,
                variant: "destructive",
              });
            }
          } catch (dpModalUpdateError) {
            console.error(
              "CATCH ERROR saat update modal DP:",
              dpModalUpdateError
            );
            toast({
              title: "Warning",
              description:
                "Penjualan tersimpan tapi gagal menambah modal dari DP",
              variant: "destructive",
            });
          }
        }
      }

      // 6. TAMBAHAN: Untuk cash_penuh, tambah harga bayar + subsidi + titip ongkir ke modal perusahaan
      if (formData.jenis_pembayaran === "cash_penuh" && submitData.company_id) {
        const totalModal =
          Math.min(hargaBayar, hargaJual) + subsidiOngkir + titipOngkir;

        if (totalModal > 0) {
          try {
            const { error: cashModalError } = await supabase.rpc(
              "update_company_modal",
              {
                company_id: submitData.company_id,
                amount: totalModal, // harga bayar + subsidi + titip ongkir (sesuai pembukuan)
              }
            );

            if (cashModalError) {
              console.error(
                "Error adding cash payment to company modal:",
                cashModalError
              );
              toast({
                title: "Warning",
                description: `Penjualan tersimpan tapi gagal menambah modal dari cash: ${cashModalError.message}`,
                variant: "destructive",
              });
            }
          } catch (cashModalUpdateError) {
            console.error(
              "CATCH ERROR saat update modal cash:",
              cashModalUpdateError
            );
            toast({
              title: "Warning",
              description:
                "Penjualan tersimpan tapi gagal menambah modal dari cash",
              variant: "destructive",
            });
          }
        }
      }

      // 7. TAMBAHAN: Untuk cash_bertahap/kredit yang sudah lunas, tambah sisa pembayaran
      if (
        (submitData.status === "selesai" || hargaBayar >= hargaJual) &&
        submitData.company_id &&
        (formData.jenis_pembayaran === "cash_bertahap" ||
          formData.jenis_pembayaran === "kredit")
      ) {
        const sisaPembayaran = Math.min(hargaBayar, hargaJual) - dp; // Total pembayaran dikurangi DP yang sudah ditambahkan

        if (sisaPembayaran > 0) {
          try {
            const { error: modalError } = await supabase.rpc(
              "update_company_modal",
              {
                company_id: submitData.company_id,
                amount: sisaPembayaran,
              }
            );

            if (modalError) {
              console.error("Error updating company modal:", modalError);
              toast({
                title: "Warning",
                description: `Penjualan tersimpan tapi gagal menambah modal perusahaan: ${modalError.message}`,
                variant: "destructive",
              });
            }
          } catch (modalUpdateError) {
            console.error("CATCH ERROR saat update modal:", modalUpdateError);
            toast({
              title: "Warning",
              description:
                "Penjualan tersimpan tapi gagal menambah modal perusahaan",
              variant: "destructive",
            });
          }
        }
      }

      return penjualanResult;
    },
    onSuccess: () => {
      // Invalidate pembelian cache agar status ter-update di dropdown
      queryClient.invalidateQueries({ queryKey: ["pembelian"] });
      queryClient.invalidateQueries({ queryKey: ["penjualan"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      
      toast({
        title: "Sukses",
        description: "Data penjualan berhasil disimpan",
      });
    },
    onError: (error) => {
      console.error("Error saving penjualan:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data penjualan",
        variant: "destructive",
      });
    },
  });
};
