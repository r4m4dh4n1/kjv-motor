import { PembelianFormData } from "../types";

export const createInitialFormData = (selectedDivision?: string): PembelianFormData => ({
  tanggal_pembelian: new Date().toISOString().split('T')[0],
  divisi: selectedDivision && selectedDivision !== "all" ? selectedDivision : "",
  cabang_id: "",
  jenis_pembelian: "",
  brand_id: "",
  jenis_motor_id: "",
  tahun: "",
  warna: "",
  kilometer: "",
  plat_nomor: "",
  tanggal_pajak: new Date().toISOString().split('T')[0],
  harga_beli: "",
  sumber_dana_1_id: "",
  nominal_dana_1: "",
  sumber_dana_2_id: "",
  nominal_dana_2: "",
  keterangan: "",
});

export const validateFormData = (formData: PembelianFormData): boolean => {
  // Validasi field wajib saja, sumber_dana_2 dan nominal_dana_2 opsional
  return !!(
    formData.tanggal_pembelian &&
    formData.divisi &&
    formData.cabang_id &&
    formData.jenis_pembelian &&
    formData.brand_id &&
    formData.jenis_motor_id &&
    formData.tahun &&
    formData.warna &&
    formData.kilometer &&
    formData.plat_nomor &&
    formData.tanggal_pajak &&
    formData.harga_beli &&
    formData.sumber_dana_1_id &&
    formData.nominal_dana_1
  );
};

export const transformFormDataForSubmit = (formData: PembelianFormData) => ({
  tanggal_pembelian: formData.tanggal_pembelian,
  divisi: formData.divisi,
  cabang_id: parseInt(formData.cabang_id),
  jenis_pembelian: formData.jenis_pembelian,
  brand_id: parseInt(formData.brand_id),
  jenis_motor_id: parseInt(formData.jenis_motor_id),
  tahun: parseInt(formData.tahun),
  warna: formData.warna,
  kilometer: parseFloat(formData.kilometer),
  plat_nomor: formData.plat_nomor,
  tanggal_pajak: formData.tanggal_pajak,
  harga_beli: parseFloat(formData.harga_beli),
  sumber_dana_1_id: parseInt(formData.sumber_dana_1_id),
  nominal_dana_1: parseFloat(formData.nominal_dana_1),
  sumber_dana_2_id: formData.sumber_dana_2_id && formData.sumber_dana_2_id !== "" ? parseInt(formData.sumber_dana_2_id) : null,
  nominal_dana_2: formData.nominal_dana_2 && formData.nominal_dana_2 !== "" ? parseFloat(formData.nominal_dana_2) : null,
  keterangan: formData.keterangan,
});

export const transformPembelianToFormData = (pembelian: any): PembelianFormData => ({
  tanggal_pembelian: pembelian.tanggal_pembelian,
  divisi: pembelian.divisi,
  cabang_id: pembelian.cabang_id.toString(),
  jenis_pembelian: pembelian.jenis_pembelian,
  brand_id: pembelian.brand_id.toString(),
  jenis_motor_id: pembelian.jenis_motor_id.toString(),
  tahun: pembelian.tahun.toString(),
  warna: pembelian.warna,
  kilometer: pembelian.kilometer.toString(),
  plat_nomor: pembelian.plat_nomor,
  tanggal_pajak: pembelian.tanggal_pajak,
  harga_beli: pembelian.harga_beli.toString(),
  sumber_dana_1_id: pembelian.sumber_dana_1_id.toString(),
  nominal_dana_1: pembelian.nominal_dana_1.toString(),
  sumber_dana_2_id: pembelian.sumber_dana_2_id?.toString() || "",
  nominal_dana_2: pembelian.nominal_dana_2?.toString() || "",
  keterangan: pembelian.keterangan || "",
});