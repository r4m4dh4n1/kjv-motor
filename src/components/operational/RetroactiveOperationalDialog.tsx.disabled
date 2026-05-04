import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle, DollarSign, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RetroactiveOperationalForm, AdjustmentImpact, RETROACTIVE_CATEGORIES } from "@/types/retroactive";

interface RetroactiveOperationalDialogProps {
  selectedDivision: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface Company {
  id: string;
  nama: string;
  modal: number;
  divisi: string;
}

const RetroactiveOperationalDialog = ({ 
  selectedDivision, 
  onSuccess,
  trigger 
}: RetroactiveOperationalDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [closedMonths, setClosedMonths] = useState<string[]>([]);
  const [impact, setImpact] = useState<AdjustmentImpact | null>(null);
  const [formData, setFormData] = useState<RetroactiveOperationalForm>({
    original_month: '',
    category: '',
    nominal: 0,
    description: '',
    company_id: '',
    notes: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCompanies();
      fetchClosedMonths();
    }
  }, [open, selectedDivision]);

  useEffect(() => {
    if (formData.company_id && formData.nominal > 0) {
      calculateImpact();
    } else {
      setImpact(null);
    }
  }, [formData.company_id, formData.nominal]);

  const fetchCompanies = async () => {
    try {
      let query = supabase
        .from('companies')
        .select('id, nama, modal, divisi')
        .order('nama');

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data company",
        variant: "destructive",
      });
    }
  };

  const fetchClosedMonths = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_closures')
        .select('month, year')
        .eq('status', 'closed')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      
      const months = data?.map(item => `${item.year}-${item.month.toString().padStart(2, '0')}`) || [];
      setClosedMonths(months);
    } catch (error) {
      console.error('Error fetching closed months:', error);
      toast({
        title: "Error", 
        description: "Gagal memuat data bulan yang sudah close",
        variant: "destructive",
      });
    }
  };

  const calculateImpact = async () => {
    try {
      const selectedCompany = companies.find(c => c.id === formData.company_id);
      if (!selectedCompany) return;

      const isKurangProfitCategory = formData.category === 'Gaji Kurang Profit';
      const profitImpact = isKurangProfitCategory ? formData.nominal : 0;
      const modalImpact = formData.nominal;

      setImpact({
        profit_impact: profitImpact,
        modal_impact: modalImpact,
        company_name: selectedCompany.nama,
        current_modal: selectedCompany.modal,
        new_modal: selectedCompany.modal - modalImpact
      });
    } catch (error) {
      console.error('Error calculating impact:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.original_month || !formData.category || !formData.company_id || formData.nominal <= 0) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!closedMonths.includes(formData.original_month)) {
      toast({
        title: "Error",
        description: "Bulan yang dipilih belum di-close atau tidak valid",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const [year, month] = formData.original_month.split('-');
      
      const { error } = await supabase
        .from('retroactive_operational')
        .insert({
          original_month: formData.original_month,
          original_year: parseInt(year),
          category: formData.category,
          nominal: formData.nominal,
          description: formData.description,
          company_id: formData.company_id,
          divisi: selectedDivision === 'all' ? companies.find(c => c.id === formData.company_id)?.divisi : selectedDivision,
          status: 'pending',
          notes: formData.notes,
          adjustment_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pengajuan retroactive operational berhasil dibuat dan menunggu approval",
      });

      setOpen(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting retroactive operational:', error);
      toast({
        title: "Error",
        description: "Gagal membuat pengajuan retroactive operational",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      original_month: '',
      category: '',
      nominal: 0,
      description: '',
      company_id: '',
      notes: ''
    });
    setImpact(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Retroactive Operational
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Retroactive Operational Adjustment
          </DialogTitle>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Fitur ini digunakan untuk mencatat transaksi operational yang perlu dimasukkan ke bulan yang sudah di-close. 
            Pengajuan akan memerlukan approval sebelum diterapkan.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="original_month">Bulan Target (Sudah Close)</Label>
              <Select
                value={formData.original_month}
                onValueChange={(value) => setFormData(prev => ({ ...prev, original_month: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan yang sudah close" />
                </SelectTrigger>
                <SelectContent>
                  {closedMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {formatMonth(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {RETROACTIVE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_id">Company</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.nama} - {formatCurrency(company.modal)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nominal">Nominal</Label>
              <Input
                id="nominal"
                type="number"
                value={formData.nominal || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, nominal: parseFloat(e.target.value) || 0 }))}
                placeholder="Masukkan nominal"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Deskripsi transaksi operational"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Catatan tambahan untuk approval"
              rows={2}
            />
          </div>

          {impact && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Dampak Adjustment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Company:</span>
                  <Badge variant="outline">{impact.company_name}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dampak Modal:</span>
                  <span className="text-sm font-medium text-red-600">
                    -{formatCurrency(impact.modal_impact)}
                  </span>
                </div>

                {impact.profit_impact > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dampak Profit:</span>
                    <span className="text-sm font-medium text-red-600">
                      -{formatCurrency(impact.profit_impact)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Modal Setelah Adjustment:</span>
                  <span className={`text-sm font-medium ${impact.new_modal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(impact.new_modal)}
                  </span>
                </div>

                {impact.new_modal < 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Peringatan: Modal company akan menjadi negatif setelah adjustment ini.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Ajukan Approval"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RetroactiveOperationalDialog;