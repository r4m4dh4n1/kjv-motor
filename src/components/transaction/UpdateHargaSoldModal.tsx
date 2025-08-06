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
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, parseFormattedNumber } from "@/utils/formatUtils";
import { AlertTriangle, DollarSign, TrendingDown } from "lucide-react";

interface UpdateHargaSoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  penjualan: any;
  onConfirm: (data: UpdateHargaSoldData) => void;
  isLoading?: boolean;
}

export interface UpdateHargaSoldData {
  biaya_tambahan: number;
  reason: string;
  keterangan?: string;
}

const UpdateHargaSoldModal = ({
  isOpen,
  onClose,
  penjualan,
  onConfirm,
  isLoading = false
}: UpdateHargaSoldModalProps) => {
  const [biayaTambahan, setBiayaTambahan] = useState('');
  const [reason, setReason] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const biayaTambahanNum = parseFormattedNumber(biayaTambahan);
  const currentKeuntungan = penjualan?.keuntungan || 0;
  const newKeuntungan = currentKeuntungan - biayaTambahanNum;

  const handleReset = () => {
    setBiayaTambahan('');
    setReason('');
    setKeterangan('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!reason.trim() || biayaTambahanNum <= 0) {
      return;
    }

    const data: UpdateHargaSoldData = {
      biaya_tambahan: biayaTambahanNum,
      reason: reason.trim(),
      keterangan: keterangan.trim() || undefined
    };

    onConfirm(data);
  };

  const canSubmit = reason.trim() && biayaTambahanNum > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Update Harga (Sold)
          </DialogTitle>
          <DialogDescription>
            Mengurangi keuntungan dan modal untuk penjualan {penjualan?.plat}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Info */}
          <Card className="bg-blue-50">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Motor:</span>
                  <div className="font-medium">{penjualan?.brands?.name} - {penjualan?.jenis_motor?.jenis_motor}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Harga Jual:</span>
                  <div className="font-medium text-blue-600">{formatCurrency(penjualan?.harga_jual)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Keuntungan Saat Ini:</span>
                  <div className="font-medium text-green-600">{formatCurrency(currentKeuntungan)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="font-medium text-green-600">Selesai/Sold</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Input Biaya Tambahan */}
          <div className="space-y-2">
            <Label htmlFor="biaya_tambahan">Biaya Tambahan *</Label>
            <Input
              id="biaya_tambahan"
              placeholder="Masukkan biaya tambahan"
              value={biayaTambahan}
              onChange={(e) => setBiayaTambahan(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Biaya ini akan mengurangi keuntungan dan modal perusahaan
            </p>
          </div>

          {/* Alasan */}
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Update *</Label>
            <Textarea
              id="reason"
              placeholder="Alasan penambahan biaya..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan Tambahan</Label>
            <Textarea
              id="keterangan"
              placeholder="Keterangan detail..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={2}
            />
          </div>

          {/* Impact Summary */}
          {biayaTambahanNum > 0 && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-800 text-sm">Dampak Perubahan</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Biaya tambahan:</span>
                    <span className="text-red-600 font-medium">-{formatCurrency(biayaTambahanNum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Keuntungan baru:</span>
                    <span className={newKeuntungan >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(newKeuntungan)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modal perusahaan:</span>
                    <span className="text-red-600 font-medium">-{formatCurrency(biayaTambahanNum)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-red-200">
                    <span>Pembukuan debit:</span>
                    <span className="text-red-600 font-medium">{formatCurrency(biayaTambahanNum)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Memproses..." : "Update Harga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateHargaSoldModal;