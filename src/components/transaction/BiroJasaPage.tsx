import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, TrendingUp, Clock, CheckCircle, DollarSign } from "lucide-react";
import { useBiroJasaData } from "./biro-jasa/hooks/useBiroJasaData";
import { useBiroJasaForm } from "./biro-jasa/hooks/useBiroJasaForm";
import { BiroJasaForm } from "./biro-jasa/BiroJasaForm";
import { BiroJasaTable } from "./biro-jasa/BiroJasaTable";
import { formatCurrency } from "./biro-jasa/utils";

const BiroJasaPage = ({ selectedDivision }: { selectedDivision: string }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { biroJasaData, brandsData, companiesData, jenisMotorData, fetchData, handleDelete } = useBiroJasaData(selectedDivision);
  
  const { 
    formData, 
    setFormData, 
    editingBiroJasa, 
    handleSubmit, 
    handleEdit, 
    resetForm 
  } = useBiroJasaForm(() => {
    fetchData();
    setIsDialogOpen(false);
  }, selectedDivision);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalKeuntungan = biroJasaData.reduce((sum, item) => {
      return sum + (item.keuntungan || 0);
    }, 0);

    const dalamProses = biroJasaData.filter(item => 
      item.status === 'Dalam Proses' || item.status === 'belum_lunas'
    ).length;

    const selesai = biroJasaData.filter(item => 
      item.status === 'Selesai' || item.status === 'lunas'
    ).length;

    const totalTransaksi = biroJasaData.length;

    const totalPendapatan = biroJasaData.reduce((sum, item) => {
      return sum + (item.total_bayar || 0);
    }, 0);

    return {
      totalKeuntungan,
      dalamProses,
      selesai,
      totalTransaksi
    };
  }, [biroJasaData]);

  const handleEditClick = (item: any) => {
    handleEdit(item);
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Biro Jasa</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Biro Jasa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBiroJasa ? "Edit Biro Jasa" : "Tambah Biro Jasa"}
              </DialogTitle>
            </DialogHeader>
            <BiroJasaForm
              formData={formData}
              setFormData={setFormData}
              brandsData={brandsData}
              companiesData={companiesData}
              jenisMotorData={jenisMotorData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isEditing={!!editingBiroJasa}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keuntungan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(statistics.totalKeuntungan.toString())}
            </div>
            <p className="text-xs text-muted-foreground">
              Dari {statistics.totalTransaksi} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dalam Proses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statistics.dalamProses}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi berlangsung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.selesai}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi selesai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics.totalTransaksi}
            </div>
            <p className="text-xs text-muted-foreground">
              Semua transaksi
            </p>
          </CardContent>
        </Card>

       
      </div>

      <BiroJasaTable
        data={biroJasaData}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        onRefresh={fetchData}
        selectedDivision={selectedDivision}
      />
    </div>
  );
};

export default BiroJasaPage;