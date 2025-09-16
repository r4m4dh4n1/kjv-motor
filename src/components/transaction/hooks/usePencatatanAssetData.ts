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
          companies!sumber_dana_id(
            nama_perusahaan
          )
        `);
      
      if (selectedDivision) {
        assetQuery = assetQuery.eq('divisi', selectedDivision);
      }
      
      const { data: assetData, error: assetError } = await assetQuery
        .order('tanggal', { ascending: false });
      
      if (assetError) throw assetError;
      
      // Get company data for each asset
      const assetWithCompanies = await Promise.all(
        (assetData || []).map(async (asset) => {
          const { data: companyData } = await supabase
            .from('companies')
            .select('nama_perusahaan')
            .eq('id', asset.sumber_dana_id)
            .single();
          
          return {
            ...asset,
            companies: companyData
          };
        })
      );
      
      return assetWithCompanies;
    },
  });
};