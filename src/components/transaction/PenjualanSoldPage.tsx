import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePenjualanData } from "./hooks/usePenjualanData";
import PenjualanSoldTable from "./PenjualanSoldTable";

interface PenjualanSoldPageProps {
  selectedDivision: string;
}

type FilterTukarTambah = 'semua' | 'tukar_tambah' | 'bukan_tukar_tambah';

const PenjualanSoldPage = ({ selectedDivision }: PenjualanSoldPageProps) => {
  // State untuk filter
  const [filterTukarTambah, setFilterTukarTambah] = useState<FilterTukarTambah>('semua');

  // Data queries
  const { penjualanData } = usePenjualanData(selectedDivision);

  // Filter data penjualan - hanya yang statusnya 'selesai' (Sold)
  const filteredPenjualanData = penjualanData.filter((penjualan: any) => {
    // Filter utama: hanya yang sudah selesai (Sold)
    if (penjualan.status !== 'selesai') {
      return false;
    }

    // Filter Tukar Tambah
    if (filterTukarTambah === 'tukar_tambah' && (!penjualan.tt || penjualan.tt === 'bukan_tukar_tambah')) {
      return false;
    }
    if (filterTukarTambah === 'bukan_tukar_tambah' && penjualan.tt === 'tukar_tambah') {
      return false;
    }

    return true;
  });

  const resetFilters = () => {
    setFilterTukarTambah('semua');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Penjualan - Sold</h1>
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
          Menampilkan {filteredPenjualanData.length} dari {penjualanData.length} data penjualan (Status: Sold)
        </div>
      </div>

      <PenjualanSoldTable
        penjualanData={filteredPenjualanData}
      />
    </div>
  );
};

export default PenjualanSoldPage;