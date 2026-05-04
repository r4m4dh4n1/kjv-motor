import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Eye, DollarSign, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { BiroJasaItem } from "./types";
import { convertDateFromISO } from "./utils";
import { formatCurrency } from "@/lib/utils";
import { UpdateBiayaModal } from "./UpdateBiayaModal";
import { KeuntunganModal } from "./KeuntunganModal";

interface BiroJasaTableProps {
  data: BiroJasaItem[];
  onEdit: (item: BiroJasaItem) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
  selectedDivision: string;
}

export const BiroJasaTable = ({ data, onEdit, onDelete, onRefresh, selectedDivision }: BiroJasaTableProps) => {
  const [updateBiayaModal, setUpdateBiayaModal] = useState<{ isOpen: boolean; item: BiroJasaItem | null }>({
    isOpen: false,
    item: null,
  });
  const [keuntunganModal, setKeuntunganModal] = useState<{ isOpen: boolean; item: BiroJasaItem | null }>({
    isOpen: false,
    item: null,
  });

  const handleView = (item: BiroJasaItem) => {
    alert(`Detail Biro Jasa:\nTanggal: ${convertDateFromISO(item.tanggal)}\nBrand: ${item.brands?.name || '-'}\nJenis Motor: ${item.jenis_motor || '-'}\nWarna: ${item.warna || '-'}\nPlat Nomor: ${item.plat_nomor || '-'}\nTahun: ${item.tahun || '-'}\nJenis Pengurusan: ${item.jenis_pengurusan}\nKeterangan: ${item.keterangan || '-'}\nEstimasi Biaya: ${formatCurrency(item.estimasi_biaya?.toString() || '0')}\nEstimasi Tanggal Selesai: ${convertDateFromISO(item.estimasi_tanggal_selesai)}\nDP: ${formatCurrency(item.dp?.toString() || '0')}\nSisa: ${formatCurrency(item.sisa?.toString() || '0')}\nRekening Tujuan: ${item.companies?.nama_perusahaan || '-'}\nStatus: ${item.status}`);
  };

  const showUpdateBiaya = (item: BiroJasaItem) => {
    return item.status !== "Selesai" && item.status !== "Batal" && (item.sisa || 0) > 0;
  };

  const showKeuntungan = (item: BiroJasaItem) => {
    return item.status === "Selesai";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Data Biro Jasa</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Jenis Motor</TableHead>
                <TableHead>Plat Nomor</TableHead>
                <TableHead>Jenis Pengurusan</TableHead>
                <TableHead>Estimasi Biaya</TableHead>
                <TableHead>DP</TableHead>
                <TableHead>Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{convertDateFromISO(item.tanggal)}</TableCell>
                  <TableCell>{item.brands?.name || '-'}</TableCell>
                  <TableCell>{item.jenis_motor || '-'}</TableCell>
                  <TableCell>{item.plat_nomor || '-'}</TableCell>
                  <TableCell>{item.jenis_pengurusan}</TableCell>
                  <TableCell>{formatCurrency(item.estimasi_biaya?.toString() || '0')}</TableCell>
                  <TableCell>{formatCurrency(item.dp?.toString() || '0')}</TableCell>
                  <TableCell>{formatCurrency(item.sisa?.toString() || '0')}</TableCell>
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
                          title="Update Biaya"
                        >
                          <DollarSign className="w-4 h-4" />
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
              ))}
            </TableBody>
          </Table>
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
    </>
  );
};