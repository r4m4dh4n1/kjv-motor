import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfitAdjustment {
  id: number;
  operational_id: number;
  tanggal: string;
  divisi: string;
  kategori: string;
  deskripsi: string;
  nominal: number;
  adjustment_type: 'deduction' | 'restoration';
  status: 'active' | 'reversed';
  created_at: string;
  updated_at: string;
  operational_tanggal?: string;
  operational_kategori?: string;
  operational_deskripsi?: string;
  operational_nominal?: number;
  operational_divisi?: string;
}

interface ProfitAdjustmentSummary {
  total_deductions: number;
  total_restorations: number;
  net_adjustment: number;
}

export const useProfitAdjustments = (
  divisi?: string,
  dateRange?: { start: string; end: string }
) => {
  const [adjustments, setAdjustments] = useState<ProfitAdjustment[]>([]);
  const [summary, setSummary] = useState<ProfitAdjustmentSummary>({
    total_deductions: 0,
    total_restorations: 0,
    net_adjustment: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAdjustments = async () => {
    try {
      setLoading(true);

      // Fetch detailed adjustments
      let query = supabase
        .from('profit_adjustments_view' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (divisi && divisi !== 'all') {
        query = query.eq('divisi', divisi);
      }

      if (dateRange) {
        query = query
          .gte('tanggal', dateRange.start)
          .lte('tanggal', dateRange.end);
      }

      const { data: adjustmentsData, error: adjustmentsError } = await query;

      if (adjustmentsError) throw adjustmentsError;

      setAdjustments((adjustmentsData as any) || []);

      // Fetch summary
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_profit_adjustments_total' as any, {
        p_divisi: divisi === 'all' ? null : divisi,
        p_start_date: dateRange?.start || null,
        p_end_date: dateRange?.end || null
      });

      if (summaryError) throw summaryError;

      if (summaryData && (summaryData as any).length > 0) {
        setSummary((summaryData as any)[0]);
      }

    } catch (error) {
      console.error('Error fetching profit adjustments:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data penyesuaian keuntungan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deductProfit = async (
    operationalId: number,
    tanggal: string,
    divisi: string,
    kategori: string,
    deskripsi: string,
    nominal: number
  ) => {
    try {
      const { error } = await supabase.rpc('deduct_profit' as any, {
        p_operational_id: operationalId,
        p_tanggal: tanggal,
        p_divisi: divisi,
        p_kategori: kategori,
        p_deskripsi: deskripsi,
        p_nominal: nominal
      });

      if (error) throw error;

      await fetchAdjustments(); // Refresh data
      return true;
    } catch (error) {
      console.error('Error deducting profit:', error);
      toast({
        title: "Error",
        description: "Gagal mengurangi keuntungan",
        variant: "destructive",
      });
      return false;
    }
  };

  const restoreProfit = async (operationalId: number) => {
    try {
      const { error } = await supabase.rpc('restore_profit' as any, {
        p_operational_id: operationalId
      });

      if (error) throw error;

      await fetchAdjustments(); // Refresh data
      return true;
    } catch (error) {
      console.error('Error restoring profit:', error);
      toast({
        title: "Error",
        description: "Gagal mengembalikan keuntungan",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, [divisi, dateRange]);

  return {
    adjustments,
    summary,
    loading,
    fetchAdjustments,
    deductProfit,
    restoreProfit
  };
};