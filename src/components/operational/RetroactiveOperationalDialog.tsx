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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, AlertTriangle, DollarSign, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RetroactiveOperationalForm, AdjustmentImpact, RETROACTIVE_CATEGORIES } from "@/types/retroactive";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RetroactiveOperationalDialogProps {
  selectedDivision: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface Company {
  id: number;
  nama_perusahaan: string;
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
  const [transactionDate, setTransactionDate] = useState<Date | undefined>();
  const [targetMonthDate, setTargetMonthDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState<RetroactiveOperationalForm>({
    original_month: '',
    category: '',
    nominal: 0,
    description: '',
    company_id: '',
    notes: '',
    divisi: selectedDivision === 'all' ? 'sport' : selectedDivision
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
        .select('id, nama_perusahaan, modal, divisi')
        .order('nama_perusahaan');

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
        .select('closure_month, closure_year')
        .order('closure_year', { ascending: false })
        .order('closure_month', { ascending: false });

      if (error) throw error;
      
      const months = data?.map(item => `${item.closure_year}-${item.closure_month.toString().padStart(2, '0')}`) || [];
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
      const selectedCompany = companies.find(c => c.id.toString() === formData.company_id);
      if (!selectedCompany) return;

      const isKurangProfitCategory = formData.category === 'Gaji Kurang Profit';
      const isOPGlobalCategory = formData.category === 'OP Global';
      const profitImpact = isKurangProfitCategory ? formData.nominal : 0;
      const modalImpact = isOPGlobalCategory ? formData.nominal : formData.nominal; // OP Global: modal dikurangi nominal penuh

      setImpact({
        profit_impact: profitImpact,
        modal_impact: modalImpact,
        company_name: selectedCompany.nama_perusahaan,
        current_modal: selectedCompany.modal,
        new_modal: selectedCompany.modal - modalImpact
      });
    } catch (error) {
      console.error('Error calculating impact:', error);
    }
  };

  // Check if category affects modal or profit
  const isModalReducingCategory = formData.category.includes('Kurang Modal');
  const isProfitReducingCategory = formData.category.includes('Kurang Profit');
  const isOPGlobalCategory = formData.category === 'OP Global';
  const isRetroactiveCategory = isModalReducingCategory || isProfitReducingCategory || isOPGlobalCategory;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation based on category type
    if (!formData.category || !formData.company_id || formData.nominal <= 0) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    // Validate target month for retroactive categories (both profit and modal)
    if (isRetroactiveCategory) {
      if (!targetMonthDate) {
        toast({
          title: "Error",
          description: "Bulan target wajib diisi untuk kategori retroaktif",
          variant: "destructive",
        });
        return;
      }

      const targetMonthYear = format(targetMonthDate, 'yyyy-MM');
      if (!closedMonths.includes(targetMonthYear)) {
        toast({
          title: "Error",
          description: "Bulan target yang dipilih belum di-close atau tidak valid",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      // Use today if transaction date is not provided
      const finalTransactionDate = transactionDate || new Date();
      const formattedTransactionDate = format(finalTransactionDate, 'yyyy-MM-dd');
      
      // For retroactive categories, use target month. Otherwise, use current month
      const formattedTargetDate = isRetroactiveCategory && targetMonthDate
        ? format(targetMonthDate, 'yyyy-MM-dd')
        : formattedTransactionDate;
      
      const categoryType = isProfitReducingCategory ? 'profit' : isModalReducingCategory ? 'modal' : 'normal';
      const descriptionSuffix = isRetroactiveCategory && targetMonthDate
        ? ` (Retroaktif ${categoryType === 'profit' ? 'Profit' : 'Modal'} - Masuk ke: ${format(targetMonthDate, 'MMMM yyyy', { locale: id })})`
        : '';
      
      // Insert into operational table with retroactive flag
      const { data: operationalData, error: operationalError } = await supabase
        .from('operational')
        .insert({
          tanggal: isModalReducingCategory ? formattedTargetDate : formattedTransactionDate, // Modal-reducing menggunakan target date
          original_month: formattedTargetDate,
          divisi: selectedDivision === 'all' ? companies.find(c => c.id.toString() === formData.company_id)?.divisi || 'sport' : selectedDivision,
          kategori: formData.category,
          deskripsi: `${formData.description}${descriptionSuffix}`,
          nominal: formData.nominal,
          cabang_id: 1,
          company_id: formData.company_id ? parseInt(formData.company_id) : null,
          is_retroactive: isRetroactiveCategory
        } as any)
        .select()
        .single();

      if (operationalError) throw operationalError;

      // ✅ KURANG MODAL: Catat di pembukuan sesuai BULAN TARGET (untuk laporan laba rugi)
      if (isModalReducingCategory) {
        // ✅ OP GLOBAL: Gunakan nominal penuh untuk pembukuan
        const pembukuanAmount = isOPGlobalCategory ? formData.nominal : formData.nominal;
        
        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert({
            tanggal: formattedTargetDate, // ✅ Menggunakan bulan target untuk laporan laba rugi
            divisi: selectedDivision === 'all' ? companies.find(c => c.id.toString() === formData.company_id)?.divisi || 'sport' : selectedDivision,
            keterangan: `${formData.category} - ${formData.description}${descriptionSuffix}${isOPGlobalCategory ? ' (OP Global - Nominal Penuh)' : ''}`,
            debit: pembukuanAmount,
            kredit: 0,
            cabang_id: 1,
            company_id: parseInt(formData.company_id)
          });

        if (pembukuanError) {
          console.error('Error creating pembukuan for Kurang Modal:', pembukuanError);
          toast({
            title: "Warning",
            description: "Transaksi retroaktif berhasil tapi gagal mencatat pembukuan",
            variant: "destructive"
          });
        }

        // Update modal perusahaan
        // ✅ OP GLOBAL: Gunakan nominal penuh untuk modal
        const modalAmount = isOPGlobalCategory ? formData.nominal : formData.nominal;
        
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: parseInt(formData.company_id),
          amount: -modalAmount
        });

        if (modalError) {
          console.error('Error updating company modal:', modalError);
        }
      }

      // ✅ KURANG PROFIT: Tidak masuk pembukuan, hanya kurangi profit
      if (isProfitReducingCategory) {
        const { error: profitError } = await supabase.rpc('deduct_profit' as any, {
          p_operational_id: operationalData.id,
          p_tanggal: formattedTargetDate, // Masuk ke target month
          p_divisi: selectedDivision === 'all' ? companies.find(c => c.id.toString() === formData.company_id)?.divisi || 'sport' : selectedDivision,
          p_kategori: formData.category,
          p_deskripsi: formData.description,
          p_nominal: formData.nominal
        });

        if (profitError) {
          console.error('Error deducting profit:', profitError);
        }
      }

      const successMessage = isRetroactiveCategory && targetMonthDate
        ? `Transaksi retroaktif ${categoryType === 'profit' ? 'profit' : 'modal'} berhasil dibuat. Akan ${categoryType === 'profit' ? 'mengurangi profit' : 'mengurangi modal'} di laporan ${format(targetMonthDate, 'MMMM yyyy', { locale: id })}`
        : 'Transaksi operational berhasil dibuat';
      
      toast({
        title: "Berhasil",
        description: successMessage,
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
    setTransactionDate(undefined);
    setTargetMonthDate(undefined);
    setFormData({
      original_month: '',
      category: '',
      nominal: 0,
      description: '',
      company_id: '',
      notes: '',
      divisi: selectedDivision === 'all' ? 'sport' : selectedDivision
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
            Fitur ini digunakan untuk mencatat transaksi operational retroaktif:
            <br />• <strong>Kurang Profit:</strong> Mengurangi profit bulan yang sudah di-close (tidak masuk pembukuan)
            <br />• <strong>Kurang Modal:</strong> Dicatat di pembukuan sesuai tanggal input transaksi, mengurangi modal di bulan target
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, category: value }));
                // Reset target month when category changes to non-retroactive
                if (!value.includes('Kurang Modal') && !value.includes('Kurang Profit')) {
                  setTargetMonthDate(undefined);
                }
              }}
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

          {isRetroactiveCategory && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transaction_date">Tanggal Input Transaksi (Opsional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !transactionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {transactionDate ? format(transactionDate, "dd MMMM yyyy", { locale: id }) : "Hari ini"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transactionDate}
                      onSelect={setTransactionDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Kosongkan untuk menggunakan hari ini
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_date">
                  Bulan Target (Sudah Close) *
                  {isProfitReducingCategory && <span className="text-xs text-muted-foreground ml-2">(Mengurangi Profit)</span>}
                  {isModalReducingCategory && <span className="text-xs text-muted-foreground ml-2">(Mengurangi Modal)</span>}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !targetMonthDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {targetMonthDate ? format(targetMonthDate, "dd MMMM yyyy", { locale: id }) : "Pilih bulan target"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={targetMonthDate}
                      onSelect={(date) => {
                        setTargetMonthDate(date);
                        if (date) {
                          const monthYear = format(date, 'yyyy-MM');
                          setFormData(prev => ({ ...prev, original_month: monthYear }));
                        }
                      }}
                      disabled={(date) => {
                        const monthYear = format(date, 'yyyy-MM');
                        return !closedMonths.includes(monthYear) || date > new Date();
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {targetMonthDate && (
                  <p className="text-xs text-muted-foreground">
                    Masuk ke laporan: {format(targetMonthDate, "MMMM yyyy", { locale: id })}
                  </p>
                )}
              </div>
            </div>
          )}

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
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.nama_perusahaan} - {formatCurrency(company.modal)}
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

                {isOPGlobalCategory && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dampak Pembukuan:</span>
                    <span className="text-sm font-medium text-orange-600">
                      -{formatCurrency(impact.modal_impact)}
                    </span>
                  </div>
                )}

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