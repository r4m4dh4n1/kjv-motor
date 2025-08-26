import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, RefreshCw, History } from 'lucide-react';
import { usePriceHistoryUpload } from './hooks/usePriceHistoryUpload';
import PriceHistoryUploadModal from './PriceHistoryUploadModal';
import { formatCurrency } from '@/utils/formatUtils';
import { format } from 'date-fns';

const PriceHistoryUploadPage = () => {
  const { unuploadedHistories, isLoading, refetch } = usePriceHistoryUpload();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalAmount = unuploadedHistories.reduce((sum, history) => {
    const totalBiaya = (history.biaya_pajak || 0) + (history.biaya_qc || 0) + (history.biaya_lain_lain || 0);
    const selisihHarga = history.harga_beli_baru - history.harga_beli_lama;
    return sum + Math.max(totalBiaya, selisihHarga);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Upload Price History</h1>
          <p className="text-gray-600">Kelola upload price history ke pembukuan</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)} disabled={unuploadedHistories.length === 0}>
            <Upload className="w-4 h-4 mr-2" />
            Upload ke Pembukuan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unuploadedHistories.length}</div>
            <p className="text-xs text-gray-500">Belum diupload</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Nominal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-gray-500">Akan diupload</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? 'Loading...' : 'Ready'}
            </div>
            <p className="text-xs text-gray-500">Siap upload</p>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Price History Belum Diupload
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : unuploadedHistories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Semua price history sudah diupload ke pembukuan
            </div>
          ) : (
            <div className="space-y-3">
              {unuploadedHistories.map((history) => {
                const totalBiaya = (history.biaya_pajak || 0) + (history.biaya_qc || 0) + (history.biaya_lain_lain || 0);
                const selisihHarga = history.harga_beli_baru - history.harga_beli_lama;
                const totalAmount = Math.max(totalBiaya, selisihHarga);
                
                return (
                  <div key={history.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {history.pembelian?.brands?.name} - {history.pembelian?.jenis_motor?.jenis_motor}
                      </p>
                      <p className="text-sm text-gray-600">
                        {history.pembelian?.plat_nomor} - {history.reason}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(history.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        {formatCurrency(totalAmount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {history.pembelian?.divisi}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PriceHistoryUploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default PriceHistoryUploadPage;