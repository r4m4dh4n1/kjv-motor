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
      // Helper function to build query for a specific table
      const fetchFromTable = async (tableName: string) => {
        let query = supabase
          .from(tableName as any)
          .select('keuntungan, harga_jual, status, tanggal, tanggal_lunas')
          .eq('status', 'selesai'); // Only sold items

        if (selectedDivision !== 'all') {
          query = query.eq('divisi', selectedDivision);
        }

        // ✅ FIXED: For sold items, filter by tanggal_lunas (payment completion date)
        // This matches the logic in PenjualanSoldPageEnhanced
        if (dateRange?.start && dateRange?.end) {
          // Filter by tanggal_lunas if exists, fallback to tanggal
          query = query.or(
            `and(tanggal_lunas.gte.${dateRange.start},tanggal_lunas.lte.${dateRange.end}),and(tanggal_lunas.is.null,tanggal.gte.${dateRange.start},tanggal.lte.${dateRange.end})`
          );
        }

        const { data, error } = await query;
        if (error) {
          // If table doesn't exist (e.g. history table not created yet), just return empty
          console.warn(`Error fetching from ${tableName}:`, error);
          return [];
        }
        return data || [];
      };

      // Fetch from both active and history tables to ensure we get all data
      // This matches the logic in usePenjualanData which manually combines them
      const [activeData, historyData] = await Promise.all([
        fetchFromTable('penjualans'),
        fetchFromTable('penjualans_history')
      ]);

      const combinedData = [...activeData, ...historyData];

      // Calculate metrics using the utility to be consistent
      const metrics = calculateProfitMetrics(combinedData);
      
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