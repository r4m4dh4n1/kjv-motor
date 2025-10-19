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
  jenis_transaksi?: string; // ✅ TAMBAH: Field jenis transaksi
  created_at: string;
  updated_at: string;
  companies?: {  // ✅ TAMBAH: interface untuk nested company data
    nama_perusahaan: string;
    id: number;
    modal?: number; // ✅ TAMBAH: Field modal perusahaan
  };
}

export const usePencatatanAssetData = (selectedDivision: string) => {
  return useQuery({
    queryKey: ["pencatatan-asset", selectedDivision],
    queryFn: async (): Promise<PencatatanAssetItem[]> => {
     // ✅ PERBAIKAN: Tambahkan JOIN ke tabel companies dan integrasi dengan sistem
     let query = (supabase as any)
     .from('pencatatan_asset')
     .select(`
       *,
       companies:sumber_dana_id (
         id,
         nama_perusahaan,
         modal
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