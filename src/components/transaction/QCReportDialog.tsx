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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RefreshCw,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatUtils";

interface QCReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pembelian: any;
}

interface QCReportHistoryItem {
  id: number;
  qc_report_id: number;
  pembelian_id: number;
  estimasi_nominal_qc: number;
  real_nominal_qc: number;
  keterangan: string;
  estimasi_tanggal_selesai: string;
  tanggal_selesai_qc: string;
  iteration_number: number;
  created_at: string;
  created_by: string;
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
  iterationNumber: number;
  qcHistory: Array<{
    id: number;
    tanggal_qc: string;
    total_pengeluaran: number;
    keterangan: string;
  }>;
  qcReportHistory: QCReportHistoryItem[];
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
    iterationNumber: 1,
    qcHistory: [],
    qcReportHistory: [],
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isNewQC, setIsNewQC] = useState(false);
  const [currentQcReportId, setCurrentQcReportId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && pembelian) {
      loadQCData();
      setIsNewQC(false);
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
        .from("qc_report" as any)
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

      // Get QC report history
      const { data: qcReportHistory, error: historyError } = await supabase
        .from("qc_report_history" as any)
        .select("*")
        .eq("pembelian_id", pembelian.id)
        .order("iteration_number", { ascending: false });

      if (historyError) {
        console.error("Error fetching QC report history:", historyError);
      }

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
      const realFromReport = qcReport?.real_nominal_qc;
      const realFallback =
        Number(latestBiayaQc ?? 0) + Number(qcHistoryTotal ?? 0);
      const realNominalQC =
        realFromReport !== null && realFromReport !== undefined
          ? Number(realFromReport)
          : realFallback;

      // For estimasi, prefer qc_report.estimasi_nominal_qc if available
      const estimasiFromReport = Number(qcReport?.estimasi_nominal_qc ?? 0);
      const estimasiTanggalSelesai = qcReport?.estimasi_tanggal_selesai || "";
      const iterationNumber = qcReport?.iteration_number || 1;

      setCurrentQcReportId(qcReport?.id || null);

      // Set QC data
      setQcData({
        brand: pembelian.brands?.name || "",
        jenis_motor: pembelian.jenis_motor?.jenis_motor || "",
        warna: pembelian.warna || "",
        kilometer: pembelian.kilometer || 0,
        plat_nomor: pembelian.plat_nomor || "",
        estimasiTanggalSelesai: estimasiTanggalSelesai,
        estimasiNominalQC: estimasiFromReport || 0,
        realNominalQC: realNominalQC,
        keterangan: "",
        iterationNumber: iterationNumber,
        qcHistory: qcHistory || [],
        qcReportHistory: (qcReportHistory as QCReportHistoryItem[]) || [],
      });
    } catch (error) {
      console.error("Error loading QC data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEstimasiChange = (value: string) => {
    const numericValue = value.replace(/[^\d.]/g, "");
    const numericAmount = parseFloat(numericValue.replace(/\./g, "")) || 0;

    setQcData((prev) => ({
      ...prev,
      estimasiNominalQC: numericAmount,
      keterangan: calculateKeterangan(numericAmount, prev.realNominalQC),
    }));
  };

  const handleStartNewQC = async () => {
    // Save current QC to history before starting new one
    if (currentQcReportId && qcData.estimasiNominalQC > 0) {
      try {
        // Insert current QC to history
        const { error: historyError } = await supabase
          .from("qc_report_history" as any)
          .insert({
            qc_report_id: currentQcReportId,
            pembelian_id: pembelian.id,
            estimasi_nominal_qc: qcData.estimasiNominalQC,
            real_nominal_qc: qcData.realNominalQC,
            keterangan: qcData.keterangan || calculateKeterangan(qcData.estimasiNominalQC, qcData.realNominalQC),
            estimasi_tanggal_selesai: qcData.estimasiTanggalSelesai || null,
            iteration_number: qcData.iterationNumber,
            created_at: new Date().toISOString(),
          });

        if (historyError) {
          console.error("Error saving to history:", historyError);
          return;
        }
      } catch (error) {
        console.error("Error saving to history:", error);
        return;
      }
    }

    // Reset form for new QC
    setIsNewQC(true);
    setQcData((prev) => ({
      ...prev,
      estimasiTanggalSelesai: "",
      estimasiNominalQC: 0,
      keterangan: "",
      iterationNumber: prev.iterationNumber + 1,
    }));
  };

  const saveQCReport = async () => {
    if (!pembelian || qcData.estimasiNominalQC === 0) {
      return;
    }

    try {
      setLoading(true);

      if (isNewQC && currentQcReportId) {
        // Update existing qc_report with new iteration
        const { error: updateError } = await supabase
          .from("qc_report" as any)
          .update({
            estimasi_tanggal_selesai: qcData.estimasiTanggalSelesai || null,
            estimasi_nominal_qc: qcData.estimasiNominalQC,
            real_nominal_qc: qcData.realNominalQC,
            keterangan: qcData.keterangan,
            iteration_number: qcData.iterationNumber,
            updated_at: new Date().toISOString(),
          })
          .eq("pembelian_id", pembelian.id);

        if (updateError) throw updateError;

        setSuccessMessage(`QC Report iterasi ke-${qcData.iterationNumber} berhasil disimpan`);
        setShowSuccess(true);
        setIsNewQC(false);
        loadQCData(); // Reload data
        return;
      }

      // Try update first (existing behavior)
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
          iteration_number: 1,
        });

      if (insertError) throw insertError;

      setSuccessMessage("QC Report created successfully");
      setShowSuccess(true);
      setLoading(false);
    } catch (error) {
      console.error("Error saving QC report:", error);
    } finally {
      setLoading(false);
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
    setShowSuccess(false);
    onClose();
    try {
      window.dispatchEvent(
        new CustomEvent("navigate-to-menu", { detail: "pembelian" })
      );
    } catch (e) {
      // ignore
    }
  };

  const hasExistingQC = currentQcReportId !== null && qcData.estimasiNominalQC > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 -mx-6 -mt-6 px-6 py-6 rounded-t-lg">
          <DialogTitle className="flex items-center gap-3 text-white text-2xl">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold">Report QC</div>
              <div className="text-blue-100 text-sm font-normal mt-1">
                {pembelian.plat_nomor}
              </div>
            </div>
            {hasExistingQC && (
              <Badge className="bg-white/20 text-white border-white/30">
                Iterasi ke-{qcData.iterationNumber}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-blue-100 mt-2">
            Ringkasan dan perhitungan QC untuk unit ini.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="current" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              QC Saat Ini
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Riwayat QC ({qcData.qcReportHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6 mt-4">
            {/* Unit Information */}
            <Card className="border-2 border-blue-100 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b py-3">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                  <Bike className="w-5 h-5 text-blue-600" />
                  Informasi Unit
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Brand</Label>
                    <div className="font-semibold text-sm">{qcData.brand}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Jenis Motor</Label>
                    <div className="font-semibold text-sm">{qcData.jenis_motor}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Warna</Label>
                    <div className="font-semibold text-sm">{qcData.warna}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Kilometer</Label>
                    <div className="font-semibold text-sm">{qcData.kilometer.toLocaleString("id-ID")} km</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New QC Button */}
            {hasExistingQC && !isNewQC && (
              <Card className="border-2 border-amber-200 bg-amber-50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-full">
                        <RefreshCw className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-amber-900">Unit ini sudah pernah QC</p>
                        <p className="text-sm text-amber-700">Klik tombol untuk melakukan QC lagi dan menyimpan history</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleStartNewQC}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      QC Lagi
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isNewQC && (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Mode QC Baru - Iterasi ke-{qcData.iterationNumber}</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Data QC sebelumnya telah disimpan ke riwayat. Silakan isi data QC baru.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* QC Calculation */}
            <Card className="border-2 border-purple-100 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b py-3">
                <CardTitle className="text-lg flex items-center gap-2 text-purple-900">
                  <Calculator className="w-5 h-5 text-purple-600" />
                  Perhitungan QC
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimasi-tanggal" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      Perkiraan Tanggal Selesai
                    </Label>
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
                      className="border-2 border-blue-200 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estimasi-qc" className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      Estimasi Nominal QC
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold">
                        Rp
                      </span>
                      <Input
                        id="estimasi-qc"
                        type="text"
                        placeholder="Masukkan estimasi QC"
                        value={qcData.estimasiNominalQC > 0 ? formatCurrencyInput(qcData.estimasiNominalQC) : ""}
                        onChange={(e) => handleEstimasiChange(e.target.value)}
                        className="pl-10 border-2 border-green-200 focus:border-green-500 font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      Real Nominal QC
                    </Label>
                    <div className="p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200">
                      <span className="font-bold text-xl text-orange-700">
                        {formatCurrencyDisplay(qcData.realNominalQC)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-purple-500" />
                      Status
                    </Label>
                    <div className="p-3 rounded-lg border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                      <Badge
                        variant="outline"
                        className={`${getKeteranganColor(qcData.keterangan)} border-0 font-semibold`}
                      >
                        {qcData.keterangan || "Masukkan estimasi"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-blue-200">
                    <div className="text-xs text-gray-600 mb-1">Estimasi</div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrencyDisplay(qcData.estimasiNominalQC)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-green-200">
                    <div className="text-xs text-gray-600 mb-1">Real</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrencyDisplay(qcData.realNominalQC)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-purple-200">
                    <div className="text-xs text-gray-600 mb-1">Selisih</div>
                    <div className={`text-lg font-bold ${
                      qcData.estimasiNominalQC > qcData.realNominalQC
                        ? "text-red-600"
                        : qcData.estimasiNominalQC < qcData.realNominalQC
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}>
                      {formatCurrencyDisplay(Math.abs(qcData.estimasiNominalQC - qcData.realNominalQC))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QC History Detail */}
            {qcData.qcHistory.length > 0 && (
              <Card className="border-2 border-indigo-100 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b py-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-indigo-900">
                    <History className="w-5 h-5 text-indigo-600" />
                    Detail Pengeluaran QC
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {qcData.qcHistory.map((qc, index) => (
                      <div
                        key={qc.id || index}
                        className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-indigo-600 text-white text-xs">#{index + 1}</Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(qc.tanggal_qc).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          <span className="font-bold text-red-600">
                            {formatCurrencyDisplay(qc.total_pengeluaran)}
                          </span>
                        </div>
                        {qc.keterangan && (
                          <p className="text-sm text-gray-600 mt-2">{qc.keterangan}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-6"
              >
                Tutup
              </Button>
              <Button
                onClick={saveQCReport}
                disabled={qcData.estimasiNominalQC === 0 || loading}
                className="px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isNewQC ? `Simpan QC Iterasi ${qcData.iterationNumber}` : "Simpan Report QC"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Card className="border-2 border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b py-3">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                  <Clock className="w-5 h-5 text-slate-600" />
                  Riwayat QC Report
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {qcData.qcReportHistory.length > 0 ? (
                  <div className="space-y-4">
                    {qcData.qcReportHistory.map((history, index) => (
                      <div
                        key={history.id}
                        className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border-2 border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-slate-600 text-white">
                            Iterasi ke-{history.iteration_number}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(history.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-gray-600">Estimasi QC</Label>
                            <p className="font-bold text-blue-600">
                              {formatCurrencyDisplay(history.estimasi_nominal_qc)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Real QC</Label>
                            <p className="font-bold text-green-600">
                              {formatCurrencyDisplay(history.real_nominal_qc)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Selisih</Label>
                            <p className={`font-bold ${
                              history.estimasi_nominal_qc > history.real_nominal_qc
                                ? "text-red-600"
                                : history.estimasi_nominal_qc < history.real_nominal_qc
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}>
                              {formatCurrencyDisplay(Math.abs(history.estimasi_nominal_qc - history.real_nominal_qc))}
                            </p>
                          </div>
                        </div>
                        {history.keterangan && (
                          <div className="mt-3 p-2 bg-white rounded border">
                            <Label className="text-xs text-gray-600">Keterangan</Label>
                            <p className="text-sm">{history.keterangan}</p>
                          </div>
                        )}
                        {history.estimasi_tanggal_selesai && (
                          <div className="mt-2 text-sm text-gray-600">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Est. Selesai: {new Date(history.estimasi_tanggal_selesai).toLocaleDateString("id-ID")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                      <History className="w-12 h-12 text-gray-300" />
                    </div>
                    <p className="text-lg font-semibold">Belum ada riwayat QC</p>
                    <p className="text-sm mt-2">
                      Riwayat akan muncul setelah unit di-QC ulang
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Success message overlay */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-96">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2 text-center text-gray-900">
                {successMessage}
              </h3>
              <p className="text-sm text-gray-600 mb-6 text-center">
                Data berhasil disimpan.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={handleSuccessOk}
                  className="w-full py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
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
