import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Building, DollarSign, History, Minus } from "lucide-react";
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
import ModalReductionPage from "@/components/finance/ModalReductionPage";
import { formatNumber, parseFormattedNumber, handleNumericInput, formatCurrency } from "@/utils/formatUtils";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Company = Tables<"companies">;
type ModalHistory = Tables<"modal_history">;

interface CompanyPageProps {
  selectedDivision: string;
}

const CompanyPage = ({ selectedDivision }: CompanyPageProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  // Tambahkan state untuk user roles
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    nama_perusahaan: "",
    alamat: "",
    telepon: "",
    email: "",
    divisi: "",
    modal: "",
  });
  const [formattedModal, setFormattedModal] = useState("");
  const { toast } = useToast();

  // Modal injection states
  const [isModalInjectionOpen, setIsModalInjectionOpen] = useState(false);
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState<Company | null>(null);
  const [modalAmount, setModalAmount] = useState("");
  const [formattedModalAmount, setFormattedModalAmount] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  // Modal reduction states
  const [isModalReductionOpen, setIsModalReductionOpen] = useState(false);

  // History states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [modalHistory, setModalHistory] = useState<ModalHistory[]>([]);

  // Pagination
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedCompanies,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setData
  } = usePagination(companies, 10);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      
      // Fetch companies tanpa embedding
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .eq("divisi", selectedDivision)
        .order("created_at", { ascending: false });
  
      if (companiesError) throw companiesError;
  
      // Fetch user_roles secara terpisah
      const { data: userRolesData, error: userRolesError } = await supabase
        .from("user_roles")
        .select("user_id, role_id");
  
      if (userRolesError) throw userRolesError;
  
      // Fetch roles secara terpisah
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("role_id, role_name, permissions");
  
      if (rolesError) throw rolesError;
  
      // Manual join di JavaScript
      const userRolesWithDetails = userRolesData?.map(userRole => {
        const roleDetail = rolesData?.find(role => role.role_id === userRole.role_id);
        return {
          ...userRole,
          role_name: roleDetail?.role_name,
          permissions: roleDetail?.permissions
        };
      }) || [];
  
      // Fetch modal history to calculate current modal
      const { data: modalHistoryData, error: modalHistoryError } = await supabase
        .from("modal_history")
        .select("company_id, jumlah")
        .in("company_id", companiesData?.map(c => c.id) || []);
  
      if (modalHistoryError) throw modalHistoryError;
  
      // Calculate current modal for each company
      const companiesWithCurrentModal = companiesData?.map(company => {
        const companyHistory = modalHistoryData?.filter(h => h.company_id === company.id) || [];
        const totalModalFromHistory = companyHistory.reduce((sum, h) => sum + (h.jumlah || 0), 0);
        
        return {
          ...company,
          current_modal: totalModalFromHistory
        };
      }) || [];
  
      setCompanies(companiesWithCurrentModal);
      setData(companiesWithCurrentModal);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Error",
        description: "Gagal mengambil data perusahaan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDivision) {
      fetchCompanies();
    }
  }, [selectedDivision]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const modalValue = parseFormattedNumber(formattedModal || formData.modal);
      
      const companyData = {
        nama_perusahaan: formData.nama_perusahaan,
        alamat: formData.alamat,
        telepon: formData.telepon,
        email: formData.email,
        divisi: formData.divisi || selectedDivision,
        modal: modalValue,
      };

      if (editingCompany) {
        const { error } = await supabase
          .from("companies")
          .update(companyData)
          .eq("id", editingCompany.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Perusahaan berhasil diperbarui",
        });
      } else {
        const { data: newCompany, error } = await supabase
          .from("companies")
          .insert([companyData])
          .select()
          .single();

        if (error) throw error;

        // Insert initial modal to modal_history
        if (modalValue > 0) {
          const { error: historyError } = await supabase
            .from("modal_history")
            .insert({
              company_id: newCompany.id,
              jumlah: modalValue,
              keterangan: "Modal awal perusahaan",
              jenis_transaksi: "injection"
            });

          if (historyError) throw historyError;
        }

        toast({
          title: "Berhasil",
          description: "Perusahaan berhasil ditambahkan",
        });
      }

      setIsDialogOpen(false);
      setEditingCompany(null);
      setFormData({
        nama_perusahaan: "",
        alamat: "",
        telepon: "",
        email: "",
        divisi: "",
        modal: "",
      });
      setFormattedModal("");
      fetchCompanies();
    } catch (error) {
      console.error("Error saving company:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan perusahaan",
        variant: "destructive",
      });
    }
  };

  const handleModalInjection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCompanyForModal || !modalAmount || !modalDescription) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFormattedNumber(formattedModalAmount || modalAmount);
      
      if (amount <= 0) {
        toast({
          title: "Error",
          description: "Jumlah modal harus lebih dari 0",
          variant: "destructive",
        });
        return;
      }

      // Insert to modal_history only (mutable modal approach)
      const { error: historyError } = await supabase
        .from("modal_history")
        .insert({
          company_id: selectedCompanyForModal.id,
          jumlah: amount, // Positive value for injection
          keterangan: modalDescription,
          jenis_transaksi: "injection"
        });

      if (historyError) throw historyError;

      toast({
        title: "Berhasil",
        description: `Modal berhasil disuntikkan ke ${selectedCompanyForModal.nama_perusahaan}`,
      });

      // Reset form and close dialog
      setIsModalInjectionOpen(false);
      setModalAmount("");
      setFormattedModalAmount("");
      setModalDescription("");
      setSelectedCompanyForModal(null);
      
      // Refresh companies data
      fetchCompanies();
    } catch (error) {
      console.error("Error injecting modal:", error);
      toast({
        title: "Error",
        description: "Gagal menyuntikkan modal",
        variant: "destructive",
      });
    }
  };

  const handleViewHistory = async (company: Company) => {
    try {
      const { data, error } = await supabase
        .from("modal_history")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setModalHistory(data || []);
      setSelectedCompany(company);
      setIsHistoryOpen(true);
    } catch (error) {
      console.error("Error fetching modal history:", error);
      toast({
        title: "Error",
        description: "Gagal mengambil riwayat modal",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      nama_perusahaan: company.nama_perusahaan || "",
      alamat: company.alamat || "",
      telepon: company.telepon || "",
      email: company.email || "",
      divisi: company.divisi || "",
      modal: company.modal?.toString() || "",
    });
    setFormattedModal(company.modal ? formatNumber(company.modal) : "");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus perusahaan ini?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Perusahaan berhasil dihapus",
      });
      
      fetchCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus perusahaan",
        variant: "destructive",
      });
    }
  };

  const handleModalChange = (value: string) => {
    const result = handleNumericInput(value);
    setFormData({ ...formData, modal: result.rawValue });
    setFormattedModal(result.formattedValue);
  };

  const handleModalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = handleNumericInput(e.target.value);
    setModalAmount(result.rawValue);
    setFormattedModalAmount(result.formattedValue);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    return (
      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={goToPreviousPage}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {getVisiblePages().map((page, index) => (
              <PaginationItem key={index}>
                {page === '...' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => goToPage(page as number)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                onClick={goToNextPage}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Manajemen Perusahaan - {selectedDivision}
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Perusahaan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCompany ? "Edit Perusahaan" : "Tambah Perusahaan"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nama_perusahaan">Nama Perusahaan</Label>
                    <Input
                      id="nama_perusahaan"
                      value={formData.nama_perusahaan}
                      onChange={(e) => setFormData({ ...formData, nama_perusahaan: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="alamat">Alamat</Label>
                    <Input
                      id="alamat"
                      value={formData.alamat}
                      onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telepon">Telepon</Label>
                    <Input
                      id="telepon"
                      value={formData.telepon}
                      onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="divisi">Divisi</Label>
                    <Select
                      value={formData.divisi || selectedDivision}
                      onValueChange={(value) => setFormData({ ...formData, divisi: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih divisi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Motor">Motor</SelectItem>
                        <SelectItem value="Mobil">Mobil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="modal">Modal Awal</Label>
                    <Input
                      id="modal"
                      type="text"
                      value={formattedModal || formData.modal}
                      onChange={(e) => handleModalChange(e.target.value)}
                      placeholder="Masukkan modal awal (contoh: 1.000.000)"
                      className="mt-1"
                    />
                    {formattedModal && (
                      <p className="text-xs text-gray-500 mt-1">
                        Nilai: {formatCurrency(parseFormattedNumber(formattedModal))}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingCompany ? "Perbarui" : "Tambah"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingCompany(null);
                        setFormData({
                          nama_perusahaan: "",
                          alamat: "",
                          telepon: "",
                          email: "",
                          divisi: "",
                          modal: "",
                        });
                        setFormattedModal("");
                      }}
                      className="flex-1"
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Perusahaan</TableHead>
                <TableHead className="hidden md:table-cell">Alamat</TableHead>
                <TableHead className="hidden lg:table-cell">Telepon</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead>Modal Saat Ini</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Tidak ada data perusahaan
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      {company.nama_perusahaan}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {company.alamat || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {company.telepon || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {company.email || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(company.current_modal || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {/* Desktop buttons */}
                        <div className="hidden md:flex gap-1">
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
                              setSelectedCompanyForModal(company);
                              setIsModalReductionOpen(true);
                            }}
                            title="Adjustment Modal"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewHistory(company)}
                            title="History Modal"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(company)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(company.id)}
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Mobile dropdown - more compact */}
                        <div className="flex md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="px-2">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCompanyForModal(company);
                                  setIsModalInjectionOpen(true);
                                }}
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Suntik Modal
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCompanyForModal(company);
                                  setIsModalReductionOpen(true);
                                }}
                              >
                                <Minus className="w-4 h-4 mr-2" />
                                Adjustment Modal
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleViewHistory(company)}
                              >
                                <History className="w-4 h-4 mr-2" />
                                History Modal
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(company)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(company.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
                type="text"
                value={formattedModalAmount || modalAmount}
                onChange={handleModalAmountChange}
                placeholder="Masukkan jumlah modal (contoh: 1.000.000)"
                className="mt-1"
              />
              {formattedModalAmount && (
                <p className="text-xs text-gray-500 mt-1">
                  Nilai: {formatCurrency(parseFormattedNumber(formattedModalAmount))}
                </p>
              )}
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
                  setFormattedModalAmount("");
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

      {/* Modal Reduction Dialog */}
      <Dialog open={isModalReductionOpen} onOpenChange={setIsModalReductionOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Minus className="w-5 h-5" />
              Adjustment Modal Perusahaan
            </DialogTitle>
          </DialogHeader>
          <ModalReductionPage 
            preSelectedCompany={selectedCompanyForModal}
            onClose={() => {
              setIsModalReductionOpen(false);
              setSelectedCompanyForModal(null);
              fetchCompanies(); // Refresh data after modal reduction
            }}
          />
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