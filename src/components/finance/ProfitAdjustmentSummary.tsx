import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, DollarSign, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateProfitMetrics } from "@/utils/profitCalculationUtils";

interface ProfitAdjustmentSummaryProps {
  selectedDivision: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ProfitAdjustmentData {
  total_deductions: number;
  total_restorations: number;
  net_adjustment: number;
}

const ProfitAdjustmentSummary = ({ selectedDivision, dateRange }: ProfitAdjustmentSummaryProps) => {
  const [adjustmentData, setAdjustmentData] = useState<ProfitAdjustmentData>({
    total_deductions: 0,
    total_restorations: 0,
    net_adjustment: 0
  });
  
  const [totalProfitData, setTotalProfitData] = useState({
    totalKeuntungan: 0,
    totalUnits: 0
  });

  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedDivision, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchProfitAdjustments(),
        fetchTotalProfit()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalProfit = async () => {
    try {
      // Determine if we need to query combined table (history) or just active table
      // Logic: If dateRange is strictly within current month, use 'penjualans'.
      // If it spans past months, we might need 'penjualans_combined' if it exists, 
      // but user asked for "tabel penjualan saja". 
      // However, to match "Penjualan Sold" which uses combined for "This Month" (wait, previous analysis said Penjualan Sold uses combined for this_month? 
      // Actually step 262 said: "PenjualanSoldPageEnhanced... for 'this_month' it explicitly *does not* use the combined table."
      // BUT step 288 said: "Penjualan Sold uses hook usePenjualanData which automatically uses penjualans_combined (active + history) for period 'This Month'."
      // Let's look at the requirement: "bisa nggak card total keuntungan di operational menggunakan tabel penjualan saja?"
      // I will query 'penjualans' table directly as requested, but I will ensure I filter correctly.
      
      let query = supabase
        .from('penjualans')
        .select('keuntungan, harga_jual, status, tanggal')
        .eq('status', 'selesai'); // Only sold items

      if (selectedDivision !== 'all') {
        query = query.eq('divisi', selectedDivision);
      }

      if (dateRange?.start) {
        query = query.gte('tanggal', dateRange.start);
      }
      if (dateRange?.end) {
        query = query.lte('tanggal', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate metrics using the utility to be consistent
      const metrics = calculateProfitMetrics(data || []);
      
      setTotalProfitData({
        totalKeuntungan: metrics.totalKeuntungan,
        totalUnits: metrics.totalUnits
      });

    } catch (error) {
      console.error('Error fetching total profit:', error);
      // Don't block the UI, just show 0
    }
  };

  const fetchProfitAdjustments = async () => {
    try {
      const { data, error } = await supabase.rpc('get_profit_adjustments_total' as any, {
        p_divisi: selectedDivision === 'all' ? null : selectedDivision,
        p_start_date: dateRange?.start || null,
        p_end_date: dateRange?.end || null
      });

      if (error) throw error;

      if (data && (data as any).length > 0) {
        setAdjustmentData((data as any)[0]);
      }
    } catch (error) {
      console.error('Error fetching profit adjustments:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Card Total Keuntungan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            Total Keuntungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(totalProfitData.totalKeuntungan)}
          </div>
          <Badge variant="outline" className="mt-2">
            {totalProfitData.totalUnits} Unit Terjual
          </Badge>
        </CardContent>
      </Card>

      {/* Card Pengurangan Keuntungan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Pengurangan Keuntungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(adjustmentData.total_deductions)}
          </div>
          <Badge variant="destructive" className="mt-2">
            Kategori "Kurang Profit"
          </Badge>
        </CardContent>
      </Card>

      {/* Card Pengembalian Keuntungan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Pengembalian Keuntungan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(adjustmentData.total_restorations)}
          </div>
          <Badge variant="secondary" className="mt-2">
            Dari Penghapusan Data
          </Badge>
        </CardContent>
      </Card>

      {/* Card Dampak Bersih */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-500" />
            Dampak Bersih
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${adjustmentData.net_adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(adjustmentData.net_adjustment))}
          </div>
          <Badge variant={adjustmentData.net_adjustment >= 0 ? "default" : "destructive"} className="mt-2">
            {adjustmentData.net_adjustment >= 0 ? "Keuntungan Bertambah" : "Keuntungan Berkurang"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitAdjustmentSummary;