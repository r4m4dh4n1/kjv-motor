import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedTable, DateCell, CurrencyCell, TextCell } from "./EnhancedTable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PencatatanAssetHistoryItem {
  id: number;
  asset_id: number;
  tanggal: string;
  nama: string;
  nominal: number;
  jenis_transaksi: string;
  sumber_dana_id: number;
  keterangan?: string;
  divisi: string;
  cabang_id: number;
  created_at: string;
  updated_at?: string;
  companies?: {
    nama_perusahaan: string;
  };
}

interface PencatatanAssetHistoryTableProps {
  selectedDivision: string;
}

export const PencatatanAssetHistoryTable = ({ selectedDivision }: PencatatanAssetHistoryTableProps) => {
  // Fetch data from pencatatan_asset_history table
  const { data, isLoading, error } = useQuery({
    queryKey: ["pencatatan_asset_history", selectedDivision],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pencatatan_asset_history")
        .select("*")
        .eq("divisi", selectedDivision)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // ✅ PERBAIKAN: Manual join dengan companies untuk menghindari foreign key error
      if (data && data.length > 0) {
        const companyIds = [...new Set(data.map(item => item.sumber_dana_id))] as number[];
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, nama_perusahaan')
          .in('id', companyIds);
        
        // Merge data
        const enrichedData = data.map(history => ({
          ...history,
          companies: companiesData?.find(company => company.id === history.sumber_dana_id)
        }));
        
        return enrichedData;
      }
      
      return data || [];
    },
  });

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
      key: "jenis_transaksi",
      header: "Jenis Transaksi",
      render: (value: string) => (
        <TextCell 
          text={value === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan'} 
          className={`font-medium ${value === 'pengeluaran' ? 'text-red-600' : 'text-green-600'}`}
        />
      )
    },
    {
      key: "nominal",
      header: "Nominal",
      render: (value: number) => <CurrencyCell amount={value} />
    },
    {
      key: "company",
      header: "Sumber Dana",
      render: (value: any, row: PencatatanAssetHistoryItem) => (
        <TextCell text={row.companies?.nama_perusahaan || "-"} />
      )
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (value: string) => <TextCell text={value || "-"} />
    },
    {
      key: "created_at",
      header: "Dibuat",
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