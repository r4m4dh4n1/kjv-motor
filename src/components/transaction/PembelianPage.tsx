import React, { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PembelianForm from "./PembelianForm";
import PembelianTable from "./PembelianTable";
import PriceHistoryModal from "./PriceHistoryModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pembelian, PembelianPageProps } from "./types";
import { ShoppingCart, CheckCircle, DollarSign } from "lucide-react";

import { 
  usePembelianData,
  useCabangData,
  useBrandsData,
  useJenisMotorData,
  useCompaniesData
} from "./hooks/usePembelianData";
import {
  usePembelianCreate,
  usePembelianUpdate,
  usePembelianDelete
} from "./hooks/usePembelianMutations";
import {
  createInitialFormData,
  validateFormData,
  transformFormDataForSubmit,
  transformPembelianToFormData
} from "./utils/formUtils";
import { supabase } from "@/integrations/supabase/client";

const PembelianPage = ({ selectedDivision }: PembelianPageProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isUpdateHargaDialogOpen, setIsUpdateHargaDialogOpen] = useState(false);
  const [isQCDialogOpen, setIsQCDialogOpen] = useState(false);
  const [isQcHistoryDialogOpen, setIsQcHistoryDialogOpen] = useState(false);
  const [isPriceHistoryDialogOpen, setIsPriceHistoryDialogOpen] = useState(false);
  const [selectedJenisPembelian, setSelectedJenisPembelian] = useState("all");
  const [editingPembelian, setEditingPembelian] = useState<Pembelian | null>(null);
  const [viewingPembelian, setViewingPembelian] = useState<Pembelian | null>(null);
  const [updatingHargaPembelian, setUpdatingHargaPembelian] = useState<Pembelian | null>(null);
  const [qcPembelian, setQCPembelian] = useState<Pembelian | null>(null);
  const [formData, setFormData] = useState(createInitialFormData(selectedDivision));
  const [qcHistory, setQcHistory] = useState([]);

  // State untuk form QC yang lengkap
  const [qcForm, setQcForm] = useState({
    tanggal_qc: new Date().toISOString().split('T')[0],
    jenis_qc: "",
    total_pengeluaran: "",
    keterangan: ""
  });

  const [selectedStatus, setSelectedStatus] = useState("ready");
  // State untuk form update harga yang lengkap
  const [updateHargaForm, setUpdateHargaForm] = useState({
    harga_beli_dasar: "",
    biaya_pajak: "",
    biaya_qc: "",
    biaya_lain_lain: "",
    keterangan_biaya_lain: "",
    reason: ""
  });

  const { toast } = useToast();

  // Data queries
  const { data: pembelianData = [] } = usePembelianData(selectedDivision, selectedJenisPembelian, selectedStatus);
  const { data: cabangData = [] } = useCabangData();
  const { data: brandsData = [] } = useBrandsData();
  const { data: jenisMotorData = [] } = useJenisMotorData();
  const { data: companiesData = [] } = useCompaniesData(selectedDivision);

  // Mutations
  const createMutation = usePembelianCreate();
  const updateMutation = usePembelianUpdate();
  const deleteMutation = usePembelianDelete();

  // Hitung data summary dengan useMemo untuk optimasi
  const summaryData = useMemo(() => {
    const totalPembelian = pembelianData.length;
    const totalReady = pembelianData.filter(item => item.status === 'ready').length;
    const totalNilai = pembelianData.reduce((sum, item) => {
      return sum + (item.harga_final || item.harga_beli || 0);
    }, 0);

    return {
      totalPembelian,
      totalReady,
      totalNilai
    };
  }, [pembelianData]);

  // Helper functions untuk format currency
  const formatNumberInput = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (!numericValue) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(numericValue));
  };

  const parseNumericInput = (value: string) => {
    return value.replace(/[^0-9]/g, "");
  };

  const handleQcNumericChange = (field: string, value: string) => {
    const formattedValue = formatNumberInput(value);
    setQcForm(prev => ({
      ...prev,
      [field]: formattedValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!validateFormData(formData)) {
      toast({ 
        title: "Error", 
        description: "Mohon lengkapi semua field yang wajib diisi", 
        variant: "destructive" 
      });
      return;
    }

    // Validasi nominal dana
    const hargaBeli = parseFloat(formData.harga_beli) || 0;
    const nominalDana1 = parseFloat(formData.nominal_dana_1) || 0;
    const nominalDana2 = parseFloat(formData.nominal_dana_2) || 0;

    // Jika hanya menggunakan nominal dana 1
    if (nominalDana2 === 0) {
      if (nominalDana1 !== hargaBeli) {
        toast({
          title: "Error",
          description: "Sumber dana 1 tidak sama dengan harga beli",
          variant: "destructive"
        });
        return;
      }
    } 
    // Jika menggunakan nominal dana 1 dan nominal dana 2
    else {
      const totalNominalDana = nominalDana1 + nominalDana2;
      if (totalNominalDana !== hargaBeli) {
        toast({
          title: "Error",
          description: "Total sumber dana 1 dan sumber dana 2 tidak sama dengan harga beli",
          variant: "destructive"
        });
        return;
      }
    }

    const submitData = transformFormDataForSubmit(formData);
    
    if (editingPembelian) {
      updateMutation.mutate({ id: editingPembelian.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
    
    setFormData(createInitialFormData(selectedDivision));
    setEditingPembelian(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (pembelian: any) => {
    setEditingPembelian(pembelian);
    setFormData(transformPembelianToFormData(pembelian));
    setIsDialogOpen(true);
  };

  const handleView = (pembelian: any) => {
    setViewingPembelian(pembelian);
    setIsViewDialogOpen(true);
  };

  const handleUpdateHarga = (pembelian: any) => {
    setUpdatingHargaPembelian(pembelian);
    setUpdateHargaForm({
      harga_beli_dasar: (pembelian.harga_final || pembelian.harga_beli).toString(),
      biaya_pajak: "",
      biaya_qc: "",
      biaya_lain_lain: "",
      keterangan_biaya_lain: "",
      reason: ""
    });
    setIsUpdateHargaDialogOpen(true);
  };

  const handleQC = (pembelian: any) => {
    setQCPembelian(pembelian);
    setQcForm({
      tanggal_qc: new Date().toISOString().split('T')[0],
      jenis_qc: "",
      total_pengeluaran: "",
      keterangan: ""
    });
    setIsQCDialogOpen(true);
  };

  const loadQcHistory = async (pembelianId: number) => {
    try {
      const { data, error } = await supabase
        .from('qc_history')
        .select('*')
        .eq('pembelian_id', pembelianId)
        .order('tanggal_qc', { ascending: false });
      
      if (error) throw error;
      setQcHistory(data || []);
    } catch (error) {
      console.error('Error loading QC history:', error);
      toast({
        title: "Error",
        description: "Gagal memuat history QC",
        variant: "destructive"
      });
    }
  };

  const handleViewQcHistory = (pembelian: any) => {
    setViewingPembelian(pembelian);
    loadQcHistory(pembelian.id);
    setIsQcHistoryDialogOpen(true);
  };

  const handleViewPriceHistory = (pembelian: any) => {
    setViewingPembelian(pembelian);
    setIsPriceHistoryDialogOpen(true);
  };

  const closeAllDialogs = () => {
    setIsViewDialogOpen(false);
    setIsUpdateHargaDialogOpen(false);
    setIsQCDialogOpen(false);
    setIsQcHistoryDialogOpen(false);
    setIsPriceHistoryDialogOpen(false);
    setViewingPembelian(null);
    setUpdatingHargaPembelian(null);
    setQCPembelian(null);
    setUpdateHargaForm({
      harga_beli_dasar: "",
      biaya_pajak: "",
      biaya_qc: "",
      biaya_lain_lain: "",
      keterangan_biaya_lain: "",
      reason: ""
    });
    setQcForm({
      tanggal_qc: new Date().toISOString().split('T')[0],
      jenis_qc: "",
      total_pengeluaran: "",
      keterangan: ""
    });
    setQcHistory([]);
  };

  const handleUpdateHargaSubmit = async () => {
    if (!updateHargaForm.harga_beli_dasar || !updateHargaForm.reason || !updatingHargaPembelian) {
      toast({
        title: "Error",
        description: "Mohon lengkapi field yang wajib diisi (Harga Beli Dasar dan Alasan Update)",
        variant: "destructive"
      });
      return;
    }

    const hargaBeliBaru = parseFloat(parseNumericInput(updateHargaForm.harga_beli_dasar));
    const biayaPajak = parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || 0;
    const biayaQC = parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || 0;
    const biayaLainLain = parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || 0;
    
    if (isNaN(hargaBeliBaru) || hargaBeliBaru <= 0) {
      toast({
        title: "Error",
        description: "Harga Beli Dasar harus berupa angka yang valid",
        variant: "destructive"
      });
      return;
    }

    // Validasi keterangan biaya lain jika biaya lain-lain diisi
    if (biayaLainLain > 0 && !updateHargaForm.keterangan_biaya_lain.trim()) {
      toast({
        title: "Error",
        description: "Keterangan Biaya Lain wajib diisi jika Biaya Lain-Lain diisi",
        variant: "destructive"
      });
      return;
    }

    // Hitung harga final
    const hargaFinal = hargaBeliBaru + biayaPajak + biayaQC + biayaLainLain;
    const hargaLama = updatingHargaPembelian.harga_final || updatingHargaPembelian.harga_beli || 0;
    const selisihHarga = hargaFinal - hargaLama;

    try {
      // Insert ke price_histories_pembelian
      const { error: historyError } = await supabase
        .from('price_histories_pembelian')
        .insert({
          pembelian_id: updatingHargaPembelian.id,
          harga_beli_lama: hargaLama,
          harga_beli_baru: hargaFinal,
          biaya_qc: biayaQC,
          biaya_pajak: biayaPajak,
          biaya_lain_lain: biayaLainLain,
          keterangan_biaya_lain: updateHargaForm.keterangan_biaya_lain || null,
          reason: updateHargaForm.reason,
          company_id: 1, // Add required company_id field  
          user_id: null // Ganti dengan user ID yang sebenarnya
        });

      if (historyError) throw historyError;

      // Jika ada selisih harga (kenaikan), catat ke pembukuan dan kurangi modal
      if (selisihHarga > 0) {
        // Catat ke pembukuan sebagai pengeluaran tambahan
        const pembukuanData = {
          tanggal: new Date().toISOString().split('T')[0],
          divisi: updatingHargaPembelian.divisi,
          cabang_id: updatingHargaPembelian.cabang_id,
          keterangan: `Update harga motor ${updatingHargaPembelian.plat_nomor} - ${updateHargaForm.reason}`,
          debit: selisihHarga,
          pembelian_id: updatingHargaPembelian.id,
          company_id: updatingHargaPembelian.sumber_dana_1_id // Menggunakan sumber dana utama
        };

        const { error: pembukuanError } = await supabase
          .from("pembukuan")
          .insert([pembukuanData]);
        
        if (pembukuanError) throw pembukuanError;

        // Kurangi modal dari company yang menjadi sumber dana utama
        const { data: company, error: companyFetchError } = await supabase
          .from("companies")
          .select("modal")
          .eq("id", updatingHargaPembelian.sumber_dana_1_id)
          .single();
        
        if (companyFetchError) throw companyFetchError;

        const { error: updateModalError } = await supabase
          .from("companies")
          .update({ modal: company.modal - selisihHarga })
          .eq("id", updatingHargaPembelian.sumber_dana_1_id);
        
        if (updateModalError) throw updateModalError;
      }

      // Update harga_final di tabel pembelian - PERBAIKAN: Langsung update tanpa mutation
      const { error: updateHargaError } = await supabase
        .from("pembelian")
        .update({ harga_final: hargaFinal })
        .eq("id", updatingHargaPembelian.id);

      if (updateHargaError) throw updateHargaError;

      toast({
        title: "Sukses",
        description: selisihHarga > 0 
          ? "Harga berhasil diupdate, history tersimpan, dan modal telah dikurangi"
          : "Harga berhasil diupdate dan history tersimpan"
      });
      closeAllDialogs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan history harga atau update pembukuan",
        variant: "destructive"
      });
      console.error(error);
    }
  };

  const handleQCSubmit = async () => {
    if (!qcForm.tanggal_qc || !qcForm.jenis_qc || !qcForm.total_pengeluaran || !qcPembelian) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive"
      });
      return;
    }

    const totalPengeluaran = parseFloat(parseNumericInput(qcForm.total_pengeluaran));
    
    if (isNaN(totalPengeluaran) || totalPengeluaran <= 0) {
      toast({
        title: "Error",
        description: "Total pengeluaran harus berupa angka yang valid",
        variant: "destructive"
      });
      return;
    }

    try {
      // Insert ke tabel qc_history (perlu dibuat tabel baru)
      const { error: qcHistoryError } = await supabase
        .from('qc_history')
        .insert({
          pembelian_id: qcPembelian.id,
          tanggal_qc: qcForm.tanggal_qc,
          jenis_qc: qcForm.jenis_qc,
          total_pengeluaran: totalPengeluaran,
          keterangan: qcForm.keterangan || null,
          user_id: null // Ganti dengan user ID yang sebenarnya
        });

      if (qcHistoryError) throw qcHistoryError;

      // Catat ke pembukuan sebagai pengeluaran (debit)
      const pembukuanData = {
        tanggal: qcForm.tanggal_qc,
        divisi: qcPembelian.divisi,
        cabang_id: qcPembelian.cabang_id,
        keterangan: `QC ${qcForm.jenis_qc} - Motor ${qcPembelian.plat_nomor} - ${qcForm.keterangan || ''}`,
        debit: totalPengeluaran,
        pembelian_id: qcPembelian.id,
        company_id: qcPembelian.sumber_dana_1_id // Menggunakan sumber dana utama
      };

      const { error: pembukuanError } = await supabase
        .from("pembukuan")
        .insert([pembukuanData]);
      
      if (pembukuanError) throw pembukuanError;

      // Kurangi modal dari company
      const { data: company, error: companyFetchError } = await supabase
        .from("companies")
        .select("modal")
        .eq("id", qcPembelian.sumber_dana_1_id)
        .single();
      
      if (companyFetchError) throw companyFetchError;

      const { error: updateModalError } = await supabase
        .from("companies")
        .update({ modal: company.modal - totalPengeluaran })
        .eq("id", qcPembelian.sumber_dana_1_id);
      
      if (updateModalError) throw updateModalError;

      // Update harga_final di tabel pembelian (menambahkan biaya QC)
      const hargaFinalBaru = (qcPembelian.harga_final || qcPembelian.harga_beli) + totalPengeluaran;
      
      updateMutation.mutate(
        { 
          id: qcPembelian.id, 
          data: { harga_final: hargaFinalBaru } 
        },
        {
          onSuccess: () => {
            toast({
              title: "Sukses",
              description: "QC berhasil disimpan, pembukuan tercatat, modal dikurangi, dan harga final diupdate"
            });
            closeAllDialogs();
          },
          onError: () => {
            toast({
              title: "Error",
              description: "Gagal mengupdate harga final",
              variant: "destructive"
            });
          }
        }
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menyimpan data QC atau update pembukuan",
        variant: "destructive"
      });
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">

      {/* Tambahkan filter jenis pembelian */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Pembelian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <Label htmlFor="jenis-pembelian-filter">Jenis Pembelian:</Label>
            <Select value={selectedJenisPembelian} onValueChange={setSelectedJenisPembelian}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Pilih jenis pembelian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="Tukar Tambah">Tukar Tambah</SelectItem>
                <SelectItem value="Bukan Tukar Tambah">Bukan Tukar Tambah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalPembelian}</div>
            <p className="text-xs text-muted-foreground">Unit motor</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryData.totalReady}</div>
            <p className="text-xs text-muted-foreground">Motor siap jual</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryData.totalNilai)}</div>
            <p className="text-xs text-muted-foreground">Total investasi</p>
          </CardContent>
        </Card>
      </div>

      
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Pembelian</h1>
        <PembelianForm
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          editingPembelian={editingPembelian}
          formData={formData}
          setFormData={setFormData}
          cabangData={cabangData}
          brandsData={brandsData}
          jenisMotorData={jenisMotorData}
          companiesData={companiesData}
          handleSubmit={handleSubmit}
          selectedDivision={selectedDivision}
        />
      </div>
      
      <PembelianTable 
        pembelianData={pembelianData}
        handleEdit={handleEdit}
        handleView={handleView}
        handleUpdateHarga={handleUpdateHarga}
        handleQC={handleQC}
        handleViewQcHistory={handleViewQcHistory}
        handleViewPriceHistory={handleViewPriceHistory}
        deleteMutation={deleteMutation}
      />

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Pembelian</DialogTitle>
          </DialogHeader>
          {viewingPembelian && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tanggal Pembelian:</Label>
                <p>{new Date(viewingPembelian.tanggal_pembelian).toLocaleDateString('id-ID')}</p>
              </div>
              <div>
                <Label>Divisi:</Label>
                <p>{viewingPembelian.divisi}</p>
              </div>
              <div>
                <Label>Cabang:</Label>
                <p>{viewingPembelian.cabang?.nama}</p>
              </div>
              <div>
                <Label>Jenis Motor:</Label>
                <p>{viewingPembelian.jenis_motor?.jenis_motor}</p>
              </div>
              <div>
                <Label>Plat Nomor:</Label>
                <p>{viewingPembelian.plat_nomor}</p>
              </div>
              <div>
                <Label>Harga Beli:</Label>
                <p>{formatCurrency(viewingPembelian.harga_beli)}</p>
              </div>
              <div>
                <Label>Harga Final:</Label>
                <p>{formatCurrency(viewingPembelian.harga_final)}</p>
              </div>
              <div>
                <Label>Jenis Pembelian:</Label>
                <p>{viewingPembelian.jenis_pembelian}</p>
              </div>
              <div className="col-span-2">
                <Label>Keterangan:</Label>
                <p>{viewingPembelian.keterangan || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Harga Dialog */}
      <Dialog open={isUpdateHargaDialogOpen} onOpenChange={setIsUpdateHargaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Harga</DialogTitle>
          </DialogHeader>
          {updatingHargaPembelian && (
            <div className="space-y-4">
              <div>
                <Label>Motor: {updatingHargaPembelian.jenis_motor?.jenis_motor}</Label>
                <p className="text-sm text-gray-600">Plat: {updatingHargaPembelian.plat_nomor}</p>
              </div>
              <div>
                <Label htmlFor="harga-beli-dasar">Harga Beli Dasar *</Label>
                <Input
                  id="harga-beli-dasar"
                  type="text"
                  value={formatNumberInput(updateHargaForm.harga_beli_dasar)}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, harga_beli_dasar: parseNumericInput(e.target.value) }))}
                  placeholder="Masukkan harga beli dasar"
                />
              </div>
              <div>
                <Label htmlFor="biaya-pajak">Biaya Pajak</Label>
                <Input
                  id="biaya-pajak"
                  type="text"
                  value={formatNumberInput(updateHargaForm.biaya_pajak)}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, biaya_pajak: parseNumericInput(e.target.value) }))}
                  placeholder="Masukkan biaya pajak"
                />
              </div>
              <div>
                <Label htmlFor="biaya-qc">Biaya QC</Label>
                <Input
                  id="biaya-qc"
                  type="text"
                  value={formatNumberInput(updateHargaForm.biaya_qc)}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, biaya_qc: parseNumericInput(e.target.value) }))}
                  placeholder="Masukkan biaya QC"
                />
              </div>
              <div>
                <Label htmlFor="biaya-lain-lain">Biaya Lain-Lain</Label>
                <Input
                  id="biaya-lain-lain"
                  type="text"
                  value={formatNumberInput(updateHargaForm.biaya_lain_lain)}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, biaya_lain_lain: parseNumericInput(e.target.value) }))}
                  placeholder="Masukkan biaya lain-lain"
                />
              </div>
              {updateHargaForm.biaya_lain_lain && (
                <div>
                  <Label htmlFor="keterangan-biaya-lain">Keterangan Biaya Lain *</Label>
                  <Input
                    id="keterangan-biaya-lain"
                    value={updateHargaForm.keterangan_biaya_lain}
                    onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, keterangan_biaya_lain: e.target.value }))}
                    placeholder="Jelaskan biaya lain-lain"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="reason">Alasan Update *</Label>
                <Textarea
                  id="reason"
                  value={updateHargaForm.reason}
                  onChange={(e) => setUpdateHargaForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Jelaskan alasan update harga"
                  className="h-20"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <Label className="text-sm font-medium">Preview Harga Final:</Label>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(
                    (parseFloat(parseNumericInput(updateHargaForm.harga_beli_dasar)) || 0) +
                    (parseFloat(parseNumericInput(updateHargaForm.biaya_pajak)) || 0) +
                    (parseFloat(parseNumericInput(updateHargaForm.biaya_qc)) || 0) +
                    (parseFloat(parseNumericInput(updateHargaForm.biaya_lain_lain)) || 0)
                  )}
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={closeAllDialogs}>Batal</Button>
                <Button onClick={handleUpdateHargaSubmit}>Update Harga</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QC Dialog dengan field yang diperlukan */}
      <Dialog open={isQCDialogOpen} onOpenChange={setIsQCDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quality Control</DialogTitle>
          </DialogHeader>
          {qcPembelian && (
            <div className="space-y-4">
              <div>
                <Label>Motor: {qcPembelian.jenis_motor?.jenis_motor}</Label>
                <p className="text-sm text-gray-600">Plat: {qcPembelian.plat_nomor}</p>
              </div>
              
              <div>
                <Label htmlFor="tanggal-qc">Tanggal QC *</Label>
                <Input
                  id="tanggal-qc"
                  type="date"
                  value={qcForm.tanggal_qc}
                  onChange={(e) => setQcForm(prev => ({ ...prev, tanggal_qc: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="jenis-qc">Jenis QC *</Label>
                <Select value={qcForm.jenis_qc} onValueChange={(value) => setQcForm(prev => ({ ...prev, jenis_qc: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis QC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Penggantian Sparepart">Penggantian Sparepart</SelectItem>
                    <SelectItem value="Service Mesin">Service Mesin</SelectItem>
                    <SelectItem value="Perbaikan Body">Perbaikan Body</SelectItem>
                    <SelectItem value="Penggantian Oli">Penggantian Oli</SelectItem>
                    <SelectItem value="Tune Up">Tune Up</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="total-pengeluaran">Total Pengeluaran *</Label>
                <Input
                  id="total-pengeluaran"
                  type="text"
                  value={qcForm.total_pengeluaran}
                  onChange={(e) => handleQcNumericChange('total_pengeluaran', e.target.value)}
                  placeholder="Contoh: 1.000.000"
                />
              </div>
              
              <div>
                <Label htmlFor="keterangan-qc">Keterangan</Label>
                <Textarea 
                  id="keterangan-qc"
                  value={qcForm.keterangan}
                  onChange={(e) => setQcForm(prev => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Masukkan keterangan QC..."
                  className="h-24"
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={closeAllDialogs}>Batal</Button>
                <Button onClick={handleQCSubmit}>Simpan QC</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QC History Dialog */}
      <Dialog open={isQcHistoryDialogOpen} onOpenChange={setIsQcHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>History Quality Control</DialogTitle>
          </DialogHeader>
          {viewingPembelian && (
            <div className="space-y-4">
              <div>
                <Label>Motor: {viewingPembelian.jenis_motor?.jenis_motor}</Label>
                <p className="text-sm text-gray-600">Plat: {viewingPembelian.plat_nomor}</p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {qcHistory.length > 0 ? (
                  <div className="space-y-3">
                    {qcHistory.map((qc: any, index: number) => (
                      <Card key={qc.id || index} className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Tanggal QC:</Label>
                            <p className="text-sm">{new Date(qc.tanggal_qc).toLocaleDateString('id-ID')}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Jenis QC:</Label>
                            <p className="text-sm">{qc.jenis_qc}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Total Pengeluaran:</Label>
                            <p className="text-sm font-semibold text-red-600">{formatCurrency(qc.total_pengeluaran)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Keterangan:</Label>
                            <p className="text-sm">{qc.keterangan || '-'}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Belum ada history QC untuk motor ini</p>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button onClick={closeAllDialogs}>Tutup</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Price History Modal */}
      <PriceHistoryModal
        isOpen={isPriceHistoryDialogOpen}
        onClose={() => setIsPriceHistoryDialogOpen(false)}
        pembelian={viewingPembelian}
      />
    </div>
  );
};

export default PembelianPage;