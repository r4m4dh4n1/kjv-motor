import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BiroJasaFormData, BiroJasaItem } from "../types";
import { getCurrentDate, convertDateToISO, convertDateFromISO } from "../utils";
import { formatCurrency, parseCurrency } from "../utils";

export const useBiroJasaForm = (onSuccess: () => void, selectedDivision: string) => {
  const { toast } = useToast();
  const [editingBiroJasa, setEditingBiroJasa] = useState<BiroJasaItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<BiroJasaFormData>({
    tanggal: getCurrentDate(),
    brand_name: "",
    jenis_motor: "",
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
    
    const formattedSisa = formatCurrency(sisa);
    
    // Only update if the calculated sisa is different from current sisa
    const currentSisa = parseCurrency(formData.sisa) || 0;
    if (sisa !== currentSisa) {
      setFormData(prev => ({ ...prev, sisa: formattedSisa }));
    }
  }, [formData.estimasi_biaya, formData.dp]);
  
  // Validation function
  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.tanggal) {
      errors.push("Tanggal harus diisi");
    }
    
    if (!formData.jenis_pengurusan) {
      errors.push("Jenis Pengurusan harus dipilih");
    }
    
    // Validate estimasi_biaya is not negative
    const estimasiBiaya = parseCurrency(formData.estimasi_biaya) || 0;
    if (estimasiBiaya < 0) {
      errors.push("Estimasi biaya tidak boleh negatif");
    }
    
    // Validate DP is not greater than estimasi_biaya
    const dp = parseCurrency(formData.dp) || 0;
    if (dp > estimasiBiaya) {
      errors.push("DP tidak boleh lebih besar dari estimasi biaya");
    }
    
    if (dp < 0) {
      errors.push("DP tidak boleh negatif");
    }
    
    if (errors.length > 0) {
      toast({
        title: "Validasi Error",
        description: errors.join(", "),
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) return;
    
    // Validate form
    if (!validateForm()) return;
    
    setIsSubmitting(true);
  
    try {
      const submitData = {
        tanggal: convertDateToISO(formData.tanggal),
        brand_name: formData.brand_name?.trim() || null,
        jenis_motor: formData.jenis_motor?.trim() || null,
        warna: formData.warna?.trim() || null,
        plat_nomor: formData.plat_nomor?.trim() || null,
        tahun: formData.tahun ? parseInt(formData.tahun) : null,
        jenis_pengurusan: formData.jenis_pengurusan,
        keterangan: formData.keterangan?.trim() || null,
        estimasi_biaya: parseCurrency(formData.estimasi_biaya) || 0,
        estimasi_tanggal_selesai: convertDateToISO(formData.estimasi_tanggal_selesai),
        dp: parseCurrency(formData.dp) || 0,
        sisa: parseCurrency(formData.sisa) || 0,
        total_bayar: parseCurrency(formData.dp) || 0,
        rekening_tujuan_id: formData.rekening_tujuan_id ? parseInt(formData.rekening_tujuan_id) : null,
        status: formData.status,
      };

      if (editingBiroJasa) {
        const { error } = await supabase
          .from("biro_jasa")
          .update(submitData)
          .eq("id", editingBiroJasa.id);

        if (error) {
          console.error('Update error:', error);
          throw new Error(error.message || 'Gagal mengupdate data');
        }

        toast({
          title: "Berhasil",
          description: "Data biro jasa berhasil diupdate",
        });
      } else {
        const { data: insertedData, error } = await supabase
          .from("biro_jasa")
          .insert([submitData])
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw new Error(error.message || 'Gagal menyimpan data');
        }

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
    } catch (error: any) {
      console.error("Error saving data:", error);
      toast({
        title: "Error",
        description: error?.message || "Gagal menyimpan data. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (biroJasa: BiroJasaItem) => {
    setEditingBiroJasa(biroJasa);
    setFormData({
      tanggal: convertDateFromISO(biroJasa.tanggal),
      brand_name: biroJasa.brand_name || "",
      jenis_motor: biroJasa.jenis_motor || "",
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
      brand_id: "", // Always empty since we don't use brand_id
      brand_name: "",
      jenis_motor_id: "", // Always empty since we don't use jenis_motor_id
      jenis_motor: "",
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
    isSubmitting,
  };
};