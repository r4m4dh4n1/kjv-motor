import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, History, TrendingUp, TrendingDown, Calendar, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RetroactiveOperationalDialogSimple } from './RetroactiveOperationalDialogSimple';
import { useToast } from '@/hooks/use-toast';

interface RetroactiveOperationalSimpleProps {
  divisi: string;
}

interface RetroactiveRecord {
  id: string;
  original_month: string;
  category: string;
  nominal: number;
  description: string;
  company_name: string;
  adjustment_date: string;
  auto_approved: boolean;
}

interface AdjustmentSummary {
  total_adjustments: number;
  total_impact_profit: number;
  total_impact_modal: number;
  adjustment_count: number;
}

export function RetroactiveOperationalSimple({ divisi }: RetroactiveOperationalSimpleProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [records, setRecords] = useState<RetroactiveRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [summary, setSummary] = useState<AdjustmentSummary>({
    total_adjustments: 0,
    total_impact_profit: 0,
    total_impact_modal: 0,
    adjustment_count: 0
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecords();
    fetchSummary();
  }, [divisi]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('retroactive_operational')
        .select(`
          id,
          original_month,
          category,
          nominal,
          description,
          adjustment_date,
          auto_approved,
          companies!inner(nama_perusahaan)
        `)
        .eq('divisi', divisi)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedRecords = data?.map(record => ({
        id: record.id,
        original_month: record.original_month,
        category: record.category,
        nominal: record.nominal,
        description: record.description,
        company_name: (record.companies as any)?.nama_perusahaan || 'Unknown',
        adjustment_date: record.adjustment_date,
        auto_approved: record.auto_approved
      })) || [];

      setRecords(formattedRecords);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_adjustments')
        .select('total_adjustments, total_impact_profit, total_impact_modal, adjustment_count')
        .eq('divisi', divisi);

      if (error) throw error;

      if (data && data.length > 0) {
        const totals = data.reduce((acc, curr) => ({
          total_adjustments: acc.total_adjustments + (curr.total_adjustments || 0),
          total_impact_profit: acc.total_impact_profit + (curr.total_impact_profit || 0),
          total_impact_modal: acc.total_impact_modal + (curr.total_impact_modal || 0),
          adjustment_count: acc.adjustment_count + (curr.adjustment_count || 0)
        }), {
          total_adjustments: 0,
          total_impact_profit: 0,
          total_impact_modal: 0,
          adjustment_count: 0
        });

        setSummary(totals);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatMonth = (monthString: string) => {
    return new Date(monthString + '-01').toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric'
    });
  };

  const handleSuccess = () => {
    fetchRecords();
    fetchSummary();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecords(records.map(record => record.id));
    } else {
      setSelectedRecords([]);
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecords(prev => [...prev, recordId]);
    } else {
      setSelectedRecords(prev => prev.filter(id => id !== recordId));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRecords.length === 0) {
      toast({
        title: "Tidak ada data yang dipilih",
        description: "Silakan pilih data yang ingin dihapus terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedRecords.length} data yang dipilih?`)) {
      return;
    }

    try {
      setDeleting(true);
      
      // Delete from retroactive_operational table
      const { error } = await supabase
        .from('retroactive_operational')
        .delete()
        .in('id', selectedRecords);

      if (error) throw error;

      toast({
        title: "Berhasil menghapus data",
        description: `${selectedRecords.length} data berhasil dihapus.`,
      });

      // Reset selection and refresh data
      setSelectedRecords([]);
      fetchRecords();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting records:', error);
      toast({
        title: "Gagal menghapus data",
        description: "Terjadi kesalahan saat menghapus data. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Adjustment Operasional Retroaktif</h2>
          <p className="text-muted-foreground">
            Kelola adjustment operasional untuk bulan yang sudah di-close - {divisi}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedRecords.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBatchDelete}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Menghapus...' : `Hapus (${selectedRecords.length})`}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Buat Adjustment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adjustment</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.adjustment_count}</div>
            <p className="text-xs text-muted-foreground">
              Transaksi retroaktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nominal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.total_adjustments)}
            </div>
            <p className="text-xs text-muted-foreground">
              Nilai adjustment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dampak Profit</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.total_impact_profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(summary.total_impact_profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Perubahan profit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dampak Modal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.total_impact_modal < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(summary.total_impact_modal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Perubahan modal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Records */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Adjustment Terbaru</CardTitle>
            {records.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectedRecords.length === records.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Pilih Semua
                </label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Memuat data...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada adjustment retroaktif</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                    selectedRecords.includes(record.id) ? 'bg-muted/30 border-primary' : ''
                  }`}
                >
                  <Checkbox
                    id={`record-${record.id}`}
                    checked={selectedRecords.includes(record.id)}
                    onCheckedChange={(checked) => handleSelectRecord(record.id, checked as boolean)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatMonth(record.original_month)}
                      </Badge>
                      <Badge variant={record.category === 'Gaji Kurang Profit' ? 'destructive' : 'default'}>
                        {record.category}
                      </Badge>
                      {record.auto_approved && (
                        <Badge variant="secondary">Auto</Badge>
                      )}
                    </div>
                    <p className="font-medium">{record.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.company_name} • {formatDate(record.adjustment_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${record.category === 'Gaji Kurang Profit' ? 'text-red-600' : 'text-green-600'}`}>
                      {record.category === 'Gaji Kurang Profit' ? '-' : '+'}{formatCurrency(record.nominal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <RetroactiveOperationalDialogSimple
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        divisi={divisi}
        onSuccess={handleSuccess}
      />
    </div>
  );
}