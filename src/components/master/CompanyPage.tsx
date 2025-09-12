import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Building, DollarSign, History, Settings } from "lucide-react"; // Tambahkan Settings icon
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
import ModalHistoryPage from "./ModalHistoryPage";
import { Textarea } from "@/components/ui/textarea"; // Tambahkan import Textarea
import { formatNumber, parseFormattedNumber, handleNumericInput, formatCurrency } from '@/utils/formatUtils'; // Tambahkan import utils

type Company = Tables<"companies">;
type ModalHistory = Tables<"modal_history">;

interface CompanyPageProps {
  selectedDivision: string;
}

const CompanyPage = ({ selectedDivision }: CompanyPageProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [modalHistory, setModalHistory] = useState<ModalHistory[]>([]);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [nomorRekening, setNomorRekening] = useState("");
  const [modal, setModal] = useState("");
  const [divisi, setDivisi] = useState<"" | "sport" | "start">("");
  const [status, setStatus] = useState<"" | "active" | "passive">("");
  const [loading, setLoading] = useState(true);
  
  // Modal injection states
  const [isModalInjectionOpen, setIsModalInjectionOpen] = useState(false);
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState<Company | null>(null);
  const [modalAmount, setModalAmount] = useState("");
  const [modalDescription, setModalDescription] = useState("");

   // Modal adjustment states
  const [isModalAdjustmentOpen, setIsModalAdjustmentOpen] = useState(false);
  const [selectedCompanyForAdjustment, setSelectedCompanyForAdjustment] = useState<Company | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [formattedAdjustmentAmount, setFormattedAdjustmentAmount] = useState("");
  const [adjustmentDescription, setAdjustmentDescription] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"increase" | "decrease">("increase");
  
  const { toast } = useToast();

  // Implementasi pagination dengan 7 items per halaman
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
    totalItems
  } = usePagination(companies, 7);

  useEffect(() => {
    fetchCompanies();
  }, [selectedDivision]);

  const fetchCompanies = async () => {
    try {
      let query = supabase.from('companies').select('*');
      
      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }
      
      const { data, error } = await query.order('id', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
      resetPage();
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data perusahaan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim() || !nomorRekening.trim() || !modal.trim() || !divisi || !status) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const modalValue = parseFloat(modal);
      if (isNaN(modalValue)) {
        toast({
          title: "Error",
          description: "Modal harus berupa angka",
          variant: "destructive",
        });
        return;
      }

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({ 
            nama_perusahaan: companyName,
            nomor_rekening: nomorRekening,
            modal: modalValue,
            divisi: divisi,
            status: status
          })
          .eq('id', editingCompany.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Perusahaan berhasil diupdate",
        });
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([{ 
            nama_perusahaan: companyName,
            nomor_rekening: nomorRekening,
            modal: modalValue,
            divisi: divisi,
            status: status
          }]);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Perusahaan berhasil ditambahkan",
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      toast({
        title: "Error",
        description: "Gagal menyimpan perusahaan",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setCompanyName(company.nama_perusahaan);
    setNomorRekening(company.nomor_rekening);
    setModal(company.modal.toString());
    setDivisi(company.divisi as "sport" | "start");
    setStatus(company.status as "active" | "passive");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Perusahaan berhasil dihapus",
      });
      
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus perusahaan",
        variant: "destructive",
      });
    }
  };

  const handleModalInjection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyForModal || !modalAmount.trim() || !modalDescription.trim()) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(modalAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error",
          description: "Jumlah modal harus berupa angka positif",
          variant: "destructive",
        });
        return;
      }

      // Insert modal history
      const { error: historyError } = await supabase
        .from('modal_history')
        .insert([{
          company_id: selectedCompanyForModal.id,
          jumlah: amount,
          keterangan: modalDescription,
          tanggal: new Date().toISOString().split('T')[0]
        }]);

      if (historyError) throw historyError;

      // Update company modal
      const newModal = selectedCompanyForModal.modal + amount;
      const { error: updateError } = await supabase
        .from('companies')
        .update({ modal: newModal })
        .eq('id', selectedCompanyForModal.id);

      if (updateError) throw updateError;

      toast({
        title: "Berhasil",
        description: `Modal berhasil ditambahkan sebesar ${formatCurrency(amount)}`,
      });

      setModalAmount("");
      setModalDescription("");
      setSelectedCompanyForModal(null);
      setIsModalInjectionOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error injecting modal:', error);
      toast({
        title: "Error",
        description: "Gagal menambahkan modal",
        variant: "destructive",
      });
    }
  };
  // Handler untuk formatting adjustment amount
  const handleAdjustmentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = handleNumericInput(value);
    const formattedValue = formatNumber(numericValue);
    
    setAdjustmentAmount(numericValue);
    setFormattedAdjustmentAmount(formattedValue);
  };

  const handleModalAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyForAdjustment || !adjustmentAmount.trim() || !adjustmentDescription.trim()) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFormattedNumber(formattedAdjustmentAmount || adjustmentAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Error",
          description: "Jumlah adjustment harus berupa angka positif",
          variant: "destructive",
        });
        return;
      }

      // Validasi untuk pengurangan modal
      if (adjustmentType === "decrease" && amount > selectedCompanyForAdjustment.modal) {
        toast({
          title: "Error",
          description: "Jumlah pengurangan tidak boleh melebihi modal saat ini",
          variant: "destructive",
        });
        return;
      }

      const finalAmount = adjustmentType === "decrease" ? -amount : amount;
      const actionText = adjustmentType === "decrease" ? "Pengurangan" : "Penambahan";

      // Insert modal history
      const { error: historyError } = await supabase
        .from('modal_history')
        .insert([{
          company_id: selectedCompanyForAdjustment.id,
          jumlah: finalAmount,
          keterangan: `${actionText} Modal: ${adjustmentDescription}`,
          tanggal: new Date().toISOString().split('T')[0]
        }]);

      if (historyError) throw historyError;

      // Update company modal
      const newModal = selectedCompanyForAdjustment.modal + finalAmount;
      const { error: updateError } = await supabase
        .from('companies')
        .update({ modal: newModal })
        .eq('id', selectedCompanyForAdjustment.id);

      if (updateError) throw updateError;

      toast({
        title: "Berhasil",
        description: `Modal berhasil ${adjustmentType === "decrease" ? "dikurangi" : "ditambahkan"} sebesar ${formatCurrency(amount)}`,
      });

      setAdjustmentAmount("");
      setFormattedAdjustmentAmount("");
      setAdjustmentDescription("");
      setAdjustmentType("increase");
      setSelectedCompanyForAdjustment(null);
      setIsModalAdjustmentOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error adjusting modal:', error);
      toast({
        title: "Error",
        description: "Gagal melakukan adjustment modal",
        variant: "destructive",
      });
    }
  };

  const handleViewHistory = async (company: Company) => {
    try {
      const { data, error } = await supabase
        .from('modal_history')
        .select('*')
        .eq('company_id', company.id)
        .order('tanggal', { ascending: false });

      if (error) throw error;

      setSelectedCompany(company);
      setModalHistory(data || []);
      setIsHistoryOpen(true);
    } catch (error) {
      console.error('Error fetching modal history:', error);
      toast({
        title: "Error",
        description: "Gagal memuat history modal",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setCompanyName("");
    setNomorRekening("");
    setModal("");
    setDivisi("");
    setStatus("");
    setEditingCompany(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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
            <Building className="w-8 h-8 text-blue-600" />
            Master Perusahaan
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola data perusahaan dan modal
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Perusahaan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Edit Perusahaan" : "Tambah Perusahaan Baru"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="companyName">Nama Perusahaan</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Masukkan nama perusahaan"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="nomorRekening">Nomor Rekening</Label>
                <Input
                  id="nomorRekening"
                  value={nomorRekening}
                  onChange={(e) => setNomorRekening(e.target.value)}
                  placeholder="Masukkan nomor rekening"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="modal">Modal</Label>
                <Input
                  id="modal"
                  type="number"
                  value={modal}
                  onChange={(e) => setModal(e.target.value)}
                  placeholder="Masukkan modal"
                  className="mt-1"
                />
              </div>
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
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: "active" | "passive") => setStatus(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="passive">Passive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  {editingCompany ? "Update" : "Simpan"}
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
            <span>Daftar Perusahaan</span>
            <span className="text-sm font-normal text-gray-500">
              Total: {totalItems} perusahaan | Halaman {currentPage} dari {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nama Perusahaan</TableHead>
                <TableHead>No. Rekening</TableHead>
                <TableHead>Modal</TableHead>
                <TableHead>Divisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Tidak ada data perusahaan
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((company, index) => (
                  <TableRow key={company.id}>
                    <TableCell>{getRowNumber(index)}</TableCell>
                    <TableCell className="font-medium">{company.nama_perusahaan}</TableCell>
                    <TableCell>{company.nomor_rekening}</TableCell>
                    <TableCell>{formatCurrency(company.modal)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        company.divisi === 'sport' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {company.divisi}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        company.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCompanyForModal(company);
                            setIsModalInjectionOpen(true);
                          }}
                          title="Suntik Modal"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCompanyForAdjustment(company);
                            setIsModalAdjustmentOpen(true);
                          }}
                          title="Adjustment Modal"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewHistory(company)}
                          title="Lihat History Modal"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(company)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(company.id)}
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

      {/* Modal Injection Dialog */}
      <Dialog open={isModalInjectionOpen} onOpenChange={setIsModalInjectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Suntik Modal - {selectedCompanyForModal?.nama_perusahaan}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModalInjection} className="space-y-4">
            <div>
              <Label htmlFor="modalAmount">Jumlah Modal</Label>
              <Input
                id="modalAmount"
                type="number"
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                placeholder="Masukkan jumlah modal"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="modalDescription">Keterangan</Label>
              <Input
                id="modalDescription"
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                placeholder="Masukkan keterangan"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Suntik Modal
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsModalInjectionOpen(false);
                  setModalAmount("");
                  setModalDescription("");
                  setSelectedCompanyForModal(null);
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Adjustment Dialog */}
      <Dialog open={isModalAdjustmentOpen} onOpenChange={setIsModalAdjustmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Adjustment Modal - {selectedCompanyForAdjustment?.nama_perusahaan}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleModalAdjustment} className="space-y-4">
            {selectedCompanyForAdjustment && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Modal saat ini: <span className="font-semibold">{formatCurrency(selectedCompanyForAdjustment.modal)}</span>
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="adjustmentType">Tipe Adjustment</Label>
              <Select value={adjustmentType} onValueChange={(value: "increase" | "decrease") => setAdjustmentType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih tipe adjustment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Penambahan Modal</SelectItem>
                  <SelectItem value="decrease">Pengurangan Modal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="adjustmentAmount">Jumlah Adjustment</Label>
              <Input
                id="adjustmentAmount"
                type="text"
                value={formattedAdjustmentAmount || adjustmentAmount}
                onChange={handleAdjustmentAmountChange}
                placeholder="Masukkan jumlah adjustment (contoh: 1.000.000)"
                className="mt-1"
              />
              {formattedAdjustmentAmount && (
                <p className="text-xs text-gray-500 mt-1">
                  Nilai: {formatCurrency(parseFormattedNumber(formattedAdjustmentAmount))}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="adjustmentDescription">Keterangan</Label>
              <Textarea
                id="adjustmentDescription"
                value={adjustmentDescription}
                onChange={(e) => setAdjustmentDescription(e.target.value)}
                placeholder="Masukkan keterangan adjustment modal"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className={adjustmentType === "decrease" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {adjustmentType === "decrease" ? "Kurangi Modal" : "Tambah Modal"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsModalAdjustmentOpen(false);
                  setAdjustmentAmount("");
                  setFormattedAdjustmentAmount("");
                  setAdjustmentDescription("");
                  setAdjustmentType("increase");
                  setSelectedCompanyForAdjustment(null);
                }}
              >
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal History */}
      <ModalHistoryPage
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        company={selectedCompany}
        history={modalHistory}
      />
    </div>
  );
};

export default CompanyPage;
