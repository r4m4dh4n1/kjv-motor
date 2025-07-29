import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, Edit, Trash2, Eye, Calendar, Car, DollarSign, CheckCircle, Clock } from "lucide-react";
import { EnhancedTable, CurrencyCell, DateCell, StatusBadge } from "./EnhancedTable";

interface BiroJasaTableEnhancedProps {
  data: any[];
  loading?: boolean;
  onEdit?: (item: any) => void;
  onDelete?: (id: number) => void;
  onView?: (item: any) => void;
}

const BiroJasaTableEnhanced = ({ 
  data, 
  loading = false, 
  onEdit, 
  onDelete,
  onView 
}: BiroJasaTableEnhancedProps) => {

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Dalam Proses": { 
        variant: "secondary" as const, 
        className: "bg-yellow-100 text-yellow-800",
        icon: Clock 
      },
      "Selesai": { 
        variant: "default" as const, 
        className: "bg-green-100 text-green-800",
        icon: CheckCircle 
      },
      "Pending": { 
        variant: "outline" as const, 
        className: "bg-orange-100 text-orange-800",
        icon: Clock 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["Pending"];
    const Icon = config.icon;

    return (
      <div className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        <StatusBadge 
          status={status} 
          variant={config.variant}
          className={config.className}
        />
      </div>
    );
  };

  const getJenisPengurusanBadge = (jenis: string) => {
    const jenisConfig = {
      "STNK": { color: "bg-blue-100 text-blue-800" },
      "BPKB": { color: "bg-green-100 text-green-800" },
      "Pajak": { color: "bg-yellow-100 text-yellow-800" },
      "Mutasi": { color: "bg-purple-100 text-purple-800" },
      "Balik Nama": { color: "bg-red-100 text-red-800" },
      "Plat Nomor": { color: "bg-indigo-100 text-indigo-800" }
    };

    const config = jenisConfig[jenis as keyof typeof jenisConfig] || { color: "bg-gray-100 text-gray-800" };

    return (
      <Badge variant="secondary" className={config.color}>
        {jenis}
      </Badge>
    );
  };

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      width: "w-28",
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <DateCell date={value} />
        </div>
      )
    },
    {
      key: "jenis_pengurusan",
      header: "Jenis Pengurusan",
      width: "w-36",
      render: (value: string) => getJenisPengurusanBadge(value)
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
              {row.brands?.name || row.jenis_motor} {row.tahun && `(${row.tahun})`}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Plat: {row.plat_nomor} | Warna: {row.warna}
          </div>
        </div>
      )
    },
    {
      key: "estimasi_biaya",
      header: "Est. Biaya",
      width: "w-32",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell amount={value} className="text-blue-600" />
      )
    },
    {
      key: "dp",
      header: "DP",
      width: "w-28",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell amount={value} className="text-green-600" />
      )
    },
    {
      key: "sisa",
      header: "Sisa",
      width: "w-28",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell 
          amount={value} 
          className={value === 0 ? "text-green-600" : "text-amber-600"} 
        />
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
      key: "estimasi_tanggal_selesai",
      header: "Target Selesai",
      width: "w-32",
      render: (value: string) => (
        <DateCell date={value} className="text-sm" />
      )
    },
    {
      key: "status",
      header: "Status",
      width: "w-32",
      render: (value: string) => getStatusBadge(value)
    }
  ];

  const actions = [
    {
      label: "Lihat Detail",
      icon: Eye,
      onClick: onView || (() => {}),
      variant: "outline" as const,
      className: "hover:bg-blue-50 hover:text-blue-600"
    },
    {
      label: "Edit",
      icon: Edit,
      onClick: onEdit || (() => {}),
      variant: "outline" as const,
      className: "hover:bg-green-50 hover:text-green-600"
    },
    {
      label: "Hapus",
      icon: Trash2,
      onClick: (row: any) => onDelete && onDelete(row.id),
      variant: "destructive" as const,
      className: "hover:bg-red-50"
    }
  ];

  return (
    <EnhancedTable
      title="Data Biro Jasa"
      subtitle={`Menampilkan ${data.length} layanan biro jasa`}
      icon={FileText}
      data={data}
      columns={columns}
      actions={actions.filter(action => {
        if (action.label === "Lihat Detail" && !onView) return false;
        if (action.label === "Edit" && !onEdit) return false;
        if (action.label === "Hapus" && !onDelete) return false;
        return true;
      })}
      loading={loading}
      emptyMessage="Belum ada data layanan biro jasa"
      headerColor="bg-gradient-to-r from-orange-50 to-amber-50"
    />
  );
};

export default BiroJasaTableEnhanced;