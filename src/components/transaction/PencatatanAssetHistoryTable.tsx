import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedTable, DateCell, CurrencyCell, TextCell } from "./EnhancedTable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PencatatanAssetHistoryItem {
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
  closed_month: number;
  closed_year: number;
  closed_at: string;
}

interface PencatatanAssetHistoryTableProps {
  selectedDivision: string;
}

export const PencatatanAssetHistoryTable = ({ selectedDivision }: PencatatanAssetHistoryTableProps) => {
  // For now, return empty data until types are updated
  const data: PencatatanAssetHistoryItem[] = [];
  const isLoading = false;
  const error = null;

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
      key: "keterangan",
      header: "Keterangan",
      render: (value: string) => <TextCell text={value || "-"} />
    },
    {
      key: "closed_period",
      header: "Closed Period", 
      render: (value: any, row: PencatatanAssetHistoryItem) => (
        <TextCell text={`${row.closed_month}/${row.closed_year}`} />
      )
    },
    {
      key: "closed_at",
      header: "Closed At",
      render: (value: string) => <DateCell date={value} />
    }
  ];

  if (isLoading) return <div>Loading history...</div>;
  if (error) return <div>Error loading history: {error.message}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>History Pencatatan Asset</CardTitle>
        <CardDescription>
          Riwayat asset yang telah ditutup dalam proses close month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EnhancedTable
          title="History Pencatatan Asset"
          subtitle="Riwayat asset yang telah ditutup dalam proses close month" 
          data={data}
          columns={columns}
        />
      </CardContent>
    </Card>
  );
};