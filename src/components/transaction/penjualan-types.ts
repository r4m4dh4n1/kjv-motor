export interface Penjualan {
  id: number;
  tanggal_penjualan: string;
  divisi: string;
  cabang_id: number;
  jenis_transaksi: string;
  brand_id: number;
  jenis_motor_id: number;
  tahun: number;
  warna: string;
  kilometer: number;
  plat_nomor: string;
  harga_beli: number;
  harga_jual: number;
  jenis_pembayaran: string;
  harga_bayar?: number; // untuk cash penuh
  dp?: number; // untuk cash bertahap dan kredit
  sisa_bayar?: number; // untuk cash bertahap dan kredit
  total_ongkir: number;
  subsidi_ongkir: number;
  titip_ongkir: number;
  sisa_ongkir: number;
  status: string;
  company_id: number;
  catatan?: string;
}

export interface PenjualanFormData {
  tanggal_penjualan: string;
  divisi: string;
  cabang_id: string;
  jenis_transaksi: string;
  brand_id: string;
  jenis_motor_id: string;
  tahun: string;
  warna: string;
  kilometer: string;
  plat_nomor: string;
  harga_beli: string;
  harga_jual: string;
  jenis_pembayaran: string;
  harga_bayar: string; // untuk cash penuh
  dp: string; // untuk cash bertahap dan kredit
  sisa_bayar: string; // untuk cash bertahap dan kredit
  total_ongkir: string;
  subsidi_ongkir: string;
  titip_ongkir: string;
  sisa_ongkir: string;
  status: string;
  company_id: string;
  catatan: string;
  selected_motor_id: string;
  pembelian_id: string;
  brand_name: string;
  jenis_motor_name: string;
}