import React from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Clock, CheckCircle, AlertCircle, Calendar, User, DollarSign } from "lucide-react";
import { EnhancedTable, CurrencyCell, DateCell, StatusBadge } from "./EnhancedTable";

interface CicilanTableEnhancedProps {
  data: any[];
  loading?: boolean;
}

const CicilanTableEnhanced = ({ data, loading = false }: CicilanTableEnhancedProps) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        variant: "secondary" as const, 
        className: "bg-yellow-100 text-yellow-800",
        icon: Clock 
      },
      completed: { 
        variant: "default" as const, 
        className: "bg-green-100 text-green-800",
        icon: CheckCircle 
      },
      overdue: { 
        variant: "destructive" as const, 
        className: "bg-red-100 text-red-800",
        icon: AlertCircle 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
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

  const getJenisPembayaranBadge = (jenis: string) => {
    const jenisConfig = {
      cash: { variant: "default" as const, className: "bg-green-100 text-green-800" },
      transfer: { variant: "secondary" as const, className: "bg-blue-100 text-blue-800" },
      card: { variant: "outline" as const, className: "bg-purple-100 text-purple-800" }
    };

    const config = jenisConfig[jenis as keyof typeof jenisConfig] || jenisConfig.cash;

    return (
      <StatusBadge 
        status={jenis} 
        variant={config.variant}
        className={config.className}
      />
    );
  };

  const columns = [
    {
      key: "tanggal_bayar",
      header: "Tanggal Bayar",
      width: "w-32",
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <DateCell date={value} />
        </div>
      )
    },
    {
      key: "penjualan_info",
      header: "Informasi Motor",
      width: "w-56",
      render: (value: any, row: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {row.penjualans?.brands?.name} - {row.penjualans?.jenis_motor?.jenis_motor}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Plat: {row.penjualans?.plat}
          </div>
          <div className="text-xs text-muted-foreground">
            Cabang: {row.penjualans?.cabang?.nama}
          </div>
        </div>
      )
    },
    {
      key: "batch_ke",
      header: "Batch",
      width: "w-20",
      render: (value: number) => (
        <Badge variant="outline" className="w-fit">
          #{value}
        </Badge>
      )
    },
    {
      key: "jumlah_bayar",
      header: "Jumlah Bayar",
      width: "w-32",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell amount={value} className="text-green-600 font-semibold" />
      )
    },
    {
      key: "sisa_bayar",
      header: "Sisa Bayar",
      width: "w-32",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell 
          amount={value} 
          className={value === 0 ? "text-green-600" : "text-amber-600"} 
        />
      )
    },
    {
      key: "jenis_pembayaran",
      header: "Jenis Bayar",
      width: "w-28",
      render: (value: string) => getJenisPembayaranBadge(value)
    },
    {
      key: "status",
      header: "Status",
      width: "w-32",
      render: (value: string) => getStatusBadge(value)
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
    }
  ];

  return (
    <EnhancedTable
      title="Data Cicilan Pembayaran"
      subtitle={`Menampilkan ${data.length} transaksi cicilan`}
      icon={CreditCard}
      data={data}
      columns={columns}
      actions={[]}
      loading={loading}
      emptyMessage="Belum ada data cicilan pembayaran"
      headerColor="bg-gradient-to-r from-blue-50 to-cyan-50"
    />
  );
};

export default CicilanTableEnhanced;