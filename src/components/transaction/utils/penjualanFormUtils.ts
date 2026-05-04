import { PenjualanFormData } from "../penjualan-types";
import { parseFormattedNumber } from "@/utils/formatUtils";

export const createInitialPenjualanFormData = (selectedDivision?: string): PenjualanFormData => ({
  tanggal_penjualan: new Date().toISOString().split('T')[0],
  divisi: selectedDivision,
  cabang_id: "",
  jenis_transaksi: "",
  brand_id: "",
  jenis_motor_id: "",
  tahun: "",
  warna: "",
  kilometer: "",
  plat_nomor: "",
  harga_beli: "",
  harga_jual: "",
  jenis_pembayaran: "",
  harga_bayar: "",
  dp: "",
  sisa_bayar: "",
  total_ongkir: "",
  subsidi_ongkir: "",
  titip_ongkir: "",
  sisa_ongkir: "",
  status: "",
  company_id: "",
  catatan: "",
  selected_motor_id: "",
  pembelian_id: "",
  brand_name: "",
  jenis_motor_name: ""
});

export const validatePenjualanFormData = (formData: PenjualanFormData): boolean => {
  const baseValidation = !!(
    formData.tanggal_penjualan &&
    formData.divisi &&
    formData.cabang_id &&
    formData.jenis_transaksi &&
    formData.brand_id &&
    formData.jenis_motor_id &&
    formData.tahun &&
    formData.warna &&
    formData.kilometer &&
    formData.plat_nomor &&
    formData.harga_beli &&
    formData.harga_jual &&
    formData.jenis_pembayaran &&
    formData.status &&
    formData.company_id &&
    formData.pembelian_id
  );

  // Validasi tambahan berdasarkan jenis pembayaran
  if (formData.jenis_pembayaran === 'cash_penuh') {
    return baseValidation && !!formData.harga_bayar;
  } else if (formData.jenis_pembayaran === 'cash_bertahap' || formData.jenis_pembayaran === 'kredit') {
    return baseValidation && !!formData.dp;
  }
  
  return baseValidation;
};

export const transformPenjualanFormDataForSubmit = (formData: PenjualanFormData) => {
  // Map status dari form ke database
  const statusMapping: { [key: string]: string } = {
    'Booked': 'booked',
    'Sold': 'selesai',
    'Pending': 'pending',
    'Cancelled': 'cancelled_dp_hangus',
    // Fallback untuk nilai yang sudah sesuai database
    'booked': 'booked',
    'selesai': 'selesai',
    'pending': 'pending',
    'cancelled_dp_hangus': 'cancelled_dp_hangus'
  };

  return {
    tanggal_penjualan: formData.tanggal_penjualan,
    divisi: formData.divisi,
    cabang_id: parseInt(formData.cabang_id),
    jenis_transaksi: formData.jenis_transaksi,
    brand_id: parseInt(formData.brand_id),
    jenis_motor_id: parseInt(formData.jenis_motor_id),
    tahun: parseInt(formData.tahun),
    warna: formData.warna,
    kilometer: parseFormattedNumber(formData.kilometer),
    plat_nomor: formData.plat_nomor,
    harga_beli: parseFormattedNumber(formData.harga_beli),
    harga_jual: parseFormattedNumber(formData.harga_jual),
    jenis_pembayaran: formData.jenis_pembayaran,
    harga_bayar: formData.harga_bayar ? parseFormattedNumber(formData.harga_bayar) : null,
    dp: formData.dp ? parseFormattedNumber(formData.dp) : null,
    sisa_bayar: formData.sisa_bayar ? parseFormattedNumber(formData.sisa_bayar) : null,
    total_ongkir: parseFormattedNumber(formData.total_ongkir) || 0,
    subsidi_ongkir: parseFormattedNumber(formData.subsidi_ongkir) || 0,
    titip_ongkir: parseFormattedNumber(formData.titip_ongkir) || 0,
    sisa_ongkir: parseFormattedNumber(formData.sisa_ongkir) || 0,
    status: statusMapping[formData.status] || formData.status.toLowerCase(),
    company_id: parseInt(formData.company_id),
    catatan: formData.catatan,
    pembelian_id: parseInt(formData.pembelian_id)
  };
};

export const transformPenjualanToFormData = (penjualan: any): PenjualanFormData => {
  // Map status dari database ke form
  const statusMapping: { [key: string]: string } = {
    'booked': 'Booked',
    'selesai': 'Sold',
    'pending': 'Pending',
    'cancelled_dp_hangus': 'Cancelled',
    // Fallback untuk nilai yang sudah sesuai form
    'Booked': 'Booked',
    'Sold': 'Sold',
    'Pending': 'Pending',
    'Cancelled': 'Cancelled'
  };

  return {
    tanggal_penjualan: penjualan.tanggal,
    divisi: penjualan.divisi,
    cabang_id: penjualan.cabang_id.toString(),
    jenis_transaksi: penjualan.tt || "",
    brand_id: penjualan.brand_id.toString(),
    jenis_motor_id: penjualan.jenis_id.toString(),
    tahun: penjualan.tahun.toString(),
    warna: penjualan.warna,
    kilometer: penjualan.kilometer.toString(),
    plat_nomor: penjualan.plat,
    harga_beli: penjualan.harga_beli.toString(),
    harga_jual: penjualan.harga_jual.toString(),
    jenis_pembayaran: penjualan.jenis_pembayaran,
    harga_bayar: penjualan.harga_bayar?.toString() || "",
    dp: penjualan.dp?.toString() || "",
    sisa_bayar: penjualan.sisa_bayar?.toString() || "",
    total_ongkir: penjualan.total_ongkir?.toString() || "0",
    subsidi_ongkir: penjualan.subsidi_ongkir?.toString() || "0",
    titip_ongkir: penjualan.titip_ongkir?.toString() || "0",
    sisa_ongkir: penjualan.sisa_ongkir?.toString() || "0",
    status: statusMapping[penjualan.status] || penjualan.status,
    company_id: penjualan.company_id.toString(),
    catatan: penjualan.catatan || "",
    selected_motor_id: penjualan.pembelian_id?.toString() || "",
    pembelian_id: penjualan.pembelian_id?.toString() || "",
    brand_name: penjualan.brands?.name || "",
    jenis_motor_name: penjualan.jenis_motor?.jenis_motor || ""
  };
};