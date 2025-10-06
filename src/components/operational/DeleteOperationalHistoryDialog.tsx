import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DeleteOperationalHistoryDialogProps {
  selectedDivision: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const DeleteOperationalHistoryDialog = ({ 
  selectedDivision, 
  onSuccess,
  trigger 
}: DeleteOperationalHistoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
      // Simple search for operational_history records
      let query = supabase
        .from('operational_history')
        .select('*')
        .eq('divisi', selectedDivision);

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

          {/* Info */}
          <div className="text-sm text-gray-600 text-center">
            <p>Fitur ini sedang dalam pengembangan.</p>
            <p>Saat ini hanya menampilkan jumlah record yang ditemukan.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteOperationalHistoryDialog;