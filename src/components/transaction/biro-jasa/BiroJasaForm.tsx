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
import type { BiroJasaFormData, Brand, Company, JenisMotor } from "./types";
import { yearOptions } from "./utils";
import { formatCurrency, parseCurrency, handleCurrencyInput } from "./utils";

interface BiroJasaFormProps {
  formData: BiroJasaFormData;
  setFormData: React.Dispatch<React.SetStateAction<BiroJasaFormData>>;
  brandsData: Brand[];
  companiesData: Company[];
  jenisMotorData: JenisMotor[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export const BiroJasaForm = ({
  formData,
  setFormData,
  brandsData,
  companiesData,
  jenisMotorData,
  onSubmit,
  onCancel,
  isEditing,
}: BiroJasaFormProps) => {
  // State untuk mengontrol popover calendar
  const [tanggalOpen, setTanggalOpen] = useState(false);
  const [estimasiTanggalOpen, setEstimasiTanggalOpen] = useState(false);


  const handleCurrencyChange = (field: keyof BiroJasaFormData, value: string) => {
    const formattedValue = handleCurrencyInput(value);
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
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

  // Handler untuk perubahan estimasi tanggal selesai
  const handleEstimasiTanggalChange = (date: Date | undefined) => {
    const dateString = convertDateToString(date);
    setFormData(prev => ({ ...prev, estimasi_tanggal_selesai: dateString }));
    setEstimasiTanggalOpen(false);
  };


  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="tanggal">Tanggal *</Label>
          <Popover open={tanggalOpen} onOpenChange={setTanggalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand_id">Brand</Label>
          <Input
            id="brand_id"
            type="text"
            value={formData.brand_name || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              brand_name: e.target.value,
              brand_id: "",
              jenis_motor_id: ""
            }))}
            placeholder="Masukkan brand secara manual"
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="jenis_motor">Jenis Motor</Label>
          <Input
            id="jenis_motor"
            type="text"
            value={formData.jenis_motor || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              jenis_motor: e.target.value,
              jenis_motor_id: ""
            }))}
            placeholder="Masukkan jenis motor secara manual"
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="warna">Warna</Label>
          <Input
            id="warna"
            type="text"
            value={formData.warna}
            onChange={(e) => setFormData(prev => ({ ...prev, warna: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="plat_nomor">Plat Nomor</Label>
          <Input
            id="plat_nomor"
            type="text"
            value={formData.plat_nomor}
            onChange={(e) => setFormData(prev => ({ ...prev, plat_nomor: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="tahun">Tahun</Label>
          <Select
            value={formData.tahun}
            onValueChange={(value) => setFormData(prev => ({ ...prev, tahun: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="jenis_pengurusan">Jenis Pengurusan *</Label>
        <Select
          value={formData.jenis_pengurusan}
          onValueChange={(value) => setFormData(prev => ({ ...prev, jenis_pengurusan: value }))}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih Jenis Pengurusan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Perpanjangan STNK">Perpanjangan STNK</SelectItem>
            <SelectItem value="Balik Nama">Balik Nama</SelectItem>
            <SelectItem value="Mutasi">Mutasi</SelectItem>
            <SelectItem value="Lainnya">Lainnya</SelectItem>
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
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="estimasi_biaya">Estimasi Biaya</Label>
          <Input
            id="estimasi_biaya"
            type="text"
            value={formData.estimasi_biaya}
            onChange={(e) => handleCurrencyChange('estimasi_biaya', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="estimasi_tanggal_selesai">Estimasi Tanggal Selesai</Label>
          <Popover open={estimasiTanggalOpen} onOpenChange={setEstimasiTanggalOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.estimasi_tanggal_selesai && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.estimasi_tanggal_selesai ? formData.estimasi_tanggal_selesai : "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={convertStringToDate(formData.estimasi_tanggal_selesai)}
                onSelect={handleEstimasiTanggalChange}
                initialFocus
                locale={id}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dp">DP</Label>
          <Input
            id="dp"
            type="text"
            value={formData.dp}
            onChange={(e) => handleCurrencyChange('dp', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="sisa">Sisa</Label>
          <Input
            id="sisa"
            type="text"
            value={formData.sisa}
            readOnly
            className="bg-muted"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rekening_tujuan_id">Rekening Tujuan</Label>
          <Select
            value={formData.rekening_tujuan_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, rekening_tujuan_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Rekening Tujuan" />
            </SelectTrigger>
            <SelectContent>
              {companiesData.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.nama_perusahaan} - {company.nomor_rekening}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
              <SelectItem value="Selesai">Selesai</SelectItem>
              <SelectItem value="Batal">Batal</SelectItem>
            </SelectContent>
          </Select>
        </div>
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