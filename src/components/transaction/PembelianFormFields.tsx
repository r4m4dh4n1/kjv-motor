import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/components/ui/date-picker";

interface PembelianFormFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  cabangData: any[];
  brandsData: any[];
  jenisMotorData: any[];
  companiesData: any[];
  selectedDivision: string;
}

const PembelianFormFields = ({
  formData,
  setFormData,
  cabangData,
  brandsData,
  jenisMotorData,
  companiesData,
  selectedDivision,
}: PembelianFormFieldsProps) => {
  // Generate year options
  const yearOptions = [];
  for (let year = 2000; year <= 2025; year++) {
    yearOptions.push(year);
  }

  // Filter companies by division
  const filteredCompanies = companiesData.filter(company => 
    formData.divisi ? company.divisi.toLowerCase() === formData.divisi.toLowerCase() : true
  );

  // Filter jenis motor by division and brand
  const filteredJenisMotor = jenisMotorData.filter(jenis => {
    const divisiMatch = formData.divisi ? jenis.divisi.toLowerCase() === formData.divisi.toLowerCase() : true;
    const brandMatch = formData.brand_id ? jenis.brand_id.toString() === formData.brand_id : true;
    return divisiMatch && brandMatch;
  });

  // Helper functions for numeric formatting
  const formatNumberInput = (value: string | number): string => {
    if (!value) return "";
    const numericValue = value.toString().replace(/[^0-9]/g, "");
    if (!numericValue) return "";
    return parseInt(numericValue).toLocaleString("id-ID");
  };

  const parseNumericInput = (value: string): string => {
    return value.replace(/[^0-9]/g, "");
  };

  const handleNumericChange = (field: string, value: string) => {
    const numericValue = parseNumericInput(value);
    setFormData({ ...formData, [field]: numericValue });
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Tanggal, Divisi, Cabang */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="tanggal_pembelian">Tanggal *</Label>
          <div className="mt-1">
            <DatePicker
              id="tanggal_pembelian"
              value={formData.tanggal_pembelian}
              onChange={(value) => setFormData({ ...formData, tanggal_pembelian: value })}
              placeholder="Pilih tanggal pembelian"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="divisi">Divisi *</Label>
          {selectedDivision === "all" ? (
            <Select value={formData.divisi} onValueChange={(value) => setFormData({ ...formData, divisi: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Pilih divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sport">Sport</SelectItem>
                <SelectItem value="start">Start</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="divisi"
              type="text"
              value={formData.divisi ? (formData.divisi === 'sport' ? 'Sport' : 'Start') : 'Belum dipilih'}
              readOnly
              className="mt-1 bg-gray-100 cursor-not-allowed"
              placeholder="Divisi akan otomatis terisi berdasarkan pilihan di sidebar"
            />
          )}
        </div>
        <div>
          <Label htmlFor="cabang_id">Cabang *</Label>
          <Select value={formData.cabang_id} onValueChange={(value) => setFormData({ ...formData, cabang_id: value })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Jakarta" />
            </SelectTrigger>
            <SelectContent>
              {cabangData.map((cabang) => (
                <SelectItem key={cabang.id} value={cabang.id.toString()}>
                  {cabang.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Jenis Pembelian with Radio Buttons */}
      <div>
        <Label>Jenis Pembelian *</Label>
        <RadioGroup 
          value={formData.jenis_pembelian} 
          onValueChange={(value) => setFormData({ ...formData, jenis_pembelian: value })}
          className="flex gap-6 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Tukar Tambah" id="tukar-tambah" />
            <Label htmlFor="tukar-tambah">Tukar Tambah</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Bukan Tukar Tambah" id="bukan-tukar-tambah" />
            <Label htmlFor="bukan-tukar-tambah">Bukan Tukar Tambah</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Row 3: Brand, Jenis Motor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand_id">Brand *</Label>
          <Select value={formData.brand_id} onValueChange={(value) => setFormData({ ...formData, brand_id: value, jenis_motor_id: "" })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="- Pilih Brand -" />
            </SelectTrigger>
            <SelectContent>
              {brandsData.map((brand) => (
                <SelectItem key={brand.id} value={brand.id.toString()}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="jenis_motor_id">Jenis Motor *</Label>
          <Select value={formData.jenis_motor_id} onValueChange={(value) => setFormData({ ...formData, jenis_motor_id: value })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="- Pilih Jenis Motor -" />
            </SelectTrigger>
            <SelectContent>
              {filteredJenisMotor.map((jenis) => (
                <SelectItem key={jenis.id} value={jenis.id.toString()}>
                  {jenis.jenis_motor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 4: Tahun, Warna, Kilometer, Plat Nomor */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label htmlFor="tahun">Tahun *</Label>
          <Select value={formData.tahun} onValueChange={(value) => setFormData({ ...formData, tahun: value })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tahun" />
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
        <div>
          <Label htmlFor="warna">Warna *</Label>
          <Input
            id="warna"
            type="text"
            value={formData.warna}
            onChange={(e) => setFormData({ ...formData, warna: e.target.value })}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="kilometer">Kilometer *</Label>
          <Input
            id="kilometer"
            type="number"
            value={formData.kilometer}
            onChange={(e) => setFormData({ ...formData, kilometer: e.target.value })}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="plat_nomor">Plat Nomor *</Label>
          <Input
            id="plat_nomor"
            type="text"
            value={formData.plat_nomor}
            onChange={(e) => setFormData({ ...formData, plat_nomor: e.target.value })}
            required
            className="mt-1"
          />
        </div>
      </div>

      {/* Row 5: Tanggal Pajak, Harga Beli - DIPERBAIKI */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tanggal_pajak">Tanggal Pajak *</Label>
          <div className="mt-1">
            <DatePicker
              id="tanggal_pajak"
              value={formData.tanggal_pajak}
              onChange={(value) => setFormData({ ...formData, tanggal_pajak: value })}
              placeholder="Pilih tanggal pajak"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="harga_beli">Harga Beli *</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-sm text-gray-500">Rp</span>
            <Input
              id="harga_beli"
              type="text"
              value={formatNumberInput(formData.harga_beli)}
              onChange={(e) => handleNumericChange('harga_beli', e.target.value)}
              required
              className="pl-8"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Row 6: Sumber Dana 1 and Nominal Dana 1 - DIPERBAIKI */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sumber_dana_1_id">Sumber Dana 1 *</Label>
          <Select value={formData.sumber_dana_1_id} onValueChange={(value) => setFormData({ ...formData, sumber_dana_1_id: value })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="- Pilih Sumber Dana -" />
            </SelectTrigger>
            <SelectContent>
              {filteredCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.nama_perusahaan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="nominal_dana_1">Nominal Dana 1 *</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-sm text-gray-500">Rp</span>
            <Input
              id="nominal_dana_1"
              type="text"
              value={formatNumberInput(formData.nominal_dana_1)}
              onChange={(e) => handleNumericChange('nominal_dana_1', e.target.value)}
              required
              className="pl-8"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Row 7: Sumber Dana 2 and Nominal Dana 2 - DIPERBAIKI */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sumber_dana_2_id">Sumber Dana 2 (Opsional)</Label>
          <Select value={formData.sumber_dana_2_id || "none"} onValueChange={(value) => setFormData({ ...formData, sumber_dana_2_id: value === "none" ? "" : value })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="- Pilih Sumber Dana 2 -" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak Ada</SelectItem>
              {filteredCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.nama_perusahaan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="nominal_dana_2">Nominal Dana 2</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2.5 text-sm text-gray-500">Rp</span>
            <Input
              id="nominal_dana_2"
              type="text"
              value={formatNumberInput(formData.nominal_dana_2)}
              onChange={(e) => handleNumericChange('nominal_dana_2', e.target.value)}
              placeholder="0"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Row 8: Catatan */}
      <div>
        <Label htmlFor="keterangan">Catatan</Label>
        <Textarea
          id="keterangan"
          value={formData.keterangan}
          onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>
    </div>
  );
};

export default PembelianFormFields;