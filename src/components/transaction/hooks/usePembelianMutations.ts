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
      const { error } = await supabase.from("pembelian").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pembelian"] });
      toast({ title: "Berhasil", description: "Data pembelian berhasil diperbarui" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Gagal memperbarui data pembelian", variant: "destructive" });
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