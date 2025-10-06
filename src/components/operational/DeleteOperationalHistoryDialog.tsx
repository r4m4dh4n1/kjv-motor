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

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Simple search for operational_history records
      let query = supabase
        .from('operational_history')
        .select('*')
        .eq('divisi', selectedDivision);

      if (searchFilters.month) {
        query = query.eq('closed_month', parseInt(searchFilters.month));
      }
      
      if (searchFilters.year) {
        query = query.eq('closed_year', parseInt(searchFilters.year));
      }

      const { data, error } = await query;

      if (error) throw error;

      toast({
        title: "Pencarian Selesai",
        description: `Ditemukan ${data?.length || 0} record operational_history untuk divisi ${selectedDivision}.`,
      });

    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: "Error",
        description: `Gagal mencari data: ${error.message}`,
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
                  <SelectItem value="">Semua Bulan</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={`month-${i + 1}`} value={(i + 1).toString()}>
                      {new Date(2024, i).toLocaleDateString('id-ID', { month: 'long' })}
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
                  <SelectItem value="">Semua Tahun</SelectItem>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={`year-${year}`} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
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