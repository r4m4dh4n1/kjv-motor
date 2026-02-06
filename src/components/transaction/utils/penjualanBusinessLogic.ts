import { parseFormattedNumber } from "@/utils/formatUtils";

export const createPenjualanData = (submitData: any, formData: any, hargaBeli: number, hargaJual: number, keuntungan: number) => {
  return {
    tanggal: submitData.tanggal_penjualan,
    divisi: submitData.divisi,
    tt: submitData.jenis_transaksi,
    cabang_id: submitData.cabang_id,
    brand_id: submitData.brand_id,
    jenis_id: submitData.jenis_motor_id,
    tahun: submitData.tahun,
    warna: submitData.warna,
    kilometer: submitData.kilometer,
    plat: submitData.plat_nomor,
    pajak: submitData.tanggal_penjualan,
    harga_beli: hargaBeli,
    harga_jual: hargaJual,
    harga_bayar: submitData.harga_bayar,
    keuntungan: keuntungan,
    sisa_bayar: parseFormattedNumber(formData.sisa_bayar),
    titip_ongkir: parseFormattedNumber(formData.titip_ongkir),
    ongkir_dibayar: false,
    total_ongkir: parseFormattedNumber(formData.total_ongkir),
    subsidi_ongkir: parseFormattedNumber(formData.subsidi_ongkir),
    sisa_ongkir: parseFormattedNumber(formData.sisa_ongkir),
    status: submitData.status,
    dp: submitData.dp ? parseFormattedNumber(formData.dp) : null,
    cicilan: false,
    jenis_pembayaran: submitData.jenis_pembayaran,
    company_id: submitData.company_id,
    nominal_dana_1: 0,
    company_id_2: null,
    nominal_dana_2: 0,
    pembelian_id: parseInt(formData.pembelian_id),
    catatan: submitData.catatan,
    biaya_qc: 0,
    biaya_pajak: 0,
    biaya_lain_lain: 0
  };
};

export const createPembukuanEntries = (submitData: any, formData: any, selectedMotor: any) => {
  const brandName = selectedMotor?.brands?.name || '';
  const jenisMotor = selectedMotor?.jenis_motor?.jenis_motor || '';
  const platNomor = formData.plat_nomor;
  
  console.log('createPembukuanEntries DEBUG:', {
    submitData,
    formData,
    selectedMotor,
    brandName,
    jenisMotor,
    platNomor
  });
  
  const pembukuanEntries = [];
  
  if (submitData.jenis_transaksi !== 'tukar_tambah') {
    // Non tukar tambah cases
    if (submitData.jenis_pembayaran === 'cash_penuh') {
      // Case 1: Cash penuh - harga bayar + subsidi ongkir + titip ongkir masuk kredit
      const totalKredit = submitData.harga_bayar + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
      pembukuanEntries.push({
        tanggal: submitData.tanggal_penjualan,
        divisi: submitData.divisi,
        cabang_id: submitData.cabang_id,
        keterangan: `cash penuh dari ${brandName} - ${jenisMotor} - ${platNomor}`,
        debit: 0,
        kredit: totalKredit,
        saldo: 0,
        pembelian_id: parseInt(formData.pembelian_id),
        company_id: submitData.company_id
      });
    } else if (submitData.jenis_pembayaran === 'cash_bertahap') {
      // Case 2: Cash bertahap - DP + subsidi ongkir + titip ongkir masuk kredit (satu entry)
      const totalKredit = (submitData.dp || 0) + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
      if (totalKredit > 0) {
        pembukuanEntries.push({
          tanggal: submitData.tanggal_penjualan,
          divisi: submitData.divisi,
          cabang_id: submitData.cabang_id,
          keterangan: `DP dari ${brandName} - ${jenisMotor} - ${platNomor}`,
          debit: 0,
          kredit: totalKredit,
          saldo: 0,
          pembelian_id: parseInt(formData.pembelian_id),
          company_id: submitData.company_id
        });
      }
    } else if (submitData.jenis_pembayaran === 'kredit') {
      // Case 3: Kredit - DP + subsidi ongkir + titip ongkir masuk kredit
      const totalKredit = (submitData.dp || 0) + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
      pembukuanEntries.push({
        tanggal: submitData.tanggal_penjualan,
        divisi: submitData.divisi,
        cabang_id: submitData.cabang_id,
        keterangan: `DP dari ${brandName} - ${jenisMotor} - ${platNomor}`,
        debit: 0,
        kredit: totalKredit,
        saldo: 0,
        pembelian_id: parseInt(formData.pembelian_id),
        company_id: submitData.company_id
      });
    }
  } else {
    // Tukar tambah cases
    if (submitData.jenis_pembayaran === 'cash_penuh') {
      // Case 1: Cash penuh tukar tambah - harga bayar + subsidi ongkir + titip ongkir masuk kredit
      const totalKredit = submitData.harga_bayar + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
      pembukuanEntries.push({
        tanggal: submitData.tanggal_penjualan,
        divisi: submitData.divisi,
        cabang_id: submitData.cabang_id,
        keterangan: `cash penuh Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`,
        debit: 0,
        kredit: totalKredit,
        saldo: 0,
        pembelian_id: parseInt(formData.pembelian_id),
        company_id: submitData.company_id
      });
    } else if (submitData.jenis_pembayaran === 'cash_bertahap') {
      // Case 2: Cash bertahap tukar tambah - DP + subsidi ongkir + titip ongkir masuk KREDIT
      const totalKredit = (submitData.dp || 0) + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
      pembukuanEntries.push({
        tanggal: submitData.tanggal_penjualan,
        divisi: submitData.divisi,
        cabang_id: submitData.cabang_id,
        keterangan: `DP Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`,
        debit: 0,
        kredit: totalKredit,
        saldo: 0,
        pembelian_id: parseInt(formData.pembelian_id),
        company_id: submitData.company_id
      });
    } else if (submitData.jenis_pembayaran === 'kredit') {
      // Case 3: Kredit tukar tambah - DP + subsidi ongkir + titip ongkir masuk KREDIT
      const totalKredit = (submitData.dp || 0) + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
      pembukuanEntries.push({
        tanggal: submitData.tanggal_penjualan,
        divisi: submitData.divisi,
        cabang_id: submitData.cabang_id,
        keterangan: `DP Tukar Tambah dari ${brandName} - ${jenisMotor} - ${platNomor}`,
        debit: 0,
        kredit: totalKredit,
        saldo: 0,
        pembelian_id: parseInt(formData.pembelian_id),
        company_id: submitData.company_id
      });
    }
  }

  return pembukuanEntries;
};

export const createUpdateHargaPembukuanEntry = (updateData: any, selectedPenjualan: any) => {
  const totalBiayaTambahan = updateData.biaya_pajak + updateData.biaya_qc + updateData.biaya_lain_lain;
  
  if (totalBiayaTambahan <= 0) return null;

  return {
    company_id: selectedPenjualan.company_id,
    cabang_id: selectedPenjualan.cabang_id,
    pembelian_id: selectedPenjualan.pembelian_id,
    divisi: selectedPenjualan.divisi,
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: `Update Harga Penjualan - ${selectedPenjualan.brands?.name} ${selectedPenjualan.jenis_motor?.jenis_motor} (${updateData.reason})`,
    debit: totalBiayaTambahan,
    kredit: 0
  };
};
