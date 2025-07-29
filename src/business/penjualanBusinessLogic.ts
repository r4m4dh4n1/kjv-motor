// Interface untuk data penjualan
export interface PenjualanData {
  jenis_transaksi: 'bukan_tukar_tambah' | 'tukar_tambah' | 'tukar_tambah_transfer';
  jenis_pembayaran: 'cash_penuh' | 'cash_bertahap' | 'kredit';
  harga_bayar: number;
  dp_amount: number;
  customer_name: string;
  motor_lama?: string;
  harga_motor_lama?: number;
  selisih_bayar?: number;
}

export interface TransferData {
  tanggal: string;
  customer_name: string;
  motor_baru: string;
  jumlah_transfer: number;
}

// Fungsi utama untuk membuat entries pembukuan
export function createPembukuanEntries(submitData: PenjualanData) {
  const pembukuanEntries = [];

  // Handle regular transactions (bukan tukar tambah)
  if (submitData.jenis_transaksi !== 'tukar_tambah' && submitData.jenis_transaksi !== 'tukar_tambah_transfer') {
    if (submitData.jenis_pembayaran === 'cash_penuh') {
      pembukuanEntries.push({
        keterangan: `Penjualan Cash Penuh`,
        debit: 0,
        kredit: submitData.harga_bayar
      });
    } else if (submitData.jenis_pembayaran === 'cash_bertahap' || submitData.jenis_pembayaran === 'kredit') {
      pembukuanEntries.push({
        keterangan: `DP Penjualan`,
        debit: 0,
        kredit: submitData.dp_amount
      });
    }
  }
  
  // Handle regular trade-in (tukar tambah biasa)
  else if (submitData.jenis_transaksi === 'tukar_tambah') {
    if (submitData.jenis_pembayaran === 'cash_bertahap' || submitData.jenis_pembayaran === 'kredit') {
      // ✅ DP Tukar Tambah = Uang masuk = KREDIT
      pembukuanEntries.push({
        keterangan: `DP Tukar Tambah`,
        debit: 0,                    // ✅ DEBIT = 0
        kredit: submitData.dp_amount // ✅ KREDIT = DP (uang masuk)
      });
    }
  }
  
  // Handle trade-in with transfer (tukar tambah dengan transfer)
  else if (submitData.jenis_transaksi === 'tukar_tambah_transfer') {
    if (submitData.jenis_pembayaran === 'cash_bertahap' || submitData.jenis_pembayaran === 'kredit') {
      // ✅ DP dari customer = Uang masuk = KREDIT
      pembukuanEntries.push({
        keterangan: `DP dari ${submitData.customer_name} untuk ${submitData.motor_lama}`,
        debit: 0,                    // ✅ DEBIT = 0
        kredit: submitData.dp_amount // ✅ KREDIT = DP (uang masuk)
      });
    }
  }

  return pembukuanEntries;
}

// Fungsi untuk membuat entry transfer (uang keluar)
export function createTransferPembukuanEntry(transferData: TransferData) {
  return {
    tanggal: transferData.tanggal,
    keterangan: `Transfer ke ${transferData.customer_name} (pengganti ${transferData.motor_baru})`,
    debit: transferData.jumlah_transfer, // ✅ Transfer = Uang keluar = DEBIT
    kredit: 0                            // ✅ KREDIT = 0
  };
}

// Fungsi untuk menghitung net cash flow tukar tambah
export function calculateTradeInNetFlow(dpAmount: number, transferAmount: number) {
  return transferAmount - dpAmount; // Net keluar (transfer - dp)
}

// Fungsi untuk update harga dengan biaya tambahan
export function createUpdateHargaPembukuanEntry(updateData: any) {
  return {
    keterangan: `Update Harga - Biaya Tambahan`,
    debit: updateData.biaya_tambahan, // ✅ Biaya tambahan = Pengeluaran = DEBIT
    kredit: 0
  };
}