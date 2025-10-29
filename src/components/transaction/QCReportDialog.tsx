import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calculator, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatUtils";

interface QCReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pembelian: any;
}

interface QCReportData {
  brand: string;
  jenis_motor: string;
  warna: string;
  kilometer: number;
  plat_nomor: string;
  estimasiNominalQC: number;
  realNominalQC: number;
  keterangan: string;
  qcHistory: Array<{
    id: number;
    tanggal_qc: string;
    total_pengeluaran: number;
    keterangan: string;
  }>;
}

const QCReportDialog: React.FC<QCReportDialogProps> = ({
  isOpen,
  onClose,
  pembelian,
}) => {
  const [qcData, setQcData] = useState<QCReportData>({
    brand: "",
    jenis_motor: "",
    warna: "",
    kilometer: 0,
    plat_nomor: "",
    estimasiNominalQC: 0,
    realNominalQC: 0,
    keterangan: "",
    qcHistory: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && pembelian) {
      loadQCData();
    }
  }, [isOpen, pembelian]);

  const loadQCData = async () => {
    if (!pembelian) return;

    setLoading(true);
    try {
      // Get QC history from qc_history table
      const { data: qcHistory, error: qcError } = await supabase
        .from("qc_history")
        .select("*")
        .eq("pembelian_id", pembelian.id)
        .order("tanggal_qc", { ascending: false });

      if (qcError) {
        console.error("Error fetching QC history:", qcError);
      }

      // Get real nominal QC from price_histories_pembelian
      const { data: priceHistory, error: priceError } = await supabase
        .from("price_histories_pembelian")
        .select("biaya_qc")
        .eq("pembelian_id", pembelian.id);

      if (priceError) {
        console.error("Error fetching price history:", priceError);
      }

      // Calculate total real nominal QC from both sources
      const priceHistoryQC =
        priceHistory?.reduce((sum, item) => sum + (item.biaya_qc || 0), 0) || 0;
      const qcHistoryTotal =
        qcHistory?.reduce(
          (sum, item) => sum + (item.total_pengeluaran || 0),
          0
        ) || 0;
      const realNominalQC = priceHistoryQC + qcHistoryTotal;

      // Set QC data
      setQcData({
        brand: pembelian.brands?.name || "",
        jenis_motor: pembelian.jenis_motor?.jenis_motor || "",
        warna: pembelian.warna || "",
        kilometer: pembelian.kilometer || 0,
        plat_nomor: pembelian.plat_nomor || "",
        estimasiNominalQC: 0, // User will input this
        realNominalQC: realNominalQC,
        keterangan: "",
        qcHistory: qcHistory || [],
      });
    } catch (error) {
      console.error("Error loading QC data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEstimasiChange = (value: string) => {
    // Remove non-numeric characters except dots
    const numericValue = value.replace(/[^\d.]/g, "");

    // Convert to number for calculation
    const numericAmount = parseFloat(numericValue.replace(/\./g, "")) || 0;

    setQcData((prev) => ({
      ...prev,
      estimasiNominalQC: numericAmount,
      keterangan: calculateKeterangan(numericAmount, prev.realNominalQC),
    }));
  };

  const saveQCReport = async () => {
    if (!pembelian || qcData.estimasiNominalQC === 0) {
      return;
    }

    try {
      // Insert QC report data
      // Upsert via update-then-insert to avoid requiring a UNIQUE constraint on pembelian_id
      setLoading(true);

      // Try update first
      const { data: updated, error: updateError } = await supabase
        .from("qc_report" as any)
        .update({
          estimasi_nominal_qc: qcData.estimasiNominalQC,
          real_nominal_qc: qcData.realNominalQC,
          keterangan: qcData.keterangan,
          updated_at: new Date().toISOString(),
        })
        .eq("pembelian_id", pembelian.id)
        .select();

      if (updateError) throw updateError;

      if (updated && (updated as any).length > 0) {
        console.log("QC Report updated successfully");
        return;
      }

      // If no rows were updated, insert a new row
      const { error: insertError } = await supabase
        .from("qc_report" as any)
        .insert({
          pembelian_id: pembelian.id,
          estimasi_nominal_qc: qcData.estimasiNominalQC,
          real_nominal_qc: qcData.realNominalQC,
          keterangan: qcData.keterangan,
        });

      if (insertError) throw insertError;

      console.log("QC Report created successfully");
    } catch (error) {
      console.error("Error saving QC report:", error);
    }
  };

  const calculateKeterangan = (estimasi: number, real: number): string => {
    if (estimasi > real) {
      return "Estimasi QC lebih Besar";
    } else if (estimasi < real) {
      return "Estimasi QC kurang";
    } else {
      return "Estimasi QC sama dengan Real QC";
    }
  };

  const formatCurrencyInput = (amount: number): string => {
    return new Intl.NumberFormat("id-ID").format(amount);
  };

  const formatCurrencyDisplay = (amount: number): string => {
    return formatCurrency(amount);
  };

  const getKeteranganColor = (keterangan: string): string => {
    if (keterangan.includes("lebih Besar")) {
      return "bg-red-100 text-red-800";
    } else if (keterangan.includes("kurang")) {
      return "bg-yellow-100 text-yellow-800";
    } else if (keterangan.includes("sama dengan")) {
      return "bg-green-100 text-green-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  if (!pembelian) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-600" />
            Report QC - {pembelian.plat_nomor}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Unit Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informasi Unit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Brand
                  </Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded border">
                    {qcData.brand}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Jenis Motor
                  </Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded border">
                    {qcData.jenis_motor}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Warna
                  </Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded border">
                    {qcData.warna}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Kilometer
                  </Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded border">
                    {qcData.kilometer.toLocaleString("id-ID")} km
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-600">
                    Plat Nomor
                  </Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded border">
                    <Badge variant="secondary" className="font-mono text-lg">
                      {qcData.plat_nomor}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QC Calculation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Perhitungan QC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label
                  htmlFor="estimasi-qc"
                  className="text-sm font-medium text-gray-600"
                >
                  Estimasi Nominal QC
                </Label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    Rp
                  </span>
                  <Input
                    id="estimasi-qc"
                    type="text"
                    placeholder="Masukkan estimasi QC (contoh: 1.000.000)"
                    value={
                      qcData.estimasiNominalQC > 0
                        ? formatCurrencyInput(qcData.estimasiNominalQC)
                        : ""
                    }
                    onChange={(e) => handleEstimasiChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Real Nominal QC
                </Label>
                <div className="mt-1 p-3 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Rp</span>
                    <span className="font-semibold text-lg">
                      {formatCurrencyDisplay(qcData.realNominalQC)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Diambil dari qc_history.total_pengeluaran +
                    price_histories_pembelian.biaya_qc
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">
                  Keterangan
                </Label>
                <div className="mt-1 p-3 rounded border">
                  <Badge
                    variant="outline"
                    className={`${getKeteranganColor(
                      qcData.keterangan
                    )} border-0`}
                  >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {qcData.keterangan ||
                      "Masukkan Estimasi Nominal QC untuk melihat keterangan"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QC History Detail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Detail QC History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {qcData.qcHistory.length > 0 ? (
                <div className="space-y-3">
                  {qcData.qcHistory.map((qc, index) => (
                    <div
                      key={qc.id || index}
                      className="p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Tanggal QC
                          </Label>
                          <p className="text-sm">
                            {new Date(qc.tanggal_qc).toLocaleDateString(
                              "id-ID"
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            Total Pengeluaran
                          </Label>
                          <p className="text-sm font-semibold text-red-600">
                            {formatCurrencyDisplay(qc.total_pengeluaran)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-sm font-medium text-gray-600">
                            Keterangan
                          </Label>
                          <p className="text-sm">{qc.keterangan || "-"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Belum ada data QC History</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan QC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Estimasi QC</div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatCurrencyDisplay(qcData.estimasiNominalQC)}
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Real QC</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrencyDisplay(qcData.realNominalQC)}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Selisih</div>
                <div
                  className={`text-xl font-bold ${
                    qcData.estimasiNominalQC > qcData.realNominalQC
                      ? "text-red-600"
                      : qcData.estimasiNominalQC < qcData.realNominalQC
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {formatCurrencyDisplay(
                    Math.abs(qcData.estimasiNominalQC - qcData.realNominalQC)
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
            <Button
              onClick={saveQCReport}
              disabled={qcData.estimasiNominalQC === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Simpan Report QC
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QCReportDialog;
