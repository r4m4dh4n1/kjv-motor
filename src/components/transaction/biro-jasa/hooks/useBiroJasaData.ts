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
    if (!confirm("Apakah Anda yakin ingin menghapus data biro jasa ini?")) {
      return;
    }

    try {
      // 1. Ambil data biro jasa yang akan dihapus
      const { data: biroJasaToDelete, error: fetchError } = await supabase
        .from('biro_jasa')
        .select('biaya_modal, keuntungan, rekening_tujuan_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Jika ada biaya modal, kembalikan ke rekening tujuan (company)
      if (biroJasaToDelete.rekening_tujuan_id && biroJasaToDelete.biaya_modal > 0) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: biroJasaToDelete.rekening_tujuan_id,
          amount: biroJasaToDelete.biaya_modal // Kembalikan biaya modal
        });

        if (modalError) {
          console.error('Error returning modal to company:', modalError);
        }
      }

      // 3. Jika ada keuntungan, kurangi dari modal company
      if (biroJasaToDelete.rekening_tujuan_id && biroJasaToDelete.keuntungan > 0) {
        const { error: keuntunganError } = await supabase.rpc('update_company_modal', {
          company_id: biroJasaToDelete.rekening_tujuan_id,
          amount: -biroJasaToDelete.keuntungan // Kurangi keuntungan
        });

        if (keuntunganError) {
          console.error('Error subtracting keuntungan from company:', keuntunganError);
        }
      }

      // 4. Hapus cicilan biro jasa jika ada
      const { error: cicilanError } = await supabase
        .from('biro_jasa_cicilan')
        .delete()
        .eq('biro_jasa_id', id);

      if (cicilanError) {
        console.error('Error deleting biro jasa cicilan:', cicilanError);
      }

      // 5. Hapus data biro jasa
      const { error: deleteError } = await supabase
        .from('biro_jasa')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({
        title: "Berhasil",
        description: "Data biro jasa berhasil dihapus dan modal company disesuaikan",
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