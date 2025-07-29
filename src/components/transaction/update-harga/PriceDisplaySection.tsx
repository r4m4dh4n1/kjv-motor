import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PriceDisplaySectionProps {
  currentPrice: number;
  newPrice: number;
}

const PriceDisplaySection = ({ currentPrice, newPrice }: PriceDisplaySectionProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Harga Saat Ini */}
      <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">ℹ</span>
          </div>
          <h3 className="font-medium text-cyan-700">Harga Saat Ini</h3>
        </div>
        <div className="text-2xl font-bold text-cyan-600">
          {formatCurrency(currentPrice)}
        </div>
      </div>

      {/* Harga Jual Tetap */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">$</span>
          </div>
          <h3 className="font-medium text-green-700">Harga Jual Motor</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label className="text-sm text-green-600">Harga Jual Tetap (Tidak Berubah)</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-green-600">Rp</span>
              <Input
                value={new Intl.NumberFormat('id-ID').format(newPrice)}
                readOnly
                className="border-green-200 bg-green-50 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-green-600 mt-1">
              Harga jual motor tidak berubah. Yang berubah adalah keuntungan perusahaan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceDisplaySection;