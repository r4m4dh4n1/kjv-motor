
// Mock formatUtils
const parseFormattedNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleanValue = value.toString().replace(/[^0-9]/g, '');
  return cleanValue ? parseInt(cleanValue, 10) : 0;
};

// Mock transformPenjualanFormDataForSubmit
const transformPenjualanFormDataForSubmit = (formData: any) => {
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
      status: formData.status,
      company_id: parseInt(formData.company_id),
      catatan: formData.catatan,
      pembelian_id: parseInt(formData.pembelian_id)
    };
};

// Mock createPembukuanEntries (copied from source)
const createPembukuanEntries = (submitData: any, formData: any, selectedMotor: any) => {
  const brandName = selectedMotor?.brands?.name || '';
  const jenisMotor = selectedMotor?.jenis_motor?.jenis_motor || '';
  const platNomor = formData.plat_nomor;
  
  console.log('createPembukuanEntries DEBUG:', {
    submitDataDp: submitData.dp,
    formDataDp: formData.dp,
    submitDataJenisPembayaran: submitData.jenis_pembayaran,
    totalKreditCalc: (submitData.dp || 0) + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0")
  });
  
  const pembukuanEntries = [];
  
  if (submitData.jenis_transaksi !== 'tukar_tambah') {
    // Non tukar tambah cases
    if (submitData.jenis_pembayaran === 'cash_penuh') {
      const totalKredit = submitData.harga_bayar + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
      pembukuanEntries.push({
        keterangan: `cash penuh dari ${brandName} - ${jenisMotor} - ${platNomor}`,
        kredit: totalKredit,
      });
    } else if (submitData.jenis_pembayaran === 'cash_bertahap') {
      // Case 2: Cash bertahap
      const totalKredit = (submitData.dp || 0) + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
      if (totalKredit > 0) {
        pembukuanEntries.push({
          keterangan: `DP dari ${brandName} - ${jenisMotor} - ${platNomor}`,
          kredit: totalKredit,
        });
      }
    } else if (submitData.jenis_pembayaran === 'kredit') {
      // Case 3: Kredit
      const totalKredit = (submitData.dp || 0) + parseFormattedNumber(formData.subsidi_ongkir || "0") + parseFormattedNumber(formData.titip_ongkir || "0");
       // Note: original code didn't have check > 0 here for kredit, but it did for cash_bertahap? 
       // Let's verify with the file content I read.
       // The file content I read for 'kredit' (lines 90-103) DOES NOT have `if (totalKredit > 0)`.
       // It just pushes it.
      pembukuanEntries.push({
        keterangan: `DP dari ${brandName} - ${jenisMotor} - ${platNomor}`,
        kredit: totalKredit,
      });
    }
  }
  // I will skip tukar_tambah for this test as the user asked about general cash_bertahap/kredit
  return pembukuanEntries;
};

// Simulation
async function runTest() {
    console.log("--- Starting Reproduction Test ---");

    // Case 1: Cash Bertahap with DP
    const formData1 = {
        tanggal_penjualan: "2024-02-17",
        divisi: "sport",
        cabang_id: "1",
        jenis_transaksi: "bukan_tukar_tambah",
        brand_id: "1",
        jenis_motor_id: "1",
        tahun: "2023",
        warna: "Red",
        kilometer: "1000",
        plat_nomor: "B 1234 XYZ",
        harga_beli: 10000000,
        harga_jual: 15000000,
        jenis_pembayaran: "cash_bertahap",
        dp: 2000000, // Number as it comes from handleNumericInput
        sisa_bayar: 13000000,
        status: "Booked",
        company_id: "1",
        pembelian_id: "100"
    };

    console.log("\nTest Case 1: Cash Bertahap with DP (Number)");
    const submitData1 = transformPenjualanFormDataForSubmit(formData1);
    const selectedMotor = { brands: { name: "Honda" }, jenis_motor: { jenis_motor: "Vario" } };
    const entries1 = createPembukuanEntries(submitData1, formData1, selectedMotor);
    console.log("Entries 1:", JSON.stringify(entries1, null, 2));


    // Case 2: Kredit with DP
    const formData2 = {
        ...formData1,
        jenis_pembayaran: "kredit",
        dp: "5000000" // String as it might currently be stored if not correctly typed??
                     // Wait, handleNumericInput ensures it's a number in callback, but let's test string too
    };

    console.log("\nTest Case 2: Kredit with DP (String)");
    const submitData2 = transformPenjualanFormDataForSubmit(formData2);
    const entries2 = createPembukuanEntries(submitData2, formData2, selectedMotor);
    console.log("Entries 2:", JSON.stringify(entries2, null, 2));
    
}

runTest();
