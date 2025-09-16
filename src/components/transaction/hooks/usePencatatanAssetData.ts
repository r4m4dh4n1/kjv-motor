import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PencatatanAssetItem {
  id: number;
  tanggal: string;
  nama: string;
  nominal: number;
  divisi: string;
  cabang_id: number;
  sumber_dana_id: number;
  keterangan?: string;
  created_at: string;
  updated_at: string;
  companies?: {
    nama_perusahaan: string;
  };
}

export const usePencatatanAssetData = (selectedDivision: string) => {
  return useQuery({
    queryKey: ["pencatatan-asset", selectedDivision],
    queryFn: async (): Promise<PencatatanAssetItem[]> => {
      let query = (supabase as any)
        .from('pencatatan_asset')
        .select(`
          *,
          companies(
            nama_perusahaan
          )
        `);
      
      // Filter by division if provided
      if (selectedDivision) {
        query = query.eq('divisi', selectedDivision);
      }
      
      const { data, error } = await query.order('tanggal', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
};