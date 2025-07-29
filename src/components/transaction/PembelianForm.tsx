
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import PembelianFormFields from "./PembelianFormFields";

interface PembelianFormProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingPembelian: any;
  formData: any;
  setFormData: (data: any) => void;
  cabangData: any[];
  brandsData: any[];
  jenisMotorData: any[];
  companiesData: any[];
  handleSubmit: (e: React.FormEvent) => void;
  selectedDivision: string;
}

const PembelianForm = ({
  isDialogOpen,
  setIsDialogOpen,
  editingPembelian,
  formData,
  setFormData,
  cabangData,
  brandsData,
  jenisMotorData,
  companiesData,
  handleSubmit,
  selectedDivision,
}: PembelianFormProps) => {
  const handleAddNew = () => {
    if (!editingPembelian) {
      // Only reset when adding new, not when editing
    }
  };
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => handleAddNew()}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pembelian
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPembelian ? "Edit Pembelian" : "Tambah Pembelian Motor"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              {editingPembelian ? "Update" : "Simpan"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PembelianForm;
