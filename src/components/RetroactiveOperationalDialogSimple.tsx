import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RetroactiveOperationalForm, AdjustmentImpact, RETROACTIVE_CATEGORIES } from '@/types/retroactive';

interface RetroactiveOperationalDialogSimpleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  divisi: string;
  onSuccess?: () => void;
}

export function RetroactiveOperationalDialogSimple({
  open,
  onOpenChange,
  divisi,
  onSuccess,
}: RetroactiveOperationalDialogSimpleProps) {
  const [formData, setFormData] = useState<RetroactiveOperationalForm>({
    original_month: '',
    category: '',
    nominal: 0,
    description: '',
    company_id: '',
    divisi: divisi,
  });

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [closedMonths, setClosedMonths] = useState<string[]>([]);
  const [impact, setImpact] = useState<AdjustmentImpact | null>(null);

  useEffect(() => {
    if (open) {
      fetchCompanies();
      fetchClosedMonths();
      setFormData(prev => ({ ...prev, divisi }));
    }
  }, [open, divisi]);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('divisi', divisi)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Gagal memuat data perusahaan');
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
      
      const months = data?.map(item => 
        `${item.closure_year}-${item.closure_month.toString().padStart(2, '0')}`
      ) || [];
      
      setClosedMonths(months);
    } catch (error) {
      console.error('Error fetching closed months:', error);
    }
  };

  const calculateImpact = () => {
    if (!formData.nominal || !formData.category) return;

    const isDeduction = formData.category === 'Gaji Kurang Profit';
    const impactAmount = isDeduction ? -formData.nominal : formData.nominal;

    setImpact({
      profit_impact: isDeduction ? -formData.nominal : 0,
      capital_impact: impactAmount,
      description: isDeduction 
        ? `Pengurangan profit sebesar ${formatCurrency(formData.nominal)}`
        : `Penambahan modal sebesar ${formatCurrency(formData.nominal)}`
    });
  };

  useEffect(() => {
    calculateImpact();
  }, [formData.nominal, formData.category]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!formData.original_month || !formData.category || !formData.nominal || 
        !formData.description || !formData.company_id) {
      toast.error('Mohon lengkapi semua field yang diperlukan');
      return;
    }

    if (!closedMonths.includes(formData.original_month)) {
      toast.error('Bulan yang dipilih belum di-close');
      return;
    }

    setLoading(true);

    try {
      // 1. Insert retroactive operational (auto-approved)
      const { data: retroactiveData, error: retroactiveError } = await supabase
        .from('retroactive_operational')
        .insert({
          ...formData,
          original_year: parseInt(formData.original_month.split('-')[0]),
          status: 'approved',
          auto_approved: true,
          requires_approval: false,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (retroactiveError) throw retroactiveError;

      // 2. Insert ke tabel operational
      const { error: operationalError } = await supabase
        .from('operational')
        .insert({
          tanggal: new Date().toISOString().split('T')[0],
          kategori: formData.category,
          nominal: formData.nominal,
          keterangan: `[RETROAKTIF ${formData.original_month}] ${formData.description}`,
          company_id: formData.company_id,
          divisi: formData.divisi,
          is_retroactive: true,
          retroactive_id: retroactiveData.id,
        });

      if (operationalError) throw operationalError;

      // 3. Update company capital
      const { error: companyError } = await supabase.rpc('update_company_capital', {
        p_company_id: formData.company_id,
        p_amount: formData.category === 'Gaji Kurang Profit' ? -formData.nominal : formData.nominal
      });

      if (companyError) throw companyError;

      // 4. Call deduct_profit for "Gaji Kurang Profit"
      if (formData.category === 'Gaji Kurang Profit') {
        const { error: profitError } = await supabase.rpc('deduct_profit', {
          p_company_id: formData.company_id,
          p_amount: formData.nominal,
          p_description: `Retroaktif ${formData.original_month}: ${formData.description}`
        });

        if (profitError) throw profitError;
      }

      // 5. Insert pembukuan record
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .insert({
          tanggal: new Date().toISOString().split('T')[0],
          keterangan: `[RETROAKTIF ${formData.original_month}] ${formData.description}`,
          debit: formData.category === 'Gaji Kurang Profit' ? formData.nominal : 0,
          kredit: formData.category !== 'Gaji Kurang Profit' ? formData.nominal : 0,
          company_id: formData.company_id,
          divisi: formData.divisi,
        });

      if (pembukuanError) throw pembukuanError;

      // 6. Update monthly adjustments
      const monthKey = formData.original_month;
      
      // First, get existing data
      const { data: existingAdjustment } = await supabase
        .from('monthly_adjustments')
        .select('*')
        .eq('month', monthKey)
        .eq('divisi', formData.divisi)
        .single();

      const { error: adjustmentError } = await supabase
        .from('monthly_adjustments')
        .upsert({
          month: monthKey,
          year: parseInt(monthKey.split('-')[0]),
          divisi: formData.divisi,
          total_adjustments: (existingAdjustment?.total_adjustments || 0) + formData.nominal,
          total_impact_profit: (existingAdjustment?.total_impact_profit || 0) + (impact?.profit_impact || 0),
          total_impact_modal: (existingAdjustment?.total_impact_modal || 0) + (impact?.capital_impact || 0),
          adjustment_count: (existingAdjustment?.adjustment_count || 0) + 1,
          last_adjustment_date: new Date().toISOString().split('T')[0],
        }, {
          onConflict: 'month,divisi',
          ignoreDuplicates: false
        });

      if (adjustmentError) throw adjustmentError;

      toast.success('Adjustment retroaktif berhasil diproses!');
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        original_month: '',
        category: '',
        nominal: 0,
        description: '',
        company_id: '',
        divisi: divisi,
      });
      setImpact(null);

    } catch (error: any) {
      console.error('Error processing retroactive adjustment:', error);
      toast.error(error.message || 'Gagal memproses adjustment retroaktif');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adjustment Operasional Retroaktif - {divisi}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bulan Asli */}
          <div>
            <Label htmlFor="original_month">Bulan Asli Transaksi</Label>
            <Select
              value={formData.original_month}
              onValueChange={(value) => setFormData(prev => ({ ...prev, original_month: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih bulan yang sudah di-close" />
              </SelectTrigger>
              <SelectContent>
                {closedMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {new Date(month + '-01').toLocaleDateString('id-ID', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kategori */}
          <div>
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

          {/* Perusahaan */}
          <div>
            <Label htmlFor="company_id">Perusahaan</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, company_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih perusahaan" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nominal */}
          <div>
            <Label htmlFor="nominal">Nominal</Label>
            <Input
              id="nominal"
              type="number"
              value={formData.nominal || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                nominal: parseFloat(e.target.value) || 0 
              }))}
              placeholder="Masukkan nominal"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Jelaskan detail adjustment ini..."
              rows={3}
            />
          </div>

          {/* Impact Preview */}
          {impact && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Dampak Adjustment:</p>
                  <p>• Modal Perusahaan: {formatCurrency(impact.capital_impact)}</p>
                  {impact.profit_impact !== 0 && (
                    <p>• Profit: {formatCurrency(impact.profit_impact)}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{impact.description}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Mode Otomatis:</strong> Adjustment akan langsung diproses tanpa perlu approval.
              Data akan segera ditambahkan ke sistem dan mempengaruhi modal perusahaan.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.original_month || !formData.category || 
                     !formData.nominal || !formData.description || !formData.company_id}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Proses Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}