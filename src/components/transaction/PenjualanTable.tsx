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
import { Edit, Trash2, Eye, DollarSign, History, MoreHorizontal, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PenjualanTableProps {
  penjualanData: any[];
  handleEdit: (penjualan: any) => void;
  deleteMutation: any;
  handleViewDetail?: (penjualan: any) => void;
  handleUpdateHarga?: (penjualan: any) => void;
  handleRiwayatHarga?: (penjualan: any) => void;
  handleCancelDp?: (penjualan: any) => void;
  showCancelDp?: boolean;
}

const PenjualanTable = ({ 
  penjualanData, 
  handleEdit, 
  deleteMutation,
  handleViewDetail,
  handleUpdateHarga,
  handleRiwayatHarga,
  handleCancelDp,
  showCancelDp = false
}: PenjualanTableProps) => {
  const isMobile = useIsMobile();

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
          <DialogTitle>Detail Penjualan</DialogTitle>
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
            <div><strong>Jenis Pembayaran:</strong> {penjualan.jenis_pembayaran?.replace('_', ' ')}</div>
            <div><strong>Status:</strong> {penjualan.status}</div>
            <div><strong>Company:</strong> {penjualan.companies?.nama_perusahaan || '-'}</div>
            <div><strong>Catatan:</strong> {penjualan.catatan || '-'}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderActionButtons = (penjualan: any) => {
    if (isMobile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {}}>
              <Eye className="w-4 h-4 mr-2" />
              Lihat Detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateHarga?.(penjualan)}>
              <DollarSign className="w-4 h-4 mr-2" />
              Update Harga
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRiwayatHarga?.(penjualan)}>
              <History className="w-4 h-4 mr-2" />
              Riwayat Harga
            </DropdownMenuItem>
            {showCancelDp && penjualan.dp > 0 && penjualan.status === 'booked' && (
              <DropdownMenuItem 
                onClick={() => handleCancelDp?.(penjualan)}
                className="text-orange-600 focus:text-orange-600"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Batalkan DP
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleEdit(penjualan)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => deleteMutation.mutate(penjualan.id)}
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
      <div className="flex space-x-1">
        {/* Tombol Lihat Detail */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <DetailDialog penjualan={penjualan} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Lihat Detail</p>
          </TooltipContent>
        </Tooltip>

        {/* Tombol Update Harga */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateHarga?.(penjualan)}
            >
              <DollarSign className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Update Harga</p>
          </TooltipContent>
        </Tooltip>

        {/* Tombol Riwayat Harga */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRiwayatHarga?.(penjualan)}
            >
              <History className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Riwayat Harga</p>
          </TooltipContent>
        </Tooltip>

        {/* Tombol Cancel DP - only show for booked status */}
        {showCancelDp && penjualan.dp > 0 && penjualan.status === 'booked' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelDp?.(penjualan)}
                className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Batalkan DP</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Tombol Edit */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(penjualan)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit</p>
          </TooltipContent>
        </Tooltip>

        {/* Tombol Delete */}
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Hapus</p>
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Penjualan</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus data penjualan ini? Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(penjualan.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Jenis Transaksi</TableHead>
              <TableHead>Jenis Motor</TableHead>
              <TableHead>Plat Nomor</TableHead>
              <TableHead>Harga Jual</TableHead>
              <TableHead>DP</TableHead>
              <TableHead>Jenis Pembayaran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {penjualanData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-4">
                  Tidak ada data penjualan
                </TableCell>
              </TableRow>
            ) : (
              penjualanData.map((penjualan, index) => (
                <TableRow key={penjualan.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatDate(penjualan.tanggal)}</TableCell>
                  <TableCell className="capitalize">{penjualan.divisi}</TableCell>
                  <TableCell>{penjualan.cabang?.nama || '-'}</TableCell>
                  <TableCell className="capitalize">{penjualan.tt?.replace('_', ' ')}</TableCell>
                  <TableCell>{penjualan.jenis_motor?.jenis_motor || '-'}</TableCell>
                  <TableCell>{penjualan.plat}</TableCell>
                  <TableCell>{formatCurrency(penjualan.harga_jual)}</TableCell>
                  <TableCell>{penjualan.dp ? formatCurrency(penjualan.dp) : '-'}</TableCell>
                  <TableCell className="capitalize">{penjualan.jenis_pembayaran?.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      penjualan.status === 'selesai' ? 'bg-green-100 text-green-800' :
                      penjualan.status === 'proses' ? 'bg-blue-100 text-blue-800' :
                      penjualan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {penjualan.status}
                    </span>
                  </TableCell>
                  <TableCell>{penjualan.companies?.nama_perusahaan || '-'}</TableCell>
                   <TableCell>
                    {renderActionButtons(penjualan)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default PenjualanTable;