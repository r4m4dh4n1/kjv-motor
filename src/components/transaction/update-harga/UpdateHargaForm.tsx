import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { parseFormattedNumber } from "@/utils/formatUtils";
import { Calendar, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompaniesData } from "../hooks/usePembelianData";
import MotorInfoSection from "./MotorInfoSection";
import PriceDisplaySection from "./PriceDisplaySection";
import AdditionalCostsSection from "./AdditionalCostsSection";
import PriceSummarySection from "./PriceSummarySection";
import ReasonSection from "./ReasonSection";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/formatUtils";

export interface UpdateHargaData {
  harga_jual_baru: number;
  biaya_pajak: number;
  biaya_qc: number;
  biaya_lain_lain: number;
  keterangan_biaya_lain: string;
  reason: string;
  tanggal_update: string;
  sumber_dana_id: number;
}

interface UpdateHargaFormProps {
  penjualan: any;
  onSubmit: (data: UpdateHargaData) => void;
  onCancel: () => void;
}

const UpdateHargaForm = ({ penjualan, onSubmit, onCancel }: UpdateHargaFormProps) => {
  const [formData, setFormData] = useState({
    harga_jual_dasar: "",
    biaya_pajak: "0",
    biaya_qc: "0", 
    biaya_lain_lain: "0",
    keterangan_biaya_lain: "",
    reason: "",
    tanggal_update: new Date().toISOString().split('T')[0],
    sumber_dana_id: ""
  });
  
  const [tanggalOpen, setTanggalOpen] = useState(false);
  
  // Fetch companies data
  const { data: companiesData = [] } = useCompaniesData(penjualan?.divisi);

  useEffect(() => {
    if (penjualan) {
      setFormData({
        harga_jual_dasar: penjualan.harga_jual?.toString() || "",
        biaya_pajak: "0",
        biaya_qc: "0",
        biaya_lain_lain: "0", 
        keterangan_biaya_lain: "",
        reason: "",
        tanggal_update: new Date().toISOString().split('T')[0],
        sumber_dana_id: penjualan.company_id?.toString() || ""
      });
    }
  }, [penjualan]);

  const handleInputChange = (field: string, value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const handleTextChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotalBiayaTambahan = () => {
    const biayaPajak = parseFormattedNumber(formData.biaya_pajak);
    const biayaQc = parseFormattedNumber(formData.biaya_qc);
    const biayaLain = parseFormattedNumber(formData.biaya_lain_lain);
    
    return biayaPajak + biayaQc + biayaLain;
  };

  const calculateKeuntunganBaru = () => {
    const keuntunganSaatIni = penjualan?.keuntungan || 0;
    const totalBiayaTambahan = calculateTotalBiayaTambahan();
    
    return keuntunganSaatIni - totalBiayaTambahan;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      alert("Alasan update harga wajib diisi");
      return;
    }

    // Validasi keterangan biaya lain-lain
    const biayaLain = parseFormattedNumber(formData.biaya_lain_lain);
    if (biayaLain > 0 && !formData.keterangan_biaya_lain.trim()) {
      alert("Keterangan biaya lain-lain wajib diisi ketika biaya lain-lain diisi");
      return;
    }

    const submitData: UpdateHargaData = {
      harga_jual_baru: penjualan.harga_jual,
      biaya_pajak: parseFormattedNumber(formData.biaya_pajak),
      biaya_qc: parseFormattedNumber(formData.biaya_qc),
      biaya_lain_lain: parseFormattedNumber(formData.biaya_lain_lain),
      keterangan_biaya_lain: formData.keterangan_biaya_lain,
      reason: formData.reason,
      tanggal_update: formData.tanggal_update,
      sumber_dana_id: parseInt(formData.sumber_dana_id)
    };

    onSubmit(submitData);
  };

  if (!penjualan) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informasi Motor */}
      <MotorInfoSection penjualan={penjualan} />

      {/* Harga Display */}
      <PriceDisplaySection 
        currentPrice={penjualan.harga_jual}
        newPrice={penjualan.harga_jual} // Harga jual tidak berubah
      />

      {/* Biaya Tambahan */}
      <AdditionalCostsSection
        formData={formData}
        onInputChange={handleInputChange}
        onTextChange={handleTextChange}
      />

      <div className="space-y-4">
        {/* Date Picker */}
        <div className="space-y-2">
          <Label htmlFor="tanggal_update">Tanggal Update</Label>
          <Popover open={tanggalOpen} onOpenChange={setTanggalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {formData.tanggal_update
                  ? format(new Date(formData.tanggal_update), "dd MMMM yyyy", { locale: id })
                  : "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={formData.tanggal_update ? new Date(formData.tanggal_update) : undefined}
                onSelect={(date) => {
                  if (date) {
                    setFormData(prev => ({
                      ...prev,
                      tanggal_update: date.toISOString().split('T')[0]
                    }));
                    setTanggalOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Sumber Dana */}
        <div className="space-y-2">
          <Label htmlFor="sumber_dana_id">Sumber Dana</Label>
          <Select
            value={formData.sumber_dana_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, sumber_dana_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih sumber dana" />
            </SelectTrigger>
            <SelectContent>
              {companiesData.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.nama_perusahaan} - {formatCurrency(company.modal)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ringkasan Perhitungan */}
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-3">Ringkasan Biaya dan Keuntungan</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Keuntungan Saat Ini:</span>
            <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(penjualan.keuntungan)}</span>
          </div>
          <div className="flex justify-between">
            <span>- Biaya Pajak:</span>
            <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFormattedNumber(formData.biaya_pajak))}</span>
          </div>
          <div className="flex justify-between">
            <span>- Biaya QC:</span>
            <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFormattedNumber(formData.biaya_qc))}</span>
          </div>
          <div className="flex justify-between">
            <span>- Biaya Lain-lain:</span>
            <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(parseFormattedNumber(formData.biaya_lain_lain))}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Keuntungan Baru:</span>
            <span className={calculateKeuntunganBaru() >= 0 ? 'text-green-600' : 'text-red-600'}>
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(calculateKeuntunganBaru())}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total Biaya Tambahan:</span>
            <span className="font-medium text-red-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(calculateTotalBiayaTambahan())}
            </span>
          </div>
        </div>
      </div>

      {/* Alasan Update Harga */}
      <ReasonSection
        reason={formData.reason}
        onReasonChange={(value) => handleTextChange('reason', value)}
      />

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Batal
        </Button>
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700"
        >
          Update Harga
        </Button>
      </div>
    </form>
  );
};

export default UpdateHargaForm;