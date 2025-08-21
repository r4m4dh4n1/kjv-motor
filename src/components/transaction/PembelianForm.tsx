import React from "react";
import { Button } from "@/components/ui/button";
import PembelianFormFields from "./PembelianFormFields";
import { useCabangData, useBrandsData, useJenisMotorData, useCompaniesData } from "./hooks/usePembelianData";

interface PembelianFormProps {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  editingPembelian: any;
  selectedDivision: string;
}

const PembelianForm = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isEditing,
  editingPembelian,
  selectedDivision,
}: PembelianFormProps) => {
  const { data: cabangData = [] } = useCabangData();
  const { data: brandsData = [] } = useBrandsData();
  const { data: jenisMotorData = [] } = useJenisMotorData();
  const { data: companiesData = [] } = useCompaniesData();

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <PembelianFormFields
        formData={formData}
        setFormData={setFormData}
        cabangData={cabangData}
        brandsData={brandsData}
        jenisMotorData={jenisMotorData}
        companiesData={companiesData}
        selectedDivision={selectedDivision}
      />

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {isEditing ? "Update" : "Simpan"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
};

export default PembelianForm;