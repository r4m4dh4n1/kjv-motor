import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Building } from "lucide-react";
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

type Brand = Tables<"brands">;

const BrandsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState("");
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
  } = usePagination(brands, 10);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setBrands(data || []);
      resetPage(); // Reset ke halaman 1 setelah fetch data
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data brands",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!brandName.trim()) {
      toast({
        title: "Error",
        description: "Nama brand tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update({ name: brandName })
          .eq('id', editingBrand.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Brand berhasil diupdate",
        });
      } else {
        const { error } = await supabase
          .from('brands')
          .insert([{ name: brandName }]);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Brand berhasil ditambahkan",
        });
      }

      setBrandName("");
      setEditingBrand(null);
      setIsDialogOpen(false);
      fetchBrands();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan brand",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandName(brand.name);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Brand berhasil dihapus",
      });
      
      fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus brand",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setBrandName("");
    setEditingBrand(null);
  };

  // Fungsi untuk menghitung nomor urut berdasarkan halaman
  const getRowNumber = (index: number) => {
    return (currentPage - 1) * 10 + index + 1;
  };

  // Fungsi untuk render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Previous button
    pages.push(
      <PaginationItem key="prev">
        <PaginationPrevious 
          onClick={() => currentPage > 1 && goToPage(currentPage - 1)}
          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
    );

    // First page
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

    // Page numbers
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

    // Last page
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

    // Next button
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
            <Building className="w-8 h-8 text-blue-600" />
            Master Brands
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola data brand motor
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBrand ? "Edit Brand" : "Tambah Brand Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="brandName">Nama Brand</Label>
                <Input
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Masukkan nama brand"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingBrand ? "Update" : "Simpan"}
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Brands</span>
            <span className="text-sm font-normal text-gray-500">
              Total: {totalItems} brands | Halaman {currentPage} dari {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nama Brand</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    Tidak ada data brand
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((brand, index) => (
                  <TableRow key={brand.id}>
                    <TableCell>{getRowNumber(index)}</TableCell>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(brand)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(brand.id)}
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
          
          {/* Pagination Component */}
          {renderPagination()}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandsPage;