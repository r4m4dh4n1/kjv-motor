import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPembukuanEntries, createTransferPembukuanEntry, TransferData, PenjualanData } from '../business/penjualanBusinessLogic';

// API functions (adjust based on your actual API)
const createPembukuan = async (pembukuanData: any) => {
  const response = await fetch('/api/pembukuan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pembukuanData)
  });
  return response.json();
};

const createPenjualan = async (penjualanData: PenjualanData) => {
  const response = await fetch('/api/penjualan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(penjualanData)
  });
  return response.json();
};

// Enhanced Penjualan Mutation
export function usePenjualanCreateMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (penjualanData: PenjualanData) => {
      // Create the main penjualan record
      const penjualanResult = await createPenjualan(penjualanData);
      
      // Create pembukuan entries based on transaction type
      const pembukuanEntries = createPembukuanEntries(penjualanData);
      
      // Save each pembukuan entry
      const pembukuanPromises = pembukuanEntries.map(entry => 
        createPembukuan({
          ...entry,
          tanggal: new Date().toISOString().split('T')[0],
          penjualan_id: penjualanResult.id,
          jenis: penjualanData.jenis_transaksi === 'tukar_tambah_transfer' ? 'dp' : 'regular'
        })
      );
      
      await Promise.all(pembukuanPromises);
      
      return penjualanResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penjualan'] });
      queryClient.invalidateQueries({ queryKey: ['pembukuan'] });
    },
    onError: (error) => {
      console.error('Error creating penjualan:', error);
    }
  });
}

// New Transfer Mutation
export function useTransferMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transferData: TransferData) => {
      // Create pembukuan entry for transfer
      const pembukuanEntry = createTransferPembukuanEntry(transferData);
      
      return await createPembukuan({
        ...pembukuanEntry,
        jenis: 'transfer'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pembukuan'] });
    },
    onError: (error) => {
      console.error('Error creating transfer entry:', error);
    }
  });
}

// Enhanced Cicilan Mutation (for completing payments)
export function useCicilanMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cicilanData: { penjualan_id: string; jumlah_bayar: number; keterangan: string }) => {
      // Create cicilan record
      const cicilanResponse = await fetch('/api/cicilan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cicilanData)
      });
      
      const cicilanResult = await cicilanResponse.json();
      
      // Create pembukuan entry for cicilan
      await createPembukuan({
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: cicilanData.keterangan,
        debit: 0,
        kredit: cicilanData.jumlah_bayar,
        jenis: 'cicilan',
        penjualan_id: cicilanData.penjualan_id
      });
      
      return cicilanResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cicilan'] });
      queryClient.invalidateQueries({ queryKey: ['pembukuan'] });
      queryClient.invalidateQueries({ queryKey: ['penjualan'] });
    }
  });
}

// Mutation for updating harga (existing functionality)
export function useUpdateHargaMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: { penjualan_id: string; harga_baru: number; biaya_tambahan: number }) => {
      // Update penjualan record
      const updateResponse = await fetch(`/api/penjualan/${updateData.penjualan_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ harga_bayar: updateData.harga_baru })
      });
      
      const updateResult = await updateResponse.json();
      
      // Create pembukuan entry for additional cost
      if (updateData.biaya_tambahan > 0) {
        await createPembukuan({
          tanggal: new Date().toISOString().split('T')[0],
          keterangan: 'Update Harga - Biaya Tambahan',
          debit: updateData.biaya_tambahan,
          kredit: 0,
          jenis: 'update_harga',
          penjualan_id: updateData.penjualan_id
        });
      }
      
      return updateResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penjualan'] });
      queryClient.invalidateQueries({ queryKey: ['pembukuan'] });
    }
  });
}