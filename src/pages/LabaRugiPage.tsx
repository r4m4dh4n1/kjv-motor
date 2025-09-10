// Perbaiki fungsi fetchBiayaData
const fetchBiayaData = async (dateRange: { start: Date; end: Date }) => {
  try {
    // Gunakan format timezone yang benar
    const startDate = dateRange.start.toISOString();
    const endDate = dateRange.end.toISOString();

    // Query operational dengan kolom yang benar
    const { data: operationalData, error: operationalError } = await supabase
      .from(operationalTable)
      .select('tanggal, divisi, kategori, deskripsi, nominal, cabang_id')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: false });

    if (operationalError) {
      console.error('Error fetching operational data:', operationalError);
      throw operationalError;
    }

    // Query pembukuan
    const { data: pembukuanData, error: pembukuanError } = await supabase
      .from(pembukuanTable)
      .select('tanggal, divisi, keterangan, debit, kredit, cabang_id')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)
      .order('tanggal', { ascending: false });

    if (pembukuanError) {
      console.error('Error fetching pembukuan data:', pembukuanError);
      throw pembukuanError;
    }

    // Hitung total operasional - gunakan kategori sebagai pengganti jenis_biaya
    const totalOperasional = operationalData?.reduce((sum, item) => {
      return sum + (item.nominal || 0);
    }, 0) || 0;

    // Hitung total pembukuan (debit sebagai pengeluaran)
    const totalPembukuan = pembukuanData?.reduce((sum, item) => {
      return sum + (item.debit || 0);
    }, 0) || 0;

    return {
      operasional: operationalData || [],
      pembukuan: pembukuanData || [],
      totalOperasional,
      totalPembukuan,
      totalBiaya: totalOperasional + totalPembukuan
    };
  } catch (error) {
    console.error('Error in fetchBiayaData:', error);
    throw error;
  }
};