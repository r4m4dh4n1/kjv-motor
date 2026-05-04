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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, parseFormattedNumber } from "@/utils/formatUtils";
import { Edit, Info } from "lucide-react";
import { Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useEditPriceHistory, EditPriceHistoryData } from "./hooks/useEditPriceHistory";

interface EditPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceHistory: any;
  onSuccess?: () => void;
}

const EditPriceHistoryModal = ({
  isOpen,
  onClose,
  priceHistory,
  onSuccess
}: EditPriceHistoryModalProps) => {
  const [formData, setFormData] = useState({
    biaya_qc: "",
    biaya_pajak: "",
    biaya_lain_lain: "",
    keterangan_biaya_lain: "",
    reason: "",
    tanggal_update: ""
  });
  const [tanggalOpen, setTanggalOpen] = useState(false);

  const editMutation = useEditPriceHistory();

  useEffect(() => {
    if (priceHistory && isOpen) {
      setFormData({
        biaya_qc: (priceHistory.biaya_qc || 0).toString(),
        biaya_pajak: (priceHistory.biaya_pajak || 0).toString(),
        biaya_lain_lain: (priceHistory.biaya_lain_lain || 0).toString(),
        keterangan_biaya_lain: priceHistory.keterangan_biaya_lain || "",
        reason: priceHistory.reason || "",
        tanggal_update: priceHistory.tanggal_update || new Date().toISOString().split('T')[0]
      });
    }
  }, [priceHistory, isOpen]);

  const handleInputChange = (field: string, value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handleTextChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (!priceHistory) return;

    const submitData: EditPriceHistoryData = {
      id: priceHistory.id,
      biaya_qc: parseFormattedNumber(formData.biaya_qc),
      biaya_pajak: parseFormattedNumber(formData.biaya_pajak),
      biaya_lain_lain: parseFormattedNumber(formData.biaya_lain_lain),
      keterangan_biaya_lain: formData.keterangan_biaya_lain,
      reason: formData.reason,
      tanggal_update: formData.tanggal_update
    };

    editMutation.mutate(submitData, {
      onSuccess: () => {
        onClose();
        onSuccess?.();
      }
    });
  };

  const handleClose = () => {
    setFormData({
      biaya_qc: "",
      biaya_pajak: "",
      biaya_lain_lain: "",
      keterangan_biaya_lain: "",
      reason: "",
      tanggal_update: ""
    });
    onClose();
  };

  const canSubmit = formData.reason.trim() !== "";

  // Calculate preview values
  const oldTotalBiaya = (priceHistory?.biaya_qc || 0) + (priceHistory?.biaya_pajak || 0) + (priceHistory?.biaya_lain_lain || 0);
  const newTotalBiaya = parseFormattedNumber(formData.biaya_qc) + parseFormattedNumber(formData.biaya_pajak) + parseFormattedNumber(formData.biaya_lain_lain);
  const biayaDifference = newTotalBiaya - oldTotalBiaya;
  const newHargaBeli = (priceHistory?.harga_beli_lama || 0) + newTotalBiaya;

  if (!priceHistory) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-500" />
            Edit Riwayat Update Harga
          </DialogTitle>
          <DialogDescription>
            Edit data update harga untuk pembelian ID: {priceHistory.pembelian_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Values Display */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Data Saat Ini:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Harga Beli Lama:</span>
                  <div className="font-medium">{formatCurrency(priceHistory.harga_beli_lama || 0)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Harga Beli Baru:</span>
                  <div className="font-medium text-blue-600">{formatCurrency(priceHistory.harga_beli_baru || 0)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="biaya_qc">Biaya QC</Label>
              <Input
                id="biaya_qc"
                type="text"
                value={formData.biaya_qc}
                onChange={(e) => handleInputChange('biaya_qc', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biaya_pajak">Biaya Pajak</Label>
              <Input
                id="biaya_pajak"
                type="text"
                value={formData.biaya_pajak}
                onChange={(e) => handleInputChange('biaya_pajak', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biaya_lain_lain">Biaya Lain-lain</Label>
              <Input
                id="biaya_lain_lain"
                type="text"
                value={formData.biaya_lain_lain}
                onChange={(e) => handleInputChange('biaya_lain_lain', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {parseFormattedNumber(formData.biaya_lain_lain) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="keterangan_biaya_lain">Keterangan Biaya Lain *</Label>
              <Input
                id="keterangan_biaya_lain"
                value={formData.keterangan_biaya_lain}
                onChange={(e) => handleTextChange('keterangan_biaya_lain', e.target.value)}
                placeholder="Jelaskan biaya lain-lain"
              />
            </div>
          )}

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
                  {formData.tanggal_update
                    ? format(new Date(formData.tanggal_update), "dd MMMM yyyy", { locale: id })
                    : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.tanggal_update ? new Date(formData.tanggal_update) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({
                        ...prev,
                        tanggal_update: date.toISOString().split('T')[0]
                      }));
                    }
                    setTanggalOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Alasan Edit *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleTextChange('reason', e.target.value)}
              placeholder="Jelaskan alasan edit riwayat harga"
              className="h-20"
            />
          </div>

          {/* Preview Changes */}
          {biayaDifference !== 0 && (
            <Card className={`${biayaDifference > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                <span className="text-sm font-medium">Preview Perubahan</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Biaya Lama:</span>
                  <div className="font-medium">{formatCurrency(oldTotalBiaya)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Biaya Baru:</span>
                  <div className={`font-medium ${biayaDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(newTotalBiaya)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Selisih:</span>
                  <div className={`font-medium ${biayaDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {biayaDifference > 0 ? '+' : ''}{formatCurrency(biayaDifference)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Harga Beli Baru:</span>
                  <div className="font-medium text-blue-600">
                    {formatCurrency(newHargaBeli)}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={editMutation.isPending}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || editMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditPriceHistoryModal;