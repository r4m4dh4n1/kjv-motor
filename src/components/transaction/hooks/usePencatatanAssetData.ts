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
      // First get pencatatan_asset data
      let assetQuery = supabase
        .from('pencatatan_asset')
        .select('*');
      
      if (selectedDivision) {
        assetQuery = assetQuery.eq('divisi', selectedDivision);
      }
      
      const { data: assetData, error: assetError } = await assetQuery
        .order('tanggal', { ascending: false });
      
      if (assetError) throw assetError;
      
      if (!assetData || assetData.length === 0) {
        return [];
      }
      
      // Get unique company IDs
      const companyIds = [...new Set(assetData.map(asset => asset.sumber_dana_id))];
      
      // Get company data
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, nama_perusahaan')
        .in('id', companyIds);
      
      if (companiesError) throw companiesError;
      
      // Create a map for quick lookup
      const companiesMap = new Map(
        (companiesData || []).map(company => [company.id, company])
      );
      
      // Combine asset data with company data
      const assetWithCompanies = assetData.map(asset => ({
        ...asset,
        companies: companiesMap.get(asset.sumber_dana_id) || null
      }));
      
      return assetWithCompanies;
    },
  });
};