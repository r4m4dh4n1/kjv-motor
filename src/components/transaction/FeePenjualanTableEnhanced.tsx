import React from "react";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Edit, Trash2, Car, Calendar, MapPin } from "lucide-react";
import { EnhancedTable, CurrencyCell, DateCell } from "./EnhancedTable";

interface FeePenjualanTableEnhancedProps {
  data: any[];
  loading?: boolean;
  onEdit?: (item: any) => void;
  onDelete?: (id: number) => void;
}

const FeePenjualanTableEnhanced = ({ 
  data, 
  loading = false, 
  onEdit, 
  onDelete 
}: FeePenjualanTableEnhancedProps) => {

  const columns = [
    {
      key: "tanggal_fee",
      header: "Tanggal Fee",
      width: "w-32",
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <DateCell date={value} />
        </div>
      )
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
      key: "penjualan_info",
      header: "Informasi Penjualan",
      width: "w-64",
      render: (value: any, row: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {row.penjualans?.brands?.name} - {row.penjualans?.jenis_motor?.jenis_motor}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Plat: {row.penjualans?.plat}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            Cabang: {row.penjualans?.cabangs?.nama}
          </div>
        </div>
      )
    },
    {
      key: "harga_jual",
      header: "Harga Jual",
      width: "w-32",
      className: "text-right",
      render: (value: any, row: any) => (
        <CurrencyCell amount={row.penjualans?.harga_jual || 0} className="text-blue-600" />
      )
    },
    {
      key: "jumlah_fee",
      header: "Jumlah Fee",
      width: "w-32",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell amount={value} className="text-green-600 font-semibold" />
      )
    },
    {
      key: "persentase_fee",
      header: "% Fee",
      width: "w-24",
      render: (value: any, row: any) => {
        const hargaJual = row.penjualans?.harga_jual || 0;
        const persentase = hargaJual > 0 ? ((row.jumlah_fee / hargaJual) * 100).toFixed(2) : 0;
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            {persentase}%
          </Badge>
        );
      }
    },
    {
      key: "keterangan",
      header: "Keterangan",
      width: "w-48",
      render: (value: string) => (
        <div className="max-w-48 truncate text-sm text-muted-foreground" title={value}>
          {value || '-'}
        </div>
      )
    },
    {
      key: "created_at",
      header: "Dibuat",
      width: "w-32",
      render: (value: string) => (
        <DateCell date={value} className="text-xs text-muted-foreground" />
      )
    }
  ];

  const actions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: onEdit || (() => {}),
      variant: "outline" as const,
      className: "hover:bg-blue-50 hover:text-blue-600"
    },
    {
      label: "Hapus",
      icon: Trash2,
      onClick: (row: any) => onDelete && onDelete(row.id),
      variant: "destructive" as const,
      className: "hover:bg-red-50"
    }
  ];

  // Calculate total fee
  const totalFee = data.reduce((sum, item) => sum + (item.jumlah_fee || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Fee</p>
              <p className="text-2xl font-bold text-green-600">
                <CurrencyCell amount={totalFee} />
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Transaksi</p>
              <p className="text-2xl font-bold text-blue-600">{data.length}</p>
            </div>
            <Car className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rata-rata Fee</p>
              <p className="text-2xl font-bold text-purple-600">
                <CurrencyCell amount={data.length > 0 ? totalFee / data.length : 0} />
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      <EnhancedTable
        title="Data Fee Penjualan"
        subtitle={`Menampilkan ${data.length} transaksi fee penjualan`}
        icon={DollarSign}
        data={data}
        columns={columns}
        actions={actions.filter(action => {
          if (action.label === "Edit" && !onEdit) return false;
          if (action.label === "Hapus" && !onDelete) return false;
          return true;
        })}
        loading={loading}
        emptyMessage="Belum ada data fee penjualan"
        headerColor="bg-gradient-to-r from-green-50 to-emerald-50"
      />
    </div>
  );
};

export default FeePenjualanTableEnhanced;