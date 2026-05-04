import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DollarSign } from "lucide-react";
import UpdateHargaForm, { UpdateHargaData } from "./update-harga/UpdateHargaForm";

interface UpdateHargaModalProps {
  isOpen: boolean;
  onClose: () => void;
  penjualan: any;
  onSubmit: (data: UpdateHargaData) => void;
}

const UpdateHargaModal = ({ isOpen, onClose, penjualan, onSubmit }: UpdateHargaModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-6 h-6" />
            Update Harga Jual Motor
          </DialogTitle>
        </DialogHeader>

        <UpdateHargaForm
          penjualan={penjualan}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export type { UpdateHargaData };
export default UpdateHargaModal;