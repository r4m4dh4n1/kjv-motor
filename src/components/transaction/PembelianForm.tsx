import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  selectedDivision
}: PembelianFormProps) => {
  return (
    <>
      {/* Tombol untuk membuka dialog */}
      <Button 
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {editingPembelian ? "Edit Pembelian" : "Tambah Pembelian"}
      </Button>

      {/* Dialog yang berisi form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPembelian ? "Edit Pembelian" : "Tambah Pembelian Baru"}
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
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">
                {editingPembelian ? "Update" : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PembelianForm;