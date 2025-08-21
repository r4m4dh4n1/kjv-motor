export const calculateStandardProfitTotals = (data: any[], dateRange?: { start: Date; end: Date }) => {
  // Filter data berdasarkan tanggal jika diperlukan
  let filteredData = data;
  
  if (dateRange) {
    filteredData = data.filter(item => {
      const itemDate = new Date(item.tanggal || item.tanggal_jual);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });
  }
  
  // Hitung total dengan cara yang sama seperti PenjualanSoldPageEnhanced
  const totalKeuntungan = filteredData.reduce((sum, item) => {
    return sum + (item.keuntungan || item.profit || 0);
  }, 0);
  
  const totalPenjualan = filteredData.reduce((sum, item) => {
    return sum + (item.harga_jual || 0);
  }, 0);
  
  const totalUnit = filteredData.length;
  
  return { totalKeuntungan, totalPenjualan, totalUnit };
};