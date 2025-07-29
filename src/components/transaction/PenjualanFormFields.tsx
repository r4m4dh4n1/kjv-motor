import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect } from "react";
import { formatNumber, parseFormattedNumber, handleNumericInput } from "@/utils/formatUtils";
import { DatePicker } from "@/components/ui/date-picker";

interface PenjualanFormFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  cabangData: any[];
  pembelianData: any[];
  companiesData: any[];
  selectedDivision: string;
}

const PenjualanFormFields = ({
  formData,
  setFormData,
  cabangData,
  pembelianData,
  companiesData,
  selectedDivision,
}: PenjualanFormFieldsProps) => {
  // Filter pembelian berdasarkan divisi dan status ready
  const filteredPembelian = pembelianData.filter(pembelian => {
    const divisiToCheck = formData.divisi && formData.divisi !== 'all' ? formData.divisi : selectedDivision;
    console.log('Debug brand filter:', {
      pembelianTotal: pembelianData.length,
      divisiToCheck,
      selectedDivision,
      pembelianStatus: pembelian.status,
      pembelianDivisi: pembelian.divisi,
      brandData: pembelian.brands
    });
    return pembelian.status === 'ready' && 
           (divisiToCheck === 'all' || pembelian.divisi.toLowerCase() === divisiToCheck.toLowerCase());
  });

  // Get unique brands dari pembelian yang sudah difilter
  const availableBrands = filteredPembelian.reduce((brands, pembelian) => {
    const existingBrand = brands.find(b => b.id === pembelian.brand_id);
    if (!existingBrand) {
      brands.push({
        id: pembelian.brand_id,
        name: pembelian.brands?.name || 'Unknown Brand'
      });
    }
    return brands;
  }, []);

  // Get unique jenis motor berdasarkan brand dan divisi yang dipilih
  const availableJenisMotor = filteredPembelian
    .filter(pembelian => 
      formData.brand_id ? pembelian.brand_id.toString() === formData.brand_id : true
    )
    .reduce((jenisMotor, pembelian) => {
      const existing = jenisMotor.find(j => j.id === pembelian.jenis_motor_id);
      if (!existing) {
        jenisMotor.push({
          id: pembelian.jenis_motor_id,
          jenis_motor: pembelian.jenis_motor?.jenis_motor || 'Unknown Type'
        });
      }
      return jenisMotor;
    }, []);

  // Get motor details berdasarkan divisi, brand, dan jenis motor yang dipilih
  const selectedMotorDetails = filteredPembelian.filter(pembelian => 
    formData.divisi && pembelian.divisi.toLowerCase() === formData.divisi.toLowerCase() &&
    formData.brand_id && pembelian.brand_id.toString() === formData.brand_id &&
    formData.jenis_motor_id && pembelian.jenis_motor_id.toString() === formData.jenis_motor_id
  );

  // Filter companies by division
  const filteredCompanies = companiesData.filter(company => 
    formData.divisi ? company.divisi.toLowerCase() === formData.divisi.toLowerCase() : true
  );

  // Auto-calculate sisa bayar when DP or harga jual changes
  useEffect(() => {
    if (formData.jenis_pembayaran === 'cash_bertahap' || formData.jenis_pembayaran === 'kredit') {
      if (formData.harga_jual && formData.dp) {
        const hargaJual = parseFormattedNumber(formData.harga_jual);
        const dp = parseFormattedNumber(formData.dp);
        const sisaBayar = hargaJual - dp;
        setFormData({ ...formData, sisa_bayar: sisaBayar.toString() });
      }
    }
  }, [formData.harga_jual, formData.dp, formData.jenis_pembayaran]);

  // Auto-calculate sisa ongkir when total ongkir or titip ongkir changes
  useEffect(() => {
    const totalOngkir = parseFormattedNumber(formData.total_ongkir);
    const titipOngkir = parseFormattedNumber(formData.titip_ongkir);
    const sisaOngkir = totalOngkir - titipOngkir;
    setFormData({ ...formData, sisa_ongkir: sisaOngkir.toString() });
  }, [formData.total_ongkir, formData.titip_ongkir]);

  // Reset payment fields when payment type changes
  useEffect(() => {
    setFormData({
      ...formData,
      harga_bayar: "",
      dp: "",
      sisa_bayar: ""
    });
  }, [formData.jenis_pembayaran]);

  return (
    <div className="space-y-6">
      {/* Row 1: Tanggal, Divisi, Cabang */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="tanggal_penjualan">Tanggal *</Label>
          <div className="mt-1">
            <DatePicker
              id="tanggal_penjualan"
              value={formData.tanggal_penjualan}
              onChange={(value) => setFormData({ ...formData, tanggal_penjualan: value })}
              placeholder="Pilih tanggal penjualan"
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="divisi">Divisi *</Label>
          {selectedDivision === "all" ? (
            <Select value={formData.divisi} onValueChange={(value) => setFormData({ 
              ...formData, 
              divisi: value,
              brand_id: "",
              jenis_motor_id: "",
              tahun: "",
              warna: "",
              kilometer: "",
              plat_nomor: "",
              harga_beli: ""
            })}>
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
              <SelectValue placeholder="- Pilih Cabang -" />
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

      {/* Row 2: Jenis Transaksi */}
      <div>
        <Label htmlFor="jenis_transaksi">Jenis Transaksi *</Label>
        <Select value={formData.jenis_transaksi} onValueChange={(value) => setFormData({ ...formData, jenis_transaksi: value })}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="- Pilih Jenis Transaksi -" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tukar_tambah">Tukar Tambah</SelectItem>
            <SelectItem value="bukan_tukar_tambah">Bukan Tukar Tambah</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 3: Brand, Jenis Motor */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand_id">Brand *</Label>
          <Select 
            value={formData.brand_id} 
            onValueChange={(value) => setFormData({ 
              ...formData, 
              brand_id: value, 
              jenis_motor_id: "",
              tahun: "",
              warna: "",
              kilometer: "",
              plat_nomor: "",
              harga_beli: ""
            })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="- Pilih Brand -" />
            </SelectTrigger>
            <SelectContent>
              {availableBrands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id.toString()}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="jenis_motor_id">Jenis Motor *</Label>
          <Select 
            value={formData.jenis_motor_id} 
            onValueChange={(value) => setFormData({ 
              ...formData, 
              jenis_motor_id: value,
              tahun: "",
              warna: "",
              kilometer: "",
              plat_nomor: "",
              harga_beli: ""
            })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="- Pilih Jenis Motor -" />
            </SelectTrigger>
            <SelectContent>
              {availableJenisMotor.map((jenis) => (
                <SelectItem key={jenis.id} value={jenis.id.toString()}>
                  {jenis.jenis_motor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 4: Motor Details - Auto-populated from selected motor */}
      {selectedMotorDetails.length > 0 && (
        <div>
          <Label>Pilih Motor yang Tersedia:</Label>
          <div className="mt-2 space-y-2">
            {selectedMotorDetails.map((motor) => (
              <div 
                key={motor.id}
                className={`p-3 border rounded cursor-pointer ${
                  formData.selected_motor_id === motor.id.toString() 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData({
                  ...formData,
                  selected_motor_id: motor.id.toString(),
                  pembelian_id: motor.id.toString(),
                  tahun: motor.tahun.toString(),
                  warna: motor.warna,
                  kilometer: motor.kilometer.toString(),
                  plat_nomor: motor.plat_nomor,
                  harga_beli: motor.harga_beli.toString()
                })}
              >
                <div className="grid grid-cols-5 gap-2 text-sm">
                  <div><strong>Tahun:</strong> {motor.tahun}</div>
                  <div><strong>Warna:</strong> {motor.warna}</div>
                  <div><strong>KM:</strong> {formatNumber(motor.kilometer)}</div>
                  <div><strong>Plat:</strong> {motor.plat_nomor}</div>
                  <div><strong>Harga Beli:</strong> Rp {formatNumber(motor.harga_beli)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 5: Harga Jual */}
      <div>
        <Label htmlFor="harga_jual">Harga Jual *</Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
          <Input
            id="harga_jual"
            type="text"
            value={formatNumber(formData.harga_jual)}
            onChange={(e) => handleNumericInput(e.target.value, (val) => setFormData({ ...formData, harga_jual: val }))}
            className="pl-10"
            placeholder="1.000.000"
          />
        </div>
      </div>

      {/* Row 6: Jenis Pembayaran with Radio Buttons */}
      <div>
        <Label>Jenis Pembayaran *</Label>
        <RadioGroup 
          value={formData.jenis_pembayaran} 
          onValueChange={(value) => setFormData({ ...formData, jenis_pembayaran: value })}
          className="flex space-x-6 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cash_penuh" id="cash_penuh" />
            <Label htmlFor="cash_penuh">Cash Penuh</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cash_bertahap" id="cash_bertahap" />
            <Label htmlFor="cash_bertahap">Cash Bertahap</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="kredit" id="kredit" />
            <Label htmlFor="kredit">Kredit</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Conditional Payment Fields */}
      {formData.jenis_pembayaran === 'cash_penuh' && (
        <div>
          <Label htmlFor="harga_bayar">Harga Bayar *</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
            <Input
              id="harga_bayar"
              type="text"
              value={formatNumber(formData.harga_bayar)}
              onChange={(e) => handleNumericInput(e.target.value, (val) => setFormData({ ...formData, harga_bayar: val }))}
              className="pl-10"
              placeholder="1.000.000"
            />
          </div>
        </div>
      )}

      {(formData.jenis_pembayaran === 'cash_bertahap' || formData.jenis_pembayaran === 'kredit') && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dp">DP *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
              <Input
                id="dp"
                type="text"
                value={formatNumber(formData.dp)}
                onChange={(e) => handleNumericInput(e.target.value, (val) => setFormData({ ...formData, dp: val }))}
                className="pl-10"
                placeholder="1.000.000"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sisa_bayar">Sisa Bayar</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
              <Input
                id="sisa_bayar"
                type="text"
                value={formatNumber(formData.sisa_bayar)}
                readOnly
                className="pl-10 bg-gray-100"
                placeholder="Otomatis terhitung"
              />
            </div>
          </div>
        </div>
      )}

      {/* Row 7: Total Ongkir, Titip Ongkir, Sisa Ongkir */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="total_ongkir">Total Ongkir</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
            <Input
              id="total_ongkir"
              type="text"
              value={formatNumber(formData.total_ongkir)}
              onChange={(e) => handleNumericInput(e.target.value, (val) => setFormData({ ...formData, total_ongkir: val }))}
              className="pl-10"
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="titip_ongkir">Titip Ongkir</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
            <Input
              id="titip_ongkir"
              type="text"
              value={formatNumber(formData.titip_ongkir)}
              onChange={(e) => handleNumericInput(e.target.value, (val) => setFormData({ ...formData, titip_ongkir: val }))}
              className="pl-10"
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="sisa_ongkir">Sisa Ongkir</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
            <Input
              id="sisa_ongkir"
              type="text"
              value={formatNumber(formData.sisa_ongkir)}
              readOnly
              className="pl-10 bg-gray-100"
              placeholder="Otomatis terhitung"
            />
          </div>
        </div>
      </div>

      {/* Row 8: Status, Company */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status *</Label>
          {(() => {
            // Determine auto status and if it should be disabled
            const hargaJual = parseFormattedNumber(formData.harga_jual);
            const hargaBayar = parseFormattedNumber(formData.harga_bayar);
            const dp = parseFormattedNumber(formData.dp);
            const sisaBayar = parseFormattedNumber(formData.sisa_bayar);
            
            let autoStatus = "";
            let isDisabled = false;
            
            if (formData.jenis_pembayaran === 'cash_penuh' && hargaJual === hargaBayar && hargaJual > 0) {
              autoStatus = "Sold";
              isDisabled = true;
            } else if ((formData.jenis_pembayaran === 'cash_bertahap' || formData.jenis_pembayaran === 'kredit') && dp > 0 && dp < sisaBayar) {
              autoStatus = "Booked";
              isDisabled = true;
            }
            
            // Auto-set status if conditions are met
            if (autoStatus && formData.status !== autoStatus) {
              setTimeout(() => setFormData({ ...formData, status: autoStatus }), 0);
            }
            
            return (
              <Select 
                value={formData.status || autoStatus} 
                onValueChange={(value) => !isDisabled && setFormData({ ...formData, status: value })}
                disabled={isDisabled}
              >
                <SelectTrigger className={`mt-1 ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder="- Pilih Status -" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Booked">Booked</SelectItem>
                  <SelectItem value="Sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            );
          })()}
        </div>
        <div>
          <Label htmlFor="company_id">Company *</Label>
          <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="- Pilih Company -" />
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
      </div>

      {/* Row 9: Catatan */}
      <div>
        <Label htmlFor="catatan">Catatan</Label>
        <Textarea
          id="catatan"
          value={formData.catatan}
          onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
          className="mt-1"
          placeholder="Catatan tambahan..."
          rows={4}
        />
      </div>
    </div>
  );
};

export default PenjualanFormFields;