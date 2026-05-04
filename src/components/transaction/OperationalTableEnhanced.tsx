import React from "react";
import { Badge } from "@/components/ui/badge";
import { Settings, Edit, Trash2, Building, Calendar, Receipt } from "lucide-react";
import { EnhancedTable, CurrencyCell, DateCell } from "./EnhancedTable";

interface OperationalTableEnhancedProps {
  data: any[];
  loading?: boolean;
  onEdit?: (item: any) => void;
  onDelete?: (id: number) => void;
}

const OperationalTableEnhanced = ({ 
  data, 
  loading = false, 
  onEdit, 
  onDelete 
}: OperationalTableEnhancedProps) => {
  
  const getCategoryBadge = (kategori: string) => {
    const categoryConfig = {
      "Operasional Kantor": { color: "bg-blue-100 text-blue-800" },
      "Transportasi": { color: "bg-green-100 text-green-800" },
      "Komunikasi": { color: "bg-purple-100 text-purple-800" },
      "Listrik & Air": { color: "bg-yellow-100 text-yellow-800" },
      "Maintenance": { color: "bg-red-100 text-red-800" },
      "Marketing": { color: "bg-pink-100 text-pink-800" },
      "Gaji & Tunjangan": { color: "bg-indigo-100 text-indigo-800" },
      "Pajak & Retribusi": { color: "bg-orange-100 text-orange-800" },
      "Asuransi": { color: "bg-teal-100 text-teal-800" },
      "Lain-lain": { color: "bg-gray-100 text-gray-800" }
    };

    const config = categoryConfig[kategori as keyof typeof categoryConfig] || categoryConfig["Lain-lain"];

    return (
      <Badge variant="secondary" className={config.color}>
        {kategori}
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
      key: "kategori",
      header: "Kategori",
      width: "w-40",
      render: (value: string) => getCategoryBadge(value)
    },
    {
      key: "deskripsi",
      header: "Deskripsi",
      width: "w-64",
      render: (value: string) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">{value}</span>
          </div>
        </div>
      )
    },
    {
      key: "nominal",
      header: "Nominal",
      width: "w-32",
      className: "text-right",
      render: (value: number) => (
        <CurrencyCell amount={value} className="text-red-600 font-semibold" />
      )
    },
    {
      key: "companies",
      header: "Sumber Dana",
      width: "w-40",
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{row.companies?.nama_perusahaan || '-'}</span>
        </div>
      )
    },
    {
      key: "cabang",
      header: "Cabang",
      width: "w-28",
      render: (value: any) => value?.nama || '-'
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

  return (
    <EnhancedTable
      title="Data Pengeluaran Operasional"
      subtitle={`Menampilkan ${data.length} transaksi operasional`}
      icon={Settings}
      data={data}
      columns={columns}
      actions={onEdit || onDelete ? actions : []}
      loading={loading}
      emptyMessage="Belum ada data pengeluaran operasional"
      headerColor="bg-gradient-to-r from-purple-50 to-violet-50"
    />
  );
};

export default OperationalTableEnhanced;