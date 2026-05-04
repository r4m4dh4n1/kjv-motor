export interface Pembelian {
  id: number;
  tanggal_pembelian: string;
  divisi: string;
  cabang_id: number;
  jenis_pembelian: string;
  brand_id: number;
  jenis_motor_id: number;
  tahun: number;
  warna: string;
  kilometer: number;
  plat_nomor: string;
  tanggal_pajak: string;
  harga_beli: number;
  harga_final?: number;
  sumber_dana_1_id: number;
  nominal_dana_1: number;
  sumber_dana_2_id?: number;
  nominal_dana_2?: number;
  keterangan?: string;
  status?: string;
  // Relations
  cabang?: { nama: string };
  jenis_motor?: { jenis_motor: string };
  brands?: { name: string };
}

export interface PembelianFormData {
  tanggal_pembelian: string;
  divisi: string;
  cabang_id: string;
  jenis_pembelian: string;
  brand_id: string;
  jenis_motor_id: string;
  tahun: string;
  warna: string;
  kilometer: string;
  plat_nomor: string;
  tanggal_pajak: string;
  harga_beli: string;
  sumber_dana_1_id: string;
  nominal_dana_1: string;
  sumber_dana_2_id: string;
  nominal_dana_2: string;
  keterangan: string;
}

export interface PembelianPageProps {
  selectedDivision: string;
}