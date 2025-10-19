import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Trash2, History } from "lucide-react";
import { EnhancedTable, DateCell, CurrencyCell, TextCell, ActionCell } from "./EnhancedTable";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface PencatatanAssetTableProps {
  data: PencatatanAssetItem[];
  onEdit: (asset: PencatatanAssetItem) => void;
  onRefetch: () => void;
}

export const PencatatanAssetTable = ({ data, onEdit, onRefetch }: PencatatanAssetTableProps) => {
  const { toast } = useToast();
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedAssetName, setSelectedAssetName] = useState<string>("");

  // Query untuk mengambil history per asset
  const { data: assetHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["asset_history", selectedAssetName],
    queryFn: async () => {
      if (!selectedAssetName) return [];
      
      const { data, error } = await supabase
        .from("pencatatan_asset_history")
        .select(`
          *,
          companies:company_id (
            nama_perusahaan
          )
        `)
        .eq("nama", selectedAssetName)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAssetName
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // 1. Ambil data asset yang akan dihapus
      const assetToDelete = data.find(item => item.id === id);
      if (!assetToDelete) throw new Error("Asset tidak ditemukan");

      // 2. Kembalikan modal ke company (sumber dana)
      if (assetToDelete.sumber_dana_id && assetToDelete.nominal > 0) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: assetToDelete.sumber_dana_id,
          amount: assetToDelete.nominal // Kembalikan nominal asset
        });

        if (modalError) {
          console.error('Error returning modal to company:', modalError);
          throw modalError;
        }
      }

      // 3. Hapus data asset
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Data asset berhasil dihapus dan modal company dikembalikan",
      });
      onRefetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus data asset",
        variant: "destructive",
      });
      console.error('Error deleting asset:', error);
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus asset ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleShowHistory = (assetName: string) => {
    setSelectedAssetName(assetName);
    setHistoryDialogOpen(true);
  };

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (value: string) => <DateCell date={value} />
    },
    {
      key: "nama", 
      header: "Nama Asset",
      render: (value: string) => <TextCell text={value} className="font-medium" />
    },
    {
      key: "nominal",
      header: "Nominal", 
      render: (value: number) => <CurrencyCell amount={value} />
    },
    {
      key: "companies.nama_perusahaan",
      header: "Sumber Dana",
      render: (value: string) => <TextCell text={value || "-"} />
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (value: string) => <TextCell text={value || "-"} />
    }
  ];

  const actions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: onEdit,
      variant: "outline" as const
    },
    {
      label: "History",
      icon: History,
      onClick: (row: PencatatanAssetItem) => handleShowHistory(row.nama),
      variant: "outline" as const
    },
    {
      label: "Delete", 
      icon: Trash2,
      onClick: (row: PencatatanAssetItem) => handleDelete(row.id),
      variant: "outline" as const
    }
  ];

  // Hitung total nilai asset saat ini
  const calculateCurrentAssetValue = () => {
    if (!assetHistory) return 0;
    
    let total = 0;
    assetHistory.forEach(entry => {
      if (entry.jenis_transaksi === 'pengeluaran') {
        total -= entry.nominal;
      } else if (entry.jenis_transaksi === 'pemasukan') {
        total += entry.nominal;
      }
    });
    return total;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Data Pencatatan Asset</CardTitle>
          <CardDescription>
            Daftar semua asset yang telah dicatat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedTable
            title="Data Pencatatan Asset"
            subtitle="Daftar semua asset yang telah dicatat"
            data={data}
            columns={columns}
            actions={actions}
          />
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              History Asset: {selectedAssetName}
            </DialogTitle>
          </DialogHeader>
          
          {historyLoading ? (
            <div className="text-center py-8">Loading history...</div>
          ) : (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ringkasan Asset</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Transaksi</p>
                      <p className="text-2xl font-bold">{assetHistory?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nilai Asset Saat Ini</p>
                      <p className={`text-2xl font-bold ${calculateCurrentAssetValue() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0
                        }).format(calculateCurrentAssetValue())}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Transaksi</CardTitle>
                </CardHeader>
                <CardContent>
                  {assetHistory && assetHistory.length > 0 ? (
                    <div className="space-y-2">
                      {assetHistory.map((entry, index) => (
                        <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div className="text-sm text-muted-foreground">
                                {new Date(entry.created_at).toLocaleDateString('id-ID')}
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                entry.jenis_transaksi === 'pengeluaran' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {entry.jenis_transaksi === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan'}
                              </div>
                              <div className="text-sm">
                                {entry.companies?.nama_perusahaan || 'Unknown Company'}
                              </div>
                            </div>
                            {entry.keterangan && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {entry.keterangan}
                              </div>
                            )}
                          </div>
                          <div className={`text-lg font-bold ${
                            entry.jenis_transaksi === 'pengeluaran' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {entry.jenis_transaksi === 'pengeluaran' ? '-' : '+'}
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                              minimumFractionDigits: 0
                            }).format(entry.nominal)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Belum ada history untuk asset ini
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};