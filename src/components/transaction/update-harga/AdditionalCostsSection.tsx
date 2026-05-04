import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseFormattedNumber } from "@/utils/formatUtils";

interface AdditionalCostsSectionProps {
  formData: {
    biaya_pajak: string;
    biaya_qc: string;
    biaya_lain_lain: string;
    keterangan_biaya_lain: string;
  };
  onInputChange: (field: string, value: string) => void;
  onTextChange: (field: string, value: string) => void;
}

const AdditionalCostsSection = ({ 
  formData, 
  onInputChange, 
  onTextChange 
}: AdditionalCostsSectionProps) => {
  const formatInputValue = (value: string) => {
    const number = parseFormattedNumber(value);
    return number.toLocaleString('id-ID');
  };

  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
      <h3 className="font-medium text-blue-700 mb-4">Biaya Tambahan</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="text-sm text-blue-600">Biaya Pajak</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-blue-600">Rp</span>
            <Input
              value={formatInputValue(formData.biaya_pajak)}
              onChange={(e) => onInputChange('biaya_pajak', e.target.value)}
              placeholder="0"
              className="border-blue-200"
            />
          </div>
        </div>
        <div>
          <Label className="text-sm text-blue-600">Biaya QC</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-blue-600">Rp</span>
            <Input
              value={formatInputValue(formData.biaya_qc)}
              onChange={(e) => onInputChange('biaya_qc', e.target.value)}
              placeholder="0"
              className="border-blue-200"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <Label className="text-sm text-blue-600">Biaya Lain-lain</Label>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-blue-600">Rp</span>
          <Input
            value={formatInputValue(formData.biaya_lain_lain)}
            onChange={(e) => onInputChange('biaya_lain_lain', e.target.value)}
            placeholder="0"
            className="border-blue-200"
          />
        </div>
      </div>

      {/* Keterangan Biaya Lain-lain - hanya muncul jika biaya lain-lain diisi */}
      {parseFormattedNumber(formData.biaya_lain_lain) > 0 && (
        <div>
          <Label className="text-sm text-blue-600">Keterangan Biaya Lain-lain *</Label>
          <Textarea
            value={formData.keterangan_biaya_lain}
            onChange={(e) => onTextChange('keterangan_biaya_lain', e.target.value)}
            placeholder="jelaskan biaya lain-lain (wajib diisi)"
            className="mt-1 border-blue-200"
            rows={3}
            required
          />
        </div>
      )}
    </div>
  );
};

export default AdditionalCostsSection;