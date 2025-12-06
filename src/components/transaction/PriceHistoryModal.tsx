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
import { Clock, DollarSign, FileText, Trash2, Loader2 } from "lucide-react";
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
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
                    Memuat data...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {priceHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Belum ada riwayat update harga
                      </div>
                    ) : (
                      priceHistory.map((history) => (
                        <div
                          key={history.id}
                          className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50/50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {format(
                                  new Date(history.tanggal_update || history.created_at),
                                  "dd MMMM yyyy",
                                  { locale: id }
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {history.reason}
                              </div>
                              {/* Tampilkan Perusahaan (Sumber Dana) */}
                              {history.companies?.nama_perusahaan && (
                                <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                                  Sumber Dana: {history.companies.nama_perusahaan}
                                </div>
                              )}
                            </div>
                            <div className="text-right space-y-1">
                              <div className="text-sm font-bold text-blue-600">
                                {formatCurrency(history.harga_beli_baru)}
                              </div>
                              <div className="text-xs text-muted-foreground line-through">
                                {formatCurrency(history.harga_beli_lama)}
                              </div>
                            </div>
                          </div>

                          {/* Detail Biaya */}
                          {(history.biaya_qc > 0 ||
                            history.biaya_pajak > 0 ||
                            history.biaya_lain_lain > 0) && (
                            <div className="mt-2 pt-2 border-t text-xs space-y-1">
                              {history.biaya_qc > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Biaya QC:</span>
                                  <span>+{formatCurrency(history.biaya_qc)}</span>
                                </div>
                              )}
                              {history.biaya_pajak > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Pajak:</span>
                                  <span>+{formatCurrency(history.biaya_pajak)}</span>
                                </div>
                              )}
                              {history.biaya_lain_lain > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                  <span>
                                    Lain-lain
                                    {history.keterangan_biaya_lain &&
                                      ` (${history.keterangan_biaya_lain})`}
                                    :
                                  </span>
                                  <span>
                                    +{formatCurrency(history.biaya_lain_lain)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Tombol Hapus */}
                          <div className="flex justify-end mt-2 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(history)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Hapus
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
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