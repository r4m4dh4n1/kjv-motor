import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit } from "lucide-react";
import { PencatatanAssetForm } from "./PencatatanAssetForm";
import { PencatatanAssetTable } from "./PencatatanAssetTable";
import { PencatatanAssetHistoryTable } from "./PencatatanAssetHistoryTable";
import { AssetPriceUpdateDialog } from "./AssetPriceUpdateDialog";
import { AssetPriceHistoryTable } from "./AssetPriceHistoryTable";
import { SimpleAssetPriceUpdate } from "./SimpleAssetPriceUpdate";
import { BasicAssetUpdate } from "./BasicAssetUpdate";
import { TestAssetUpdate } from "./TestAssetUpdate";
import { usePencatatanAssetData } from "./hooks/usePencatatanAssetData";
import { usePencatatanAssetForm } from "./hooks/usePencatatanAssetForm";
import { formatCurrency } from "@/utils/formatUtils";

interface PencatatanAssetPageProps {
  selectedDivision: string;
}

export const PencatatanAssetPage = ({ selectedDivision }: PencatatanAssetPageProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error, refetch } = usePencatatanAssetData(selectedDivision);
  const { formData, setFormData, editingAsset, handleSubmit, handleEdit, resetForm } = usePencatatanAssetForm(
    () => {
      setDialogOpen(false);
      refetch();
    },
    selectedDivision
  );

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(asset =>
      asset.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.keterangan?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!data) return { totalAssets: 0, totalNominal: 0 };
    
    return {
      totalAssets: data.length,
      totalNominal: data.reduce((sum, asset) => sum + (Number(asset.nominal) || 0), 0)
    };
  }, [data]);

  const handleEditClick = (asset: any) => {
    handleEdit(asset);
    setDialogOpen(true);
  };

  const handleOpenDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCancel = () => {
    resetForm();
    setDialogOpen(false);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  console.log('PencatatanAssetPage rendered with selectedDivision:', selectedDivision);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pencatatan Asset</h1>
          <p className="text-muted-foreground">
            Kelola pencatatan asset untuk divisi {selectedDivision}
          </p>
        </div>
        <div className="flex gap-2">
          <TestAssetUpdate 
            selectedDivision={selectedDivision} 
            onSuccess={refetch}
          />
          <Button onClick={handleOpenDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Asset
          </Button>
        </div>
      </div>
      
      <div className="p-4 bg-green-100 border border-green-400 rounded">
        <p className="text-green-800">
          Debug: PencatatanAssetPage rendered successfully. 
          Selected Division: {selectedDivision}
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? "Edit Asset" : "Tambah Asset Baru"}
            </DialogTitle>
          </DialogHeader>
          <PencatatanAssetForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={!!editingAsset}
            selectedDivision={selectedDivision}
          />
        </DialogContent>
      </Dialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              Asset yang tercatat
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nominal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statistics.totalNominal.toString())}
            </div>
            <p className="text-xs text-muted-foreground">
              Total nilai asset
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Pencarian</CardTitle>
          <CardDescription>
            Filter dan cari data asset berdasarkan nama atau keterangan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Pencarian</Label>
              <Input
                id="search"
                placeholder="Cari berdasarkan nama atau keterangan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Data and History */}
      <Tabs defaultValue="data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="data">Data Aktif</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="price-history">Price History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="data">
          <PencatatanAssetTable
            data={filteredData}
            onEdit={handleEditClick}
            onRefetch={refetch}
          />
        </TabsContent>
        
        <TabsContent value="history">
          <PencatatanAssetHistoryTable selectedDivision={selectedDivision} />
        </TabsContent>
        
        <TabsContent value="price-history">
          <AssetPriceHistoryTable selectedDivision={selectedDivision} />
        </TabsContent>
      </Tabs>
    </div>
  );
};