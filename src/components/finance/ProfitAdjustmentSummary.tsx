import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";
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

const ProfitAdjustmentSummary = ({ selectedDivision, dateRange }: ProfitAdjustmentSummaryProps) => {
  const [adjustmentData, setAdjustmentData] = useState<ProfitAdjustmentData>({
    total_deductions: 0,
    total_restorations: 0,
    net_adjustment: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfitAdjustments();
  }, [selectedDivision, dateRange]);

  const fetchProfitAdjustments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_profit_adjustments_total', {
        p_divisi: selectedDivision === 'all' ? null : selectedDivision,
        p_start_date: dateRange?.start || null,
        p_end_date: dateRange?.end || null
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setAdjustmentData(data[0]);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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