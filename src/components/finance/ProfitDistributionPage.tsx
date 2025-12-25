import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, parseCurrency, handleCurrencyInput } from "@/lib/utils";
import { DollarSign, TrendingUp, Building, Calculator } from "lucide-react";

interface ProfitDistributionPageProps {
  selectedDivision: string;
}

interface Company {
  id: number;
  nama_perusahaan: string;
  divisi: string;
  modal: number;
}

interface ProfitData {
  keuntunganKotor: number;
  keuntunganBersih: number;
  totalPenjualan: number;
  totalOperational: number;
}

export const ProfitDistributionPage = ({ selectedDivision }: ProfitDistributionPageProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [tipeKeuntungan, setTipeKeuntungan] = useState<string>("kotor");
  const [distribusiType, setDistribusiType] = useState<string>("ambil");
  const [jumlahDistribusi, setJumlahDistribusi] = useState<string>("0");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");

  // Current date info
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  useEffect(() => {
    fetchData();
  }, [selectedDivision]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch companies based on division
      const { data: companiesData, error: companiesError } = await supabase
        .from("companies")
        .select("*")
        .eq("divisi", selectedDivision)
        .eq("status", "active");

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Calculate profit data for current month
      await calculateProfitData();
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Gagal mengambil data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitData = async () => {
    try {
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${lastDay}`;

      // Get current month's sales (sold status)
      const { data: penjualanData, error: penjualanError } = await supabase
        .from("penjualans")
        .select("keuntungan, harga_jual")
        .eq("divisi", selectedDivision)
        .eq("status", "selesai")
        .gte("tanggal", startDate)
        .lte("tanggal", endDate);

      if (penjualanError) throw penjualanError;

      // Get current month's operational costs
      const { data: operationalData, error: operationalError } = await supabase
        .from("operational")
        .select("nominal")
        .eq("divisi", selectedDivision)
        .gte("tanggal", startDate)
        .lte("tanggal", endDate);

      if (operationalError) throw operationalError;

      const totalKeuntunganKotor = penjualanData?.reduce((sum, p) => sum + (p.keuntungan || 0), 0) || 0;
      const totalPenjualan = penjualanData?.reduce((sum, p) => sum + (p.harga_jual || 0), 0) || 0;
      const totalOperational = operationalData?.reduce((sum, o) => sum + (o.nominal || 0), 0) || 0;
      
      // Keuntungan bersih = keuntungan kotor - biaya operasional
      const keuntunganBersih = totalKeuntunganKotor - totalOperational;

      setProfitData({
        keuntunganKotor: totalKeuntunganKotor,
        keuntunganBersih: keuntunganBersih,
        totalPenjualan: totalPenjualan,
        totalOperational: totalOperational,
      });
    } catch (error) {
      console.error("Error calculating profit:", error);
    }
  };

  const handleDistribusi = async () => {
    if (!profitData) return;

    const totalKeuntungan = tipeKeuntungan === "kotor" ? profitData.keuntunganKotor : profitData.keuntunganBersih;
    const jumlah = parseCurrency(jumlahDistribusi);

    if (jumlah <= 0) {
      toast({
        title: "Error",
        description: "Jumlah distribusi harus lebih dari 0",
        variant: "destructive",
      });
      return;
    }

    if (jumlah > totalKeuntungan) {
      toast({
        title: "Error",
        description: "Jumlah distribusi tidak boleh melebihi total keuntungan",
        variant: "destructive",
      });
      return;
    }

    if (distribusiType === "perusahaan" && !selectedCompany) {
      toast({
        title: "Error",
        description: "Pilih perusahaan terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Insert distribution record
      const { error: distributionError } = await supabase
        .from("profit_distribution")
        .insert({
          divisi: selectedDivision,
          bulan: currentMonth,
          tahun: currentYear,
          tipe_keuntungan: tipeKeuntungan,
          total_keuntungan: totalKeuntungan,
          jumlah_diambil: distribusiType === "ambil" ? jumlah : 0,
          jumlah_ke_perusahaan: distribusiType === "perusahaan" ? jumlah : 0,
          company_id: distribusiType === "perusahaan" ? parseInt(selectedCompany) : null,
          keterangan: keterangan,
          status: "completed"
        });

      if (distributionError) throw distributionError;

      // If distributing to company, update company modal
      if (distribusiType === "perusahaan") {
        const { error: updateError } = await supabase.rpc(
          "update_company_modal",
          {
            company_id: parseInt(selectedCompany),
            amount: jumlah
          }
        );

        if (updateError) throw updateError;

        // Insert modal history
        const { error: modalHistoryError } = await supabase
          .from("modal_history")
          .insert({
            company_id: parseInt(selectedCompany),
            jumlah: jumlah,
            keterangan: `Distribusi Profit ${monthNames[currentMonth - 1]} ${currentYear} - ${tipeKeuntungan.toUpperCase()}`
          });

        if (modalHistoryError) throw modalHistoryError;
      }

      toast({
        title: "Berhasil",
        description: `Distribusi profit berhasil ${distribusiType === "ambil" ? "diambil" : "ditambahkan ke perusahaan"}`,
      });

      // Reset form
      setJumlahDistribusi("0");
      setSelectedCompany("");
      setKeterangan("");
      setDistribusiType("ambil");
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error distributing profit:", error);
      toast({
        title: "Error",
        description: "Gagal melakukan distribusi profit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const maxDistribusi = profitData ? (tipeKeuntungan === "kotor" ? profitData.keuntunganKotor : profitData.keuntunganBersih) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Distribusi Profit</h1>
          <p className="text-muted-foreground">
            Kelola pengambilan profit untuk {monthNames[currentMonth - 1]} {currentYear} - Divisi {selectedDivision}
          </p>
        </div>
      </div>

      {/* Profit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(profitData?.totalPenjualan || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keuntungan Kotor</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(profitData?.keuntunganKotor || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biaya Operasional</CardTitle>
            <Calculator className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(profitData?.totalOperational || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keuntungan Bersih</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(profitData?.keuntunganBersih || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Form */}
      <Card>
        <CardHeader>
          <CardTitle>Form Distribusi Profit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipe Keuntungan */}
          <div className="space-y-3">
            <Label>Tipe Keuntungan</Label>
            <RadioGroup value={tipeKeuntungan} onValueChange={setTipeKeuntungan}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kotor" id="kotor" />
                <Label htmlFor="kotor">
                  Keuntungan Kotor ({formatCurrency(profitData?.keuntunganKotor || 0)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bersih" id="bersih" />
                <Label htmlFor="bersih">
                  Keuntungan Bersih ({formatCurrency(profitData?.keuntunganBersih || 0)})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Tipe Distribusi */}
          <div className="space-y-3">
            <Label>Tipe Distribusi</Label>
            <RadioGroup value={distribusiType} onValueChange={setDistribusiType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ambil" id="ambil" />
                <Label htmlFor="ambil">Ambil Profit (Withdraw)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="perusahaan" id="perusahaan" />
                <Label htmlFor="perusahaan">Masukkan ke Perusahaan (Reinvest)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Company Selection (if reinvest) */}
          {distribusiType === "perusahaan" && (
            <div className="space-y-2">
              <Label>Pilih Perusahaan</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih perusahaan..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{company.nama_perusahaan}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          Modal: {formatCurrency(company.modal)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Jumlah Distribusi */}
          <div className="space-y-2">
            <Label>Jumlah Distribusi</Label>
            <Input
              type="text"
              value={jumlahDistribusi}
              onChange={(e) => setJumlahDistribusi(handleCurrencyInput(e.target.value))}
              placeholder="Masukkan jumlah..."
            />
            <p className="text-sm text-muted-foreground">
              Maksimal: {formatCurrency(maxDistribusi)} | 
              Tersisa: {formatCurrency(maxDistribusi - parseCurrency(jumlahDistribusi))}
            </p>
          </div>

          {/* Keterangan */}
          <div className="space-y-2">
            <Label>Keterangan (Opsional)</Label>
            <Textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Masukkan keterangan distribusi..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleDistribusi}
              disabled={loading || !profitData || maxDistribusi <= 0}
              className="flex-1"
            >
              {loading ? "Processing..." : 
                distribusiType === "ambil" ? "Ambil Profit" : "Investasi ke Perusahaan"
              }
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setJumlahDistribusi("0");
                setSelectedCompany("");
                setKeterangan("");
                setDistribusiType("ambil");
                setTipeKeuntungan("kotor");
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};