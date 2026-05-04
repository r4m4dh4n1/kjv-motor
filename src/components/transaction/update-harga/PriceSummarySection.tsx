import React from "react";
import { parseFormattedNumber } from "@/utils/formatUtils";

interface PriceSummarySectionProps {
  currentPrice: number;
  formData: {
    biaya_pajak: string;
    biaya_qc: string;
    biaya_lain_lain: string;
  };
  newPrice: number;
}

const PriceSummarySection = ({ currentPrice, formData, newPrice }: PriceSummarySectionProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
      <h3 className="font-medium text-gray-700 mb-3">Ringkasan Perhitungan</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Harga Saat Ini:</span>
          <span className="font-medium">{formatCurrency(currentPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span>+ Biaya Pajak:</span>
          <span className="font-medium">{formatCurrency(parseFormattedNumber(formData.biaya_pajak))}</span>
        </div>
        <div className="flex justify-between">
          <span>+ Biaya QC:</span>
          <span className="font-medium">{formatCurrency(parseFormattedNumber(formData.biaya_qc))}</span>
        </div>
        <div className="flex justify-between">
          <span>+ Biaya Lain-lain:</span>
          <span className="font-medium">{formatCurrency(parseFormattedNumber(formData.biaya_lain_lain))}</span>
        </div>
        <hr className="my-2" />
        <div className="flex justify-between text-lg font-bold text-green-600">
          <span>Total Harga Baru:</span>
          <span>{formatCurrency(newPrice)}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceSummarySection;