import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, parseFormattedNumber } from "@/utils/formatUtils";
import { AlertTriangle, DollarSign } from "lucide-react";

interface DpCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  penjualan: any;
  onConfirm: (data: DpCancellationData) => void;
  isLoading?: boolean;
}

export interface DpCancellationData {
  type: 'full_forfeit' | 'partial_refund';
  refund_amount?: number;
  forfeit_amount: number;
  reason: string;
  keterangan?: string;
}

const DpCancellationModal = ({
  isOpen,
  onClose,
  penjualan,
  onConfirm,
  isLoading = false
}: DpCancellationModalProps) => {
  const [cancellationType, setCancellationType] = useState<'full_forfeit' | 'partial_refund'>('full_forfeit');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const dpAmount = penjualan?.dp || 0;
  const refundAmountNum = parseFormattedNumber(refundAmount);
  const forfeitAmount = dpAmount - refundAmountNum;

  const handleReset = () => {
    setCancellationType('full_forfeit');
    setRefundAmount('');
    setReason('');
    setKeterangan('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      return;
    }

    const data: DpCancellationData = {
      type: cancellationType,
      forfeit_amount: cancellationType === 'full_forfeit' ? dpAmount : forfeitAmount,
      reason: reason.trim(),
      keterangan: keterangan.trim() || undefined
    };

    if (cancellationType === 'partial_refund') {
      data.refund_amount = refundAmountNum;
    }

    onConfirm(data);
  };

  const isValidRefund = cancellationType === 'full_forfeit' || 
    (refundAmountNum >= 0 && refundAmountNum <= dpAmount);

  const canSubmit = reason.trim() && isValidRefund;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Batalkan / Hanguskan DP
          </DialogTitle>
          <DialogDescription>
            Proses pembatalan DP untuk penjualan motor {penjualan?.brands?.name} - {penjualan?.jenis_motor?.jenis_motor}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informasi Penjualan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informasi Penjualan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Plat Nomor:</strong> {penjualan?.plat}</div>
                <div><strong>Tanggal:</strong> {new Date(penjualan?.tanggal).toLocaleDateString('id-ID')}</div>
                <div><strong>Harga Jual:</strong> {formatCurrency(penjualan?.harga_jual)}</div>
                <div><strong>DP Saat Ini:</strong> <span className="text-orange-600 font-semibold">{formatCurrency(dpAmount)}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Pilihan Tipe Pembatalan */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Pilih Tipe Pembatalan DP</Label>
            <RadioGroup value={cancellationType} onValueChange={(value: any) => setCancellationType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full_forfeit" id="full_forfeit" />
                <Label htmlFor="full_forfeit" className="flex-1">
                  <div>
                    <div className="font-medium">DP Hangus Sepenuhnya</div>
                    <div className="text-sm text-muted-foreground">
                      Seluruh DP ({formatCurrency(dpAmount)}) masuk sebagai modal perusahaan
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial_refund" id="partial_refund" />
                <Label htmlFor="partial_refund" className="flex-1">
                  <div>
                    <div className="font-medium">Sebagian DP Dikembalikan</div>
                    <div className="text-sm text-muted-foreground">
                      Sebagian DP dikembalikan ke customer, sisanya masuk modal perusahaan
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Input Jumlah Pengembalian */}
          {cancellationType === 'partial_refund' && (
            <div className="space-y-2">
              <Label htmlFor="refund_amount">Jumlah DP yang Dikembalikan ke Customer</Label>
              <Input
                id="refund_amount"
                placeholder="Masukkan jumlah pengembalian"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className={!isValidRefund ? "border-red-500" : ""}
              />
              {refundAmount && (
                <div className="text-sm space-y-1">
                  <div className="text-muted-foreground">
                    • Dikembalikan ke customer: <span className="text-red-600 font-medium">{formatCurrency(refundAmountNum)}</span>
                  </div>
                  <div className="text-muted-foreground">
                    • Masuk modal perusahaan: <span className="text-green-600 font-medium">{formatCurrency(forfeitAmount)}</span>
                  </div>
                </div>
              )}
              {!isValidRefund && refundAmount && (
                <p className="text-sm text-red-600">
                  Jumlah pengembalian tidak boleh melebihi total DP ({formatCurrency(dpAmount)})
                </p>
              )}
            </div>
          )}

          {/* Alasan Pembatalan */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="required">Alasan Pembatalan DP *</Label>
            <Textarea
              id="reason"
              placeholder="Masukkan alasan pembatalan DP (wajib diisi)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Keterangan Tambahan */}
          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan Tambahan</Label>
            <Textarea
              id="keterangan"
              placeholder="Keterangan tambahan (opsional)"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
            />
          </div>

          {/* Summary */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">Ringkasan Dampak Keuangan</span>
              </div>
              <div className="space-y-2 text-sm">
                {cancellationType === 'full_forfeit' ? (
                  <>
                    <div className="flex justify-between">
                      <span>Modal perusahaan bertambah:</span>
                      <span className="text-green-600 font-medium">+{formatCurrency(dpAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pengembalian ke customer:</span>
                      <span className="text-muted-foreground">Rp 0</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>Modal perusahaan bertambah:</span>
                      <span className="text-green-600 font-medium">+{formatCurrency(forfeitAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pengembalian ke customer:</span>
                      <span className="text-red-600 font-medium">-{formatCurrency(refundAmountNum)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Pembukuan (Debit):</span>
                      <span className="text-red-600 font-medium">{formatCurrency(refundAmountNum)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit || isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? "Memproses..." : "Konfirmasi Pembatalan DP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DpCancellationModal;