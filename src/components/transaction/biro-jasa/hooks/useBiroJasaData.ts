import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BiroJasaItem, Brand, Company, JenisMotor } from "../types";

export const useBiroJasaData = (selectedDivision: string) => {
  const [biroJasaData, setBiroJasaData] = useState<BiroJasaItem[]>([]);
  const [brandsData, setBrandsData] = useState<Brand[]>([]);
  const [companiesData, setCompaniesData] = useState<Company[]>([]);
  const [jenisMotorData, setJenisMotorData] = useState<JenisMotor[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      // Fetch biro jasa data with jenis_motor relation to filter by divisi
      let biroJasaQuery = supabase
        .from("biro_jasa")
        .select(`
          *,
          brands:brand_id(name),
          companies:rekening_tujuan_id(nama_perusahaan, divisi),
          jenis_motor:jenis_motor_id(jenis_motor, divisi)
        `)
        .order("created_at", { ascending: false });

      const { data: biroJasa, error: biroJasaError } = await biroJasaQuery;

      if (biroJasaError) throw biroJasaError;
      
      // Filter biro jasa data based on selected division
      const filteredBiroJasa = selectedDivision !== 'all' 
        ? (biroJasa || []).filter(item => item.jenis_motor?.divisi === selectedDivision)
        : (biroJasa || []);
      
      setBiroJasaData(filteredBiroJasa);

      // Fetch brands
      const { data: brands, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .order("name");

      if (brandsError) throw brandsError;
      setBrandsData(brands || []);

      // Fetch companies based on selected division
      let companiesQuery = supabase
        .from("companies")
        .select("*")
        .order("nama_perusahaan");

      if (selectedDivision !== 'all') {
        companiesQuery = companiesQuery.eq('divisi', selectedDivision);
      }

      const { data: companies, error: companiesError } = await companiesQuery;

      if (companiesError) throw companiesError;
      setCompaniesData(companies || []);

      // Fetch jenis motor based on selected division
      let jenisMotorQuery = supabase
        .from("jenis_motor")
        .select("*")
        .order("jenis_motor");

      if (selectedDivision !== 'all') {
        jenisMotorQuery = jenisMotorQuery.eq('divisi', selectedDivision);
      }

      const { data: jenisMotor, error: jenisMotorError } = await jenisMotorQuery;

      if (jenisMotorError) throw jenisMotorError;
      setJenisMotorData(jenisMotor || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Yakin ingin menghapus data ini?")) {
      try {
        const { error } = await supabase
          .from("biro_jasa")
          .delete()
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Data berhasil dihapus",
        });

        fetchData();
      } catch (error) {
        console.error("Error deleting data:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus data",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDivision]);

  return {
    biroJasaData,
    brandsData,
    companiesData,
    jenisMotorData,
    fetchData,
    handleDelete,
  };
};