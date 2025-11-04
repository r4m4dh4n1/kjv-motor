import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calculator,
  AlertCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Bike,
  Palette,
  Gauge,
  Hash,
  History,
  DollarSign,
  Info,
} from "lucide-react";
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
  estimasiTanggalSelesai: string;
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
    estimasiTanggalSelesai: "",
    estimasiNominalQC: 0,
    realNominalQC: 0,
    keterangan: "",
    qcHistory: [],
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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

      // Get real nominal QC from qc_report (preferred) and price_histories_pembelian as fallback
      const { data: qcReportRows, error: qcReportError } = await supabase
        .from("qc_report")
        .select("*")
        .eq("pembelian_id", pembelian.id)
        .limit(1);

      if (qcReportError) {
        console.error("Error fetching qc_report:", qcReportError);
      }

      const qcReport =
        Array.isArray(qcReportRows) && qcReportRows.length > 0
          ? qcReportRows[0]
          : null;

      // Get price history for fallback
      const { data: priceHistory, error: priceError } = await supabase
        .from("price_histories_pembelian")
        .select("biaya_qc, created_at")
        .eq("pembelian_id", pembelian.id)
        .order("created_at", { ascending: false });

      if (priceError) {
        console.error("Error fetching price history:", priceError);
      }

      // Sum qc_history totals
      const qcHistoryTotal =
        qcHistory?.reduce(
          (sum, item) => sum + (item.total_pengeluaran || 0),
          0
        ) || 0;

      // Latest biaya_qc from price history (0 if none)
      const latestBiayaQc =
        (Array.isArray(priceHistory) && priceHistory[0]?.biaya_qc) || 0;

      // Determine real nominal QC:
      // Prefer qc_report.real_nominal_qc if present and non-zero.
      // Otherwise use latestBiayaQc + qcHistoryTotal (existing behavior).
      const realFromReport = Number(qcReport?.real_nominal_qc ?? 0);
      const realFallback =
        Number(latestBiayaQc ?? 0) + Number(qcHistoryTotal ?? 0);
      const realNominalQC =
        realFromReport !== 0 ? realFromReport : realFallback;

      // For estimasi, prefer qc_report.estimasi_nominal_qc if available
      const estimasiFromReport = Number(qcReport?.estimasi_nominal_qc ?? 0);
      const estimasiTanggalSelesai = qcReport?.estimasi_tanggal_selesai || "";

      // Set QC data
      setQcData({
        brand: pembelian.brands?.name || "",
        jenis_motor: pembelian.jenis_motor?.jenis_motor || "",
        warna: pembelian.warna || "",
        kilometer: pembelian.kilometer || 0,
        plat_nomor: pembelian.plat_nomor || "",
        estimasiTanggalSelesai: estimasiTanggalSelesai, // Prefill if present
        estimasiNominalQC: estimasiFromReport || 0, // Prefill if present
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
          estimasi_tanggal_selesai: qcData.estimasiTanggalSelesai || null,
          estimasi_nominal_qc: qcData.estimasiNominalQC,
          real_nominal_qc: qcData.realNominalQC,
          keterangan: qcData.keterangan,
          updated_at: new Date().toISOString(),
        })
        .eq("pembelian_id", pembelian.id)
        .select();

      if (updateError) throw updateError;

      if (updated && (updated as any).length > 0) {
        // Show success message box inside dialog
        setSuccessMessage("QC Report updated successfully");
        setShowSuccess(true);
        setLoading(false);
        return;
      }

      // If no rows were updated, insert a new row
      const { error: insertError } = await supabase
        .from("qc_report" as any)
        .insert({
          pembelian_id: pembelian.id,
          estimasi_tanggal_selesai: qcData.estimasiTanggalSelesai || null,
          estimasi_nominal_qc: qcData.estimasiNominalQC,
          real_nominal_qc: qcData.realNominalQC,
          keterangan: qcData.keterangan,
        });

      if (insertError) throw insertError;

      // Show success message box on create
      setSuccessMessage("QC Report created successfully");
      setShowSuccess(true);
      setLoading(false);
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
  const handleSuccessOk = () => {
    // Close dialog
    setShowSuccess(false);
    onClose();

    // Notify parent/global app to navigate to pembelian menu
    try {
      window.dispatchEvent(
        new CustomEvent("navigate-to-menu", { detail: "pembelian" })
      );
    } catch (e) {
      // ignore
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 -mx-6 -mt-6 px-6 py-6 rounded-t-lg">
          <DialogTitle className="flex items-center gap-3 text-white text-2xl">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="text-2xl font-bold">Report QC</div>
              <div className="text-blue-100 text-sm font-normal mt-1">
                {pembelian.plat_nomor}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-blue-100 mt-2">
            Ringkasan dan perhitungan QC untuk unit ini. Gunakan tombol "Simpan
            Report QC" untuk menyimpan estimasi dan keterangan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Unit Information - Enhanced Design */}
          <Card className="border-2 border-blue-100 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
              <CardTitle className="text-xl flex items-center gap-2 text-blue-900">
                <Bike className="w-6 h-6 text-blue-600" />
                Informasi Unit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="transform hover:scale-105 transition-transform duration-200">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" />
                    Brand
                  </Label>
                  <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 font-semibold text-blue-900">
                    {qcData.brand}
                  </div>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-200">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Bike className="w-4 h-4 text-cyan-500" />
                    Jenis Motor
                  </Label>
                  <div className="mt-2 p-3 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-lg border-2 border-cyan-200 font-semibold text-cyan-900">
                    {qcData.jenis_motor}
                  </div>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-200">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-500" />
                    Warna
                  </Label>
                  <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200 font-semibold text-purple-900">
                    {qcData.warna}
                  </div>
                </div>
                <div className="transform hover:scale-105 transition-transform duration-200">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-orange-500" />
                    Kilometer
                  </Label>
                  <div className="mt-2 p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 font-semibold text-orange-900">
                    {qcData.kilometer.toLocaleString("id-ID")} km
                  </div>
                </div>
                <div className="col-span-2 transform hover:scale-105 transition-transform duration-200">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-green-500" />
                    Plat Nomor
                  </Label>
                  <div className="mt-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 text-center">
                    <Badge
                      variant="secondary"
                      className="font-mono text-2xl bg-green-600 text-white px-6 py-2 hover:bg-green-700 transition-colors"
                    >
                      {qcData.plat_nomor}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QC Calculation - Enhanced Design */}
          <Card className="border-2 border-purple-100 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <CardTitle className="text-xl flex items-center gap-2 text-purple-900">
                <Calculator className="w-6 h-6 text-purple-600" />
                Perhitungan QC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="transform hover:scale-105 transition-transform duration-200">
                <Label
                  htmlFor="estimasi-tanggal"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2"
                >
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Perkiraan Tanggal QC Selesai
                </Label>
                <div className="mt-1">
                  <Input
                    id="estimasi-tanggal"
                    type="date"
                    value={qcData.estimasiTanggalSelesai}
                    onChange={(e) =>
                      setQcData((prev) => ({
                        ...prev,
                        estimasiTanggalSelesai: e.target.value,
                      }))
                    }
                    className="border-2 border-blue-200 focus:border-blue-500 h-12 text-base"
                  />
                </div>
              </div>

              <div className="transform hover:scale-105 transition-transform duration-200">
                <Label
                  htmlFor="estimasi-qc"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2"
                >
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Estimasi Nominal QC
                </Label>
                <div className="mt-1 relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold text-lg">
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
                    className="pl-14 border-2 border-green-200 focus:border-green-500 h-12 text-base font-semibold"
                  />
                </div>
              </div>

              <div className="transform hover:scale-105 transition-transform duration-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Real Nominal QC
                </Label>
                <div className="mt-1 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 font-semibold">Rp</span>
                    <span className="font-bold text-2xl text-orange-700">
                      {formatCurrencyDisplay(qcData.realNominalQC)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Info className="w-3 h-3 text-gray-500" />
                    <p className="text-xs text-gray-600">
                      Diambil dari qc_history.total_pengeluaran +
                      price_histories_pembelian.biaya_qc
                    </p>
                  </div>
                </div>
              </div>

              <div className="transform hover:scale-105 transition-transform duration-200">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-purple-500" />
                  Keterangan Status
                </Label>
                <div className="mt-1 p-4 rounded-lg border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                  <Badge
                    variant="outline"
                    className={`${getKeteranganColor(
                      qcData.keterangan
                    )} border-0 text-base px-4 py-2 font-semibold`}
                  >
                    {qcData.keterangan.includes("lebih Besar") && (
                      <TrendingUp className="w-5 h-5 mr-2" />
                    )}
                    {qcData.keterangan.includes("kurang") && (
                      <TrendingDown className="w-5 h-5 mr-2" />
                    )}
                    {qcData.keterangan.includes("sama dengan") && (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    )}
                    {qcData.keterangan ||
                      "Masukkan Estimasi Nominal QC untuk melihat keterangan"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QC History Detail - Enhanced Design */}
          <Card className="border-2 border-indigo-100 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="text-xl flex items-center gap-2 text-indigo-900">
                <History className="w-6 h-6 text-indigo-600" />
                Detail QC History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {qcData.qcHistory.length > 0 ? (
                <div className="space-y-4">
                  {qcData.qcHistory.map((qc, index) => (
                    <div
                      key={qc.id || index}
                      className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200 hover:shadow-lg transition-all duration-300 transform hover:scale-102"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-indigo-600 text-white px-3 py-1">
                          Entry #{index + 1}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-1">
                            <Calendar className="w-3 h-3" />
                            Tanggal QC
                          </Label>
                          <p className="text-base font-semibold text-indigo-900">
                            {new Date(qc.tanggal_qc).toLocaleDateString(
                              "id-ID",
                              { day: "numeric", month: "long", year: "numeric" }
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-1">
                            <DollarSign className="w-3 h-3" />
                            Total Pengeluaran
                          </Label>
                          <p className="text-base font-bold text-red-600">
                            {formatCurrencyDisplay(qc.total_pengeluaran)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-1">
                            <FileText className="w-3 h-3" />
                            Keterangan
                          </Label>
                          <p className="text-sm bg-white p-3 rounded-lg border border-indigo-200">
                            {qc.keterangan || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                    <FileText className="w-16 h-16 text-gray-300" />
                  </div>
                  <p className="text-lg font-semibold">
                    Belum ada data QC History
                  </p>
                  <p className="text-sm mt-2">
                    History akan muncul setelah ada transaksi QC
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary - Enhanced Design */}
          <Card className="border-2 border-amber-200 shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
            <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b-2 border-amber-200">
              <CardTitle className="text-xl flex items-center gap-2 text-amber-900">
                <TrendingUp className="w-6 h-6 text-amber-600" />
                Ringkasan QC
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-6 bg-white rounded-xl border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="inline-block p-3 bg-blue-100 rounded-full mb-3">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">
                    Estimasi QC
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrencyDisplay(qcData.estimasiNominalQC)}
                  </div>
                </div>
                <div className="text-center p-6 bg-white rounded-xl border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="inline-block p-3 bg-green-100 rounded-full mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">
                    Real QC
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrencyDisplay(qcData.realNominalQC)}
                  </div>
                </div>
                <div className="text-center p-6 bg-white rounded-xl border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="inline-block p-3 bg-purple-100 rounded-full mb-3">
                    <AlertCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">
                    Selisih
                  </div>
                  <div
                    className={`text-2xl font-bold ${
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
              </div>

              {/* Progress Bar Visual */}
              <div className="mt-6 p-4 bg-white rounded-xl border-2 border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  Progress Estimasi vs Real
                </div>
                <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute h-full rounded-full transition-all duration-500 ${
                      qcData.estimasiNominalQC >= qcData.realNominalQC
                        ? "bg-gradient-to-r from-green-400 to-green-600"
                        : "bg-gradient-to-r from-red-400 to-red-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        (qcData.realNominalQC /
                          (qcData.estimasiNominalQC || 1)) *
                          100,
                        100
                      )}%`,
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-700">
                      {qcData.estimasiNominalQC > 0
                        ? `${Math.round(
                            (qcData.realNominalQC / qcData.estimasiNominalQC) *
                              100
                          )}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions - Enhanced Design */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-8 py-6 text-base border-2 hover:bg-gray-100 transition-all duration-300"
            >
              Tutup
            </Button>
            <Button
              onClick={saveQCReport}
              disabled={qcData.estimasiNominalQC === 0}
              className="px-8 py-6 text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Simpan Report QC
            </Button>
          </div>
        </div>
        {/* Success message overlay inside dialog */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-96 transform scale-100 animate-in">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2 text-center text-gray-900">
                {successMessage}
              </h3>
              <p className="text-sm text-gray-600 mb-6 text-center">
                Data berhasil disimpan. Klik OK untuk kembali ke menu Pembelian.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={handleSuccessOk}
                  className="w-full py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-base font-semibold shadow-lg"
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QCReportDialog;
