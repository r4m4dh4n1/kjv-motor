import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, DollarSign } from "lucide-react";
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
import type { Tables } from "@/integrations/supabase/types";

type Company = Tables<"companies">;
type ModalHistory = Tables<"modal_history">;

interface ModalHistoryPageProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
  history: ModalHistory[];
}

const ModalHistoryPage = ({ isOpen, onClose, company, history }: ModalHistoryPageProps) => {
  // Implementasi pagination dengan 7 items per halaman
  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    totalItems
  } = usePagination(history, 7);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            History Modal - {company?.nama_perusahaan}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada history suntik modal untuk perusahaan ini
            </div>
          ) : (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">Total Suntikan Modal</h3>
                      <p className="text-sm text-blue-700">
                        {history.length} kali suntikan modal | Halaman {currentPage} dari {totalPages}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(history.reduce((total, h) => total + h.jumlah, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Tidak ada data history modal
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{getRowNumber(index)}</TableCell>
                        <TableCell>{formatDate(item.tanggal)}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(item.jumlah)}
                        </TableCell>
                        <TableCell>{item.keterangan}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination Component */}
              {renderPagination()}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalHistoryPage;