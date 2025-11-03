import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DeleteOperationalHistoryDialogProps {
  selectedDivision: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface OperationalHistoryRecord {
  id: string;
  tanggal: string;
  kategori: string;
  deskripsi: string;
  nominal: number;
  divisi: string;
  cabang_id: number;
  company_id: number;
  closed_month: number;
  closed_year: number;
  closed_at: string;
  created_at: string;
  updated_at: string;
}

const DeleteOperationalHistoryDialog = ({ 
  selectedDivision, 
  onSuccess,
  trigger 
}: DeleteOperationalHistoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<OperationalHistoryRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    month: '',
    year: ''
  });
  const { toast } = useToast();

  // Define months array to avoid potential rendering issues
  const months = [
    { value: "1", label: "Januari" },
    { value: "2", label: "Februari" },
    { value: "3", label: "Maret" },
    { value: "4", label: "April" },
    { value: "5", label: "Mei" },
    { value: "6", label: "Juni" },
    { value: "7", label: "Juli" },
    { value: "8", label: "Agustus" },
    { value: "9", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" }
  ];

  // Define years array to avoid potential rendering issues
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - i).toString(),
    label: (currentYear - i).toString()
  }));

  const handleSearch = async () => {
    if (!selectedDivision) {
      toast({
        title: "Error",
        description: "Divisi harus dipilih terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Search for operational_history records
      let query = supabase
        .from('operational_history')
        .select('*')
        .eq('divisi', selectedDivision)
        .order('created_at', { ascending: false });

      if (searchFilters.month && searchFilters.month !== 'all') {
        query = query.eq('closed_month', parseInt(searchFilters.month));
      }
      
      if (searchFilters.year && searchFilters.year !== 'all') {
        query = query.eq('closed_year', parseInt(searchFilters.year));
      }

      const { data, error } = await query;

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      setSearchResults(data || []);
      setShowResults(true);

      toast({
        title: "Pencarian Selesai",
        description: `Ditemukan ${data?.length || 0} record operational_history untuk divisi ${selectedDivision}.`,
      });

    } catch (error: any) {
      console.error('Error searching:', error);
      toast({
        title: "Error",
        description: `Gagal mencari data: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus record ini?')) {
      return;
    }

    setDeletingId(recordId);
    try {
      console.log('Attempting to delete record with ID:', recordId);

      // Delete the record directly
      const { error, data } = await supabase
        .from('operational_history')
        .delete()
        .eq('id', recordId)
        .select();

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Delete operation completed, deleted data:', data);

      // Check if any records were actually deleted
      if (!data || data.length === 0) {
        console.warn('No records were deleted - record may not exist');
        throw new Error('Record tidak ditemukan atau sudah dihapus');
      }

      console.log('Deletion successful:', data.length, 'record(s) deleted');

      // Refresh data by performing search again to ensure UI is up-to-date
      console.log('Refreshing data after successful deletion...');
      
      // Re-run the search to get updated results from database
      let refreshQuery = supabase
        .from('operational_history')
        .select('*')
        .eq('divisi', selectedDivision)
        .order('created_at', { ascending: false });

      if (searchFilters.month && searchFilters.month !== 'all') {
        refreshQuery = refreshQuery.eq('closed_month', parseInt(searchFilters.month));
      }
      
      if (searchFilters.year && searchFilters.year !== 'all') {
        refreshQuery = refreshQuery.eq('closed_year', parseInt(searchFilters.year));
      }

      const { data: refreshedData, error: refreshError } = await refreshQuery;

      if (refreshError) {
        console.error('Error refreshing data:', refreshError);
        // Fallback to local state update if refresh fails
        setSearchResults(prev => prev.filter(record => record.id !== recordId));
      } else {
        console.log('Data refreshed successfully, new count:', refreshedData?.length || 0);
        setSearchResults(refreshedData || []);
      }

      toast({
        title: "Berhasil",
        description: "Record berhasil dihapus dari database",
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: `Gagal menghapus record: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMonthName = (monthNumber: number) => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return monthNames[monthNumber - 1] || monthNumber.toString();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Duplikat History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Hapus Duplikat Operational History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Perhatian:</strong> Fitur ini hanya menghapus data dari tabel operational_history. 
              Data pembukuan dan modal perusahaan tidak akan terpengaruh.
            </AlertDescription>
          </Alert>

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="division">Divisi</Label>
              <Input
                id="division"
                value={selectedDivision}
                disabled
                className="bg-gray-50"
              />
            </div>
            
            <div>
              <Label htmlFor="month">Bulan (Opsional)</Label>
              <Select value={searchFilters.month} onValueChange={(value) => 
                setSearchFilters(prev => ({ ...prev, month: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year">Tahun (Opsional)</Label>
              <Select value={searchFilters.year} onValueChange={(value) => 
                setSearchFilters(prev => ({ ...prev, year: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleSearch} 
              disabled={loading || !selectedDivision}
              className="w-full md:w-auto"
            >
              {loading ? "Mencari..." : "Cari Data Operational History"}
            </Button>
          </div>

          {/* Search Results Table */}
          {showResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Hasil Pencarian ({searchResults.length} record)
                </h3>
                {searchResults.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResults(false)}
                  >
                    Sembunyikan Hasil
                  </Button>
                )}
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data ditemukan untuk kriteria pencarian yang dipilih.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Nominal</TableHead>
                        <TableHead>Tanggal Dibuat</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {getMonthName(record.closed_month)} {record.closed_year}
                          </TableCell>
                          <TableCell>{record.kategori}</TableCell>
                          <TableCell className="max-w-xs truncate" title={record.deskripsi}>
                            {record.deskripsi}
                          </TableCell>
                          <TableCell>{record.company_id}</TableCell>
                          <TableCell>{formatCurrency(record.nominal)}</TableCell>
                          <TableCell>{formatDate(record.created_at)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteRecord(record.id)}
                              disabled={deletingId === record.id}
                            >
                              {deletingId === record.id ? (
                                "Menghapus..."
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Hapus
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteOperationalHistoryDialog;