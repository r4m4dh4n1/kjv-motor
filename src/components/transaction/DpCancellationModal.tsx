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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Batalkan DP
          </DialogTitle>
          <DialogDescription>
            {penjualan?.brands?.name} - {penjualan?.plat}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informasi DP */}
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">DP Saat Ini:</span>
              <span className="text-orange-600 font-bold text-lg">{formatCurrency(dpAmount)}</span>
            </div>
          </div>

          {/* Pilihan Tipe Pembatalan */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipe Pembatalan</Label>
            <RadioGroup value={cancellationType} onValueChange={(value: any) => setCancellationType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full_forfeit" id="full_forfeit" />
                <Label htmlFor="full_forfeit" className="text-sm">
                  DP Hangus Sepenuhnya (Tidak ada pembukuan)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial_refund" id="partial_refund" />
                <Label htmlFor="partial_refund" className="text-sm">
                  Sebagian DP Dikembalikan
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Input Jumlah Pengembalian */}
          {cancellationType === 'partial_refund' && (
            <div className="space-y-2">
              <Label htmlFor="refund_amount" className="text-sm">Jumlah Dikembalikan</Label>
              <Input
                id="refund_amount"
                placeholder="0"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className={!isValidRefund ? "border-red-500" : ""}
              />
              {refundAmount && isValidRefund && (
                <div className="text-xs bg-blue-50 p-2 rounded">
                  <div>Dikembalikan: <span className="text-red-600 font-medium">{formatCurrency(refundAmountNum)}</span></div>
                  <div>Sisa hangus: <span className="text-green-600 font-medium">{formatCurrency(forfeitAmount)}</span></div>
                </div>
              )}
              {!isValidRefund && refundAmount && (
                <p className="text-xs text-red-600">
                  Maksimal {formatCurrency(dpAmount)}
                </p>
              )}
            </div>
          )}

          {/* Alasan */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm">Alasan *</Label>
            <Textarea
              id="reason"
              placeholder="Alasan pembatalan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-2">
            <Label htmlFor="keterangan" className="text-sm">Keterangan</Label>
            <Textarea
              id="keterangan"
              placeholder="Keterangan tambahan..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
            />
          </div>

          {/* Summary kompak */}
          {cancellationType === 'partial_refund' && refundAmountNum > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-xs">
              <div className="font-medium mb-1">Dampak:</div>
              <div>• Modal berkurang: {formatCurrency(refundAmountNum)}</div>
              <div>• Pembukuan debit: {formatCurrency(refundAmountNum)}</div>
            </div>
          )}
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