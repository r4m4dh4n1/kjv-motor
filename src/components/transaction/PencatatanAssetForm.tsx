import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { formatCurrency, handleCurrencyInput } from "@/utils/formatUtils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PencatatanAssetFormData {
  tanggal: string;
  nama: string;
  nominal: string;
  sumber_dana_id: string;
  keterangan: string;
}

interface PencatatanAssetFormProps {
  formData: PencatatanAssetFormData;
  setFormData: React.Dispatch<React.SetStateAction<PencatatanAssetFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
  selectedDivision: string;
}

export const PencatatanAssetForm = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isEditing,
  selectedDivision,
}: PencatatanAssetFormProps) => {
  const [tanggalOpen, setTanggalOpen] = useState(false);

  // Fetch companies for the selected division
  const { data: companiesData = [] } = useQuery({
    queryKey: ["companies", selectedDivision],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("divisi", selectedDivision)
        .order("nama_perusahaan");
      
      if (error) throw error;
      return data;
    },
  });

  const handleCurrencyChange = (value: string) => {
    const formattedValue = handleCurrencyInput(value);
    setFormData(prev => ({ ...prev, nominal: formattedValue }));
  };

  // Helper function untuk konversi string tanggal ke Date object
  const convertStringToDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    const [day, month, year] = dateString.split('/');
    if (day && month && year) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return undefined;
  };

  // Helper function untuk konversi Date object ke string format dd/mm/yyyy
  const convertDateToString = (date: Date | undefined): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${day}/${month}/${year}`;
  };

  // Handler untuk perubahan tanggal
  const handleTanggalChange = (date: Date | undefined) => {
    const dateString = convertDateToString(date);
    setFormData(prev => ({ ...prev, tanggal: dateString }));
    setTanggalOpen(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="tanggal">Tanggal *</Label>
          <Popover open={tanggalOpen} onOpenChange={setTanggalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.tanggal && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.tanggal ? formData.tanggal : "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={convertStringToDate(formData.tanggal)}
                onSelect={handleTanggalChange}
                initialFocus
                locale={id}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <Label htmlFor="nama">Nama Asset *</Label>
        <Input
          id="nama"
          type="text"
          value={formData.nama}
          onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
          placeholder="Masukkan nama asset"
          required
        />
      </div>

      <div>
        <Label htmlFor="nominal">Nominal *</Label>
        <Input
          id="nominal"
          type="text"
          value={formData.nominal}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          placeholder="0"
          required
        />
      </div>

      <div>
        <Label htmlFor="sumber_dana_id">Sumber Dana *</Label>
        <Select
          value={formData.sumber_dana_id}
          onValueChange={(value) => setFormData(prev => ({ ...prev, sumber_dana_id: value }))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih Sumber Dana" />
          </SelectTrigger>
          <SelectContent>
            {companiesData.map((company) => (
              <SelectItem key={company.id} value={company.id.toString()}>
                {company.nama_perusahaan}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="keterangan">Keterangan</Label>
        <Textarea
          id="keterangan"
          value={formData.keterangan}
          onChange={(e) => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
          rows={3}
          placeholder="Masukkan keterangan (opsional)"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit">
          {isEditing ? "Update" : "Simpan"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  );
};