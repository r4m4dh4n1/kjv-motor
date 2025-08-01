import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { EnhancedTable, DateCell, CurrencyCell, TextCell, ActionCell } from "./EnhancedTable";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PencatatanAssetItem {
  id: number;
  tanggal: string;
  nama: string;
  nominal: number;
  sumber_dana_id: number;
  keterangan?: string;
  divisi: string;
  cabang_id: number;
  created_at: string;
  updated_at: string;
  companies?: {
    nama_perusahaan: string;
  };
}

interface PencatatanAssetTableProps {
  data: PencatatanAssetItem[];
  onEdit: (asset: PencatatanAssetItem) => void;
  onRefetch: () => void;
}

export const PencatatanAssetTable = ({ data, onEdit, onRefetch }: PencatatanAssetTableProps) => {
  const { toast } = useToast();

  const deleteMutation = {
    isPending: false,
    mutate: (id: number) => {
      toast({
        title: "Info",
        description: "Delete functionality akan tersedia setelah database types di-update",
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus asset ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (value: string) => <DateCell date={value} />
    },
    {
      key: "nama", 
      header: "Nama Asset",
      render: (value: string) => <TextCell text={value} className="font-medium" />
    },
    {
      key: "nominal",
      header: "Nominal", 
      render: (value: number) => <CurrencyCell amount={value} />
    },
    {
      key: "companies.nama_perusahaan",
      header: "Sumber Dana",
      render: (value: string) => <TextCell text={value || "-"} />
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (value: string) => <TextCell text={value || "-"} />
    }
  ];

  const actions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: onEdit,
      variant: "outline" as const
    },
    {
      label: "Delete", 
      icon: Trash2,
      onClick: (row: PencatatanAssetItem) => handleDelete(row.id),
      variant: "outline" as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Pencatatan Asset</CardTitle>
        <CardDescription>
          Daftar semua asset yang telah dicatat
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EnhancedTable
          title="Data Pencatatan Asset"
          subtitle="Daftar semua asset yang telah dicatat"
          data={data}
          columns={columns}
          actions={actions}
        />
      </CardContent>
    </Card>
  );
};