import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PenjualanSoldTableProps {
  penjualanData: any[];
}

const PenjualanSoldTable = ({ penjualanData }: PenjualanSoldTableProps) => {
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

  const DetailDialog = ({ penjualan }: { penjualan: any }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Penjualan Sold</DialogTitle>
          <DialogDescription>
            Informasi lengkap penjualan motor {penjualan.brands?.name} - {penjualan.jenis_motor?.jenis_motor}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <div><strong>Tanggal:</strong> {formatDate(penjualan.tanggal)}</div>
            <div><strong>Divisi:</strong> {penjualan.divisi}</div>
            <div><strong>Cabang:</strong> {penjualan.cabang?.nama || '-'}</div>
            <div><strong>Jenis Transaksi:</strong> {penjualan.tt?.replace('_', ' ')}</div>
            <div><strong>Brand:</strong> {penjualan.brands?.name || '-'}</div>
            <div><strong>Jenis Motor:</strong> {penjualan.jenis_motor?.jenis_motor || '-'}</div>
            <div><strong>Tahun:</strong> {penjualan.tahun}</div>
            <div><strong>Warna:</strong> {penjualan.warna}</div>
            <div><strong>Plat Nomor:</strong> {penjualan.plat}</div>
            <div><strong>Kilometer:</strong> {penjualan.kilometer?.toLocaleString()} km</div>
          </div>
          <div className="space-y-2">
            <div><strong>Harga Beli:</strong> {formatCurrency(penjualan.harga_beli)}</div>
            <div><strong>Harga Jual:</strong> {formatCurrency(penjualan.harga_jual)}</div>
            <div><strong>Harga Bayar:</strong> {formatCurrency(penjualan.harga_bayar)}</div>
            <div><strong>Keuntungan:</strong> {formatCurrency(penjualan.keuntungan)}</div>
            <div><strong>DP:</strong> {penjualan.dp ? formatCurrency(penjualan.dp) : '-'}</div>
            <div><strong>Sisa Bayar:</strong> {formatCurrency(penjualan.sisa_bayar)}</div>
            <div><strong>Pajak:</strong> {penjualan.pajak || '-'}</div>
            <div><strong>Status:</strong> <span className="text-green-600 font-semibold">{penjualan.status}</span></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Divisi</TableHead>
            <TableHead>Cabang</TableHead>
            <TableHead>Jenis Transaksi</TableHead>
            <TableHead>Jenis Motor</TableHead>
            <TableHead>Pajak</TableHead>
            <TableHead>Kilometer</TableHead>
            <TableHead>Warna</TableHead>
            <TableHead>Plat Nomor</TableHead>
            <TableHead>Keuntungan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {penjualanData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                Tidak ada data penjualan sold
              </TableCell>
            </TableRow>
          ) : (
            penjualanData.map((penjualan) => (
              <TableRow key={penjualan.id}>
                <TableCell>{formatDate(penjualan.tanggal)}</TableCell>
                <TableCell>{penjualan.divisi}</TableCell>
                <TableCell>{penjualan.cabang?.nama || '-'}</TableCell>
                <TableCell>{penjualan.tt?.replace('_', ' ') || '-'}</TableCell>
                <TableCell>
                  {penjualan.brands?.name} - {penjualan.jenis_motor?.jenis_motor}
                </TableCell>
                <TableCell>{penjualan.pajak || '-'}</TableCell>
                <TableCell>{penjualan.kilometer?.toLocaleString()} km</TableCell>
                <TableCell>{penjualan.warna}</TableCell>
                <TableCell>{penjualan.plat}</TableCell>
                <TableCell>{formatCurrency(penjualan.keuntungan)}</TableCell>
                <TableCell>
                  <span className="text-green-600 font-semibold">{penjualan.status}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <DetailDialog penjualan={penjualan} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PenjualanSoldTable;