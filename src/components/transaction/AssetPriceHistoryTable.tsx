import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { History, Edit, Trash2 } from "lucide-react";
import { EnhancedTable, DateCell, CurrencyCell, TextCell, ActionCell } from "./EnhancedTable";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AssetPriceHistoryItem {
  id: number;
  asset_id: number;
  nama_asset: string;
  harga_lama: number;
  harga_baru: number;
  selisih: number;
  alasan: string;
  tanggal_update: string;
  divisi: string;
  created_at: string;
  updated_at: string;
}

interface AssetPriceHistoryTableProps {
  selectedDivision: string;
}

export const AssetPriceHistoryTable = ({ selectedDivision }: AssetPriceHistoryTableProps) => {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingHistory, setEditingHistory] = useState<AssetPriceHistoryItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    alasan: "",
    harga_baru: ""
  });

  // Fetch price history data
  const { data: priceHistory, isLoading, error, refetch } = useQuery({
    queryKey: ["asset_price_history", selectedDivision],
    queryFn: async (): Promise<AssetPriceHistoryItem[]> => {
      const { data, error } = await supabase
        .from("asset_price_history")
        .select("*")
        .eq("divisi", selectedDivision)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Update price history mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: any }) => {
      const { error } = await supabase
        .from("asset_price_history")
        .update({
          alasan: formData.alasan,
          harga_baru: parseFloat(formData.harga_baru.replace(/[^\d]/g, '')),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "History harga asset berhasil diupdate",
      });
      setEditDialogOpen(false);
      setEditingHistory(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate history harga asset",
        variant: "destructive",
      });
    }
  });

  // Delete price history mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("asset_price_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "History harga asset berhasil dihapus",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus history harga asset",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (history: AssetPriceHistoryItem) => {
    setEditingHistory(history);
    setEditFormData({
      alasan: history.alasan,
      harga_baru: new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(history.harga_baru)
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus history harga asset ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHistory) {
      updateMutation.mutate({
        id: editingHistory.id,
        formData: editFormData
      });
    }
  };

  const handleCurrencyChange = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^\d]/g, '');
    const formattedValue = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(parseInt(numericValue) || 0);
    
    setEditFormData(prev => ({ ...prev, harga_baru: formattedValue }));
  };

  const columns = [
    {
      key: "tanggal_update",
      header: "Tanggal Update",
      render: (value: string) => <DateCell date={value} />
    },
    {
      key: "nama_asset",
      header: "Nama Asset",
      render: (value: string) => <TextCell text={value} className="font-medium" />
    },
    {
      key: "harga_lama",
      header: "Harga Lama",
      render: (value: number) => <CurrencyCell amount={value} />
    },
    {
      key: "harga_baru",
      header: "Harga Baru",
      render: (value: number) => <CurrencyCell amount={value} />
    },
    {
      key: "selisih",
      header: "Selisih",
      render: (value: number) => (
        <CurrencyCell 
          amount={value} 
          className={value >= 0 ? "text-green-600" : "text-red-600"}
        />
      )
    },
    {
      key: "alasan",
      header: "Alasan",
      render: (value: string) => <TextCell text={value || "-"} />
    }
  ];

  const actions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: handleEdit,
      variant: "outline" as const
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (row: AssetPriceHistoryItem) => handleDelete(row.id),
      variant: "outline" as const
    }
  ];

  if (isLoading) return <div>Loading price history...</div>;
  if (error) return <div>Error loading price history: {error.message}</div>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>History Update Harga Asset</CardTitle>
          <CardDescription>
            Riwayat perubahan harga asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedTable
            title="History Update Harga Asset"
            subtitle="Riwayat perubahan harga asset"
            data={priceHistory || []}
            columns={columns}
            actions={actions}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit History Harga Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="alasan">Alasan Update</Label>
              <Textarea
                id="alasan"
                value={editFormData.alasan}
                onChange={(e) => setEditFormData(prev => ({ ...prev, alasan: e.target.value }))}
                placeholder="Masukkan alasan update harga"
                required
              />
            </div>
            <div>
              <Label htmlFor="harga_baru">Harga Baru</Label>
              <Input
                id="harga_baru"
                value={editFormData.harga_baru}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                placeholder="Masukkan harga baru"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
