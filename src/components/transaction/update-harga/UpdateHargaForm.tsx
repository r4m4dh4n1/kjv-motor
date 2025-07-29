import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { parseFormattedNumber } from "@/utils/formatUtils";
import MotorInfoSection from "./MotorInfoSection";
import PriceDisplaySection from "./PriceDisplaySection";
import AdditionalCostsSection from "./AdditionalCostsSection";
import PriceSummarySection from "./PriceSummarySection";
import ReasonSection from "./ReasonSection";

export interface UpdateHargaData {
  harga_jual_baru: number;
  biaya_pajak: number;
  biaya_qc: number;
  biaya_lain_lain: number;
  keterangan_biaya_lain: string;
  reason: string;
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
    reason: ""
  });

  useEffect(() => {
    if (penjualan) {
      setFormData({
        harga_jual_dasar: penjualan.harga_jual?.toString() || "",
        biaya_pajak: "0",
        biaya_qc: "0",
        biaya_lain_lain: "0", 
        keterangan_biaya_lain: "",
        reason: ""
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
      harga_jual_baru: penjualan.harga_jual, // Harga jual tidak berubah
      biaya_pajak: parseFormattedNumber(formData.biaya_pajak),
      biaya_qc: parseFormattedNumber(formData.biaya_qc),
      biaya_lain_lain: parseFormattedNumber(formData.biaya_lain_lain),
      keterangan_biaya_lain: formData.keterangan_biaya_lain,
      reason: formData.reason
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