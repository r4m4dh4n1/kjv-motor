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
import { TrendingDown, TrendingUp, Info } from "lucide-react";
import { Calendar, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompaniesData } from "./hooks/usePembelianData";
import { Badge } from "@/components/ui/badge";

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
  tanggal_update: string;
  sumber_dana_id: number;
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
  const [operationMode, setOperationMode] = useState<'tambah' | 'kurang'>('tambah');

  const biayaTambahanNum = parseFormattedNumber(biayaTambahan);
  const currentKeuntungan = penjualan?.keuntungan || 0;
  const currentHargaBeli = penjualan?.harga_beli || 0;
  
  const finalBiayaTambahan = operationMode === 'kurang' ? -Math.abs(biayaTambahanNum) : Math.abs(biayaTambahanNum);
  const newKeuntungan = currentKeuntungan - finalBiayaTambahan;
  const newHargaBeli = currentHargaBeli + finalBiayaTambahan;

  const [tanggalUpdate, setTanggalUpdate] = useState(new Date().toISOString().split('T')[0]);
  const [sumberDanaId, setSumberDanaId] = useState('');
  const [tanggalOpen, setTanggalOpen] = useState(false);

  const { data: companiesData = [] } = useCompaniesData(penjualan?.divisi);

  const handleReset = () => {
    setBiayaTambahan('');
    setReason('');
    setOperationMode('tambah');
    setTanggalUpdate(new Date().toISOString().split('T')[0]);
    setSumberDanaId(penjualan?.company_id?.toString() || '');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = () => {
    if (!reason.trim() || biayaTambahanNum <= 0 || !sumberDanaId) return;

    if (operationMode === 'kurang') {
      if (newHargaBeli < 0) {
        alert('Pengurangan tidak boleh membuat harga beli negatif');
        return;
      }
      const maxReduction = currentHargaBeli * 0.8;
      if (biayaTambahanNum > maxReduction) {
        alert(`Pengurangan maksimal ${formatCurrency(maxReduction)}`);
        return;
      }
    }

    const data: UpdateHargaSoldData = {
      biaya_tambahan: finalBiayaTambahan,
      reason: reason.trim(),
      operation_mode: operationMode,
      tanggal_update: tanggalUpdate,
      sumber_dana_id: parseInt(sumberDanaId),

    };

    onConfirm(data);
  };

  const canSubmit = reason.trim() && biayaTambahanNum > 0 && sumberDanaId;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {operationMode === 'tambah' ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingUp className="w-4 h-4 text-green-500" />
            )}
            Update Harga
          </DialogTitle>
          <DialogDescription className="text-sm">
            {penjualan?.plat} - {penjualan?.brands?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Info Ringkas */}
          <div className="flex justify-between text-xs bg-gray-50 p-2 rounded">
            <span>Keuntungan: <strong>{formatCurrency(currentKeuntungan)}</strong></span>
            <span>Harga Beli: <strong>{formatCurrency(currentHargaBeli)}</strong></span>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1">
            <Button 
              type="button"
              size="sm"
              variant={operationMode === 'tambah' ? 'default' : 'outline'}
              onClick={() => setOperationMode('tambah')}
              className="flex-1 h-8"
            >
              <TrendingDown className="w-3 h-3 mr-1" />
              Tambah
            </Button>
            <Button 
              type="button"
              size="sm"
              variant={operationMode === 'kurang' ? 'default' : 'outline'}
              onClick={() => setOperationMode('kurang')}
              className="flex-1 h-8"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Kurangi
            </Button>
          </div>

          {/* Input Nominal */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {operationMode === 'tambah' ? 'Biaya Tambahan' : 'Pengurangan'} *
            </Label>
            <Input
              placeholder="0"
              value={biayaTambahan}
              onChange={(e) => setBiayaTambahan(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label htmlFor="tanggal_update">Tanggal Update</Label>
              <Popover open={tanggalOpen} onOpenChange={setTanggalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {tanggalUpdate
                      ? format(new Date(tanggalUpdate), "dd MMMM yyyy", { locale: id })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  // Di bagian onSelect, ganti dengan format lokal:
                  <CalendarComponent
                    mode="single"
                    selected={tanggalUpdate ? new Date(tanggalUpdate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        // Gunakan format lokal tanpa konversi UTC
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const localDateString = `${year}-${month}-${day}`;
                        
                        setTanggalUpdate(localDateString);
                        setTanggalOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sumber Dana */}
            <div className="space-y-2">
              <Label htmlFor="sumber_dana_id">Sumber Dana</Label>
              <Select value={sumberDanaId} onValueChange={setSumberDanaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sumber dana" />
                </SelectTrigger>
                <SelectContent>
                  {companiesData.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.nama_perusahaan} - {formatCurrency(company.modal)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Input Alasan */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">Alasan *</Label>
            <Textarea
              placeholder="Alasan perubahan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Preview Dampak */}
          {biayaTambahanNum > 0 && (
            <Card className={`${operationMode === 'tambah' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} p-2`}>
              <div className="flex items-center gap-1 mb-1">
                <Info className="w-3 h-3" />
                <span className="text-xs font-medium">Preview</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Keuntungan Baru:</span>
                  <div className={`font-medium ${newKeuntungan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(newKeuntungan)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Harga Beli Baru:</span>
                  <div className={`font-medium ${operationMode === 'tambah' ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(newHargaBeli)}
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Dampak Modal:</span>
                  <span className={`font-medium ${operationMode === 'tambah' ? 'text-red-600' : 'text-green-600'}`}>
                    {operationMode === 'tambah' ? '-' : '+'}{formatCurrency(biayaTambahanNum)}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isLoading}
            size="sm"
          >
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit || isLoading}
            size="sm"
            className={operationMode === 'tambah' 
              ? "bg-red-600 hover:bg-red-700" 
              : "bg-green-600 hover:bg-green-700"
            }
          >
            {isLoading ? "Proses..." : operationMode === 'tambah' ? 'Tambah' : 'Kurangi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateHargaSoldModal;