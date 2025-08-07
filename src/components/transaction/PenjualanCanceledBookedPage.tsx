import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Search, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PenjualanCanceledBookedPageProps {
  selectedDivision: string;
}

const PenjualanCanceledBookedPage = ({ selectedDivision }: PenjualanCanceledBookedPageProps) => {
  const [penjualanData, setPenjualanData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDetailPenjualan, setSelectedDetailPenjualan] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchPenjualanData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('penjualans')
        .select(`
          *,
          brands!inner(name),
          jenis_motor!jenis_id(jenis_motor),
          cabang!cabang_id(nama),
          companies!company_id(nama_perusahaan)
        `)
        .eq('divisi', selectedDivision)
        .eq('status', 'cancelled_dp_hangus')
        .order('tanggal', { ascending: false });

      if (error) throw error;

      setPenjualanData(data || []);
    } catch (error) {
      console.error('Error fetching penjualan data:', error);
      toast({
        title: "Error",
        description: "Gagal mengambil data penjualan",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPenjualanData();
  }, [selectedDivision]);

  useEffect(() => {
    const filtered = penjualanData.filter((item: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.plat?.toLowerCase().includes(searchLower) ||
        item.brands?.name?.toLowerCase().includes(searchLower) ||
        item.jenis_motor?.jenis_motor?.toLowerCase().includes(searchLower) ||
        item.warna?.toLowerCase().includes(searchLower) ||
        item.tahun?.toString().includes(searchLower)
      );
    });
    setFilteredData(filtered);
  }, [penjualanData, searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const handleViewDetail = (penjualan: any) => {
    setSelectedDetailPenjualan(penjualan);
    setIsDetailModalOpen(true);
  };

  // Calculate total values
  const totalPenjualanCanceled = filteredData.reduce((total, item) => total + (item.harga_jual || 0), 0);
  const totalUnitCanceled = filteredData.length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Canceled Booked</h1>
            <p className="text-muted-foreground">
              Kelola data penjualan yang dibatalkan dengan DP hangus
            </p>
          </div>
          <Button onClick={fetchPenjualanData} disabled={isLoading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Nilai Canceled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPenjualanCanceled)}</div>
              <p className="text-xs text-muted-foreground">
                Divisi {selectedDivision}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Unit Canceled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUnitCanceled}</div>
              <p className="text-xs text-muted-foreground">
                Unit yang dibatalkan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cari berdasarkan plat, brand, jenis motor, warna, atau tahun..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Data Penjualan Canceled Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Plat Nomor</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Jenis Motor</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Warna</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead>DP</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((penjualan) => (
                    <TableRow key={penjualan.id}>
                      <TableCell>{formatDate(penjualan.tanggal)}</TableCell>
                      <TableCell className="font-medium">{penjualan.plat}</TableCell>
                      <TableCell>{penjualan.brands?.name}</TableCell>
                      <TableCell>{penjualan.jenis_motor?.jenis_motor}</TableCell>
                      <TableCell>{penjualan.tahun}</TableCell>
                      <TableCell>{penjualan.warna}</TableCell>
                      <TableCell>{formatCurrency(penjualan.harga_jual)}</TableCell>
                      <TableCell>{formatCurrency(penjualan.dp || 0)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          Canceled DP Hangus
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(penjualan)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Lihat Detail</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Tidak ada data penjualan canceled booked yang ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Penjualan Canceled</DialogTitle>
            </DialogHeader>
            {selectedDetailPenjualan && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tanggal Penjualan</label>
                    <p className="font-medium">{formatDate(selectedDetailPenjualan.tanggal)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cabang</label>
                    <p className="font-medium">{selectedDetailPenjualan.cabang?.nama}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Brand</label>
                    <p className="font-medium">{selectedDetailPenjualan.brands?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Jenis Motor</label>
                    <p className="font-medium">{selectedDetailPenjualan.jenis_motor?.jenis_motor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tahun</label>
                    <p className="font-medium">{selectedDetailPenjualan.tahun}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Warna</label>
                    <p className="font-medium">{selectedDetailPenjualan.warna}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plat Nomor</label>
                    <p className="font-medium">{selectedDetailPenjualan.plat}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Kilometer</label>
                    <p className="font-medium">{selectedDetailPenjualan.kilometer?.toLocaleString('id-ID')} km</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Harga Beli</label>
                    <p className="font-medium">{formatCurrency(selectedDetailPenjualan.harga_beli)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Harga Jual</label>
                    <p className="font-medium">{formatCurrency(selectedDetailPenjualan.harga_jual)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">DP</label>
                    <p className="font-medium">{formatCurrency(selectedDetailPenjualan.dp || 0)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Jenis Pembayaran</label>
                    <p className="font-medium">{selectedDetailPenjualan.jenis_pembayaran}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                    <p className="font-medium">{selectedDetailPenjualan.companies?.nama_perusahaan}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant="destructive">Canceled DP Hangus</Badge>
                  </div>
                </div>
                {selectedDetailPenjualan.catatan && selectedDetailPenjualan.catatan !== '0' && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Catatan</label>
                    <p className="font-medium">{selectedDetailPenjualan.catatan}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default PenjualanCanceledBookedPage;