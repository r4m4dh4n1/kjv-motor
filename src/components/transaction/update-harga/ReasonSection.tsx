import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ReasonSectionProps {
  reason: string;
  onReasonChange: (value: string) => void;
}

const ReasonSection = ({ reason, onReasonChange }: ReasonSectionProps) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">!</span>
        </div>
        <h3 className="font-medium text-yellow-700">Alasan Update Harga *</h3>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-4 h-4 bg-yellow-400 rounded-full"></span>
        <span className="text-sm text-yellow-600">Berikan alasan yang jelas untuk audit dan tracking</span>
      </div>
      <Textarea
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="jelaskan alasan perubahan harga (contoh: penyesuaian harga pasar, biaya tambahan, dll...)"
        className="border-yellow-200"
        rows={3}
        required
      />
    </div>
  );
};

export default ReasonSection;