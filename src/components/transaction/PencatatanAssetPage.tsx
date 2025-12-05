import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import { PencatatanAssetForm } from "./PencatatanAssetForm";
import { PencatatanAssetTable } from "./PencatatanAssetTable";
import { usePencatatanAssetData } from "./hooks/usePencatatanAssetData";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseFormattedNumber } from "@/utils/formatUtils";

interface PencatatanAssetPageProps {
  selectedDivision: string;
}

interface FormData {
  tanggal: string;
  nama: string;
  nominal: string;
  sumber_dana_id: string;
  keterangan: string;
  jenis_transaksi: string;
}

const initialFormData: FormData = {
  tanggal: "",
  nama: "",
  nominal: "",
  sumber_dana_id: "",
  keterangan: "",
  jenis_transaksi: "pengeluaran",
};

export const PencatatanAssetPage = ({ selectedDivision }: PencatatanAssetPageProps) => {
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: assetData = [], isLoading, refetch } = usePencatatanAssetData(selectedDivision);

  // Convert tanggal from dd/mm/yyyy to yyyy-mm-dd
  const convertToDBDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Convert tanggal from yyyy-mm-dd to dd/mm/yyyy
  const convertToDisplayDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const nominal = parseFormattedNumber(data.nominal);
      const sumberDanaId = parseInt(data.sumber_dana_id);
      
      // 1. Insert data asset
      const { data: insertedAsset, error: insertError } = await supabase
        .from("pencatatan_asset")
        .insert([
          {
            tanggal: convertToDBDate(data.tanggal),
            nama: data.nama,
            nominal: nominal,
            sumber_dana_id: sumberDanaId,
            keterangan: data.keterangan || null,
            jenis_transaksi: data.jenis_transaksi,
            divisi: selectedDivision,
            cabang_id: 1,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Update modal perusahaan
      if (sumberDanaId && nominal > 0) {
        let modalAmount = 0;
        
        if (data.jenis_transaksi === "pengeluaran") {
          // Pengeluaran: kurangi modal perusahaan
          modalAmount = -nominal;
        } else if (data.jenis_transaksi === "pemasukan") {
          // Pemasukan: tambah modal perusahaan
          modalAmount = nominal;
        }

        const { error: modalError } = await supabase.rpc("update_company_modal", {
          company_id: sumberDanaId,
          amount: modalAmount,
        });

        if (modalError) {
          console.error("Error updating company modal:", modalError);
          toast({
            title: "Warning",
            description: `Asset tersimpan tapi modal perusahaan gagal terupdate: ${modalError.message}`,
            variant: "destructive",
          });
        }
      }

      // 3. Create pembukuan entry
      const keterangan = `${
        data.jenis_transaksi === "pengeluaran" ? "Pengeluaran" : "Pemasukan"
      } Asset - ${data.nama}${data.keterangan ? ": " + data.keterangan : ""}`;

      const { error: pembukuanError } = await supabase.from("pembukuan").insert([
        {
          tanggal: convertToDBDate(data.tanggal),
          divisi: selectedDivision,
          cabang_id: 1,
          keterangan: keterangan,
          debit: data.jenis_transaksi === "pengeluaran" ? nominal : 0,
          kredit: data.jenis_transaksi === "pemasukan" ? nominal : 0,
          saldo: 0,
          company_id: sumberDanaId,
        },
      ]);

      if (pembukuanError) {
        console.error("Error creating pembukuan entry:", pembukuanError);
        toast({
          title: "Warning",
          description: `Asset tersimpan tapi pembukuan gagal: ${pembukuanError.message}`,
          variant: "destructive",
        });
      }

      return insertedAsset;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Data asset berhasil disimpan dan modal perusahaan terupdate",
      });
      handleCancel();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menyimpan data asset",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const nominal = parseFormattedNumber(data.nominal);
      
      const { error } = await supabase
        .from("pencatatan_asset")
        .update({
          tanggal: convertToDBDate(data.tanggal),
          nama: data.nama,
          nominal: nominal,
          sumber_dana_id: parseInt(data.sumber_dana_id),
          keterangan: data.keterangan || null,
          jenis_transaksi: data.jenis_transaksi,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Data asset berhasil diupdate",
      });
      handleCancel();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate data asset",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (asset: any) => {
    setIsEditing(true);
    setEditingId(asset.id);
    setFormData({
      tanggal: convertToDisplayDate(asset.tanggal),
      nama: asset.nama,
      nominal: asset.nominal.toString(),
      sumber_dana_id: asset.sumber_dana_id.toString(),
      keterangan: asset.keterangan || "",
      jenis_transaksi: asset.jenis_transaksi || "pengeluaran",
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-8 h-8 text-primary" />
            Pencatatan Asset
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola pencatatan asset perusahaan seperti kasbon, stargazer, sewa ruko, dll
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Tambah Asset
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Asset" : "Tambah Asset Baru"}</CardTitle>
          </CardHeader>
          <CardContent>
            <PencatatanAssetForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEditing={isEditing}
              selectedDivision={selectedDivision}
            />
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Nominal Asset
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(
                  assetData.reduce((sum, item) => sum + item.nominal, 0)
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total dari {assetData.length} asset
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <PencatatanAssetTable
        data={assetData}
        onEdit={handleEdit}
        onRefetch={refetch}
      />
    </div>
  );
};

export default PencatatanAssetPage;
