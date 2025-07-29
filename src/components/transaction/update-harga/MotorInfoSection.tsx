import React from "react";
import { Label } from "@/components/ui/label";

interface MotorInfoSectionProps {
  penjualan: any;
}

const MotorInfoSection = ({ penjualan }: MotorInfoSectionProps) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-medium text-gray-700 mb-3">Informasi Motor</h3>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label className="text-sm text-gray-600">Brand Motor</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>{penjualan.brands?.name || '-'}</span>
          </div>
        </div>
        <div>
          <Label className="text-sm text-gray-600">Jenis Motor</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>{penjualan.jenis_motor?.jenis_motor || '-'}</span>
          </div>
        </div>
        <div>
          <Label className="text-sm text-gray-600">Tahun</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>{penjualan.tahun}</span>
          </div>
        </div>
        <div>
          <Label className="text-sm text-gray-600">Plat Nomor</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>{penjualan.plat}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorInfoSection;