import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { usePriceHistoryUpload, PriceHistoryUploadData } from './hooks/usePriceHistoryUpload';
import { formatCurrency } from '@/utils/formatUtils';

interface PriceHistoryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  
}

const PriceHistoryUploadModal = ({ isOpen, onClose }: PriceHistoryUploadModalProps) => {
  const { unuploadedHistories, uploadMutation } = usePriceHistoryUpload();
  // State untuk menyimpan ID histories yang dipilih
  const [selectedHistories, setSelectedHistories] = useState<number[]>([]);
  
  // Fungsi untuk select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHistories(unuploadedHistories.map(h => h.id));
    } else {
      setSelectedHistories([]);
    }
  };
  
  // Fungsi untuk select individual
  const handleSelectHistory = (historyId: number, checked: boolean) => {
    if (checked) {
      setSelectedHistories(prev => [...prev, historyId]);
    } else {
      setSelectedHistories(prev => prev.filter(id => id !== historyId));
    }
  };
  
  // Upload hanya data yang dipilih
  const handleUpload = () => {
    const selectedData = unuploadedHistories.filter(h => selectedHistories.includes(h.id));
    uploadMutation.mutate({
      histories: selectedData,
      tanggal: format(tanggal, 'yyyy-MM-dd')
    }, {
      onSuccess: () => {
        setSelectedHistories([]);
        onClose();
      }
    });
  };
  const [tanggal, setTanggal] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHistories(unuploadedHistories.map(h => h.id));
    } else {
      setSelectedHistories([]);
    }
  };

  const handleSelectHistory = (historyId: number, checked: boolean) => {
    if (checked) {
      setSelectedHistories(prev => [...prev, historyId]);
    } else {
      setSelectedHistories(prev => prev.filter(id => id !== historyId));
    }
  };

  const handleUpload = () => {
    const selectedData = unuploadedHistories.filter(h => selectedHistories.includes(h.id));
    uploadMutation.mutate({
      histories: selectedData,
      tanggal: format(tanggal, 'yyyy-MM-dd')
    }, {
      onSuccess: () => {
        setSelectedHistories([]);
        onClose();
      }
    });
  };

  const canUpload = selectedHistories.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Price History ke Pembukuan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Tanggal Upload</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(tanggal, "dd MMMM yyyy", { locale: id })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={tanggal}
                  onSelect={(date) => {
                    if (date) setTanggal(date);
                    setCalendarOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Select All */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectedHistories.length === unuploadedHistories.length && unuploadedHistories.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all" className="font-medium">
              Pilih Semua ({unuploadedHistories.length} item)
            </Label>
          </div>

          {/* History List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {unuploadedHistories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Tidak ada price history yang belum diupload
              </div>
            ) : (
              unuploadedHistories.map((history) => {
                const totalBiaya = (history.biaya_pajak || 0) + (history.biaya_qc || 0) + (history.biaya_lain_lain || 0);
                const selisihHarga = history.harga_beli_baru - history.harga_beli_lama;
                const totalAmount = Math.max(totalBiaya, selisihHarga);
                
                return (
                  <div key={history.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={selectedHistories.includes(history.id)}
                      onCheckedChange={(checked) => handleSelectHistory(history.id, checked as boolean)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {history.pembelian?.brands?.name} - {history.pembelian?.jenis_motor?.jenis_motor}
                          </p>
                          <p className="text-sm text-gray-600">
                            {history.pembelian?.plat_nomor} - {history.reason}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            {formatCurrency(totalAmount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(history.created_at), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      {history.keterangan_biaya_lain && (
                        <p className="text-xs text-gray-500">
                          {history.keterangan_biaya_lain}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedHistories.length} item dipilih
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!canUpload || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload ke Pembukuan'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryUploadModal;