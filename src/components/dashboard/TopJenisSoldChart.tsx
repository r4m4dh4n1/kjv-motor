import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShoppingBag } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface JenisSoldData {
  jenis_motor: string;
  total_sold: number;
  units: any[];
}

interface TopJenisSoldChartProps {
  data: JenisSoldData[];
  dateRange?: { from: string; to: string };
}

const COLORS = ["#F97316", "#FB923C", "#EA580C", "#C2410C", "#9A3412"]; // Orange theme for "Sold"

const TopJenisSoldChart = ({ data, dateRange }: TopJenisSoldChartProps) => {
  const [selectedJenis, setSelectedJenis] = useState<JenisSoldData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleBarClick = (jenisData: JenisSoldData) => {
    setSelectedJenis(jenisData);
    setDialogOpen(true);
  };

  const chartData = data.map((jenis, index) => ({
    ...jenis,
    fill: COLORS[index % COLORS.length],
  }));

  // Sesuaikan tinggi chart dengan jumlah data (minimal 300px)
  const chartHeight = Math.max(300, chartData.length * 48);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <>
      <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            Jenis Motor Terjual
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Semua jenis motor berstatus sold (terjual) sesuai divisi
            {dateRange && (
              <span className="ml-1 font-medium text-orange-600">
                · {dateRange.from} – {dateRange.to}
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Tidak ada data penjualan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                  tickCount={Math.max(...chartData.map(d => d.total_sold), 1) + 1}
                  domain={[0, Math.max(...chartData.map(d => d.total_sold), 1)]}
                />
                <YAxis
                  type="category"
                  dataKey="jenis_motor"
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value: number) => [`${value} Unit`, "Terjual"]}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  cursor={{ fill: "rgba(249, 115, 22, 0.1)" }}
                />
                <Bar
                  dataKey="total_sold"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data) => handleBarClick(data)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Klik pada bar untuk melihat detail unit terjual
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              Detail Terjual — {selectedJenis?.jenis_motor}
            </DialogTitle>
            <DialogDescription>
              Daftar unit yang sudah terjual untuk jenis motor {selectedJenis?.jenis_motor}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Summary */}
            <div className="mb-4 p-4 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-orange-800">Total Unit Terjual</span>
                <span className="text-2xl font-bold text-orange-700">
                  {selectedJenis?.total_sold} Unit
                </span>
              </div>
            </div>

            {/* Units Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left text-xs font-semibold">No</th>
                    <th className="border p-2 text-left text-xs font-semibold">Merk</th>
                    <th className="border p-2 text-left text-xs font-semibold">Plat Nomor</th>
                    <th className="border p-2 text-left text-xs font-semibold">Tgl Pembelian</th>
                    <th className="border p-2 text-right text-xs font-semibold">Harga Jual</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedJenis?.units.map((unit, index) => (
                    <tr key={unit.id || index} className="hover:bg-gray-50">
                      <td className="border p-2 text-xs text-center">{index + 1}</td>
                      <td className="border p-2 text-xs font-medium">{unit.brands?.name || "-"}</td>
                      <td className="border p-2 text-xs">{unit.plat_nomor || "-"}</td>
                      <td className="border p-2 text-xs">{unit.tanggal_pembelian || "-"}</td>
                      <td className="border p-2 text-xs text-right font-semibold text-orange-600">
                        {formatCurrency(unit.harga_jual || unit.harga_final || 0)}
                      </td>
                    </tr>
                  ))}
                  {(!selectedJenis?.units || selectedJenis.units.length === 0) && (
                    <tr>
                      <td colSpan={5} className="border p-4 text-center text-muted-foreground text-sm">
                        Tidak ada detail unit
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TopJenisSoldChart;
