import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit } from "lucide-react";

interface BasicAssetUpdateProps {
  selectedDivision: string;
  onSuccess?: () => void;
}

export const BasicAssetUpdate = ({ selectedDivision, onSuccess }: BasicAssetUpdateProps) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    alert(`Update Harga Asset untuk divisi: ${selectedDivision}`);
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Update Harga Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Harga Asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Divisi: {selectedDivision}</p>
          <Button onClick={handleClick} className="w-full">
            Test Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
