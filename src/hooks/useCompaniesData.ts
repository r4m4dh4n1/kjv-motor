import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useCompaniesData = (selectedDivision: string) => {
  const [companiesData, setCompaniesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCompaniesData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('companies')
        .select('*')
        .eq('status', 'active')
        .order('nama_perusahaan');

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      const { data, error } = await query;
      if (error) throw error;

      setCompaniesData(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompaniesData();
  }, [selectedDivision]);

  return {
    companiesData,
    loading,
    refetch: fetchCompaniesData
  };
};