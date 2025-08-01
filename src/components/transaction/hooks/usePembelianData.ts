import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePembelianData = (selectedDivision: string, selectedJenisPembelian: string = "all", selectedStatus: string = "all") => {
  return useQuery({
    queryKey: ['pembelian', selectedDivision, selectedJenisPembelian, selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from('pembelian')
        .select(`
          *,
          cabang:cabang_id(nama),
          brands:brand_id(name),
          jenis_motor:jenis_motor_id(jenis_motor),
          companies_1:sumber_dana_1_id(nama_perusahaan),
          companies_2:sumber_dana_2_id(nama_perusahaan)
        `);

      if (selectedDivision !== "all") {
        query = query.eq('divisi', selectedDivision);
      }

      if (selectedJenisPembelian !== "all") {
        query = query.eq('jenis_pembelian', selectedJenisPembelian);
      }

      // Filter berdasarkan status
      if (selectedStatus !== "all") {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query.order('tanggal_pembelian', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useCabangData = () => {
  return useQuery({
    queryKey: ["cabang"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cabang").select("*");
      if (error) throw error;
      return data;
    },
  });
};

export const useBrandsData = () => {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*");
      if (error) throw error;
      return data;
    },
  });
};

export const useJenisMotorData = () => {
  return useQuery({
    queryKey: ["jenis_motor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jenis_motor").select("*");
      if (error) throw error;
      return data;
    },
  });
};

export const useCompaniesData = (selectedDivision?: string) => {
  return useQuery({
    queryKey: ["companies", selectedDivision],
    queryFn: async () => {
      let query = supabase.from("companies").select("*");
      
      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};