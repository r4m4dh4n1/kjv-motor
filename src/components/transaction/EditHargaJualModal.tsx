import React, { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, parseFormattedNumber } from "@/utils/formatUtils";
import { TrendingDown, TrendingUp, Edit, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditHargaJualModalProps {
  isOpen: boolean;
  onClose: () => void;
  penjualan: any;
  onSuccess?: () => void;
}

const EditHargaJualModal = ({
  isOpen,
  onClose,
  penjualan,
  onSuccess
}: EditHargaJualModalProps) => {
  const [hargaJual, setHargaJual] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && penjualan) {
      setHargaJual(penjualan.harga_jual?.toString() || '');
    }
  }, [isOpen, penjualan]);

  const hargaJualNum = parseFormattedNumber(hargaJual);
  const currentHargaBeli = penjualan?.harga_beli || 0;
  const currentHargaJual = penjualan?.harga_jual || 0;
  const currentKeuntungan = penjualan?.keuntungan || 0;
  
  // Calculate new profit
  const newKeuntungan = hargaJualNum - currentHargaBeli;
  const selisihKeuntungan = newKeuntungan - currentKeuntungan;
  const selisihHargaJual = hargaJualNum - currentHargaJual;

  const handleReset = () => {
    setHargaJual(penjualan?.harga_jual?.toString() || '');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!penjualan || hargaJualNum <= 0) {
      toast({
        title: "Error",
        description: "Harga jual harus lebih dari 0",
        variant: "destructive"
      });
      return;
    }

    if (hargaJualNum === currentHargaJual) {
      toast({
        title: "Info",
        description: "Tidak ada perubahan harga jual",
        variant: "default"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update penjualan data
      const { error: updateError } = await supabase
        .from('penjualan' as any)
        .update({
          harga_jual: hargaJualNum,
          keuntungan: newKeuntungan,
          sisa_bayar: Math.max(0, hargaJualNum - (penjualan.harga_bayar || 0))
        })
        .eq('id', penjualan.id);

      if (updateError) throw updateError;

      // Create price history record
      const { error: historyError } = await supabase
        .from('price_history' as any)
        .insert({
          penjualan_id: penjualan.id,
          old_harga_jual: currentHargaJual,
          new_harga_jual: hargaJualNum,
          old_keuntungan: currentKeuntungan,
          new_keuntungan: newKeuntungan,
          selisih_harga: selisihHargaJual,
          selisih_keuntungan: selisihKeuntungan,
          keterangan: `Edit harga jual dari ${formatCurrency(currentHargaJual)} ke ${formatCurrency(hargaJualNum)}`,
          tanggal_update: new Date().toISOString(),
          updated_by: 'system' // You can replace with actual user
        });

      if (historyError) {
        console.error('Error creating price history:', historyError);
        // Don't throw error, just log it
      }

      toast({
        title: "Berhasil",
        description: `Harga jual berhasil diupdate ke ${formatCurrency(hargaJualNum)}`,
        variant: "default"
      });

      handleClose();
      onSuccess?.();

    } catch (error: any) {
      console.error('Error updating harga jual:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate harga jual",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumberInput = (value: string): string => {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleHargaJualChange = (value: string) => {
    const numericValue = value.replace(/\./g, '');
    setHargaJual(numericValue);
  };

  if (!penjualan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-green-600" />
            Edit Harga Jual
          </DialogTitle>
          <DialogDescription>
            Edit harga jual motor {penjualan.brands?.name} {penjualan.jenis_motor?.jenis_motor} - {penjualan.plat}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Info */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 text-gray-700">Informasi Saat Ini</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Harga Beli:</span>
                  <span className="font-medium text-red-600">{formatCurrency(currentHargaBeli)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Harga Jual:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(currentHargaJual)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span>Keuntungan:</span>
                  <span className="font-medium text-green-600">{formatCurrency(currentKeuntungan)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Input Harga Jual Baru */}
          <div>
            <Label htmlFor="harga_jual">Harga Jual Baru *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
              <Input
                id="harga_jual"
                type="text"
                value={formatNumberInput(hargaJual)}
                onChange={(e) => handleHargaJualChange(e.target.value)}
                className="pl-10"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Preview Perubahan */}
          {hargaJualNum > 0 && hargaJualNum !== currentHargaJual && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 text-blue-700 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Preview Perubahan
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Harga Jual Baru:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(hargaJualNum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Keuntungan Baru:</span>
                    <span className={`font-medium ${newKeuntungan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(newKeuntungan)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span>Selisih Keuntungan:</span>
                    <div className="flex items-center gap-1">
                      {selisihKeuntungan > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : selisihKeuntungan < 0 ? (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      ) : null}
                      <span className={`font-medium ${
                        selisihKeuntungan > 0 ? 'text-green-600' : 
                        selisihKeuntungan < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {selisihKeuntungan > 0 ? '+' : ''}{formatCurrency(selisihKeuntungan)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isLoading || hargaJualNum <= 0 || hargaJualNum === currentHargaJual}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditHargaJualModal;