import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency } from "@/utils/formatUtils";
import { Clock, Trash2, AlertCircle } from "lucide-react";
import { usePriceHistories } from "./hooks/usePriceHistories";
import { useDeletePriceHistory } from "./hooks/useDeletePriceHistory";

interface PriceHistoryViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  penjualan: any;
}

const PriceHistoryViewModal = ({
  isOpen,
  onClose,
  penjualan,
}: PriceHistoryViewModalProps) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: priceHistories = [], isLoading } = usePriceHistories(
    penjualan?.pembelian_id,
    isOpen
  );
  const deleteMutation = useDeletePriceHistory();

  const handleDeleteClick = (historyId: number) => {
    setDeleteConfirmId(historyId);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId, {
        onSuccess: () => {
          setDeleteConfirmId(null);
        },
      });
    }
  };

  if (!penjualan) return null;

  const hargaBeliAwal =
    (penjualan.harga_beli || 0) - (penjualan.biaya_lain_lain || 0);
  const totalBiayaTambahan = penjualan.biaya_lain_lain || 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Riwayat Harga Motor
            </DialogTitle>
            <DialogDescription>
              {penjualan.brands?.name} {penjualan.jenis_motor?.jenis_motor} -{" "}
              {penjualan.plat}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Harga Saat Ini */}
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 text-blue-900">
                  Harga Saat Ini
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Harga Beli:</span>
                    <div className="font-semibold text-blue-600">
                      {formatCurrency(penjualan.harga_beli)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Harga Jual:</span>
                    <div className="font-semibold text-blue-600">
                      {formatCurrency(penjualan.harga_jual)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Keuntungan:</span>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(penjualan.keuntungan)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Divisi:</span>
                    <div className="font-semibold">{penjualan.divisi}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Riwayat Update Harga */}
            <div>
              <h4 className="font-semibold mb-3">Riwayat Update Harga</h4>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </div>
              ) : priceHistories.length === 0 ? (
                <Card className="bg-gray-50">
                  <CardContent className="p-6 text-center text-muted-foreground flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Tidak ada riwayat update harga
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {priceHistories.map((history, index) => (
                    <Card
                      key={history.id}
                      className="border-l-4 border-l-orange-300"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-sm text-gray-900">
                              Update #{priceHistories.length - index}
                            </h5>
                            <p className="text-xs text-muted-foreground">
                              {new Date(
                                history.tanggal_update
                              ).toLocaleDateString("id-ID", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(history.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">
                              Harga Beli Lama:
                            </span>
                            <div className="font-medium">
                              {formatCurrency(history.harga_beli_lama)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Harga Beli Baru:
                            </span>
                            <div className="font-medium text-blue-600">
                              {formatCurrency(history.harga_beli_baru)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Selisih:
                            </span>
                            <div
                              className={`font-medium ${
                                history.harga_beli_baru -
                                  history.harga_beli_lama >
                                0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {formatCurrency(
                                history.harga_beli_baru -
                                  history.harga_beli_lama
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-3">
                          <h6 className="text-xs font-semibold text-gray-700 mb-2">
                            Detail Biaya:
                          </h6>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {history.biaya_qc > 0 && (
                              <div className="bg-orange-50 p-2 rounded">
                                <span className="text-muted-foreground">
                                  Biaya QC:
                                </span>
                                <div className="font-medium">
                                  {formatCurrency(history.biaya_qc)}
                                </div>
                              </div>
                            )}
                            {history.biaya_pajak > 0 && (
                              <div className="bg-orange-50 p-2 rounded">
                                <span className="text-muted-foreground">
                                  Biaya Pajak:
                                </span>
                                <div className="font-medium">
                                  {formatCurrency(history.biaya_pajak)}
                                </div>
                              </div>
                            )}
                            {history.biaya_lain_lain > 0 && (
                              <div className="bg-orange-50 p-2 rounded">
                                <span className="text-muted-foreground">
                                  Biaya Lain:
                                </span>
                                <div className="font-medium">
                                  {formatCurrency(history.biaya_lain_lain)}
                                </div>
                              </div>
                            )}
                          </div>

                          {history.keterangan_biaya_lain && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              {history.keterangan_biaya_lain}
                            </p>
                          )}
                        </div>

                        {history.reason && (
                          <div className="mt-3 pt-3 border-t bg-gray-50 p-2 rounded text-xs">
                            <span className="text-muted-foreground">
                              Alasan Update:
                            </span>
                            <p className="text-gray-700 mt-1">
                              {history.reason}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Riwayat Harga?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus riwayat harga ini? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PriceHistoryViewModal;
