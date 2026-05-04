import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingUp, TrendingDown, Zap, RefreshCw, BarChart2 } from "lucide-react";

interface JenisReadyData {
  jenis_motor: string;
  total_ready: number;
  units: any[];
}

interface JenisSoldData {
  jenis_motor: string;
  total_sold: number;
  units: any[];
}

interface InsightItem {
  jenis_motor: string;
  total_ready: number;
  total_sold: number;
  category: "overstock" | "fast_moving" | "dead_stock" | "healthy";
  recommendation: string;
  urgency: "high" | "medium" | "low";
}

interface InventoryInsightCardProps {
  readyData: JenisReadyData[];
  soldData: JenisSoldData[];
}

const InventoryInsightCard = ({ readyData, soldData }: InventoryInsightCardProps) => {
  // Gabungkan data ready dan sold per jenis motor
  const allJenis = new Map<string, { total_ready: number; total_sold: number }>();

  readyData.forEach((item) => {
    const entry = allJenis.get(item.jenis_motor) || { total_ready: 0, total_sold: 0 };
    entry.total_ready = item.total_ready;
    allJenis.set(item.jenis_motor, entry);
  });

  soldData.forEach((item) => {
    const entry = allJenis.get(item.jenis_motor) || { total_ready: 0, total_sold: 0 };
    entry.total_sold = item.total_sold;
    allJenis.set(item.jenis_motor, entry);
  });

  // Hitung max untuk normalisasi ratio
  const maxReady = Math.max(...Array.from(allJenis.values()).map((v) => v.total_ready), 1);
  const maxSold  = Math.max(...Array.from(allJenis.values()).map((v) => v.total_sold), 1);

  const insights: InsightItem[] = Array.from(allJenis.entries()).map(([jenis, data]) => {
    const readyRatio = data.total_ready / maxReady;
    const soldRatio  = data.total_sold  / maxSold;

    let category: InsightItem["category"];
    let recommendation: string;
    let urgency: InsightItem["urgency"];

    if (data.total_ready === 0 && data.total_sold > 0) {
      // Laku keras, stok habis
      category = "fast_moving";
      recommendation = `⚡ Stok habis! Segera lakukan pembelian ulang — permintaan pasar tinggi.`;
      urgency = "high";
    } else if (data.total_ready > 0 && data.total_sold === 0) {
      // Stok ada tapi belum ada yang terjual sama sekali
      category = "dead_stock";
      recommendation = `🚨 Belum ada penjualan. Perlu evaluasi harga & strategi promosi segera.`;
      urgency = "high";
    } else if (readyRatio > 0.6 && soldRatio < 0.3) {
      // Stok menumpuk, penjualan lambat
      category = "overstock";
      recommendation = `📦 Stok menumpuk & penjualan lambat. Pertimbangkan diskon atau bundling promo.`;
      urgency = "medium";
    } else if (soldRatio > 0.6 && readyRatio < 0.3) {
      // Penjualan kencang, stok tipis
      category = "fast_moving";
      recommendation = `🔥 Penjualan kencang, stok mulai tipis. Segera restok untuk jaga momentum.`;
      urgency = "high";
    } else {
      // Seimbang
      category = "healthy";
      recommendation = `✅ Stok & penjualan seimbang. Pertahankan strategi saat ini.`;
      urgency = "low";
    }

    return {
      jenis_motor: jenis,
      total_ready: data.total_ready,
      total_sold: data.total_sold,
      category,
      recommendation,
      urgency,
    };
  }).filter((i) => i.total_ready === 0);

  // Urutkan dari yang stok ready paling sedikit (0 dulu, lalu 1, 2, dst)
  const sorted = insights.sort((a, b) => a.total_ready - b.total_ready);

  const urgencyBadge = (urgency: InsightItem["urgency"]) => {
    if (urgency === "high")   return <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">URGENT</span>;
    if (urgency === "medium") return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">PERHATIAN</span>;
    return <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">AMAN</span>;
  };

  const categoryIcon = (category: InsightItem["category"]) => {
    if (category === "fast_moving") return <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />;
    if (category === "dead_stock")  return <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />;
    if (category === "overstock")   return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    return <Zap className="w-4 h-4 text-green-500 shrink-0" />;
  };

  const categoryRowBg = (category: InsightItem["category"]) => {
    if (category === "fast_moving") return "border-l-4 border-blue-400 bg-blue-50/60";
    if (category === "dead_stock")  return "border-l-4 border-red-400 bg-red-50/60";
    if (category === "overstock")   return "border-l-4 border-amber-400 bg-amber-50/60";
    return "border-l-4 border-green-400 bg-green-50/40";
  };

  if (insights.length === 0) return null;

  // Summary counts
  const highCount   = insights.filter((i) => i.urgency === "high").length;
  const mediumCount = insights.filter((i) => i.urgency === "medium").length;
  const healthyCount = insights.filter((i) => i.category === "healthy").length;

  return (
    <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-600" />
          Insight Inventori Otomatis
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Analisis otomatis untuk motor yang <span className="text-red-500 font-semibold">stoknya sedang kosong</span> — untuk segera dilakukan restok.
        </p>

        {/* Summary bar */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs font-semibold text-red-700">{highCount} Urgent</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">{mediumCount} Perhatian</span>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
            <Zap className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs font-semibold text-green-700">{healthyCount} Sehat</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-2.5">
        {sorted.map((insight, idx) => (
          <div
            key={idx}
            className={`rounded-lg p-3 ${categoryRowBg(insight.category)}`}
          >
            <div className="flex items-start gap-2.5">
              {categoryIcon(insight.category)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-gray-800 truncate">
                    {insight.jenis_motor}
                  </span>
                  {urgencyBadge(insight.urgency)}
                </div>
                <p className="text-xs text-gray-600 mb-1.5">{insight.recommendation}</p>
                <div className="flex gap-3 text-[11px]">
                  <span className="text-emerald-700 font-semibold">
                    Ready: <b>{insight.total_ready}</b> unit
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default InventoryInsightCard;
