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
     // ✅ PERBAIKAN: Gunakan query manual untuk menghindari foreign key error
     let query = (supabase as any)
     .from('pencatatan_asset')
     .select('*'); 
      
      // Filter by division if provided
      if (selectedDivision) {
        query = query.eq('divisi', selectedDivision);
      }
      
      const { data, error } = await query.order('tanggal', { ascending: false });
      
      if (error) throw error;
      
      // ✅ PERBAIKAN: Manual join dengan companies untuk menghindari foreign key error
      if (data && data.length > 0) {
        const companyIds = [...new Set(data.map(item => item.sumber_dana_id))] as number[];
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, nama_perusahaan, modal')
          .in('id', companyIds);
        
        // Merge data
        const enrichedData = data.map(asset => ({
          ...asset,
          companies: companiesData?.find(company => company.id === asset.sumber_dana_id)
        }));
        
        return enrichedData;
      }
      
      return data || [];
    },
  });
};