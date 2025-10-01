import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, DollarSign, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface TotalProfitData {
  total_profit: number;
  total_sales: number;
  total_units: number;
}

const ProfitAdjustmentSummary = ({ selectedDivision, dateRange }: ProfitAdjustmentSummaryProps) => {
  const [adjustmentData, setAdjustmentData] = useState<ProfitAdjustmentData>({
    total_deductions: 0,
    total_restorations: 0,
    net_adjustment: 0
  });
  const [totalProfitData, setTotalProfitData] = useState<TotalProfitData>({
    total_profit: 0,
    total_sales: 0,
    total_units: 0
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

  const fetchProfitAdjustments = async () => {
    const { data, error } = await supabase.rpc('get_profit_adjustments_total' as any, {
      p_divisi: selectedDivision === 'all' ? null : selectedDivision,
      p_start_date: dateRange?.start || null,
      p_end_date: dateRange?.end || null
    });

    if (error) throw error;

    if (data && (data as any).length > 0) {
      setAdjustmentData((data as any)[0]);
    }
  };

  const fetchTotalProfit = async () => {
    // Tentukan rentang tanggal
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Hitung tanggal akhir bulan yang benar
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const startDate = dateRange?.start || `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const endDate = dateRange?.end || `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;

    // Query untuk mendapatkan total keuntungan dari penjualan yang selesai
    let query = supabase
      .from('penjualans')
      .select('keuntungan, harga_jual')
      .eq('status', 'selesai')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);

    if (selectedDivision !== 'all') {
      query = query.eq('divisi', selectedDivision);
    }

    const { data, error } = await query;
    if (error) throw error;

    const totalProfit = data?.reduce((sum, item) => sum + (item.keuntungan || 0), 0) || 0;
    const totalSales = data?.reduce((sum, item) => sum + (item.harga_jual || 0), 0) || 0;
    const totalUnits = data?.length || 0;

    setTotalProfitData({
      total_profit: totalProfit,
      total_sales: totalSales,
      total_units: totalUnits
    });
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
            {formatCurrency(totalProfitData.total_profit)}
          </div>
          <Badge variant="outline" className="mt-2">
            {totalProfitData.total_units} Unit Terjual
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