import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency } from "@/utils/formatUtils";

interface PencatatanAssetFormData {
  tanggal: string;
  nama: string;
  nominal: string;
  sumber_dana_id: string;
  keterangan: string;
  jenis_transaksi: string; // Tambahkan field ini
}

interface PencatatanAssetItem {
  id: number;
  tanggal: string;
  nama: string;
  nominal: number;
  sumber_dana_id: number;
  keterangan?: string;
  divisi: string;
  cabang_id: number;
  created_at: string;
  updated_at: string;
  companies?: {
    nama_perusahaan: string;
  };
}

const getCurrentDate = (): string => {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear().toString();
  return `${day}/${month}/${year}`;
};

const convertDateToISO = (dateString: string): string => {
  if (!dateString) return new Date().toISOString().split('T')[0];
  
  const [day, month, year] = dateString.split('/');
  if (day && month && year) {
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
};

const convertDateFromISO = (isoString: string): string => {
  if (!isoString) return getCurrentDate();
  
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  return `${day}/${month}/${year}`;
};

export const usePencatatanAssetForm = (onSuccess: () => void, selectedDivision: string) => {
  const { toast } = useToast();
  const [editingAsset, setEditingAsset] = useState<PencatatanAssetItem | null>(null);

  const [formData, setFormData] = useState<PencatatanAssetFormData>({
    tanggal: getCurrentDate(),
    nama: '',
    nominal: '',
    sumber_dana_id: '',
    keterangan: '',
    jenis_transaksi: 'pengeluaran' // Default ke pengeluaran
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        tanggal: convertDateToISO(formData.tanggal),
        nama: formData.nama,
        nominal: parseCurrency(formData.nominal),
        sumber_dana_id: parseInt(formData.sumber_dana_id),
        keterangan: formData.keterangan,
        jenis_transaksi: formData.jenis_transaksi,
        divisi: selectedDivision,
        cabang_id: 1, // Default cabang
      };

      if (editingAsset) {
        // Update existing asset
        const { error } = await (supabase as any)
          .from('pencatatan_asset')
          .update(submitData)
          .eq('id', editingAsset.id);

        if (error) throw error;

        // Update modal perusahaan dan pembukuan untuk edit
        const assetAmount = parseCurrency(formData.nominal);
        if (assetAmount > 0 && formData.sumber_dana_id) {
          try {
            // 1. Restore modal lama dan update dengan modal baru
            const oldModalAmount = formData.jenis_transaksi === 'pengeluaran' ? editingAsset.nominal : -editingAsset.nominal;
            const newModalAmount = formData.jenis_transaksi === 'pengeluaran' ? -assetAmount : assetAmount;
            const totalModalChange = oldModalAmount + newModalAmount;

            const { error: modalError } = await supabase.rpc('update_company_modal', {
              company_id: parseInt(formData.sumber_dana_id),
              amount: totalModalChange
            });

            if (modalError) {
              console.error('Error updating company modal:', modalError);
              toast({
                title: "Warning",
                description: `Asset terupdate tapi modal gagal: ${modalError.message}`,
                variant: "destructive"
              });
            }
          } catch (modalUpdateError) {
            console.error('CATCH ERROR saat update modal:', modalUpdateError);
            toast({
              title: "Warning",
              description: "Asset terupdate tapi modal gagal",
              variant: "destructive"
            });
          }

          try {
            // 2. Update pembukuan entry
            const oldKeterangan = `Asset - ${editingAsset.nama}`;
            const newKeterangan = `${formData.jenis_transaksi === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan'} Asset - ${formData.nama}${formData.keterangan ? ` - ${formData.keterangan}` : ''}`;

            // Delete old pembukuan entry
            await supabase
              .from('pembukuan')
              .delete()
              .eq('keterangan', oldKeterangan)
              .eq('company_id', editingAsset.sumber_dana_id);

            // Insert new pembukuan entry
            const pembukuanEntry = {
              tanggal: convertDateToISO(formData.tanggal),
              divisi: selectedDivision,
              cabang_id: 1,
              keterangan: newKeterangan,
              debit: formData.jenis_transaksi === 'pengeluaran' ? assetAmount : 0,
              kredit: formData.jenis_transaksi === 'pemasukan' ? assetAmount : 0,
              saldo: 0,
              company_id: parseInt(formData.sumber_dana_id)
            };

            const { error: pembukuanError } = await supabase
              .from('pembukuan')
              .insert([pembukuanEntry]);

            if (pembukuanError) {
              console.error('Pembukuan Error:', pembukuanError);
              toast({
                title: "Warning",
                description: `Asset terupdate tapi pembukuan gagal: ${pembukuanError.message}`,
                variant: "destructive"
              });
            }
          } catch (pembukuanUpdateError) {
            console.error('CATCH ERROR saat update pembukuan:', pembukuanUpdateError);
            toast({
              title: "Warning",
              description: "Asset terupdate tapi pembukuan gagal",
              variant: "destructive"
            });
          }

          try {
            // 3. Update history
            const historyEntry = {
              asset_id: editingAsset.id,
              tanggal: convertDateToISO(formData.tanggal),
              nama: formData.nama,
              nominal: assetAmount,
              jenis_transaksi: formData.jenis_transaksi,
              sumber_dana_id: parseInt(formData.sumber_dana_id),
              keterangan: formData.keterangan,
              divisi: selectedDivision,
              cabang_id: 1,
              updated_at: new Date().toISOString()
            };

            const { error: historyError } = await supabase
              .from('pencatatan_asset_history')
              .upsert([historyEntry]);

            if (historyError) {
              console.error('History Error:', historyError);
              toast({
                title: "Warning",
                description: `Asset terupdate tapi history gagal: ${historyError.message}`,
                variant: "destructive"
              });
            }
          } catch (historyUpdateError) {
            console.error('CATCH ERROR saat update history:', historyUpdateError);
            toast({
              title: "Warning",
              description: "Asset terupdate tapi history gagal",
              variant: "destructive"
            });
          }
        }

        toast({
          title: "Berhasil",
          description: "Asset berhasil diupdate",
        });
      } else {
        // Create new asset
        const { data: insertedData, error } = await (supabase as any)
          .from('pencatatan_asset')
          .insert([submitData])
          .select();

        if (error) throw error;

        // PERBAIKAN: Update modal perusahaan dan mencatat ke pembukuan berdasarkan jenis transaksi
        const assetAmount = parseCurrency(formData.nominal);
        if (assetAmount > 0 && formData.sumber_dana_id && insertedData && insertedData.length > 0) {
          const assetId = insertedData[0].id;
          
          try {
            // 1. Update modal perusahaan berdasarkan jenis transaksi
            const modalAmount = formData.jenis_transaksi === 'pengeluaran' ? -assetAmount : assetAmount;
            const { error: modalError } = await supabase.rpc('update_company_modal', {
              company_id: parseInt(formData.sumber_dana_id),
              amount: modalAmount // Pengeluaran = kurangi modal, Pemasukan = tambah modal
            });

            if (modalError) {
              console.error('Error updating company modal:', modalError);
              toast({
                title: "Warning",
                description: `Asset tersimpan tapi gagal mengurangi modal perusahaan: ${modalError.message}`,
                variant: "destructive"
              });
            }
          } catch (modalUpdateError) {
            console.error('CATCH ERROR saat update modal:', modalUpdateError);
            toast({
              title: "Warning",
              description: "Asset tersimpan tapi gagal mengurangi modal perusahaan",
              variant: "destructive"
            });
          }

          try {
            // 2. Mencatat transaksi ke tabel pembukuan berdasarkan jenis transaksi
            const pembukuanEntry = {
              tanggal: convertDateToISO(formData.tanggal),
              divisi: selectedDivision,
              cabang_id: 1,
              keterangan: `${formData.jenis_transaksi === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan'} Asset - ${formData.nama}${formData.keterangan ? ` - ${formData.keterangan}` : ''}`,
              debit: formData.jenis_transaksi === 'pengeluaran' ? assetAmount : 0, // Pengeluaran = debit
              kredit: formData.jenis_transaksi === 'pemasukan' ? assetAmount : 0, // Pemasukan = kredit
              saldo: 0,
              company_id: parseInt(formData.sumber_dana_id)
            };

            const { error: pembukuanError } = await supabase
              .from('pembukuan')
              .insert([pembukuanEntry]);

            if (pembukuanError) {
              console.error('Pembukuan Error:', pembukuanError);
              toast({
                title: "Warning",
                description: `Asset tersimpan tapi pembukuan gagal: ${pembukuanError.message}`,
                variant: "destructive"
              });
            }
          } catch (pembukuanInsertError) {
            console.error('CATCH ERROR saat insert pembukuan:', pembukuanInsertError);
            toast({
              title: "Warning",
              description: "Asset tersimpan tapi pembukuan gagal",
              variant: "destructive"
            });
          }

          try {
            // 3. Simpan history ke tabel pencatatan_asset_history
            const historyEntry = {
              asset_id: assetId,
              tanggal: convertDateToISO(formData.tanggal),
              nama: formData.nama,
              nominal: assetAmount,
              jenis_transaksi: formData.jenis_transaksi,
              sumber_dana_id: parseInt(formData.sumber_dana_id),
              keterangan: formData.keterangan,
              divisi: selectedDivision,
              cabang_id: 1,
              created_at: new Date().toISOString()
            };

            const { error: historyError } = await supabase
              .from('pencatatan_asset_history')
              .insert([historyEntry]);

            if (historyError) {
              console.error('History Error:', historyError);
              toast({
                title: "Warning",
                description: `Asset tersimpan tapi history gagal: ${historyError.message}`,
                variant: "destructive"
              });
            }
          } catch (historyInsertError) {
            console.error('CATCH ERROR saat insert history:', historyInsertError);
            toast({
              title: "Warning",
              description: "Asset tersimpan tapi history gagal",
              variant: "destructive"
            });
          }
        }

        toast({
          title: "Berhasil",
          description: "Asset berhasil ditambahkan",
        });
      }
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (asset: PencatatanAssetItem) => {
    setEditingAsset(asset);
    setFormData({
      tanggal: convertDateFromISO(asset.tanggal),
      nama: asset.nama,
      nominal: formatCurrency(asset.nominal?.toString() || "0"),
      sumber_dana_id: asset.sumber_dana_id?.toString() || "",
      keterangan: asset.keterangan || "",
      jenis_transaksi: "pengeluaran" // Default, user bisa ubah
    });
  };

  const resetForm = () => {
    setFormData({
      tanggal: getCurrentDate(),
      nama: "",
      nominal: "0",
      sumber_dana_id: "",
      keterangan: "",
      jenis_transaksi: "pengeluaran"
    });
    setEditingAsset(null);
  };

  return {
    formData,
    setFormData,
    editingAsset,
    handleSubmit,
    handleEdit,
    resetForm,
  };
};