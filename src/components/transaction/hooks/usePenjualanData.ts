import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePenjualanData = (selectedDivision: string) => {
  const [penjualanData, setPenjualanData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchPenjualanData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('penjualans')
        .select(`
          *,
          cabang:cabang_id(nama),
          brands:brand_id(name),
          jenis_motor:jenis_id(jenis_motor),
          companies:company_id(nama_perusahaan)
        `)
        .order('tanggal', { ascending: false });

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching penjualan data:', error);
        return;
      }

      setPenjualanData(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPenjualanData();
  }, [selectedDivision]);

  return {
    penjualanData,
    isLoading,
    refetch: fetchPenjualanData
  };
};