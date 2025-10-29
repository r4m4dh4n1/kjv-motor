import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Car } from "lucide-react";
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

type JenisMotor = Tables<"jenis_motor">;
type Brand = Tables<"brands">;

interface JenisMotorPageProps {
  selectedDivision: string;
}

const JenisMotorPage = ({ selectedDivision }: JenisMotorPageProps) => {
  const [jenisMotor, setJenisMotor] = useState<JenisMotor[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJenisMotor, setEditingJenisMotor] = useState<JenisMotor | null>(null);
  const [jenisMotorName, setJenisMotorName] = useState("");
  const [brandId, setBrandId] = useState("");
  const [divisi, setDivisi] = useState<"" | "sport" | "start">("");
  const [qty, setQty] = useState("");
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
  } = usePagination(jenisMotor, 7);

  useEffect(() => {
    fetchData();
  }, [selectedDivision]);

  const fetchData = async () => {
    try {
      let jenisMotorQuery = supabase.from('jenis_motor').select('*');
      
      if (selectedDivision !== 'all') {
        jenisMotorQuery = jenisMotorQuery.eq('divisi', selectedDivision);
      }
      
      const [jenisMotorResult, brandsResult] = await Promise.all([
        jenisMotorQuery.order('id', { ascending: true }),
        supabase.from('brands').select('*').order('name', { ascending: true })
      ]);

      if (jenisMotorResult.error) throw jenisMotorResult.error;
      if (brandsResult.error) throw brandsResult.error;

      setJenisMotor(jenisMotorResult.data || []);
      setBrands(brandsResult.data || []);
      resetPage();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBrandName = (brandId: number) => {
    const brand = brands.find(b => b.id === brandId);
    return brand ? brand.name : 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ubah validasi quantity menjadi optional
    const qtyNumber = qty ? parseInt(qty) : 0; // Default ke 0 jika kosong
    
    if (!divisi || !brandId || !jenisMotorName) {
      toast({
        title: "Error",
        description: "Divisi, Brand, dan Jenis Motor harus diisi",
        variant: "destructive",
      });
      return;
    }
    
    // Validasi quantity hanya jika diisi
    if (qty && (isNaN(qtyNumber) || qtyNumber < 0)) {
      toast({
        title: "Error", 
        description: "Quantity harus berupa angka positif",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingJenisMotor) {
        const { error } = await supabase
          .from('jenis_motor')
          .update({
            divisi: divisi,
            brand_id: parseInt(brandId),
            jenis_motor: jenisMotorName,
            qty: qtyNumber
          })
          .eq('id', editingJenisMotor.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Jenis motor berhasil diupdate",
        });
      } else {
        const { error } = await supabase
          .from('jenis_motor')
          .insert([{
            divisi: divisi,
            brand_id: parseInt(brandId),
            jenis_motor: jenisMotorName,
            qty: qtyNumber
          }]);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Jenis motor berhasil ditambahkan",
        });
      }

      setJenisMotorName("");
      setBrandId("");
      setDivisi("");
      setQty("");
      setEditingJenisMotor(null);
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving jenis motor:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan jenis motor",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (jenisMotor: JenisMotor) => {
    setEditingJenisMotor(jenisMotor);
    setJenisMotorName(jenisMotor.jenis_motor);
    setBrandId(jenisMotor.brand_id.toString());
    setDivisi(jenisMotor.divisi as "sport" | "start");
    setQty(jenisMotor.qty.toString());
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('jenis_motor')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Jenis motor berhasil dihapus",
      });
      
      fetchData();
    } catch (error) {
      console.error('Error deleting jenis motor:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus jenis motor",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setJenisMotorName("");
    setBrandId("");
    setDivisi("");
    setQty("");
    setEditingJenisMotor(null);
  };

  // Fungsi untuk menghitung nomor urut berdasarkan halaman
  const getRowNumber = (index: number) => {
    return (currentPage - 1) * 7 + index + 1;
  };

  // Fungsi untuk render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
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
            <Car className="w-8 h-8 text-blue-600" />
            Master Jenis Motor
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola data jenis motor berdasarkan divisi {selectedDivision === 'all' ? 'semua' : selectedDivision}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Jenis Motor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingJenisMotor ? "Edit Jenis Motor" : "Tambah Jenis Motor Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="divisi">Divisi</Label>
                <Select value={divisi} onValueChange={(value: "sport" | "start") => setDivisi(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sport">Sport</SelectItem>
                    <SelectItem value="start">Start</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="brandId">Brand</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="jenisMotorName">Jenis Motor</Label>
                <Input
                  id="jenisMotorName"
                  value={jenisMotorName}
                  onChange={(e) => setJenisMotorName(e.target.value)}
                  placeholder="Masukkan jenis motor"
                  className="mt-1"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingJenisMotor ? "Update" : "Simpan"}
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
            <span>Daftar Jenis Motor</span>
            <span className="text-sm font-normal text-gray-500">
              Total: {totalItems} jenis motor | Halaman {currentPage} dari {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="px-3 py-2 h-10">No</TableHead>
              <TableHead className="px-3 py-2 h-10">Divisi</TableHead>
              <TableHead className="px-3 py-2 h-10">Brand</TableHead>
              <TableHead className="px-3 py-2 h-10">Jenis Motor</TableHead>
              <TableHead className="text-right px-3 py-2 h-10">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Tidak ada data jenis motor
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow key={item.id} className="h-12">
                  <TableCell className="px-3 py-2">{getRowNumber(index)}</TableCell>
                  <TableCell className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      item.divisi === 'sport' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.divisi.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium px-3 py-2">{getBrandName(item.brand_id)}</TableCell>
                  <TableCell className="px-3 py-2">{item.jenis_motor}</TableCell>
                  <TableCell className="text-right px-3 py-2">
                    <div className="flex gap-1.5 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

export default JenisMotorPage;