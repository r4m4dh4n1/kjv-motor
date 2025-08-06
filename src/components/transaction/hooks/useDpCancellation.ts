import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DpCancellationData } from "../DpCancellationModal";

export const useDpCancellation = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      penjualanId, 
      cancellationData 
    }: { 
      penjualanId: number; 
      cancellationData: DpCancellationData;
    }) => {
      // 1. Get current penjualan data with related data
      const { data: currentPenjualan, error: fetchError } = await supabase
        .from('penjualans')
        .select(`
          *,
          brands(name),
          jenis_motor(jenis_motor)
        `)
        .eq('id', penjualanId)
        .single();

      if (fetchError) {
        throw new Error(`Gagal mengambil data penjualan: ${fetchError.message}`);
      }

      const dpAmount = currentPenjualan.dp || 0;
      const companyId = currentPenjualan.company_id;

      // 2. Update penjualan status to cancelled and reset DP
      const { error: updateError } = await supabase
        .from('penjualans')
        .update({
          status: 'cancelled_dp_hangus',
          dp: 0,
          harga_bayar: 0,
          sisa_bayar: currentPenjualan.harga_jual,
          catatan: `${currentPenjualan.catatan || ''}\n\n[DP CANCELLED] ${cancellationData.reason}${cancellationData.keterangan ? `\nKeterangan: ${cancellationData.keterangan}` : ''}`
        })
        .eq('id', penjualanId);

      if (updateError) {
        throw new Error(`Gagal mengupdate status penjualan: ${updateError.message}`);
      }

      // 3. Update stock motor (return to available)
      if (currentPenjualan.jenis_id) {
        const { error: stockError } = await supabase
          .rpc('increment_qty', { 
            jenis_motor_id: currentPenjualan.jenis_id 
          });

        if (stockError) {
          console.error('Error updating stock:', stockError);
        }
      }

      // 4. Update pembelian status back to 'ready'
      if (currentPenjualan.pembelian_id) {
        const { error: pembelianError } = await supabase
          .from('pembelian')
          .update({ status: 'ready' })
          .eq('id', currentPenjualan.pembelian_id);

        if (pembelianError) {
          console.error('Error updating pembelian status:', pembelianError);
        }
      }

      // 5. Handle company modal based on cancellation type
      let modalAmount = 0;
      if (cancellationData.type === 'full_forfeit') {
        // For full forfeit, don't add to company modal as per requirement
        modalAmount = 0;
      } else if (cancellationData.type === 'partial_refund') {
        // For partial refund, only the refund amount reduces modal (subtract from company)
        if (cancellationData.refund_amount && cancellationData.refund_amount > 0) {
          const { error: modalError } = await supabase.rpc('update_company_modal', {
            company_id: companyId,
            amount: -cancellationData.refund_amount // Negative to reduce modal
          });

          if (modalError) {
            console.error('Error updating company modal:', modalError);
            toast({
              title: "Warning",
              description: `DP dibatalkan tapi gagal mengurangi modal perusahaan: ${modalError.message}`,
              variant: "destructive"
            });
          }
        }
      }

      // 6. Create pembukuan entries
      const pembukuanEntries = [];

      // For full forfeit: NO pembukuan entry as per requirement
      if (cancellationData.type === 'full_forfeit') {
        // Do nothing - no pembukuan entry for full forfeit
      }

      // Entry for refund amount (company expense) if partial refund
      if (cancellationData.type === 'partial_refund' && cancellationData.refund_amount && cancellationData.refund_amount > 0) {
        pembukuanEntries.push({
          tanggal: new Date().toISOString().split('T')[0],
          divisi: currentPenjualan.divisi,
          keterangan: `Pengembalian DP ke Customer - ${cancellationData.reason} (${currentPenjualan.brands?.name || 'Motor'} ${currentPenjualan.plat})`,
          debit: cancellationData.refund_amount,
          kredit: 0,
          cabang_id: currentPenjualan.cabang_id,
          company_id: companyId,
          pembelian_id: currentPenjualan.pembelian_id
        });
      }

      // Insert pembukuan entries
      if (pembukuanEntries.length > 0) {
        const { error: pembukuanError } = await supabase
          .from('pembukuan')
          .insert(pembukuanEntries);

        if (pembukuanError) {
          console.error('Error creating pembukuan entries:', pembukuanError);
          toast({
            title: "Warning",
            description: `DP dibatalkan tapi gagal mencatat pembukuan: ${pembukuanError.message}`,
            variant: "destructive"
          });
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Sukses",
        description: "DP berhasil dibatalkan dan status penjualan diupdate"
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['penjualan'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['pembukuan'] });
    },
    onError: (error: any) => {
      console.error('Error cancelling DP:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal membatalkan DP",
        variant: "destructive"
      });
    },
  });
};