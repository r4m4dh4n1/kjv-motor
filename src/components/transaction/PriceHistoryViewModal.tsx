import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatUtils";
import { Clock, TrendingUp, DollarSign, FileText, Info } from "lucide-react";

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
  if (!penjualan) return null;

  const hargaBeliAwal = (penjualan.harga_beli || 0) - (penjualan.biaya_lain_lain || 0);
  const totalBiayaTambahan = penjualan.biaya_lain_lain || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Detail Harga Motor
          </DialogTitle>
          <DialogDescription>
            Breakdown harga untuk {penjualan.brands?.name} {penjualan.jenis_motor?.jenis_motor} - {penjualan.plat}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Motor Info */}
          <Card className="bg-gradient-to-r from-gray-50 to-slate-50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 text-gray-900">Informasi Motor</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Brand:</span>
                  <div className="font-medium">{penjualan.brands?.name}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Jenis:</span>
                  <div className="font-medium">{penjualan.jenis_motor?.jenis_motor}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Plat Nomor:</span>
                  <div className="font-medium">{penjualan.plat}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Tahun:</span>
                  <div className="font-medium">{penjualan.tahun}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Breakdown - Pembelian */}
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
                <DollarSign className="w-4 h-4" />
                Harga Pembelian
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Harga Beli Awal:</span>
                  <span className="font-semibold text-lg">{formatCurrency(hargaBeliAwal)}</span>
                </div>
                
                {totalBiayaTambahan > 0 && (
                  <>
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-orange-700">Biaya Tambahan:</span>
                        <span className="font-semibold text-orange-600">{formatCurrency(totalBiayaTambahan)}</span>
                      </div>
                      
                      {penjualan.biaya_qc > 0 && (
                        <div className="flex justify-between text-sm pl-4">
                          <span className="text-muted-foreground">• Biaya QC:</span>
                          <span>{formatCurrency(penjualan.biaya_qc)}</span>
                        </div>
                      )}
                      
                      {penjualan.biaya_pajak > 0 && (
                        <div className="flex justify-between text-sm pl-4">
                          <span className="text-muted-foreground">• Biaya Pajak:</span>
                          <span>{formatCurrency(penjualan.biaya_pajak)}</span>
                        </div>
                      )}
                      
                      {(penjualan.biaya_lain_lain - (penjualan.biaya_qc || 0) - (penjualan.biaya_pajak || 0)) > 0 && (
                        <div className="flex justify-between text-sm pl-4">
                          <span className="text-muted-foreground">• Biaya Lain-lain:</span>
                          <span>{formatCurrency(penjualan.biaya_lain_lain - (penjualan.biaya_qc || 0) - (penjualan.biaya_pajak || 0))}</span>
                        </div>
                      )}
                      
                      {penjualan.keterangan_biaya_lain && (
                        <div className="text-xs text-muted-foreground italic pl-4 mt-1">
                          Keterangan: {penjualan.keterangan_biaya_lain}
                        </div>
                      )}
                    </div>

                    <div className="border-t pt-2 bg-green-50 -mx-4 px-4 py-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Harga Beli:</span>
                        <span className="font-bold text-lg text-green-700">{formatCurrency(penjualan.harga_beli)}</span>
                      </div>
                    </div>
                  </>
                )}
                
                {totalBiayaTambahan === 0 && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <Info className="w-4 h-4" />
                    Tidak ada biaya tambahan
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Price Breakdown - Penjualan */}
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-700">
                <TrendingUp className="w-4 h-4" />
                Harga Penjualan
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Harga Jual:</span>
                  <span className="font-semibold text-lg text-blue-600">{formatCurrency(penjualan.harga_jual)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Harga Bayar:</span>
                  <span className="font-semibold text-lg">{formatCurrency(penjualan.harga_bayar || penjualan.harga_jual)}</span>
                </div>
                
                {penjualan.dp > 0 && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">DP:</span>
                    <span>{formatCurrency(penjualan.dp)}</span>
                  </div>
                )}
                
                {penjualan.sisa_bayar > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sisa Bayar:</span>
                    <span className="text-orange-600">{formatCurrency(penjualan.sisa_bayar)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profit Summary */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-green-900">Keuntungan</h4>
                  <p className="text-xs text-muted-foreground">Harga Jual - Total Harga Beli</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-2xl text-green-700 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    {formatCurrency(penjualan.keuntungan)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Reason if exists */}
          {penjualan.reason_update_harga && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-900">
                  <FileText className="w-4 h-4" />
                  Catatan Update Harga
                </h4>
                <p className="text-sm text-muted-foreground">{penjualan.reason_update_harga}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryViewModal;
