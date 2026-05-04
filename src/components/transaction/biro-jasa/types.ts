export interface BiroJasaFormData {
  tanggal: string;
  brand_name?: string;
  jenis_motor?: string;
  warna: string;
  plat_nomor: string;
  tahun: string;
  jenis_pengurusan: string;
  keterangan: string;
  estimasi_biaya: string;
  estimasi_tanggal_selesai: string;
  dp: string;
  sisa: string;
  rekening_tujuan_id: string;
  status: string;
}

export interface BiroJasaItem {
  id: number;
  tanggal: string;
  tanggal_pencatatan?: string;
  brand_name?: string;
  jenis_motor?: string;
  warna?: string;
  plat_nomor?: string;
  tahun?: number;
  jenis_pengurusan: string;
  keterangan?: string;
  estimasi_biaya: number;
  estimasi_tanggal_selesai: string;
  dp: number;
  sisa: number;
  total_bayar: number;
  biaya_modal?: number;
  keuntungan?: number;
  rekening_tujuan_id?: number;
  dp_vendor?: number;
  dp_vendor_date?: string;
  status: string;
  cabang?: string;
  brands?: { name: string };
  companies?: { nama_perusahaan: string };
}

export interface Company {
  id: number;
  nama_perusahaan: string;
  nomor_rekening: string;
}


export interface UpdateBiayaFormData {
  jumlah_bayar: string;
  keterangan: string;
  tanggal_bayar: string;
  tujuan_pembayaran_id: string;
}

export interface KeuntunganFormData {
  biaya_modal: string;
  keuntungan: string;
  sumber_dana: string;
  tanggal: string;
}