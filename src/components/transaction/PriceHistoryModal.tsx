import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { History } from "lucide-react";

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pembelian?: any;
  penjualan?: any;
}

const PriceHistoryModal = ({ isOpen, onClose, pembelian, penjualan }: PriceHistoryModalProps) => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && (pembelian || penjualan)) {
      fetchPriceHistory();
    }
  }, [isOpen, pembelian, penjualan]);

  const fetchPriceHistory = async () => {
    setLoading(true);
    try {
      const itemId = pembelian?.id || penjualan?.pembelian_id;
      const tableName = pembelian ? 'price_histories_pembelian' : 'price_histories';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('pembelian_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryData(data || []);
    } catch (error) {
      console.error('Error fetching price history:', error);
      toast({
        title: "Error",
        description: "Gagal memuat history harga",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            History Update Harga - {pembelian?.plat_nomor || penjualan?.plat}
          </DialogTitle>
        </DialogHeader>
        
        {(pembelian || penjualan) && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Info Motor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Jenis Motor:</p>
                    <p>{pembelian?.jenis_motor?.jenis_motor || penjualan?.jenis_motor?.jenis_motor}</p>
                  </div>
                  <div>
                    <p className="font-medium">Plat Nomor:</p>
                    <p>{pembelian?.plat_nomor || penjualan?.plat}</p>
                  </div>
                  <div>
                    <p className="font-medium">Harga Beli Awal:</p>
                    <p>{formatCurrency(pembelian?.harga_beli || penjualan?.harga_beli)}</p>
                  </div>
                  <div>
                    <p className="font-medium">Harga Final Saat Ini:</p>
                    <p>{formatCurrency(pembelian?.harga_final || pembelian?.harga_beli || penjualan?.harga_jual)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">History Update Harga</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    Belum ada history update harga
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Harga Lama</TableHead>
                          <TableHead>Harga Baru</TableHead>
                          <TableHead>Selisih</TableHead>
                          <TableHead>Biaya Pajak</TableHead>
                          <TableHead>Biaya QC</TableHead>
                          <TableHead>Biaya Lain</TableHead>
                          <TableHead>Alasan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.map((history: any) => {
                          const isJualHistory = 'harga_jual_baru' in history;
                          const selisih = isJualHistory 
                            ? history.harga_jual_baru - history.harga_jual_lama
                            : history.harga_beli_baru - history.harga_beli_lama;
                          return (
                            <TableRow key={history.id}>
                              <TableCell>
                                {new Date(history.created_at).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(isJualHistory ? history.harga_jual_lama : history.harga_beli_lama)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(isJualHistory ? history.harga_jual_baru : history.harga_beli_baru)}
                              </TableCell>
                              <TableCell className={selisih > 0 ? "text-red-600 font-medium" : selisih < 0 ? "text-green-600 font-medium" : ""}>
                                {selisih > 0 ? '+' : ''}{formatCurrency(selisih)}
                              </TableCell>
                              <TableCell>{formatCurrency(history.biaya_pajak || 0)}</TableCell>
                              <TableCell>{formatCurrency(history.biaya_qc || 0)}</TableCell>
                              <TableCell>
                                {history.biaya_lain_lain ? (
                                  <div>
                                    <div>{formatCurrency(history.biaya_lain_lain)}</div>
                                    {history.keterangan_biaya_lain && (
                                      <div className="text-xs text-gray-500">
                                        {history.keterangan_biaya_lain}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  formatCurrency(0)
                                )}
                              </TableCell>
                              <TableCell>{history.reason}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={onClose}>Tutup</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryModal;