import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const usePembelianCreate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      // Validasi jenis_motor_id terlebih dahulu
      if (!data.jenis_motor_id) {
        throw new Error("Jenis motor harus dipilih");
      }

      // Ambil data jenis motor saat ini untuk mendapatkan qty
      const { data: currentJenisMotor, error: fetchError } = await supabase
        .from("jenis_motor")
        .select("qty")
        .eq("id", data.jenis_motor_id)
        .single();
      
      if (fetchError || !currentJenisMotor) {
        throw new Error("Jenis motor tidak valid atau tidak ditemukan");
      }

      // Fetch modal perusahaan sumber dana 1
      const { data: company1, error: company1Error } = await supabase
        .from("companies")
        .select("modal")
        .eq("id", data.sumber_dana_1_id)
        .single();
      
      if (company1Error || !company1) {
        throw new Error("Perusahaan sumber dana 1 tidak ditemukan");
      }

      // Validasi modal mencukupi untuk sumber dana 1
      if (company1.modal < data.nominal_dana_1) {
        throw new Error("Modal perusahaan sumber dana 1 tidak mencukupi");
      }

      let company2 = null;
      // Fetch modal perusahaan sumber dana 2 jika ada
      if (data.sumber_dana_2_id && data.nominal_dana_2) {
        const { data: comp2, error: company2Error } = await supabase
          .from("companies")
          .select("modal")
          .eq("id", data.sumber_dana_2_id)
          .single();
        
        if (company2Error || !comp2) {
          throw new Error("Perusahaan sumber dana 2 tidak ditemukan");
        }

        // Validasi modal mencukupi untuk sumber dana 2
        if (comp2.modal < data.nominal_dana_2) {
          throw new Error("Modal perusahaan sumber dana 2 tidak mencukupi");
        }
        
        company2 = comp2;
      }

      // Insert into pembelian table first
      const { data: pembelianResult, error: pembelianError } = await supabase
        .from("pembelian")
        .insert([data])
        .select()
        .single();
      
      if (pembelianError) throw pembelianError;

      // Update stock qty in jenis_motor table (menambah 1)
      const { error: updateStockError } = await supabase
        .from("jenis_motor")
        .update({ qty: currentJenisMotor.qty + 1 })
        .eq("id", data.jenis_motor_id);
      
      if (updateStockError) throw updateStockError;

      // Kurangi modal perusahaan sumber dana 1
      const { error: updateModal1Error } = await supabase
        .from("companies")
        .update({ modal: company1.modal - data.nominal_dana_1 })
        .eq("id", data.sumber_dana_1_id);
      
      if (updateModal1Error) throw updateModal1Error;

      // Kurangi modal perusahaan sumber dana 2 jika ada
      if (data.sumber_dana_2_id && data.nominal_dana_2 && company2) {
        const { error: updateModal2Error } = await supabase
          .from("companies")
          .update({ modal: company2.modal - data.nominal_dana_2 })
          .eq("id", data.sumber_dana_2_id);
        
        if (updateModal2Error) throw updateModal2Error;
      }

      // Insert into pembukuan table for sumber dana 1
      const pembukuanData1 = {
        tanggal: data.tanggal_pembelian,
        divisi: data.divisi,
        cabang_id: data.cabang_id,
        keterangan: `Pembelian motor ${data.plat_nomor} - ${data.keterangan || ''} (Sumber Dana 1)`,
        debit: data.nominal_dana_1,
        pembelian_id: pembelianResult.id,
        company_id: data.sumber_dana_1_id
      };

      const { error: pembukuanError1 } = await supabase
        .from("pembukuan")
        .insert([pembukuanData1]);
      
      if (pembukuanError1) throw pembukuanError1;

      // Insert into pembukuan table for sumber dana 2 if exists
      if (data.sumber_dana_2_id && data.nominal_dana_2) {
        const pembukuanData2 = {
          tanggal: data.tanggal_pembelian,
          divisi: data.divisi,
          cabang_id: data.cabang_id,
          keterangan: `Pembelian motor ${data.plat_nomor} - ${data.keterangan || ''} (Sumber Dana 2)`,
          debit: data.nominal_dana_2,
          pembelian_id: pembelianResult.id,
          company_id: data.sumber_dana_2_id
        };

        const { error: pembukuanError2 } = await supabase
          .from("pembukuan")
          .insert([pembukuanData2]);
        
        if (pembukuanError2) throw pembukuanError2;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pembelian"] });
      queryClient.invalidateQueries({ queryKey: ["pembukuan"] });
      queryClient.invalidateQueries({ queryKey: ["jenis_motor"] });
      toast({ 
        title: "Berhasil", 
        description: "Data pembelian berhasil ditambahkan dan stock jenis motor telah diupdate" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal menambahkan data pembelian", 
        variant: "destructive" 
      });
      console.error(error);
    },
  });
};

export const usePembelianUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      // Ambil data pembelian yang lama terlebih dahulu
      const { data: oldPembelian, error: fetchError } = await supabase
        .from("pembelian")
        .select("*")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;

      // Validasi jenis_motor_id terlebih dahulu jika berubah
      if (data.jenis_motor_id && data.jenis_motor_id !== oldPembelian.jenis_motor_id) {
        const { data: newJenisMotor, error: newJenisMotorError } = await supabase
          .from("jenis_motor")
          .select("qty")
          .eq("id", data.jenis_motor_id)
          .single();
        
        if (newJenisMotorError || !newJenisMotor) {
          throw new Error("Jenis motor baru tidak valid atau tidak ditemukan");
        }
      }

      // Cek apakah ada perubahan pada sumber dana
      const isSumberDana1Changed = data.sumber_dana_1_id && data.sumber_dana_1_id !== oldPembelian.sumber_dana_1_id;
      const isSumberDana2Changed = data.sumber_dana_2_id !== oldPembelian.sumber_dana_2_id;
      const isNominal1Changed = data.nominal_dana_1 && data.nominal_dana_1 !== oldPembelian.nominal_dana_1;
      const isNominal2Changed = data.nominal_dana_2 !== oldPembelian.nominal_dana_2;

      // Jika ada perubahan sumber dana atau nominal, lakukan penyesuaian modal
      if (isSumberDana1Changed || isSumberDana2Changed || isNominal1Changed || isNominal2Changed) {
        // Kembalikan modal ke perusahaan lama
        // Sumber dana 1 lama
        const { data: oldCompany1, error: oldCompany1Error } = await supabase
          .from("companies")
          .select("modal")
          .eq("id", oldPembelian.sumber_dana_1_id)
          .single();
        
        if (oldCompany1Error) throw oldCompany1Error;

        await supabase
          .from("companies")
          .update({ modal: oldCompany1.modal + oldPembelian.nominal_dana_1 })
          .eq("id", oldPembelian.sumber_dana_1_id);

        // Sumber dana 2 lama (jika ada)
        if (oldPembelian.sumber_dana_2_id && oldPembelian.nominal_dana_2) {
          const { data: oldCompany2, error: oldCompany2Error } = await supabase
            .from("companies")
            .select("modal")
            .eq("id", oldPembelian.sumber_dana_2_id)
            .single();
          
          if (oldCompany2Error) throw oldCompany2Error;

          await supabase
            .from("companies")
            .update({ modal: oldCompany2.modal + oldPembelian.nominal_dana_2 })
            .eq("id", oldPembelian.sumber_dana_2_id);
        }

        // Kurangi modal dari perusahaan baru
        // Sumber dana 1 baru
        const newSumberDana1Id = data.sumber_dana_1_id || oldPembelian.sumber_dana_1_id;
        const newNominal1 = data.nominal_dana_1 || oldPembelian.nominal_dana_1;
        
        const { data: newCompany1, error: newCompany1Error } = await supabase
          .from("companies")
          .select("modal")
          .eq("id", newSumberDana1Id)
          .single();
        
        if (newCompany1Error) throw newCompany1Error;

        if (newCompany1.modal < newNominal1) {
          throw new Error("Modal perusahaan sumber dana 1 tidak mencukupi");
        }

        await supabase
          .from("companies")
          .update({ modal: newCompany1.modal - newNominal1 })
          .eq("id", newSumberDana1Id);

        // Sumber dana 2 baru (jika ada)
        const newSumberDana2Id = data.sumber_dana_2_id;
        const newNominal2 = data.nominal_dana_2;

        if (newSumberDana2Id && newNominal2) {
          const { data: newCompany2, error: newCompany2Error } = await supabase
            .from("companies")
            .select("modal")
            .eq("id", newSumberDana2Id)
            .single();
          
          if (newCompany2Error) throw newCompany2Error;

          if (newCompany2.modal < newNominal2) {
            throw new Error("Modal perusahaan sumber dana 2 tidak mencukupi");
          }

          await supabase
            .from("companies")
            .update({ modal: newCompany2.modal - newNominal2 })
            .eq("id", newSumberDana2Id);
        }

        // Update pembukuan - hapus yang lama dan buat yang baru
        await supabase
          .from("pembukuan")
          .delete()
          .eq("pembelian_id", id);

        // Buat pembukuan baru untuk sumber dana 1
        const pembukuanData1 = {
          tanggal: data.tanggal_pembelian || oldPembelian.tanggal_pembelian,
          divisi: data.divisi || oldPembelian.divisi,
          cabang_id: data.cabang_id || oldPembelian.cabang_id,
          keterangan: `Pembelian motor ${data.plat_nomor || oldPembelian.plat_nomor} - ${data.keterangan || oldPembelian.keterangan || ''} (Sumber Dana 1)`,
          debit: newNominal1,
          pembelian_id: id,
          company_id: newSumberDana1Id
        };

        await supabase
          .from("pembukuan")
          .insert([pembukuanData1]);

        // Buat pembukuan baru untuk sumber dana 2 (jika ada)
        if (newSumberDana2Id && newNominal2) {
          const pembukuanData2 = {
            tanggal: data.tanggal_pembelian || oldPembelian.tanggal_pembelian,
            divisi: data.divisi || oldPembelian.divisi,
            cabang_id: data.cabang_id || oldPembelian.cabang_id,
            keterangan: `Pembelian motor ${data.plat_nomor || oldPembelian.plat_nomor} - ${data.keterangan || oldPembelian.keterangan || ''} (Sumber Dana 2)`,
            debit: newNominal2,
            pembelian_id: id,
            company_id: newSumberDana2Id
          };

          await supabase
            .from("pembukuan")
            .insert([pembukuanData2]);
        }
      }

      // Update stock jenis motor jika berubah
      if (data.jenis_motor_id && data.jenis_motor_id !== oldPembelian.jenis_motor_id) {
        // Kurangi stock dari jenis motor lama
        const { data: oldJenisMotor } = await supabase
          .from("jenis_motor")
          .select("qty")
          .eq("id", oldPembelian.jenis_motor_id)
          .single();

        if (oldJenisMotor) {
          await supabase
            .from("jenis_motor")
            .update({ qty: Math.max(0, oldJenisMotor.qty - 1) })
            .eq("id", oldPembelian.jenis_motor_id);
        }

        // Tambah stock ke jenis motor baru
        const { data: newJenisMotor } = await supabase
          .from("jenis_motor")
          .select("qty")
          .eq("id", data.jenis_motor_id)
          .single();

        if (newJenisMotor) {
          await supabase
            .from("jenis_motor")
            .update({ qty: newJenisMotor.qty + 1 })
            .eq("id", data.jenis_motor_id);
        }
      }

      // Update data pembelian
      const { error } = await supabase.from("pembelian").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pembelian"] });
      queryClient.invalidateQueries({ queryKey: ["pembukuan"] });
      queryClient.invalidateQueries({ queryKey: ["jenis_motor"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({ 
        title: "Berhasil", 
        description: "Data pembelian berhasil diperbarui dan modal perusahaan telah disesuaikan" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal memperbarui data pembelian", 
        variant: "destructive" 
      });
      console.error(error);
    },
  });
};

export const usePembelianDelete = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      // Ambil data pembelian yang akan dihapus
      const { data: pembelianToDelete, error: fetchError } = await supabase
        .from("pembelian")
        .select("*")
        .eq("id", id)
        .single();
      
      if (fetchError) throw fetchError;

      // Ambil data jenis motor saat ini
      const { data: currentJenisMotor, error: fetchJenisMotorError } = await supabase
        .from("jenis_motor")
        .select("qty")
        .eq("id", pembelianToDelete.jenis_motor_id)
        .single();
      
      if (fetchJenisMotorError) throw fetchJenisMotorError;

      // Ambil modal perusahaan sumber dana 1
      const { data: company1, error: company1Error } = await supabase
        .from("companies")
        .select("modal")
        .eq("id", pembelianToDelete.sumber_dana_1_id)
        .single();
    
      if (company1Error) throw company1Error;

      let company2 = null;
      if (pembelianToDelete.sumber_dana_2_id) {
        const { data: comp2, error: company2Error } = await supabase
          .from("companies")
          .select("modal")
          .eq("id", pembelianToDelete.sumber_dana_2_id)
          .single();
        
        if (company2Error) throw company2Error;
        company2 = comp2;
      }

      // HAPUS RECORD PEMBUKUAN TERLEBIH DAHULU
      const { error: deletePembukuanError } = await supabase
        .from("pembukuan")
        .delete()
        .eq("pembelian_id", id);

      if (deletePembukuanError) throw deletePembukuanError;

      // Delete pembelian
      const { error: deleteError } = await supabase.from("pembelian").delete().eq("id", id);
      if (deleteError) throw deleteError;

      // Update stock qty in jenis_motor table (mengurangi 1)
      const newQty = Math.max(0, currentJenisMotor.qty - 1);
      const { error: updateStockError } = await supabase
        .from("jenis_motor")
        .update({ qty: newQty })
        .eq("id", pembelianToDelete.jenis_motor_id);
      
      if (updateStockError) throw updateStockError;

      // Kembalikan modal perusahaan sumber dana 1
      const { error: restoreModal1Error } = await supabase
        .from("companies")
        .update({ modal: company1.modal + pembelianToDelete.nominal_dana_1 })
        .eq("id", pembelianToDelete.sumber_dana_1_id);
      
      if (restoreModal1Error) throw restoreModal1Error;

      // Kembalikan modal perusahaan sumber dana 2 jika ada
      if (pembelianToDelete.sumber_dana_2_id && pembelianToDelete.nominal_dana_2 && company2) {
        const { error: restoreModal2Error } = await supabase
          .from("companies")
          .update({ modal: company2.modal + pembelianToDelete.nominal_dana_2 })
          .eq("id", pembelianToDelete.sumber_dana_2_id);
        
        if (restoreModal2Error) throw restoreModal2Error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pembelian"] });
      queryClient.invalidateQueries({ queryKey: ["pembukuan"] });
      queryClient.invalidateQueries({ queryKey: ["jenis_motor"] });
      toast({ 
        title: "Berhasil", 
        description: "Data pembelian berhasil dihapus dan stock jenis motor telah diupdate" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Gagal menghapus data pembelian", 
        variant: "destructive" 
      });
      console.error(error);
    },
  });
};