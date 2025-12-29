import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, History, DollarSign } from "lucide-react";
import {
  EnhancedTable,
  DateCell,
  CurrencyCell,
  TextCell,
  ActionCell,
} from "./EnhancedTable";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PencatatanAssetItem {
  id: number;
  tanggal: string;
  nama: string;
  nominal: number;
  sumber_dana_id: number;
  keterangan?: string;
  jenis_transaksi?: string; // ✅ TAMBAH: Field jenis transaksi
  divisi: string;
  cabang_id: number;
  created_at: string;
  updated_at: string;
  companies?: {
    nama_perusahaan: string;
    modal?: number; // ✅ TAMBAH: Field modal perusahaan
  };
}

interface PencatatanAssetTableProps {
  data: PencatatanAssetItem[];
  onEdit: (asset: PencatatanAssetItem) => void;
  onRefetch: () => void;
}

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

export const PencatatanAssetTable = ({
  data,
  onEdit,
  onRefetch,
}: PencatatanAssetTableProps) => {
  const { toast } = useToast();
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedAssetName, setSelectedAssetName] = useState<string>("");
  const [updateNominalDialogOpen, setUpdateNominalDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] =
    useState<PencatatanAssetItem | null>(null);
  const [companiesData, setCompaniesData] = useState<any[]>([]);
  const [nominalFormData, setNominalFormData] = useState({
    tanggal_update: "",
    nominal: "",
    jenis_transaksi: "",
    sumber_dana_id: "",
    alasan: "",
  });

  // Query untuk mengambil data companies
  const { data: companiesDataQuery } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, nama_perusahaan, modal")
        .order("nama_perusahaan");

      if (error) throw error;
      return data || [];
    },
  });

  // Query untuk mengambil history per asset
  const { data: assetHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["asset_history", selectedAssetName],
    queryFn: async (): Promise<PencatatanAssetHistoryItem[]> => {
      if (!selectedAssetName) return [];

      const { data, error } = await supabase
        .from("pencatatan_asset_history")
        .select("*")
        .eq("nama", selectedAssetName)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // ✅ PERBAIKAN: Manual join dengan companies untuk history
      if (data && data.length > 0) {
        const companyIds = [
          ...new Set(data.map((item) => item.sumber_dana_id)),
        ] as number[];
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, nama_perusahaan")
          .in("id", companyIds);

        // Merge data
        const enrichedData = data.map((history) => ({
          ...history,
          companies: companiesData?.find(
            (company) => company.id === history.sumber_dana_id
          ),
        }));

        return enrichedData as any;
      }

      return (data as any) || [];
    },
    enabled: !!selectedAssetName,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // 1. Ambil data asset yang akan dihapus
      const assetToDelete = data.find((item) => item.id === id);
      if (!assetToDelete) throw new Error("Asset tidak ditemukan");

      // 2. Kembalikan modal ke company (sumber dana) berdasarkan jenis transaksi
      if (assetToDelete.sumber_dana_id && assetToDelete.nominal > 0) {
        // Logika pengembalian modal berdasarkan jenis transaksi
        let modalAmount = assetToDelete.nominal;

        // Jika jenis transaksi adalah 'pengeluaran', kembalikan modal (tambah modal)
        // Jika jenis transaksi adalah 'pemasukan', kurangi modal (karena saat insert modal ditambah)
        if (assetToDelete.jenis_transaksi === "pemasukan") {
          modalAmount = -assetToDelete.nominal; // Kurangi modal karena saat insert modal ditambah
        }
        // Untuk 'pengeluaran', modalAmount tetap positif (tambah modal karena saat insert modal dikurangi)

        const { error: modalError } = await supabase.rpc(
          "update_company_modal",
          {
            company_id: assetToDelete.sumber_dana_id,
            amount: modalAmount,
          }
        );

        if (modalError) {
          console.error("Error updating company modal:", modalError);
          throw modalError;
        }
      }

      // 3. Hapus pembukuan terkait (jika ada)
      const keteranganPembukuan = `${
        assetToDelete.jenis_transaksi === "pengeluaran"
          ? "Pengeluaran"
          : "Pemasukan"
      } Asset - ${assetToDelete.nama}`;
      const { error: pembukuanDeleteError } = await supabase
        .from("pembukuan")
        .delete()
        .eq("keterangan", keteranganPembukuan)
        .eq("company_id", assetToDelete.sumber_dana_id);

      if (pembukuanDeleteError) {
        console.error("Error deleting pembukuan entry:", pembukuanDeleteError);
        // Tidak throw error karena pembukuan mungkin tidak ada
      }

      // 4. Hapus data asset
      const { error: deleteError } = await supabase
        .from("pencatatan_asset")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description:
          "Data asset berhasil dihapus dan modal company dikembalikan",
      });
      onRefetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus data asset",
        variant: "destructive",
      });
      console.error("Error deleting asset:", error);
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus asset ini?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleShowHistory = (assetName: string) => {
    setSelectedAssetName(assetName);
    setHistoryDialogOpen(true);
  };

  const handleUpdateNominal = (asset: PencatatanAssetItem) => {
    setSelectedAsset(asset);
    setNominalFormData({
      tanggal_update: new Date().toISOString().split("T")[0],
      nominal: "0", // ✅ PERBAIKAN: Default ke 0 bukan nominal saat ini
      jenis_transaksi: asset.jenis_transaksi || "pengeluaran",
      sumber_dana_id: asset.sumber_dana_id?.toString() || "",
      alasan: "",
    });
    setUpdateNominalDialogOpen(true);
  };

  // Update nominal mutation
  const updateNominalMutation = useMutation({
    mutationFn: async ({
      assetId,
      formData,
    }: {
      assetId: number;
      formData: any;
    }) => {
      const nominalPerubahan = parseFloat(
        formData.nominal.replace(/[^\d]/g, "")
      );
      const jenisTransaksiBaru = formData.jenis_transaksi;
      const sumberDanaBaru = parseInt(formData.sumber_dana_id);

      if (!selectedAsset) throw new Error("Asset tidak ditemukan");

      // 1. Get current asset data
      const { data: currentAsset, error: fetchError } = await supabase
        .from("pencatatan_asset")
        .select("*")
        .eq("id", assetId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Calculate new nominal based on transaction type
      const nominalLama = currentAsset.nominal;
      let nominalBaru = nominalLama;

      if (jenisTransaksiBaru === "pemasukan") {
        // Pemasukan: kurangi nominal asset (karena asset berkurang/dijual)
        nominalBaru = nominalLama - nominalPerubahan;
      } else if (jenisTransaksiBaru === "pengeluaran") {
        // Pengeluaran: tambah nominal asset (karena beli/tambah asset)
        nominalBaru = nominalLama + nominalPerubahan;
      }

      // 3. Update asset data with new calculated nominal
      const { error: updateError } = await supabase
        .from("pencatatan_asset")
        .update({
          nominal: nominalBaru,
          jenis_transaksi: jenisTransaksiBaru,
          sumber_dana_id: sumberDanaBaru,
        })
        .eq("id", assetId);

      if (updateError) throw updateError;

      // 4. Handle modal changes for company
      if (sumberDanaBaru) {
        let modalAmount = 0;

        if (jenisTransaksiBaru === "pemasukan") {
          // Pemasukan asset = tambah modal perusahaan dengan nominal perubahan
          modalAmount = nominalPerubahan;
        } else if (jenisTransaksiBaru === "pengeluaran") {
          // Pengeluaran asset = kurangi modal perusahaan dengan nominal perubahan
          modalAmount = -nominalPerubahan;
        }

        const { error: modalError } = await supabase.rpc(
          "update_company_modal",
          {
            company_id: sumberDanaBaru,
            amount: modalAmount,
          }
        );

        if (modalError) {
          console.error("Error updating company modal:", modalError);
          toast({
            title: "Warning",
            description: `Nominal asset terupdate tapi modal perusahaan gagal: ${modalError.message}`,
            variant: "destructive",
          });
        }
      }

      // 5. Record to pencatatan_asset_history
      const { error: historyError } = await supabase
        .from("pencatatan_asset_history")
        .insert([
          {
            pencatatan_asset_id: assetId,
            tanggal: formData.tanggal_update || currentAsset.tanggal,
            nama: currentAsset.nama,
            jenis_transaksi: jenisTransaksiBaru,
            nominal: nominalPerubahan, // Record nominal perubahan, bukan nominal baru
            sumber_dana_id: sumberDanaBaru,
            keterangan: `Update Nominal: ${formData.alasan} (${
              jenisTransaksiBaru === "pemasukan" ? "+" : "-"
            }${nominalPerubahan.toLocaleString("id-ID")})`,
            divisi: currentAsset.divisi,
            cabang_id: currentAsset.cabang_id,
          },
        ] as any);

      if (historyError) {
        console.error("Error recording to history:", historyError);
        toast({
          title: "Warning",
          description: `Nominal asset terupdate tapi history gagal: ${historyError.message}`,
          variant: "destructive",
        });
      }

      // 6. Insert pembukuan entry for this update
      const keterangan = `Update ${
        jenisTransaksiBaru === "pengeluaran" ? "Pengeluaran" : "Pemasukan"
      } Asset - ${currentAsset.nama}: ${formData.alasan}`;
      const { error: pembukuanError } = await supabase
        .from("pembukuan")
        .insert([
          {
            tanggal: formData.tanggal_update,
            divisi: currentAsset.divisi,
            cabang_id: currentAsset.cabang_id,
            keterangan: keterangan,
            debit: jenisTransaksiBaru === "pengeluaran" ? nominalPerubahan : 0,
            kredit: jenisTransaksiBaru === "pemasukan" ? nominalPerubahan : 0,
            saldo: 0,
            company_id: sumberDanaBaru,
          },
        ]);

      if (pembukuanError) {
        console.error("Error updating pembukuan:", pembukuanError);
        toast({
          title: "Warning",
          description: `Nominal asset terupdate tapi pembukuan gagal: ${pembukuanError.message}`,
          variant: "destructive",
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Nominal asset berhasil diupdate",
      });
      setUpdateNominalDialogOpen(false);
      setSelectedAsset(null);
      setNominalFormData({
        tanggal_update: "",
        nominal: "",
        jenis_transaksi: "",
        sumber_dana_id: "",
        alasan: "",
      });
      onRefetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate nominal asset",
        variant: "destructive",
      });
    },
  });

  const handleNominalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAsset) {
      updateNominalMutation.mutate({
        assetId: selectedAsset.id,
        formData: nominalFormData,
      });
    }
  };

  const handleCurrencyChange = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^\d]/g, "");
    const formattedValue = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(parseInt(numericValue) || 0);

    setNominalFormData((prev) => ({ ...prev, nominal: formattedValue }));
  };

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (value: string) => <DateCell date={value} />,
    },
    {
      key: "nama",
      header: "Nama Asset",
      render: (value: string) => (
        <TextCell text={value} className="font-medium" />
      ),
    },
    {
      key: "nominal",
      header: "Nominal",
      render: (value: number) => <CurrencyCell amount={value} />,
    },
    {
      // ✅ PERBAIKAN KEY: Ubah dari "companies.nama_perusahaan" ke "companies"
      key: "companies",
      header: "Sumber Dana",
      // ✅ PERBAIKAN RENDER: Akses nested object dari parameter row
      render: (value: any, row: PencatatanAssetItem) => (
        <TextCell text={row.companies?.nama_perusahaan || "-"} />
      ),
    },
    {
      key: "companies.modal",
      header: "Modal Perusahaan",
      render: (value: any, row: PencatatanAssetItem) => (
        <CurrencyCell amount={(row.companies as any)?.modal || 0} />
      ),
    },
    {
      key: "jenis_transaksi",
      header: "Jenis Transaksi",
      render: (value: string, row: PencatatanAssetItem) => (
        <TextCell
          text={
            (row as any).jenis_transaksi === "pengeluaran"
              ? "Pengeluaran"
              : (row as any).jenis_transaksi === "pemasukan"
              ? "Pemasukan"
              : "-"
          }
          className={`font-medium ${
            (row as any).jenis_transaksi === "pengeluaran"
              ? "text-red-600"
              : (row as any).jenis_transaksi === "pemasukan"
              ? "text-green-600"
              : ""
          }`}
        />
      ),
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (value: string) => <TextCell text={value || "-"} />,
    },
  ];

  const actions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (row: PencatatanAssetItem) => {
        console.log("[PencatatanAsset] click Edit", row);
        onEdit(row);
      },
      variant: "outline" as const,
    },
    {
      label: "Update Nominal",
      icon: DollarSign,
      onClick: handleUpdateNominal,
      variant: "outline" as const,
    },
    {
      label: "History",
      icon: History,
      onClick: (row: PencatatanAssetItem) => handleShowHistory(row.nama),
      variant: "outline" as const,
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (row: PencatatanAssetItem) => handleDelete(row.id),
      variant: "outline" as const,
    },
  ];

  // Hitung total nilai asset saat ini
  const calculateCurrentAssetValue = () => {
    if (!assetHistory) return 0;

    let total = 0;
    assetHistory.forEach((entry) => {
      if (entry.jenis_transaksi === "pengeluaran") {
        total -= entry.nominal;
      } else if (entry.jenis_transaksi === "pemasukan") {
        total += entry.nominal;
      }
    });
    return total;
  };

  return (
    <>
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

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>History Asset: {selectedAssetName}</DialogTitle>
          </DialogHeader>

          {historyLoading ? (
            <div className="text-center py-8">Loading history...</div>
          ) : (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ringkasan Asset</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Transaksi
                      </p>
                      <p className="text-2xl font-bold">
                        {assetHistory?.length || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Nilai Asset Saat Ini
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          calculateCurrentAssetValue() >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(calculateCurrentAssetValue())}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Transaksi</CardTitle>
                </CardHeader>
                <CardContent>
                  {assetHistory && assetHistory.length > 0 ? (
                    <div className="space-y-2">
                      {assetHistory.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div className="text-sm text-muted-foreground">
                                {new Date(entry.created_at).toLocaleDateString(
                                  "id-ID"
                                )}
                              </div>
                              <div
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  (entry as any).jenis_transaksi ===
                                  "pengeluaran"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {(entry as any).jenis_transaksi ===
                                "pengeluaran"
                                  ? "Pengeluaran"
                                  : "Pemasukan"}
                              </div>
                              <div className="text-sm">
                                {(entry.companies as any)?.nama_perusahaan ||
                                  "Unknown Company"}
                              </div>
                            </div>
                            {entry.keterangan && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {entry.keterangan}
                              </div>
                            )}
                          </div>
                          <div
                            className={`text-lg font-bold ${
                              (entry as any).jenis_transaksi === "pengeluaran"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {(entry as any).jenis_transaksi === "pengeluaran"
                              ? "-"
                              : "+"}
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0,
                            }).format(entry.nominal)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Belum ada history untuk asset ini
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Nominal Dialog */}
      <Dialog
        open={updateNominalDialogOpen}
        onOpenChange={setUpdateNominalDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Nominal Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNominalSubmit} className="space-y-4">
            {selectedAsset && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Asset:</p>
                  <p className="font-medium">{selectedAsset.nama}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Nominal Saat Ini:
                  </p>
                  <p className="font-medium">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(selectedAsset.nominal)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sumber Dana:</p>
                  <p className="font-medium">
                    {selectedAsset.companies?.nama_perusahaan ||
                      "Unknown Company"}
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="tanggal_update">Tanggal Update</Label>
              <Input
                id="tanggal_update"
                type="date"
                value={(nominalFormData as any).tanggal_update}
                onChange={(e) =>
                  setNominalFormData((prev) => ({
                    ...prev,
                    tanggal_update: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="nominal">Nominal</Label>
              <Input
                id="nominal"
                value={nominalFormData.nominal}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                placeholder="Masukkan nominal"
                required
              />
            </div>

            <div>
              <Label htmlFor="jenis_transaksi">Jenis Transaksi *</Label>
              <Select
                value={nominalFormData.jenis_transaksi}
                onValueChange={(value) =>
                  setNominalFormData((prev) => ({
                    ...prev,
                    jenis_transaksi: value,
                  }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jenis Transaksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pengeluaran">
                    Pengeluaran Asset (Mengurangi Modal)
                  </SelectItem>
                  <SelectItem value="pemasukan">
                    Pemasukan Asset (Menambah Modal)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sumber_dana_id">Sumber Dana *</Label>
              <Select
                value={nominalFormData.sumber_dana_id}
                onValueChange={(value) =>
                  setNominalFormData((prev) => ({
                    ...prev,
                    sumber_dana_id: value,
                  }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Sumber Dana" />
                </SelectTrigger>
                <SelectContent>
                  {companiesDataQuery?.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.nama_perusahaan}
                      <br />
                      <small className="text-gray-500">
                        Modal:{" "}
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(company.modal || 0)}
                      </small>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alasan">Alasan Update</Label>
              <Textarea
                id="alasan"
                value={nominalFormData.alasan}
                onChange={(e) =>
                  setNominalFormData((prev) => ({
                    ...prev,
                    alasan: e.target.value,
                  }))
                }
                placeholder="Masukkan alasan update nominal"
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUpdateNominalDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={updateNominalMutation.isPending}>
                {updateNominalMutation.isPending
                  ? "Mengupdate..."
                  : "Update Nominal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
