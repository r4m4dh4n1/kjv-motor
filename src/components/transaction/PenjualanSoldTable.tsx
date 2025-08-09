import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye, Car, MapPin, Palette, TrendingUp, DollarSign, Clock } from "lucide-react";
import { EnhancedTable, CurrencyCell, DateCell, StatusBadge } from "./EnhancedTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UpdateHargaSoldModal, { UpdateHargaSoldData } from "./UpdateHargaSoldModal";
import PriceHistoryModal from "./PriceHistoryModal";
import { useSoldUpdateHarga } from "./hooks/useSoldUpdateHarga";

interface PenjualanSoldTableProps {
  penjualanData: any[];
}

const PenjualanSoldTable = ({ penjualanData }: PenjualanSoldTableProps) => {
  const [selectedPenjualan, setSelectedPenjualan] = useState<any>(null);
  const [isUpdateHargaOpen, setIsUpdateHargaOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedPenjualanForHistory, setSelectedPenjualanForHistory] = useState<any>(null);
  
  const soldUpdateHarga = useSoldUpdateHarga();
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const handleUpdateHarga = (penjualan: any) => {
    setSelectedPenjualan(penjualan);
    setIsUpdateHargaOpen(true);
  };

  // Update handleUpdateHargaConfirm function
const handleUpdateHargaConfirm = (data: UpdateHargaSoldData) => {
  if (selectedPenjualan) {
    soldUpdateHarga.mutate({
      penjualan_id: selectedPenjualan.id,
      biaya_tambahan: data.biaya_tambahan,
      reason: data.reason,
      keterangan: data.keterangan,
      operation_mode: data.operation_mode
    }, {
      onSuccess: () => {
        setIsUpdateHargaOpen(false);
        setSelectedPenjualan(null);
      }
    });
  }
};

  const handleUpdateHargaClose = () => {
    setIsUpdateHargaOpen(false);
    setSelectedPenjualan(null);
  };

  const handleViewHistory = (penjualan: any) => {
    setSelectedPenjualanForHistory(penjualan);
    setIsHistoryOpen(true);
  };

  const handleHistoryClose = () => {
    setIsHistoryOpen(false);
    setSelectedPenjualanForHistory(null);
  };

  const DetailDialog = ({ penjualan }: { penjualan: any }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:text-blue-600">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Detail Penjualan Motor
          </DialogTitle>
          <DialogDescription>
            {penjualan.brands?.name} - {penjualan.jenis_motor?.jenis_motor} | {penjualan.plat}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-blue-900">Informasi Umum</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal:</span>
                  <span className="font-medium">{formatDate(penjualan.tanggal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Divisi:</span>
                  <Badge variant="outline">{penjualan.divisi}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cabang:</span>
                  <span className="font-medium">{penjualan.cabang?.nama || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jenis Transaksi:</span>
                  <Badge variant="secondary">{penjualan.tt?.replace('_', ' ')}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge 
                    status={penjualan.status} 
                    variant="default"
                    className="bg-green-100 text-green-800"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-green-900">Spesifikasi Motor</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Brand:</span>
                  <span className="font-medium">{penjualan.brands?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jenis Motor:</span>
                  <span className="font-medium">{penjualan.jenis_motor?.jenis_motor || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tahun:</span>
                  <Badge variant="outline">{penjualan.tahun}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Warna:</span>
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{penjualan.warna}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plat Nomor:</span>
                  <Badge variant="secondary" className="font-mono">{penjualan.plat}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kilometer:</span>
                  <span className="font-medium">{penjualan.kilometer?.toLocaleString()} km</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 text-orange-900">Informasi Finansial</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Harga Beli Awal:</span>
                  <CurrencyCell 
                    amount={(penjualan.harga_beli || 0) - (penjualan.biaya_lain_lain || 0)} 
                    className="text-green-600" 
                  />
                </div>
                {(penjualan.biaya_lain_lain || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Update Harga:</span>
                    <CurrencyCell amount={penjualan.biaya_lain_lain} className="text-red-600" />
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Harga Beli Total:</span>
                  <CurrencyCell amount={penjualan.harga_beli} className="text-red-600" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Harga Jual:</span>
                  <CurrencyCell amount={penjualan.harga_jual} className="text-blue-600" />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Harga Bayar:</span>
                  <CurrencyCell amount={penjualan.harga_bayar} className="text-green-600" />
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="font-medium text-muted-foreground">Keuntungan:</span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <CurrencyCell amount={penjualan.keuntungan} className="text-green-600 font-bold" />
                  </div>
                </div>
                {penjualan.dp && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DP:</span>
                    <CurrencyCell amount={penjualan.dp} className="text-purple-600" />
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sisa Bayar:</span>
                  <CurrencyCell amount={penjualan.sisa_bayar} className="text-amber-600" />
                </div>
              </div>
            </div>

            {penjualan.pajak && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-purple-900">Informasi Pajak</h4>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tanggal Pajak:</span>
                    <span className="font-medium">{penjualan.pajak}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      width: "w-28",
      render: (value: string, row: any) => {
        // Gunakan tanggal_lunas jika ada, jika tidak gunakan tanggal biasa
        const displayDate = row.tanggal_lunas || row.tanggal;
        return <DateCell date={displayDate} />;
      }
    },
    {
      key: "divisi",
      header: "Divisi",
      width: "w-20",
      render: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      )
    },
    {
      key: "cabang",
      header: "Cabang",
      width: "w-28",
      render: (value: any, row: any) => (
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-sm">{row.cabang?.nama || '-'}</span>
        </div>
      )
    },
    {
      key: "tt",
      header: "Jenis Transaksi",
      width: "w-32",
      render: (value: string) => (
        <Badge variant="secondary" className="capitalize">
          {value?.replace('_', ' ') || '-'}
        </Badge>
      )
    },
    {
      key: "motor_info",
      header: "Informasi Motor",
      width: "w-56",
      render: (value: any, row: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {row.brands?.name} - {row.jenis_motor?.jenis_motor}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Plat: {row.plat}</span>
            <span>Warna: {row.warna}</span>
          </div>
        </div>
      )
    },
    {
      key: "pajak",
      header: "Pajak",
      width: "w-24",
      render: (value: string) => value || '-'
    },
    {
      key: "kilometer",
      header: "KM",
      width: "w-24",
      render: (value: number) => (
        <span className="text-sm">{value?.toLocaleString()} km</span>
      )
    },
    {
      key: "keuntungan",
      header: "Keuntungan",
      width: "w-32",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell amount={value} className="text-green-600 font-semibold" />
      )
    },
    {
      key: "status",
      header: "Status",
      width: "w-24",
      render: (value: string) => (
        <StatusBadge 
          status={value} 
          variant="default"
          className="bg-green-100 text-green-800"
        />
      )
    }
  ];

  const UpdateHargaButton = ({ penjualan }: { penjualan: any }) => (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => handleUpdateHarga(penjualan)}
      className="hover:bg-orange-50 hover:text-orange-600"
    >
      <DollarSign className="w-4 h-4" />
    </Button>
  );

  const HistoryButton = ({ penjualan }: { penjualan: any }) => (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => handleViewHistory(penjualan)}
      className="hover:bg-purple-50 hover:text-purple-600"
    >
      <Clock className="w-4 h-4" />
    </Button>
  );

  // Override the actions column to use DetailDialog
  const customColumns = columns.map(col => col);

  return (
    <>
      <EnhancedTable
        title="Data Penjualan Motor (Sold)"
        subtitle={`Menampilkan ${penjualanData.length} motor yang telah terjual`}
        icon={TrendingUp}
        data={penjualanData.map(row => ({
          ...row,
          actions: (
            <div className="flex gap-1">
              <DetailDialog penjualan={row} />
              <HistoryButton penjualan={row} />
              <UpdateHargaButton penjualan={row} />
            </div>
          )
        }))}
        columns={[
          ...customColumns,
          {
            key: "actions",
            header: "Aksi",
            width: "w-32",
            className: "text-center",
            render: (value: any) => value
          }
        ]}
        actions={[]} // Empty since we're using custom actions
        emptyMessage="Belum ada data penjualan motor yang selesai"
        headerColor="bg-gradient-to-r from-green-50 to-emerald-50"
      />
      
      <UpdateHargaSoldModal
        isOpen={isUpdateHargaOpen}
        onClose={handleUpdateHargaClose}
        penjualan={selectedPenjualan}
        onConfirm={handleUpdateHargaConfirm}
        isLoading={soldUpdateHarga.isPending}
      />
      
      <PriceHistoryModal
        isOpen={isHistoryOpen}
        onClose={handleHistoryClose}
        penjualan={selectedPenjualanForHistory}
      />
    </>
  );
};

export default PenjualanSoldTable;