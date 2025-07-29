import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Package, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from '@/hooks/usePagination';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from '@/components/ui/pagination';
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatCurrency, parseCurrency, handleCurrencyInput } from "@/utils/formatUtils";

type Asset = Tables<"assets">;

const AssetPage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [sellingAsset, setSellingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    jenis_asset: "",
    harga_asset: "",
    tanggal_perolehan: "",
  });
  const [sellFormData, setSellFormData] = useState({
    harga_jual: "",
    tanggal_jual: "",
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Implementasi pagination dengan 7 items per halaman
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
    totalItems
  } = usePagination(assets, 7);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setAssets(data || []);
      resetPage();
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateToDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateToInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hargaAsset = parseCurrency(formData.harga_asset);
    
    if (!formData.jenis_asset || hargaAsset <= 0 || !formData.tanggal_perolehan) {
      toast({
        title: "Error",
        description: "Semua field harus diisi dengan benar",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingAsset) {
        const { error } = await supabase
          .from('assets')
          .update({
            jenis_asset: formData.jenis_asset,
            harga_asset: hargaAsset,
            tanggal_perolehan: formData.tanggal_perolehan
          })
          .eq('id', editingAsset.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Asset berhasil diupdate",
        });
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([{
            jenis_asset: formData.jenis_asset,
            harga_asset: hargaAsset,
            tanggal_perolehan: formData.tanggal_perolehan
          }]);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Asset berhasil ditambahkan",
        });
      }

      setFormData({ jenis_asset: "", harga_asset: "", tanggal_perolehan: "" });
      setEditingAsset(null);
      setIsDialogOpen(false);
      fetchAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan asset",
        variant: "destructive",
      });
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sellingAsset) return;
    
    const hargaJual = parseCurrency(sellFormData.harga_jual);
    const keuntungan = hargaJual - sellingAsset.harga_asset;
    
    if (hargaJual <= 0 || !sellFormData.tanggal_jual) {
      toast({
        title: "Error",
        description: "Harga jual dan tanggal jual harus diisi dengan benar",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('assets')
        .update({
          status: 'terjual',
          harga_jual: hargaJual,
          tanggal_jual: sellFormData.tanggal_jual,
          keuntungan: keuntungan
        })
        .eq('id', sellingAsset.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Asset berhasil dijual",
      });

      setSellFormData({ harga_jual: "", tanggal_jual: "" });
      setSellingAsset(null);
      setIsSellDialogOpen(false);
      fetchAssets();
    } catch (error) {
      console.error('Error selling asset:', error);
      toast({
        title: "Error",
        description: "Gagal menjual asset",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      jenis_asset: asset.jenis_asset,
      harga_asset: formatCurrency(asset.harga_asset.toString()),
      tanggal_perolehan: formatDateToInput(asset.tanggal_perolehan),
    });
    setIsDialogOpen(true);
  };

  const handleSell = (asset: Asset) => {
    setSellingAsset(asset);
    setSellFormData({
      harga_jual: "",
      tanggal_jual: new Date().toISOString().split('T')[0]
    });
    setIsSellDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Asset berhasil dihapus",
      });
      
      fetchAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus asset",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ jenis_asset: "", harga_asset: "", tanggal_perolehan: "" });
    setEditingAsset(null);
  };

  const getRowNumber = (index: number) => {
    return (currentPage - 1) * 7 + index + 1;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    pages.push(
      <PaginationItem key="prev">
        <PaginationPrevious 
          onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
    );

    if (startPage > 1) {
      pages.push(
        <PaginationItem key={1}>
          <PaginationLink 
            onClick={() => goToPage(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
      
      if (startPage > 2) {
        pages.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => goToPage(i)}
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink 
            onClick={() => goToPage(totalPages)}
            isActive={currentPage === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    pages.push(
      <PaginationItem key="next">
        <PaginationNext 
          onClick={() => currentPage < totalPages && goToPage(currentPage + 1)}
          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
    );

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          {pages}
        </PaginationContent>
      </Pagination>
    );
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Master Assets
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola data asset perusahaan
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? "Edit Asset" : "Tambah Asset Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="jenis_asset">Jenis Asset</Label>
                <Input
                  id="jenis_asset"
                  value={formData.jenis_asset}
                  onChange={(e) => setFormData({...formData, jenis_asset: e.target.value})}
                  placeholder="Masukkan jenis asset"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="harga_asset">Harga Asset (Rp)</Label>
                <Input
                  id="harga_asset"
                  value={formData.harga_asset}
                  onChange={(e) => setFormData({...formData, harga_asset: handleCurrencyInput(e.target.value)})}
                  placeholder="1.000.000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tanggal_perolehan">Tanggal Perolehan (DD/MM/YYYY)</Label>
                <Input
                  id="tanggal_perolehan"
                  type="date"
                  value={formData.tanggal_perolehan}
                  onChange={(e) => setFormData({...formData, tanggal_perolehan: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingAsset ? "Update" : "Simpan"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Batal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sell Dialog */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jual Asset</DialogTitle>
          </DialogHeader>
          {sellingAsset && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold">Informasi Asset:</h4>
                <p><strong>Nama Asset:</strong> {sellingAsset.jenis_asset}</p>
                <p><strong>Harga Beli:</strong> {formatCurrency(sellingAsset.harga_asset.toString())}</p>
                <p><strong>Tanggal Perolehan:</strong> {formatDateToDisplay(sellingAsset.tanggal_perolehan)}</p>
              </div>
              
              <form onSubmit={handleSellSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="harga_jual">Harga Jual (Rp)</Label>
                  <Input
                    id="harga_jual"
                    value={sellFormData.harga_jual}
                    onChange={(e) => setSellFormData({...sellFormData, harga_jual: handleCurrencyInput(e.target.value)})}
                    placeholder="1.000.000"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tanggal_jual">Tanggal Jual (DD/MM/YYYY)</Label>
                  <Input
                    id="tanggal_jual"
                    type="date"
                    value={sellFormData.tanggal_jual}
                    onChange={(e) => setSellFormData({...sellFormData, tanggal_jual: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Jual Asset
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsSellDialogOpen(false)}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Assets</span>
            <span className="text-sm font-normal text-gray-500">
              Total: {totalItems} assets | Halaman {currentPage} dari {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Jenis Asset</TableHead>
                <TableHead>Harga Beli</TableHead>
                <TableHead>Tanggal Perolehan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Harga Jual</TableHead>
                <TableHead>Tanggal Jual</TableHead>
                <TableHead>Keuntungan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    Tidak ada data asset
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((asset, index) => (
                  <TableRow key={asset.id}>
                    <TableCell>{getRowNumber(index)}</TableCell>
                    <TableCell className="font-medium">{asset.jenis_asset}</TableCell>
                    <TableCell>{formatCurrency(asset.harga_asset.toString())}</TableCell>
                    <TableCell>{formatDateToDisplay(asset.tanggal_perolehan)}</TableCell>
                    <TableCell>
                      <Badge variant={asset.status === 'terjual' ? 'destructive' : 'default'}>
                        {asset.status === 'terjual' ? 'Terjual' : 'Tersedia'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {asset.harga_jual ? formatCurrency(asset.harga_jual.toString()) : '-'}
                    </TableCell>
                    <TableCell>
                      {asset.tanggal_jual ? formatDateToDisplay(asset.tanggal_jual) : '-'}
                    </TableCell>
                    <TableCell>
                      {asset.keuntungan ? (
                        <span className={asset.keuntungan >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(asset.keuntungan.toString())}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {asset.status !== 'terjual' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSell(asset)}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(asset)}
                          disabled={asset.status === 'terjual'}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetPage;