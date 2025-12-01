import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatUtils";
import { Clock, DollarSign, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDeletePriceHistory } from "./hooks/useDeletePriceHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pembelian?: any;
  penjualan?: any;
}

const PriceHistoryModal = ({
  isOpen,
  onClose,
  pembelian,
  penjualan
}: PriceHistoryModalProps) => {
  const data = pembelian || penjualan;
  const isPenjualan = !!penjualan;
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<any>(null);
  
  const { deletePriceHistory, isDeleting } = useDeletePriceHistory();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch price history from price_histories_pembelian table
  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      let query = supabase.from('price_histories_pembelian').select('*, companies(nama_perusahaan)');
      
      if (isPenjualan && data.pembelian_id) {
        // For penjualan, use pembelian_id to get history
        query = query.eq('pembelian_id', data.pembelian_id);
      } else if (pembelian) {
        // For pembelian, use the pembelian id directly
        query = query.eq('pembelian_id', data.id);
      }
      
      const { data: historyData, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching price history:', error);
        setPriceHistory([]);
      } else {
        setPriceHistory(historyData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setPriceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !data) return;
    fetchPriceHistory();
  }, [isOpen, data, isPenjualan, pembelian]);

  const handleDeleteClick = (history: any) => {
    setHistoryToDelete(history);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!historyToDelete) return;

    const pembelianId = isPenjualan ? data.pembelian_id : data.id;
    const totalBiaya = 
      (historyToDelete.biaya_qc || 0) + 
      (historyToDelete.biaya_pajak || 0) + 
      (historyToDelete.biaya_lain_lain || 0);

    await deletePriceHistory({
      historyId: historyToDelete.id,
      pembelianId: pembelianId,
      companyId: historyToDelete.company_id,
      totalBiaya: totalBiaya,
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setHistoryToDelete(null);
        fetchPriceHistory(); // Refresh the list
      },
    });
  };

  if (!data) return null;

  // Calculate current and total additional costs from price history
  const totalBiayaTambahan = priceHistory.reduce((sum, history) => {
    return sum + (history.biaya_qc || 0) + (history.biaya_pajak || 0) + (history.biaya_lain_lain || 0);
  }, 0);
  
  const currentHargaBeli = isPenjualan ? (data?.harga_beli || 0) : (data?.harga_beli || 0);
  const originalHargaBeli = currentHargaBeli - totalBiayaTambahan;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Riwayat Update Harga
            </DialogTitle>
            <DialogDescription>
              {data?.brands?.name} - {data?.jenis_motor?.jenis_motor} | {isPenjualan ? data?.plat : data?.plat_nomor}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Status */}
            <Card className="bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Status Harga Saat Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {isPenjualan ? 'Harga Beli Awal:' : 'Harga Beli:'}
                    </span>
                    <div className="font-medium text-green-600">
                      {formatCurrency(originalHargaBeli)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {isPenjualan ? 'Harga Jual:' : 'Harga Final:'}
                    </span>
                    <div className="font-medium text-blue-600">
                      {formatCurrency(isPenjualan ? (data?.harga_jual || 0) : (data?.harga_final || 0))}
                    </div>
                  </div>
                  {isPenjualan && (
                    <>
                  <div>
                    <span className="text-muted-foreground">Total Biaya Tambahan:</span>
                    <div className="font-medium text-red-600">
                      {formatCurrency(totalBiayaTambahan)}
                    </div>
                  </div>
                      <div>
                        <span className="text-muted-foreground">Keuntungan Akhir:</span>
                        <div className="font-medium text-purple-600">
                          {formatCurrency(data?.keuntungan || 0)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Update History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Riwayat Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Impact */}
            {totalBiayaTambahan > 0 && (
              <Card className="bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-orange-800">
                    Ringkasan Total Update
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Harga beli awal:</span>
                    <span className="font-medium">
                      {formatCurrency(originalHargaBeli)}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Total biaya tambahan:</span>
                    <span className="font-medium">+{formatCurrency(totalBiayaTambahan)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Harga beli akhir:</span>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(currentHargaBeli)}
                    </span>
                  </div>
                  {isPenjualan && (
                    <div className="flex justify-between">
                      <span className="font-medium">Keuntungan akhir:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(data?.keuntungan || 0)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Riwayat Harga?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Menghapus riwayat harga dari database</li>
                <li>Menghapus entry dari pembukuan</li>
                <li>Mengembalikan modal ke company (jika ada)</li>
                <li>Update harga final pembelian</li>
              </ul>
              <p className="mt-2 font-medium text-red-600">
                Tindakan ini tidak dapat dibatalkan!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PriceHistoryModal;