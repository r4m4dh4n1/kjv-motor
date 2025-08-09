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
import { AlertTriangle, DollarSign, TrendingDown, TrendingUp } from "lucide-react";

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
  operation_mode: 'tambah' | 'kurang';
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
  const [operationMode, setOperationMode] = useState<'tambah' | 'kurang'>('tambah');

  const biayaTambahanNum = parseFormattedNumber(biayaTambahan);
  const currentKeuntungan = penjualan?.keuntungan || 0;
  const currentHargaBeli = penjualan?.harga_beli || 0;
  
  // Calculate impact based on operation mode
  const finalBiayaTambahan = operationMode === 'kurang' ? -Math.abs(biayaTambahanNum) : Math.abs(biayaTambahanNum);
  const newKeuntungan = currentKeuntungan - finalBiayaTambahan;
  const newHargaBeli = currentHargaBeli + finalBiayaTambahan;

  const handleReset = () => {
    setBiayaTambahan('');
    setReason('');
    setKeterangan('');
    setOperationMode('tambah');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!reason.trim() || biayaTambahanNum <= 0) {
      return;
    }

    // Validation for reduction mode
    if (operationMode === 'kurang') {
      if (newHargaBeli < 0) {
        alert('Pengurangan tidak boleh membuat harga beli negatif');
        return;
      }
      
      const maxReduction = currentHargaBeli * 0.8; // Max 80% reduction
      if (biayaTambahanNum > maxReduction) {
        alert(`Pengurangan maksimal adalah ${formatCurrency(maxReduction)} (80% dari harga beli saat ini)`);
        return;
      }
    }

    const data: UpdateHargaSoldData = {
      biaya_tambahan: finalBiayaTambahan,
      reason: reason.trim(),
      keterangan: keterangan.trim() || undefined,
      operation_mode: operationMode
    };

    onConfirm(data);
  };

  const canSubmit = reason.trim() && biayaTambahanNum > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {operationMode === 'tambah' ? (
              <TrendingDown className="w-5 h-5 text-red-500" />
            ) : (
              <TrendingUp className="w-5 h-5 text-green-500" />
            )}
            {operationMode === 'tambah' ? 'Tambah Biaya' : 'Kurangi Biaya'} (Sold)
          </DialogTitle>
          <DialogDescription>
            {operationMode === 'tambah' 
              ? 'Mengurangi keuntungan dan modal untuk penjualan'
              : 'Menambah keuntungan dan modal untuk penjualan'
            } {penjualan?.plat}
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
                  <span className="text-muted-foreground">Harga Beli Saat Ini:</span>
                  <div className="font-medium text-orange-600">{formatCurrency(currentHargaBeli)}</div>
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

          {/* Operation Mode Selection */}
          <div className="space-y-2">
            <Label>Mode Operasi *</Label>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant={operationMode === 'tambah' ? 'default' : 'outline'}
                onClick={() => setOperationMode('tambah')}
                className="flex-1"
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Tambah Biaya
              </Button>
              <Button 
                type="button"
                variant={operationMode === 'kurang' ? 'default' : 'outline'}
                onClick={() => setOperationMode('kurang')}
                className="flex-1"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Kurangi Biaya
              </Button>
            </div>
          </div>

          {/* Input Biaya */}
          <div className="space-y-2">
            <Label htmlFor="biaya_tambahan">
              {operationMode === 'tambah' ? 'Biaya Tambahan' : 'Pengurangan Biaya'} *
            </Label>
            <Input
              id="biaya_tambahan"
              placeholder={operationMode === 'tambah' ? "Masukkan biaya tambahan" : "Masukkan pengurangan biaya"}
              value={biayaTambahan}
              onChange={(e) => setBiayaTambahan(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {operationMode === 'tambah' 
                ? 'Biaya ini akan mengurangi keuntungan dan modal perusahaan'
                : 'Pengurangan ini akan menambah keuntungan dan modal perusahaan'
              }
            </p>
          </div>

          {/* Alasan */}
          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Update *</Label>
            <Textarea
              id="reason"
              placeholder={operationMode === 'tambah' ? "Alasan penambahan biaya..." : "Alasan pengurangan biaya..."}
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
            <Card className={operationMode === 'tambah' ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  {operationMode === 'tambah' ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  )}
                  <span className={`font-medium text-sm ${
                    operationMode === 'tambah' ? 'text-red-800' : 'text-green-800'
                  }`}>
                    Dampak Perubahan
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Harga beli baru:</span>
                    <span className={operationMode === 'tambah' ? "text-red-600" : "text-green-600"}>
                      {formatCurrency(newHargaBeli)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{operationMode === 'tambah' ? 'Biaya tambahan:' : 'Pengurangan biaya:'}:</span>
                    <span className={`font-medium ${
                      operationMode === 'tambah' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {operationMode === 'tambah' ? '-' : '+'}{formatCurrency(biayaTambahanNum)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Keuntungan baru:</span>
                    <span className={newKeuntungan >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(newKeuntungan)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modal perusahaan:</span>
                    <span className={`font-medium ${
                      operationMode === 'tambah' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {operationMode === 'tambah' ? '-' : '+'}{formatCurrency(biayaTambahanNum)}
                    </span>
                  </div>
                  <div className={`flex justify-between pt-1 border-t ${
                    operationMode === 'tambah' ? 'border-red-200' : 'border-green-200'
                  }`}>
                    <span>Pembukuan {operationMode === 'tambah' ? 'debit' : 'kredit'}:</span>
                    <span className={`font-medium ${
                      operationMode === 'tambah' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatCurrency(biayaTambahanNum)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning for reduction mode */}
          {operationMode === 'kurang' && biayaTambahanNum > 0 && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800 text-sm">Peringatan</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Pengurangan biaya akan menambah keuntungan dan modal perusahaan. 
                  Pastikan alasan pengurangan sudah sesuai dengan kebijakan perusahaan.
                </p>
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
            className={operationMode === 'tambah' 
              ? "bg-red-600 hover:bg-red-700" 
              : "bg-green-600 hover:bg-green-700"
            }
          >
            {isLoading ? "Memproses..." : `${operationMode === 'tambah' ? 'Tambah' : 'Kurangi'} Biaya`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateHargaSoldModal;