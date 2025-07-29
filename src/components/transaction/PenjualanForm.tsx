import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import PenjualanFormFields from "./PenjualanFormFields";

interface PenjualanFormProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingPenjualan: any;
  formData: any;
  setFormData: (data: any) => void;
  cabangData: any[];
  pembelianData: any[]; // Ganti dari brandsData dan jenisMotorData
  companiesData: any[];
  handleSubmit: (e: React.FormEvent) => void;
  resetForm: () => void;
  selectedDivision: string;
}

const PenjualanForm = ({
  isDialogOpen,
  setIsDialogOpen,
  editingPenjualan,
  formData,
  setFormData,
  cabangData,
  pembelianData, // Ganti dari brandsData dan jenisMotorData
  companiesData,
  handleSubmit,
  resetForm,
  selectedDivision,
}: PenjualanFormProps) => {
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => resetForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Penjualan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPenjualan ? "Edit Penjualan" : "Tambah Penjualan Motor"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PenjualanFormFields
            formData={formData}
            setFormData={setFormData}
            cabangData={cabangData}
            pembelianData={pembelianData} // Ganti dari brandsData dan jenisMotorData
            companiesData={companiesData}
            selectedDivision={selectedDivision}
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit">
              {editingPenjualan ? "Update" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PenjualanForm;