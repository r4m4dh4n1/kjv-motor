import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";

interface SimpleAssetPriceUpdateProps {
  selectedDivision: string;
  onSuccess?: () => void;
}

export const SimpleAssetPriceUpdate = ({ selectedDivision, onSuccess }: SimpleAssetPriceUpdateProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    asset_name: "",
    harga_baru: "",
    alasan: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Update Harga Asset: ${formData.asset_name} - ${formData.harga_baru} - ${formData.alasan}`);
    setOpen(false);
    setFormData({ asset_name: "", harga_baru: "", alasan: "" });
    onSuccess?.();
  };

  const handleCurrencyChange = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    const formattedValue = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(parseInt(numericValue) || 0);
    
    setFormData(prev => ({ ...prev, harga_baru: formattedValue }));
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="asset_name">Nama Asset</Label>
            <Input
              id="asset_name"
              value={formData.asset_name}
              onChange={(e) => setFormData(prev => ({ ...prev, asset_name: e.target.value }))}
              placeholder="Masukkan nama asset"
              required
            />
          </div>

          <div>
            <Label htmlFor="harga_baru">Harga Baru</Label>
            <Input
              id="harga_baru"
              value={formData.harga_baru}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              placeholder="Masukkan harga baru"
              required
            />
          </div>

          <div>
            <Label htmlFor="alasan">Alasan Update</Label>
            <Textarea
              id="alasan"
              value={formData.alasan}
              onChange={(e) => setFormData(prev => ({ ...prev, alasan: e.target.value }))}
              placeholder="Masukkan alasan update harga"
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit">
              Update Harga
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
