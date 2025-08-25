import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BiroJasaItem } from "../types";

export const useBiroJasaData = (selectedDivision: string) => {
  const [biroJasaData, setBiroJasaData] = useState<BiroJasaItem[]>([]);
  const [brandsData, setBrandsData] = useState<any[]>([]);
  const [companiesData, setCompaniesData] = useState<any[]>([]);
  const [jenisMotorData, setJenisMotorData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      let biroJasaQuery;
      
      if (selectedDivision !== 'all') {
        // Query dengan inner join untuk filter divisi
        biroJasaQuery = supabase
          .from('biro_jasa')
          .select(`
            *,
            companies!inner(nama_perusahaan, divisi)
          `)
          .eq('companies.divisi', selectedDivision)
          .order('created_at', { ascending: false });
      } else {
        // Query normal tanpa filter divisi
        biroJasaQuery = supabase
          .from('biro_jasa')
          .select(`
            *,
            companies:rekening_tujuan_id(nama_perusahaan, divisi)
          `)
          .order('created_at', { ascending: false });
      }
  
      const { data: biroJasaResult, error: biroJasaError } = await biroJasaQuery;
      if (biroJasaError) throw biroJasaError;

      // Fetch companies data for dropdown with division filter
      let companiesQuery = supabase
        .from('companies')
        .select('*')
        .order('nama_perusahaan');
      
      // Apply division filter to companies
      if (selectedDivision !== 'all') {
        companiesQuery = companiesQuery.eq('divisi', selectedDivision);
      }

      const { data: companiesResult, error: companiesError } = await companiesQuery;
      if (companiesError) throw companiesError;

      // Set empty arrays for brands and jenis_motor since we don't use them anymore
      // but keep the structure for backward compatibility
      setBiroJasaData(biroJasaResult || []);
      setBrandsData([]); // Empty since we use manual input
      setCompaniesData(companiesResult || []);
      setJenisMotorData([]); // Empty since we use manual input

    } catch (error) {
      console.error('Error fetching biro jasa data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data biro jasa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('biro_jasa')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data biro jasa berhasil dihapus",
      });

      // Refresh data after delete
      fetchData();
    } catch (error) {
      console.error('Error deleting biro jasa:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data biro jasa",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDivision]);

  return {
    biroJasaData,
    brandsData, // Empty array for backward compatibility
    companiesData,
    jenisMotorData, // Empty array for backward compatibility
    loading,
    fetchData,
    handleDelete,
  };
};