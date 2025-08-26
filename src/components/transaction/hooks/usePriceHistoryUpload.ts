import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface PriceHistoryUploadData {
  id: number;
  pembelian_id: number;
  reason: string;
  biaya_pajak: number;
  biaya_qc: number;
  biaya_lain_lain: number;
  keterangan_biaya_lain: string;
  company_id: number;
  harga_beli_lama: number;
  harga_beli_baru: number;
  created_at: string;
  pembelian?: {
    plat_nomor: string;
    divisi: string;
    cabang_id: number;
    brands?: { name: string };
    jenis_motor?: { jenis_motor: string };
  };
}

export const usePriceHistoryUpload = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query untuk mengambil price histories yang belum ada di pembukuan
  const { data: unuploadedHistories = [], isLoading, refetch } = useQuery({
    queryKey: ['price-history-upload'],
    queryFn: async () => {
      // Ambil semua price histories dengan join ke pembelian
      const { data: histories, error } = await supabase
        .from('price_histories_pembelian')
        .select(`
          *,
          pembelian:pembelian_id (
            plat_nomor,
            divisi,
            cabang_id,
            brands:brand_id (name),
            jenis_motor:jenis_motor_id (jenis_motor)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter yang belum ada di pembukuan
      const unuploaded = [];
      for (const history of histories) {
        const { data: existing, error: checkError } = await supabase
          .from('pembukuan')
          .select('id')
          .eq('pembelian_id', history.pembelian_id)
          .ilike('keterangan', `%${history.reason}%`)
          .limit(1);

        if (checkError) throw checkError;
        
        if (!existing || existing.length === 0) {
          unuploaded.push(history);
        }
      }

      return unuploaded as PriceHistoryUploadData[];
    }
  });

  // Mutation untuk upload ke pembukuan
  const uploadMutation = useMutation({
    mutationFn: async (data: { histories: PriceHistoryUploadData[], tanggal: string }) => {
      const { histories, tanggal } = data;
      
      const pembukuanEntries = histories.map(history => {
        const totalBiaya = (history.biaya_pajak || 0) + (history.biaya_qc || 0) + (history.biaya_lain_lain || 0);
        const selisihHarga = history.harga_beli_baru - history.harga_beli_lama;
        const totalAmount = Math.max(totalBiaya, selisihHarga);
        
        return {
          tanggal,
          divisi: history.pembelian?.divisi || '',
          cabang_id: history.pembelian?.cabang_id || 1,
          keterangan: `Upload Price History - ${history.pembelian?.brands?.name || ''} - ${history.pembelian?.jenis_motor?.jenis_motor || ''} - ${history.pembelian?.plat_nomor || ''} - ${history.reason}`,
          debit: totalAmount > 0 ? totalAmount : 0,
          kredit: totalAmount < 0 ? Math.abs(totalAmount) : 0,
          pembelian_id: history.pembelian_id,
          company_id: history.company_id
        };
      });

      const { error } = await supabase
        .from('pembukuan')
        .insert(pembukuanEntries);

      if (error) throw error;
      
      return { count: pembukuanEntries.length };
    },
    onSuccess: (result) => {
      toast({
        title: "Sukses",
        description: `${result.count} entri berhasil diupload ke pembukuan`
      });
      queryClient.invalidateQueries({ queryKey: ['price-history-upload'] });
      queryClient.invalidateQueries({ queryKey: ['pembukuan'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal upload ke pembukuan",
        variant: "destructive"
      });
    }
  });

  return {
    unuploadedHistories,
    isLoading,
    refetch,
    uploadMutation
  };
};