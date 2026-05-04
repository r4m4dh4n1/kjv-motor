import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface BreakdownPercabangPageProps {
  selectedDivision: string;
}

interface SummaryData {
  totalPembelian: number;
  totalSold: number;
  totalBooking: number;
  totalBiayaOperasional: number;
  totalProfit: number;
}

// Tambahkan interface untuk modal data
interface ModalData {
  totalModal: number;
  sisaModal: number;
}

const BreakdownPercabangPage = ({ selectedDivision }: BreakdownPercabangPageProps) => {
  const [selectedCabang, setSelectedCabang] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cabangData, setCabangData] = useState([]);
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalPembelian: 0,
    totalSold: 0,
    totalBooking: 0,
    totalBiayaOperasional: 0,
    totalProfit: 0
  });
  // Tambahkan state untuk modal data
  const [modalData, setModalData] = useState<ModalData>({
    totalModal: 0,
    sisaModal: 0
  });
  const [pembelianData, setPembelianData] = useState([]);
  const [penjualanData, setPenjualanData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set default dates to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateFrom(format(firstDay, 'yyyy-MM-dd'));
    setDateTo(format(lastDay, 'yyyy-MM-dd'));
  }, []);

  // Fetch cabang data
  useEffect(() => {
    const fetchCabang = async () => {
      const { data } = await supabase.from("cabang").select("*").order("nama");
      setCabangData(data || []);
      if (data && data.length > 0) {
        setSelectedCabang(data[0].id.toString());
      }
    };
    fetchCabang();
  }, []);

  // Fetch summary and detailed data
  useEffect(() => {
    if (selectedCabang && dateFrom && dateTo) {
      fetchSummaryData();
      fetchDetailedData();
      fetchModalData(); // Tambahkan pemanggilan fungsi modal
    }
  }, [selectedCabang, selectedDivision, dateFrom, dateTo]);

  // Update modal data when summary data changes
  useEffect(() => {
    if (modalData.totalModal > 0) {
      setModalData(prev => ({
        ...prev,
        sisaModal: prev.totalModal - summaryData.totalPembelian
      }));
    }
  }, [summaryData.totalPembelian, modalData.totalModal]);

  // Tambahkan fungsi untuk mengambil data modal
  const fetchModalData = async () => {
    try {
      // Ambil total modal dari tabel companies
      let companiesQuery = supabase
        .from("companies")
        .select("modal, divisi");

      if (selectedDivision !== "all") {
        companiesQuery = companiesQuery.eq("divisi", selectedDivision);
      }

      const { data: companiesData } = await companiesQuery;
      
      // Hitung total modal
      const totalModal = companiesData?.reduce((sum, company) => sum + Number(company.modal || 0), 0) || 0;
      
      // Hitung sisa modal (Total Modal - Total Pembelian)
      const sisaModal = totalModal - summaryData.totalPembelian;
      
      setModalData({
        totalModal,
        sisaModal
      });
    } catch (error) {
      console.error("Error fetching modal data:", error);
    }
  };

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      // Fetch pembelian data
      let pembelianQuery = supabase
        .from("pembelian")
        .select("harga_beli, divisi")
        .eq("cabang_id", parseInt(selectedCabang))
        .gte("tanggal_pembelian", dateFrom)
        .lte("tanggal_pembelian", dateTo);

      if (selectedDivision !== "all") {
        pembelianQuery = pembelianQuery.eq("divisi", selectedDivision);
      }

      const { data: pembelianSummary } = await pembelianQuery;

      // Fetch penjualan data for sold (harga_jual with status selesai)
      let penjualanSoldQuery = supabase
        .from("penjualans")
        .select("harga_jual, divisi")
        .eq("cabang_id", parseInt(selectedCabang))
        .eq("status", "selesai")
        .gte("tanggal", dateFrom)
        .lte("tanggal", dateTo);

      if (selectedDivision !== "all") {
        penjualanSoldQuery = penjualanSoldQuery.eq("divisi", selectedDivision);
      }

      const { data: penjualanSold } = await penjualanSoldQuery;

      // Fetch penjualan data for booking (DP with status Booked)
      let penjualanBookingQuery = supabase
        .from("penjualans")
        .select("dp, divisi")
        .eq("cabang_id", parseInt(selectedCabang))
        .eq("status", "Booked")
        .gte("tanggal", dateFrom)
        .lte("tanggal", dateTo);

      if (selectedDivision !== "all") {
        penjualanBookingQuery = penjualanBookingQuery.eq("divisi", selectedDivision);
      }

      const { data: penjualanBooking } = await penjualanBookingQuery;

      // Fetch penjualan data for profit calculation (keuntungan field from selesai status)
      let penjualanProfitQuery = supabase
        .from("penjualans")
        .select("keuntungan, divisi")
        .eq("cabang_id", parseInt(selectedCabang))
        .eq("status", "selesai")
        .gte("tanggal", dateFrom)
        .lte("tanggal", dateTo);

      if (selectedDivision !== "all") {
        penjualanProfitQuery = penjualanProfitQuery.eq("divisi", selectedDivision);
      }

      const { data: penjualanProfit } = await penjualanProfitQuery;

      // Fetch operational costs
      let operationalQuery = supabase
        .from("operational")
        .select("nominal, divisi")
        .eq("cabang_id", parseInt(selectedCabang))
        .gte("tanggal", dateFrom)
        .lte("tanggal", dateTo);

      if (selectedDivision !== "all") {
        operationalQuery = operationalQuery.eq("divisi", selectedDivision);
      }

      const { data: operationalSummary } = await operationalQuery;

      // Calculate totals
      const totalPembelian = pembelianSummary?.reduce((sum, item) => sum + Number(item.harga_beli), 0) || 0;
      const totalSold = penjualanSold?.reduce((sum, item) => sum + Number(item.harga_jual), 0) || 0;
      const totalBooking = penjualanBooking?.reduce((sum, item) => sum + Number(item.dp || 0), 0) || 0;
      const totalProfit = penjualanProfit?.reduce((sum, item) => sum + Number(item.keuntungan || 0), 0) || 0;
      const totalBiayaOperasional = operationalSummary?.reduce((sum, item) => sum + Number(item.nominal), 0) || 0;

      setSummaryData({
        totalPembelian,
        totalSold,
        totalBooking,
        totalBiayaOperasional,
        totalProfit
      });
    } catch (error) {
      console.error("Error fetching summary data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedData = async () => {
    try {
      // Fetch detailed pembelian data
      let pembelianDetailQuery = supabase
        .from("pembelian")
        .select(`
          *,
          brands(name),
          jenis_motor(jenis_motor),
          cabang(nama)
        `)
        .eq("cabang_id", parseInt(selectedCabang))
        .gte("tanggal_pembelian", dateFrom)
        .lte("tanggal_pembelian", dateTo)
        .order("tanggal_pembelian", { ascending: false });

      if (selectedDivision !== "all") {
        pembelianDetailQuery = pembelianDetailQuery.eq("divisi", selectedDivision);
      }

      const { data: pembelianDetail } = await pembelianDetailQuery;

      // Fetch detailed penjualan data
      let penjualanDetailQuery = supabase
        .from("penjualans")
        .select(`
          *,
          brands(name),
          jenis_motor(jenis_motor),
          cabang(nama)
        `)
        .eq("cabang_id", parseInt(selectedCabang))
        .gte("tanggal", dateFrom)
        .lte("tanggal", dateTo)
        .order("tanggal", { ascending: false });

      if (selectedDivision !== "all") {
        penjualanDetailQuery = penjualanDetailQuery.eq("divisi", selectedDivision);
      }

      const { data: penjualanDetail } = await penjualanDetailQuery;

      setPembelianData(pembelianDetail || []);
      setPenjualanData(penjualanDetail || []);
    } catch (error) {
      console.error("Error fetching detailed data:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy', { locale: id });
  };

  const getDivisionBadgeColor = (divisi: string) => {
    switch (divisi?.toLowerCase()) {
      case 'motor': return 'bg-blue-500';
      case 'mobil': return 'bg-green-500';
      case 'sparepart': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const handlePeriodChange = (period: string) => {
    const now = new Date();
    let from: Date, to: Date;

    switch (period) {
      case 'today':
        from = to = now;
        break;
      case 'yesterday':
        from = to = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        return;
    }

    setDateFrom(format(from, 'yyyy-MM-dd'));
    setDateTo(format(to, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Divisi</label>
              <div className="text-sm text-gray-600">
                {selectedDivision === 'all' ? 'Semua Divisi' : selectedDivision.toUpperCase()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Cabang</label>
              <Select value={selectedCabang} onValueChange={setSelectedCabang}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cabang" />
                </SelectTrigger>
                <SelectContent>
                  {cabangData.map((cabang: any) => (
                    <SelectItem key={cabang.id} value={cabang.id.toString()}>
                      {cabang.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Perusahaan</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Perusahaan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Periode</label>
              <Select onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="yesterday">Kemarin</SelectItem>
                  <SelectItem value="thisMonth">Bulan Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              Filter Data
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-white flex items-center justify-between">
              📊 Ringkasan Penjualan
              <span className="text-sm">Total pembelian, booking, sold & profit</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(summaryData.totalPembelian)}
                </div>
                <div className="text-sm text-white/80">Total Pembelian</div>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(summaryData.totalBooking)}
                </div>
                <div className="text-sm text-white/80">Total Booking</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(summaryData.totalSold)}
                </div>
                <div className="text-sm text-white/80">Total Sold</div>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(summaryData.totalProfit)}
                </div>
                <div className="text-sm text-white/80">Total Profit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-white flex items-center justify-between">
              💰 Operational & Modal
              <span className="text-sm">Ringkasan biaya dan modal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(summaryData.totalBiayaOperasional)}
                </div>
                <div className="text-sm text-white/80">Biaya Operational</div>
              </div>
              <div className="bg-white/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(modalData.totalModal)}
                </div>
                <div className="text-sm text-white/80">Total Modal</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(modalData.sisaModal)}
                </div>
                <div className="text-sm text-white/80">Sisa Modal</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pembelian Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Data Pembelian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Divisi</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Jenis Motor</TableHead>
                  <TableHead>Plat Nomor</TableHead>
                  <TableHead>Harga Beli</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pembelianData.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.tanggal_pembelian)}</TableCell>
                    <TableCell>
                      <Badge className={`text-white ${getDivisionBadgeColor(item.divisi)}`}>
                        {item.divisi.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.brands?.name || '-'}</TableCell>
                    <TableCell>{item.jenis_motor?.jenis_motor || '-'}</TableCell>
                    <TableCell>{item.plat_nomor}</TableCell>
                    <TableCell>{formatCurrency(item.harga_beli)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'ready' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Branch Performance Section */}
      <div className="space-y-6">
        {cabangData.filter(c => selectedCabang === "all" || c.id.toString() === selectedCabang).map((cabang: any) => (
          <Card key={cabang.id} className="bg-gray-50">
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded">
                    🏢
                  </div>
                  <span>{cabang.nama}</span>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-cyan-500 text-white px-3 py-1">
                    {penjualanData.filter(item => item.cabang_id === cabang.id).length} Penjualan
                  </Badge>
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    {formatCurrency(penjualanData.filter(item => item.cabang_id === cabang.id).reduce((sum, item) => sum + (item.keuntungan || 0), 0))} Profit
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Top Motor Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-orange-600">🏆</span>
                  <h3 className="font-semibold text-gray-700">Top Motor Terlaris</h3>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">Data akan ditampilkan dinamis</div>
                      <div className="text-sm text-gray-600">Berdasarkan penjualan terbanyak</div>
                    </div>
                    <div className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                      -
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Motor</TableHead>
                      <TableHead>Harga Jual</TableHead>
                      <TableHead>Harga Beli</TableHead>
                      <TableHead>Keuntungan</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penjualanData.filter(item => item.cabang_id === cabang.id).map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.tanggal)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.brands?.name} {item.jenis_motor?.jenis_motor}</div>
                            <div className="text-sm text-gray-600">{item.tahun} - {item.warna}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-purple-600 font-medium">
                          {formatCurrency(item.harga_jual)}
                        </TableCell>
                        <TableCell className="text-orange-600 font-medium">
                          {formatCurrency(item.harga_beli)}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(item.keuntungan || (item.harga_jual - item.harga_beli))}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${item.jenis_pembayaran === 'cash_penuh' ? 'bg-green-500' : 'bg-blue-500'} text-white`}>
                            {item.jenis_pembayaran === 'cash_penuh' ? 'Cash' : 'Credit'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm">
                            👁️ Detail
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BreakdownPercabangPage;