import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/utils/formatUtils";
import { OngkirPaymentModal } from "./OngkirPaymentModal";
import { Truck, DollarSign, Clock, CheckCircle, Search, Filter } from "lucide-react";

interface OngkirPageEnhancedProps {
  selectedDivision: string;
}

const OngkirPageEnhanced = ({ selectedDivision }: OngkirPageEnhancedProps) => {
  const [penjualanData, setPenjualanData] = useState([]);
  const [ongkirHistoryData, setOngkirHistoryData] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPenjualan, setSelectedPenjualan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedDivision]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch penjualan with ongkir
      const { data: penjualanResult, error: penjualanError } = await supabase
        .from('penjualans')
        .select(`
          *,
          brands(name),
          jenis_motor(jenis_motor),
          cabangs(nama)
        `)
        .gt('total_ongkir', 0)
        .order('tanggal', { ascending: false });

      if (penjualanError) throw penjualanError;
      
      // Fetch ongkir payment history
      const { data: historyResult, error: historyError } = await supabase
        .from('ongkir_cicilan')
        .select(`
          *,
          penjualans(
            plat,
            brands(name),
            jenis_motor(jenis_motor)
          )
        `)
        .order('tanggal_bayar', { ascending: false });

      if (historyError) throw historyError;

      setPenjualanData(penjualanResult || []);
      setOngkirHistoryData(historyResult || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data ongkir",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    let filtered = [...penjualanData];

    // Filter divisi
    if (selectedDivision !== 'all') {
      filtered = filtered.filter(item => item.divisi === selectedDivision);
    }

    // Filter pencarian
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const plat = item.plat?.toLowerCase() || '';
        const brand = item.brands?.name?.toLowerCase() || '';
        const jenisMotor = item.jenis_motor?.jenis_motor?.toLowerCase() || '';
        
        return plat.includes(search) || 
               brand.includes(search) || 
               jenisMotor.includes(search);
      });
    }

    // Filter status
    if (statusFilter !== 'all') {
      if (statusFilter === 'lunas') {
        filtered = filtered.filter(item => item.ongkir_dibayar === true);
      } else if (statusFilter === 'belum_lunas') {
        filtered = filtered.filter(item => item.ongkir_dibayar === false && (item.sisa_ongkir || 0) > 0);
      }
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  const getTotalOngkirBelumLunas = () => {
    return filteredData
      .filter(item => !item.ongkir_dibayar && (item.sisa_ongkir || 0) > 0)
      .reduce((total, item) => total + (item.sisa_ongkir || 0), 0);
  };

  const getCountOngkirBelumLunas = () => {
    return filteredData.filter(item => !item.ongkir_dibayar && (item.sisa_ongkir || 0) > 0).length;
  };

  const getCountOngkirLunas = () => {
    return filteredData.filter(item => item.ongkir_dibayar === true).length;
  };

  const handlePayment = (penjualan: any) => {
    setSelectedPenjualan(penjualan);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchData();
    setIsPaymentModalOpen(false);
    setSelectedPenjualan(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="w-8 h-8 text-blue-600" />
            Manajemen Ongkir
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola pembayaran ongkir yang belum lunas
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Cari plat, brand, atau jenis motor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status-filter">Status Ongkir</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="belum_lunas">Belum Lunas</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ongkir Belum Lunas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(getTotalOngkirBelumLunas())}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ongkir Belum Lunas</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {getCountOngkirBelumLunas()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ongkir Lunas</p>
                <p className="text-2xl font-bold text-green-600">
                  {getCountOngkirLunas()}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Ongkir</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Motor</TableHead>
                  <TableHead>Plat</TableHead>
                  <TableHead>Total Ongkir</TableHead>
                  <TableHead>Sudah Dibayar</TableHead>
                  <TableHead>Sisa Ongkir</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatDate(item.tanggal)}</TableCell>
                    <TableCell>
                      {item.brands?.name} {item.jenis_motor?.jenis_motor}
                    </TableCell>
                    <TableCell>{item.plat}</TableCell>
                    <TableCell>{formatCurrency(item.total_ongkir)}</TableCell>
                    <TableCell>{formatCurrency(item.titip_ongkir || 0)}</TableCell>
                    <TableCell>{formatCurrency(item.sisa_ongkir || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={item.ongkir_dibayar ? "default" : "destructive"}>
                        {item.ongkir_dibayar ? "Lunas" : "Belum Lunas"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!item.ongkir_dibayar && (item.sisa_ongkir || 0) > 0 && (
                        <Button 
                          size="sm" 
                          onClick={() => handlePayment(item)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Bayar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <OngkirPaymentModal
        penjualan={selectedPenjualan}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        selectedDivision={selectedDivision}
      />
    </div>
  );
};

export default OngkirPageEnhanced;