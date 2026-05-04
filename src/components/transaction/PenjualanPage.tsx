import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import PenjualanForm from "./PenjualanForm";
import PenjualanTable from "./PenjualanTable";
import UpdateHargaModal from "./UpdateHargaModal";
import { Penjualan, PenjualanFormData } from "./penjualan-types";
import { 
  usePembelianData,
  useCabangData,
  useCompaniesData
} from "./hooks/usePembelianData";
import { usePenjualanData } from "./hooks/usePenjualanData";
import { usePenjualanCreate, usePenjualanDelete } from "./hooks/usePenjualanMutations";
import { usePenjualanActions } from "./hooks/usePenjualanActions";
import {
  createInitialPenjualanFormData,
  validatePenjualanFormData,
  transformPenjualanToFormData
} from "./utils/penjualanFormUtils";

interface PenjualanPageProps {
  selectedDivision: string;
}

// Tipe untuk filter
type FilterTukarTambah = 'semua' | 'tukar_tambah' | 'bukan_tukar_tambah';
type FilterStatus = 'semua' | 'lunas' | 'belum_lunas';
type FilterFee = 'semua' | 'sudah_ada_fee' | 'belum_ada_fee';

const PenjualanPage = ({ selectedDivision }: PenjualanPageProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPenjualan, setEditingPenjualan] = useState<Penjualan | null>(null);
  const [formData, setFormData] = useState<PenjualanFormData>(createInitialPenjualanFormData(selectedDivision));
  
  // State untuk filter
  const [filterTukarTambah, setFilterTukarTambah] = useState<FilterTukarTambah>('semua');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('semua');
  const [filterFee, setFilterFee] = useState<FilterFee>('semua');

  const { toast } = useToast();

  // Update formData when selectedDivision changes
  useEffect(() => {
    if (!editingPenjualan) {
      setFormData(createInitialPenjualanFormData(selectedDivision));
    }
  }, [selectedDivision, editingPenjualan]);

  // Data queries
  const { data: cabangData = [] } = useCabangData();
  const { data: pembelianData = [] } = usePembelianData(selectedDivision, "all");
  const { data: companiesData = [] } = useCompaniesData(selectedDivision);
  const { penjualanData, refetch: refetchPenjualan } = usePenjualanData(selectedDivision);
  
  // Mutations
  const createPenjualanMutation = usePenjualanCreate();
  const deletePenjualanMutation = usePenjualanDelete();
  
  // Actions
  const {
    isUpdateHargaOpen,
    setIsUpdateHargaOpen,
    selectedPenjualanForUpdate,
    setSelectedPenjualanForUpdate,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    selectedPenjualanForHistory,
    setSelectedPenjualanForHistory,
    handleUpdateHarga,
    handleLihatDetail,
    handleRiwayatHarga,
    handleSubmitUpdateHarga
  } = usePenjualanActions();

  // Filter data penjualan berdasarkan filter yang dipilih
  const filteredPenjualanData = penjualanData.filter((penjualan: any) => {
    // Filter Tukar Tambah
    if (filterTukarTambah === 'tukar_tambah' && (!penjualan.tt || penjualan.tt === 'bukan_tukar_tambah')) {
      return false;
    }
    if (filterTukarTambah === 'bukan_tukar_tambah' && penjualan.tt === 'tukar_tambah') {
      return false;
    }

    // Filter Status Pembayaran
    if (filterStatus === 'lunas' && penjualan.status !== 'selesai') {
      return false;
    }
    if (filterStatus === 'belum_lunas' && penjualan.status === 'selesai') {
      return false;
    }

    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!validatePenjualanFormData(formData)) {
      toast({ 
        title: "Error", 
        description: "Harap lengkapi semua field yang wajib diisi", 
        variant: "destructive" 
      });
      return;
    }

    try {
      await createPenjualanMutation.mutateAsync({ formData, pembelianData });
      resetForm();
      refetchPenjualan();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const resetForm = () => {
    setFormData(createInitialPenjualanFormData(selectedDivision));
    setEditingPenjualan(null);
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await deletePenjualanMutation.mutateAsync(id);
      refetchPenjualan();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleEdit = (penjualan: any) => {
    setEditingPenjualan(penjualan);
    setFormData(transformPenjualanToFormData(penjualan));
    setIsDialogOpen(true);
  };

  // Reset filter function
  const resetFilters = () => {
    setFilterTukarTambah('semua');
    setFilterStatus('semua');
    setFilterFee('semua');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Penjualan</h1>
        <PenjualanForm
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          editingPenjualan={editingPenjualan}
          formData={formData}
          setFormData={setFormData}
          cabangData={cabangData}
          pembelianData={pembelianData}
          companiesData={companiesData}
          handleSubmit={handleSubmit}
          resetForm={resetForm}
          selectedDivision={selectedDivision}
        />
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-4 items-center">
          <h3 className="text-lg font-semibold text-gray-700">Filter:</h3>
          
          {/* Filter Tukar Tambah */}
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={filterTukarTambah === 'semua' ? 'default' : 'outline'}
              onClick={() => setFilterTukarTambah('semua')}
            >
              Semua
            </Button>
            <Button 
              size="sm"
              variant={filterTukarTambah === 'tukar_tambah' ? 'default' : 'outline'}
              onClick={() => setFilterTukarTambah('tukar_tambah')}
            >
              Tukar Tambah
            </Button>
            <Button 
              size="sm"
              variant={filterTukarTambah === 'bukan_tukar_tambah' ? 'default' : 'outline'}
              onClick={() => setFilterTukarTambah('bukan_tukar_tambah')}
            >
              Bukan Tukar Tambah
            </Button>
          </div>

          {/* Filter Status Pembayaran */}
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={filterStatus === 'semua' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('semua')}
            >
              Semua
            </Button>
            <Button 
              size="sm"
              variant={filterStatus === 'lunas' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('lunas')}
            >
              Lunas
            </Button>
            <Button 
              size="sm"
              variant={filterStatus === 'belum_lunas' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('belum_lunas')}
            >
              Belum Lunas
            </Button>
          </div>

          {/* Filter Fee (untuk implementasi masa depan) */}
          {/* Uncomment ketika field fee sudah ditambahkan ke database */}
          {/*
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={filterFee === 'sudah_ada_fee' ? 'default' : 'outline'}
              onClick={() => setFilterFee('sudah_ada_fee')}
            >
              Sudah Ada Fee
            </Button>
            <Button 
              size="sm"
              variant={filterFee === 'belum_ada_fee' ? 'default' : 'outline'}
              onClick={() => setFilterFee('belum_ada_fee')}
            >
              Belum Ada Fee
            </Button>
          </div>
          */}

          {/* Reset Filter Button */}
          <Button 
            size="sm"
            variant="ghost"
            onClick={resetFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            Reset Filter
          </Button>
        </div>

        {/* Filter Summary */}
        <div className="mt-2 text-sm text-gray-600">
          Menampilkan {filteredPenjualanData.length} dari {penjualanData.length} data penjualan
        </div>
      </div>

      <PenjualanTable
        penjualanData={filteredPenjualanData}
        handleEdit={handleEdit}
        deleteMutation={{ mutate: handleDelete }}
        handleUpdateHarga={handleUpdateHarga}
        handleRiwayatHarga={handleRiwayatHarga}
      />

      <UpdateHargaModal
        isOpen={isUpdateHargaOpen}
        onClose={() => {
          setIsUpdateHargaOpen(false);
          setSelectedPenjualanForUpdate(null);
        }}
        penjualan={selectedPenjualanForUpdate}
        onSubmit={(updateData) => handleSubmitUpdateHarga(updateData, refetchPenjualan)}
      />
    </div>
  );
};

export default PenjualanPage;