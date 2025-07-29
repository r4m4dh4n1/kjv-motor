import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BiroJasaFormData, BiroJasaItem } from "../types";
import { getCurrentDate, convertDateToISO, convertDateFromISO } from "../utils";
import { formatCurrency, parseCurrency } from "../utils";


export const useBiroJasaForm = (onSuccess: () => void, selectedDivision: string) => {
  const { toast } = useToast();
  const [editingBiroJasa, setEditingBiroJasa] = useState<BiroJasaItem | null>(null);

  const [formData, setFormData] = useState<BiroJasaFormData>({
    tanggal: getCurrentDate(),
    brand_id: "",
    jenis_motor_id: "",
    warna: "",
    plat_nomor: "",
    tahun: "",
    jenis_pengurusan: "",
    keterangan: "",
    estimasi_biaya: "0",
    estimasi_tanggal_selesai: getCurrentDate(),
    dp: "0",
    sisa: "0",
    rekening_tujuan_id: "",
    status: "Dalam Proses",
  });

  // Calculate sisa when estimasi_biaya or dp changes
  useEffect(() => {
    const estimasiBiaya = parseCurrency(formData.estimasi_biaya) || 0;
    const dp = parseCurrency(formData.dp) || 0;
    const sisa = Math.max(0, estimasiBiaya - dp);
    
    console.log('Debug sisa calculation:', {
      estimasi_biaya_raw: formData.estimasi_biaya,
      dp_raw: formData.dp,
      estimasiBiaya_parsed: estimasiBiaya,
      dp_parsed: dp,
      sisa_calculated: sisa
    });
    
    const formattedSisa = formatCurrency(sisa);
    console.log('Debug formatted sisa:', formattedSisa);
    
    // Only update if the calculated sisa is different from current sisa
    const currentSisa = parseCurrency(formData.sisa) || 0;
    if (sisa !== currentSisa) {
      setFormData(prev => ({ ...prev, sisa: formattedSisa }));
    }
  }, [formData.estimasi_biaya, formData.dp]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {
      const submitData = {
        tanggal: convertDateToISO(formData.tanggal),
        brand_id: formData.brand_id ? parseInt(formData.brand_id) : null,
        jenis_motor_id: formData.jenis_motor_id ? parseInt(formData.jenis_motor_id) : null,
        jenis_motor: formData.jenis_motor || null, // For Other Brands manual input
        warna: formData.warna,
        plat_nomor: formData.plat_nomor,
        tahun: formData.tahun ? parseInt(formData.tahun) : null,
        jenis_pengurusan: formData.jenis_pengurusan,
        keterangan: formData.keterangan,
        estimasi_biaya: parseCurrency(formData.estimasi_biaya),
        estimasi_tanggal_selesai: convertDateToISO(formData.estimasi_tanggal_selesai),
        dp: parseCurrency(formData.dp),
        sisa: parseCurrency(formData.sisa),
        total_bayar: parseCurrency(formData.dp),
        rekening_tujuan_id: formData.rekening_tujuan_id ? parseInt(formData.rekening_tujuan_id) : null,
        status: formData.status,
      };

      if (editingBiroJasa) {
        const { error } = await supabase
          .from("biro_jasa")
          .update(submitData)
          .eq("id", editingBiroJasa.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Data biro jasa berhasil diupdate",
        });
      } else {
        const { data: insertedData, error } = await supabase
          .from("biro_jasa")
          .insert([submitData])
          .select();

        if (error) throw error;

        // If DP is filled, create pembukuan entry
        const dpAmount = parseCurrency(formData.dp);
        if (dpAmount > 0 && insertedData && insertedData.length > 0) {
          const biroJasaId = insertedData[0].id;
          
          const pembukuanEntry = {
            tanggal: convertDateToISO(formData.tanggal),
            divisi: selectedDivision,
            cabang_id: 1, // Default cabang, adjust if needed
            keterangan: `DP Biro Jasa - ${formData.jenis_pengurusan}${formData.plat_nomor ? ` - ${formData.plat_nomor}` : ''}`,
            debit: 0,
            kredit: dpAmount,
            saldo: 0,
            company_id: formData.rekening_tujuan_id ? parseInt(formData.rekening_tujuan_id) : null
          };

          const { error: pembukuanError } = await supabase
            .from('pembukuan')
            .insert([pembukuanEntry]);

          if (pembukuanError) {
            console.error('Pembukuan Error:', pembukuanError);
            toast({
              title: "Warning",
              description: `Biro Jasa tersimpan tapi pembukuan gagal: ${pembukuanError.message}`,
              variant: "destructive"
            });
          }
        }

        toast({
          title: "Berhasil",
          description: "Data biro jasa berhasil ditambahkan",
        });
      }

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error saving data:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (biroJasa: BiroJasaItem) => {
    setEditingBiroJasa(biroJasa);
    setFormData({
      tanggal: convertDateFromISO(biroJasa.tanggal),
      brand_id: biroJasa.brand_id?.toString() || "",
      jenis_motor_id: biroJasa.jenis_motor_id?.toString() || "",
      warna: biroJasa.warna || "",
      plat_nomor: biroJasa.plat_nomor || "",
      tahun: biroJasa.tahun?.toString() || "",
      jenis_pengurusan: biroJasa.jenis_pengurusan || "",
      keterangan: biroJasa.keterangan || "",
      estimasi_biaya: formatCurrency(biroJasa.estimasi_biaya?.toString() || "0"),
      estimasi_tanggal_selesai: convertDateFromISO(biroJasa.estimasi_tanggal_selesai),
      dp: formatCurrency(biroJasa.dp?.toString() || "0"),
      sisa: formatCurrency(biroJasa.sisa?.toString() || "0"),
      rekening_tujuan_id: biroJasa.rekening_tujuan_id?.toString() || "",
      status: biroJasa.status || "Dalam Proses",
    });
  };

  const resetForm = () => {
    setFormData({
      tanggal: getCurrentDate(),
      brand_id: "",
      jenis_motor_id: "",
      warna: "",
      plat_nomor: "",
      tahun: "",
      jenis_pengurusan: "",
      keterangan: "",
      estimasi_biaya: "0",
      estimasi_tanggal_selesai: getCurrentDate(),
      dp: "0",
      sisa: "0",
      rekening_tujuan_id: "",
      status: "Dalam Proses",
    });
    setEditingBiroJasa(null);
  };

  return {
    formData,
    setFormData,
    editingBiroJasa,
    handleSubmit,
    handleEdit,
    resetForm,
  };
};