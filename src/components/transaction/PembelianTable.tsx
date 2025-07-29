import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pencil, Trash2, Eye, DollarSign, CheckCircle, History, TrendingUp, MoreHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PembelianTableProps {
  pembelianData: any[];
  handleEdit: (pembelian: any) => void;
  handleView: (pembelian: any) => void;
  handleUpdateHarga: (pembelian: any) => void;
  handleQC: (pembelian: any) => void;
  handleViewQcHistory: (pembelian: any) => void;
  handleViewPriceHistory: (pembelian: any) => void;
  deleteMutation: any;
}

const PembelianTable = ({ 
  pembelianData, 
  handleEdit, 
  handleView,
  handleUpdateHarga,
  handleQC,
  handleViewQcHistory,
  handleViewPriceHistory,
  deleteMutation 
}: PembelianTableProps) => {
  const isMobile = useIsMobile();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const renderActionButtons = (pembelian: any) => {
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(pembelian)}>
              <Eye className="w-4 h-4 mr-2" />
              Lihat Detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewQcHistory(pembelian)}>
              <History className="w-4 h-4 mr-2" />
              History QC
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleViewPriceHistory(pembelian)}>
              <TrendingUp className="w-4 h-4 mr-2" />
              History Harga
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(pembelian)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateHarga(pembelian)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Update Harga
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQC(pembelian)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Quality Control
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => deleteMutation.mutate(pembelian.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className="flex gap-1 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleView(pembelian)}
          title="Lihat Detail"
          className="text-blue-600 hover:text-blue-800"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewQcHistory(pembelian)}
          title="History QC"
          className="text-indigo-600 hover:text-indigo-800"
        >
          <History className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewPriceHistory(pembelian)}
          title="History Update Harga"
          className="text-amber-600 hover:text-amber-800"
        >
          <TrendingUp className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEdit(pembelian)}
          title="Edit"
          className="text-green-600 hover:text-green-800"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUpdateHarga(pembelian)}
          title="Update Harga"
          className="text-orange-600 hover:text-orange-800"
        >
          <DollarSign className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQC(pembelian)}
          title="Quality Control"
          className="text-purple-600 hover:text-purple-800"
        >
          <CheckCircle className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => deleteMutation.mutate(pembelian.id)}
          title="Hapus"
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Pembelian</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Divisi</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Jenis Motor</TableHead>
                <TableHead>Plat</TableHead>
                <TableHead>Tgl Pajak</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Harga Final</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pembelianData.map((pembelian: any) => (
                <TableRow key={pembelian.id}>
                  <TableCell>{new Date(pembelian.tanggal_pembelian).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{pembelian.divisi}</TableCell>
                  <TableCell>{pembelian.cabang?.nama}</TableCell>
                  <TableCell>{pembelian.jenis_motor?.jenis_motor}</TableCell>
                  <TableCell>{pembelian.plat_nomor}</TableCell>
                  <TableCell>{new Date(pembelian.tanggal_pajak).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell>{formatCurrency(pembelian.harga_beli)}</TableCell>
                  <TableCell>{formatCurrency(pembelian.harga_final)}</TableCell>
                  <TableCell>
                    {renderActionButtons(pembelian)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PembelianTable;