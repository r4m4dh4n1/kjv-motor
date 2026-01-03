import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trophy } from "lucide-react";
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

interface BrandSalesData {
  brand_id: number;
  brand_name: string;
  total_sold: number;
  motor_types: {
    jenis_motor: string;
    units_sold: number;
  }[];
}

interface TopBrandsChartProps {
  data: BrandSalesData[];
}

const COLORS = ["#8B5CF6", "#6366F1", "#3B82F6", "#0EA5E9", "#06B6D4"];

const TopBrandsChart = ({ data }: TopBrandsChartProps) => {
  const [selectedBrand, setSelectedBrand] = useState<BrandSalesData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleBarClick = (brandData: BrandSalesData) => {
    setSelectedBrand(brandData);
    setDialogOpen(true);
  };

  // Get top 5 brands
  const top5Brands = data.slice(0, 5);

  const chartData = top5Brands.map((brand, index) => ({
    ...brand,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <>
      <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-4 bg-gradient-to-r from-violet-50 to-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-violet-600" />
            Top 5 Brand Motor Terlaris
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {top5Brands.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Tidak ada data penjualan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="brand_name"
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
                  cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
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
          
          {/* Legend with click hint */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Klik pada bar untuk melihat detail jenis motor
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-violet-600" />
              Detail Penjualan - {selectedBrand?.brand_name}
            </DialogTitle>
            <DialogDescription>
              Daftar jenis motor yang terjual untuk brand {selectedBrand?.brand_name}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Brand Summary */}
            <div className="mb-4 p-4 bg-gradient-to-r from-violet-100 to-purple-100 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-violet-800">Total Unit Terjual</span>
                <span className="text-2xl font-bold text-violet-700">
                  {selectedBrand?.total_sold} Unit
                </span>
              </div>
            </div>

            {/* Motor Types Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-3 text-left text-sm font-semibold">No</th>
                    <th className="border p-3 text-left text-sm font-semibold">Jenis Motor</th>
                    <th className="border p-3 text-right text-sm font-semibold">Unit Terjual</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBrand?.motor_types.map((motor, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border p-3 text-sm">{index + 1}</td>
                      <td className="border p-3 text-sm font-medium">{motor.jenis_motor}</td>
                      <td className="border p-3 text-sm text-right font-semibold text-violet-600">
                        {motor.units_sold} Unit
                      </td>
                    </tr>
                  ))}
                  {(!selectedBrand?.motor_types || selectedBrand.motor_types.length === 0) && (
                    <tr>
                      <td colSpan={3} className="border p-4 text-center text-muted-foreground">
                        Tidak ada data jenis motor
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

export default TopBrandsChart;
