import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatUtils";
import { Edit, Clock, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditPriceHistoryModal from "./EditPriceHistoryModal";
import { supabase } from "@/integrations/supabase/client";

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pembelian?: any;
  penjualan?: any;
}

const PriceHistoryModal = ({
  isOpen,
  onClose,
  pembelian,
  penjualan
}: PriceHistoryModalProps) => {
  const data = pembelian || penjualan;
  const isPenjualan = !!penjualan;
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHistoryForEdit, setSelectedHistoryForEdit] = useState<any>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEditHistory = (history: any) => {
    setSelectedHistoryForEdit(history);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    // Refresh price history data
    if (data) {
      fetchPriceHistory();
    }
  };

  // Fetch price history from price_histories_pembelian table
  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      let query = supabase.from('price_histories_pembelian').select('*');
      
      if (isPenjualan && data.pembelian_id) {
        // For penjualan, use pembelian_id to get history
        query = query.eq('pembelian_id', data.pembelian_id);
      } else if (pembelian) {
        // For pembelian, use the pembelian id directly
        query = query.eq('pembelian_id', data.id);
      }
      
      const { data: historyData, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching price history:', error);
        setPriceHistory([]);
      } else {
        setPriceHistory(historyData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setPriceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !data) return;
    fetchPriceHistory();
  }, [isOpen, data, isPenjualan, pembelian]);

  if (!data) return null;

  // Calculate current and total additional costs from price history
  const totalBiayaTambahan = priceHistory.reduce((sum, history) => {
    return sum + (history.biaya_qc || 0) + (history.biaya_pajak || 0) + (history.biaya_lain_lain || 0);
  }, 0);
  
  const currentHargaBeli = isPenjualan ? (data?.harga_beli || 0) : (data?.harga_beli || 0);
  const originalHargaBeli = currentHargaBeli - totalBiayaTambahan;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Riwayat Update Harga
            </DialogTitle>
            <DialogDescription>
              {data?.brands?.name} - {data?.jenis_motor?.jenis_motor} | {isPenjualan ? data?.plat : data?.plat_nomor}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Status */}
            <Card className="bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Status Harga Saat Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {isPenjualan ? 'Harga Beli Awal:' : 'Harga Beli:'}
                    </span>
                    <div className="font-medium text-green-600">
                      {formatCurrency(originalHargaBeli)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {isPenjualan ? 'Harga Jual:' : 'Harga Final:'}
                    </span>
                    <div className="font-medium text-blue-600">
                      {formatCurrency(isPenjualan ? (data?.harga_jual || 0) : (data?.harga_final || 0))}
                    </div>
                  </div>
                  {isPenjualan && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Total Biaya Tambahan:</span>
                        <div className="font-medium text-red-600">
                          {formatCurrency(totalBiayaTambahan)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Keuntungan Akhir:</span>
                        <div className="font-medium text-purple-600">
                          {formatCurrency(data?.keuntungan || 0)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Update History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Riwayat Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                    <p className="text-sm">Memuat riwayat...</p>
                  </div>
                ) : priceHistory.length > 0 ? (
                  <div className="space-y-3">
                    {priceHistory.map((history, index) => (
                      <div key={history.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="font-medium text-sm">Update Harga #{priceHistory.length - index}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditHistory(history)}
                              className="h-6 px-2 text-xs"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(history.created_at)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Harga beli lama:</span>
                            <span className="font-medium">{formatCurrency(history.harga_beli_lama || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Harga beli baru:</span>
                            <span className="font-medium text-blue-600">{formatCurrency(history.harga_beli_baru || 0)}</span>
                          </div>
                          
                          {(history.biaya_qc || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Biaya QC:</span>
                              <span className="text-red-600 font-medium">+{formatCurrency(history.biaya_qc)}</span>
                            </div>
                          )}
                          
                          {(history.biaya_pajak || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Biaya Pajak:</span>
                              <span className="text-red-600 font-medium">+{formatCurrency(history.biaya_pajak)}</span>
                            </div>
                          )}
                          
                          {(history.biaya_lain_lain || 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Biaya Lain-lain:</span>
                              <span className="text-red-600 font-medium">+{formatCurrency(history.biaya_lain_lain)}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between border-t pt-1">
                            <span className="text-muted-foreground">Total biaya tambahan:</span>
                            <span className="text-red-600 font-medium">
                              +{formatCurrency((history.biaya_qc || 0) + (history.biaya_pajak || 0) + (history.biaya_lain_lain || 0))}
                            </span>
                          </div>
                          
                          {history.reason && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <span className="font-medium">Alasan: </span>
                              {history.reason}
                            </div>
                          )}
                          
                          {history.keterangan_biaya_lain && (
                            <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                              <span className="font-medium">Keterangan: </span>
                              {history.keterangan_biaya_lain}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Belum ada riwayat update harga</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Impact */}
            {totalBiayaTambahan > 0 && (
              <Card className="bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-orange-800">
                    Ringkasan Total Update
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Harga beli awal:</span>
                    <span className="font-medium">
                      {formatCurrency(originalHargaBeli)}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Total biaya tambahan:</span>
                    <span className="font-medium">+{formatCurrency(totalBiayaTambahan)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Harga beli akhir:</span>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(currentHargaBeli)}
                    </span>
                  </div>
                  {isPenjualan && (
                    <div className="flex justify-between">
                      <span className="font-medium">Keuntungan akhir:</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(data?.keuntungan || 0)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Price History Modal */}
      <EditPriceHistoryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedHistoryForEdit(null);
        }}
        priceHistory={selectedHistoryForEdit}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};

export default PriceHistoryModal;