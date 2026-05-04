import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Eye, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import type { BiroJasaItem } from "./types";
import { convertDateFromISO } from "./utils";
import { formatCurrency } from "@/lib/utils";
import { UpdateBiayaModal } from "./UpdateBiayaModal";
import { KeuntunganModal } from "./KeuntunganModal";
import { InputVendorDpModal } from "./InputVendorDpModal";

interface BiroJasaTableEnhancedProps {
  data: BiroJasaItem[];
  onEdit: (item: BiroJasaItem) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
  selectedDivision: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export const BiroJasaTableEnhanced = ({ 
  data, 
  onEdit, 
  onDelete, 
  onRefresh, 
  selectedDivision,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}: BiroJasaTableEnhancedProps) => {
  const [updateBiayaModal, setUpdateBiayaModal] = useState<{ isOpen: boolean; item: BiroJasaItem | null }>({
    isOpen: false,
    item: null,
  });
  const [keuntunganModal, setKeuntunganModal] = useState<{ isOpen: boolean; item: BiroJasaItem | null }>({
    isOpen: false,
    item: null,
  });
  const [inputVendorDpModal, setInputVendorDpModal] = useState<{ isOpen: boolean; item: BiroJasaItem | null }>({
    isOpen: false,
    item: null,
  });

  const handleView = (item: BiroJasaItem) => {
    alert(`Detail Biro Jasa:
Tanggal: ${convertDateFromISO(item.tanggal)}
Brand: ${item.brand_name || '-'}
Jenis Motor: ${item.jenis_motor || '-'}
Warna: ${item.warna || '-'}
Plat Nomor: ${item.plat_nomor || '-'}
Tahun: ${item.tahun || '-'}
Jenis Pengurusan: ${item.jenis_pengurusan}
Keterangan: ${item.keterangan || '-'}
Estimasi Biaya: ${formatCurrency(item.estimasi_biaya?.toString() || '0')}
Estimasi Tanggal Selesai: ${convertDateFromISO(item.estimasi_tanggal_selesai)}
DP Customer: ${formatCurrency(item.dp?.toString() || '0')}
Sisa Customer: ${formatCurrency(item.sisa?.toString() || '0')}
DP ke Vendor: ${formatCurrency(item.dp_vendor?.toString() || '0')}
Rekening Tujuan: ${item.companies?.nama_perusahaan || '-'}
Status: ${item.status}`);
  };

  const showUpdateBiaya = (item: BiroJasaItem) => {
    return item.status !== "Selesai" && item.status !== "Batal" && (item.sisa || 0) > 0;
  };

  const showKeuntungan = (item: BiroJasaItem) => {
    return item.status === "Selesai";
  };
  
  const showInputVendorDp = (item: BiroJasaItem) => {
    // Show only if status is "Dalam Proses" and no vendor DP has been input yet (or maybe allow multiple? for now let's assume one time or check if 0)
    // Adjust logic if multiple DPs needed. For now assume one time input.
    return item.status === "Dalam Proses";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Data Biro Jasa</CardTitle>
            <div className="flex items-center gap-2">
              <Label>Items per halaman:</Label>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Jenis Motor</TableHead>
                <TableHead>Plat Nomor</TableHead>
                <TableHead>Jenis Pengurusan</TableHead>
                <TableHead>Estimasi Biaya</TableHead>
                <TableHead>DP Cust</TableHead>
                <TableHead>Sisa Cust</TableHead>
                <TableHead>DP Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-4">
                    Tidak ada data biro jasa
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                    <TableCell>{convertDateFromISO(item.tanggal)}</TableCell>
                    <TableCell>{item.brand_name || '-'}</TableCell>
                    <TableCell>{item.jenis_motor || '-'}</TableCell>
                    <TableCell>{item.plat_nomor || '-'}</TableCell>
                    <TableCell>{item.jenis_pengurusan}</TableCell>
                    <TableCell>{formatCurrency(item.estimasi_biaya?.toString() || '0')}</TableCell>
                    <TableCell>{formatCurrency(item.dp?.toString() || '0')}</TableCell>
                    <TableCell>{formatCurrency(item.sisa?.toString() || '0')}</TableCell>
                    <TableCell>{formatCurrency(item.dp_vendor?.toString() || '0')}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === 'Selesai' ? 'bg-green-100 text-green-800' :
                        item.status === 'Batal' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleView(item)} title="View Details">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {showUpdateBiaya(item) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setUpdateBiayaModal({ isOpen: true, item })}
                            title="Update Biaya Pelunasan Customer"
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}
                         {showInputVendorDp(item) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setInputVendorDpModal({ isOpen: true, item })}
                            title="Input DP ke Vendor"
                          >
                            <Wallet className="w-4 h-4" />
                          </Button>
                        )}
                        {showKeuntungan(item) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setKeuntunganModal({ isOpen: true, item })}
                            title="Keuntungan"
                          >
                            <TrendingUp className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">
                Halaman {currentPage} dari {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UpdateBiayaModal
        biroJasa={updateBiayaModal.item}
        isOpen={updateBiayaModal.isOpen}
        onClose={() => setUpdateBiayaModal({ isOpen: false, item: null })}
        onSuccess={onRefresh}
        selectedDivision={selectedDivision}
      />

      <KeuntunganModal
        biroJasa={keuntunganModal.item}
        isOpen={keuntunganModal.isOpen}
        onClose={() => setKeuntunganModal({ isOpen: false, item: null })}
        onSuccess={onRefresh}
        selectedDivision={selectedDivision}
      />

      <InputVendorDpModal
        biroJasa={inputVendorDpModal.item}
        isOpen={inputVendorDpModal.isOpen}
        onClose={() => setInputVendorDpModal({ isOpen: false, item: null })}
        onSuccess={onRefresh}
        selectedDivision={selectedDivision}
      />
    </>
  );
};