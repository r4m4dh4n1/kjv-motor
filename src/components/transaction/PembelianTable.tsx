import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Eye,
  DollarSign,
  CheckCircle,
  History,
  TrendingUp,
  Car,
  Calendar,
  FileText,
} from "lucide-react";
import {
  EnhancedTable,
  CurrencyCell,
  DateCell,
  StatusBadge,
} from "./EnhancedTable";
import { useRBAC } from "@/hooks/useRBAC";

interface PembelianTableProps {
  pembelianData: any[];
  handleEdit: (pembelian: any) => void;
  handleView: (pembelian: any) => void;
  handleUpdateHarga: (pembelian: any) => void;
  handleQC: (pembelian: any) => void;
  handleViewQcHistory: (pembelian: any) => void;
  handleViewPriceHistory: (pembelian: any) => void;
  handleViewQcReport?: () => void;
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
  handleViewQcReport,
  deleteMutation,
}: PembelianTableProps) => {
  const { hasPermission } = useRBAC();

  const columns = [
    {
      key: "tanggal_pembelian",
      header: "Tanggal",
      width: "w-32",
      render: (value: string) => <DateCell date={value} />,
    },
    {
      key: "divisi",
      header: "Divisi",
      width: "w-20",
      render: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: "cabang",
      header: "Cabang",
      width: "w-28",
      render: (value: any) => value?.nama || "-",
    },
    {
      key: "motor_info",
      header: "Informasi Motor",
      width: "w-64",
      render: (value: any, row: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {row.brands?.name} - {row.jenis_motor?.jenis_motor}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Tahun: {row.tahun} | Warna: {row.warna}
          </div>
        </div>
      ),
    },
    {
      key: "plat_nomor",
      header: "Plat Nomor",
      width: "w-24",
      render: (value: string) => (
        <Badge variant="secondary" className="font-mono">
          {value}
        </Badge>
      ),
    },
    {
      key: "tanggal_pajak",
      header: "Pajak",
      width: "w-28",
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <DateCell date={value} className="text-xs" checkOverdue={true} />
        </div>
      ),
    },
    {
      key: "harga_beli",
      header: "Harga Beli",
      width: "w-32",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell amount={value} className="text-blue-600" />
      ),
    },
    {
      key: "harga_final",
      header: "Harga Final",
      width: "w-32",
      className: "text-right",
      render: (value: number, row: any) => (
        <CurrencyCell
          amount={value || row.harga_beli}
          className="text-green-600 font-semibold"
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-24",
      render: (value: string) => {
        const statusConfig = {
          ready: {
            variant: "default" as const,
            color: "bg-green-100 text-green-800",
          },
          sold: {
            variant: "secondary" as const,
            color: "bg-blue-100 text-blue-800",
          },
          draft: {
            variant: "outline" as const,
            color: "bg-yellow-100 text-yellow-800",
          },
        };

        const config =
          statusConfig[value as keyof typeof statusConfig] ||
          statusConfig.ready;

        return (
          <StatusBadge
            status={value}
            variant={config.variant}
            className={config.color}
          />
        );
      },
    },
  ];

  // QC role: hanya bisa akses Report QC, Lihat Detail, History Harga
  // QC permission check
  const canReportQC = hasPermission("report_qc");
  const canViewDetail = hasPermission("view_detail_pembelian");
  const canViewHistoryHarga = hasPermission("view_history_harga");

  const actions = [
    {
      label: "Lihat Detail",
      icon: Eye,
      onClick: handleView,
      variant: "outline" as const,
      className: "hover:bg-blue-50 hover:text-blue-600",
      hidden: !canViewDetail && !hasPermission("update_data"), // QC atau role dengan update_data bisa akses
    },
    {
      label: "History Harga",
      icon: TrendingUp,
      onClick: handleViewPriceHistory,
      variant: "outline" as const,
      className: "hover:bg-amber-50 hover:text-amber-600",
      hidden: !canViewHistoryHarga && !hasPermission("update_data"), // QC atau role dengan update_data bisa akses
    },
    {
      label: "Report QC",
      icon: FileText,
      onClick: handleQC,
      variant: "outline" as const,
      className: "hover:bg-purple-50 hover:text-purple-600",
      hidden: !canReportQC && !hasPermission("update_data"), // QC atau role dengan update_data bisa akses
    },
    {
      label: "History QC",
      icon: History,
      onClick: handleViewQcHistory,
      variant: "outline" as const,
      className: "hover:bg-indigo-50 hover:text-indigo-600",
      hidden: !hasPermission("update_data"), // Hanya untuk role dengan update_data (bukan QC)
    },
    {
      label: "Edit",
      icon: Pencil,
      onClick: handleEdit,
      variant: "outline" as const,
      className: "hover:bg-green-50 hover:text-green-600",
      hidden: !hasPermission("update_data"), // Hanya untuk role dengan update_data (bukan QC)
    },
    {
      label: "Update Harga",
      icon: DollarSign,
      onClick: handleUpdateHarga,
      variant: "outline" as const,
      className: "hover:bg-orange-50 hover:text-orange-600",
      hidden: !hasPermission("update_harga_penjualan"), // Hanya untuk role dengan permission update_harga_penjualan
    },
    {
      label: "Hapus",
      icon: Trash2,
      onClick: (row: any) => deleteMutation.mutate(row.id),
      variant: "destructive" as const,
      className: "hover:bg-red-50",
      hidden: !hasPermission("delete_data"), // Hanya untuk role dengan delete_data
    },
  ].filter((action) => !action.hidden); // Filter out hidden actions

  return (
    <EnhancedTable
      title="Data Pembelian Motor"
      subtitle={`Menampilkan ${pembelianData.length} data pembelian`}
      icon={Car}
      data={pembelianData}
      columns={columns}
      actions={actions}
      emptyMessage="Belum ada data pembelian motor"
      headerColor="bg-gradient-to-r from-blue-50 to-indigo-50"
    />
  );
};

export default PembelianTable;
