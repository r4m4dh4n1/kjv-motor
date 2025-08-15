import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const usePenjualanDelete = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      // 1. Get penjualan data first to retrieve all necessary information
      const { data: penjualanToDelete, error: fetchError } = await supabase
        .from('penjualans')
        .select('pembelian_id, jenis_id, company_id, keuntungan, harga_beli')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Return modal to company (add back the harga_beli to company modal)
      if (penjualanToDelete.company_id && penjualanToDelete.harga_beli) {
        const { error: modalError } = await supabase.rpc('update_company_modal', {
          company_id: penjualanToDelete.company_id,
          amount: penjualanToDelete.harga_beli  // Return the purchase cost
        });

        if (modalError) {
          console.error('Error returning modal to company:', modalError);
        }
      }

      // 3. Subtract keuntungan from company modal (remove the profit gained)
      if (penjualanToDelete.company_id && penjualanToDelete.keuntungan > 0) {
        const { error: keuntunganError } = await supabase.rpc('update_company_modal', {
          company_id: penjualanToDelete.company_id,
          amount: -penjualanToDelete.keuntungan  // Subtract the profit
        });

        if (keuntunganError) {
          console.error('Error subtracting keuntungan from company:', keuntunganError);
        }
      }

      // 4. Delete from pembukuan table (entries related to this sale)
      const { error: pembukuanError } = await supabase
        .from('pembukuan')
        .delete()
        .eq('pembelian_id', penjualanToDelete.pembelian_id);

      if (pembukuanError) {
        console.error('Error deleting pembukuan:', pembukuanError);
      }

      // 5. Delete from cicilan table (if any cicilan exists for this sale)
      const { error: cicilanError } = await supabase
        .from('cicilan')
        .delete()
        .eq('penjualan_id', id);

      if (cicilanError) {
        console.error('Error deleting cicilan:', cicilanError);
      }

      // 6. Increment qty back in jenis_motor table
      const { error: stockError } = await supabase
        .rpc('increment_qty', { 
          jenis_motor_id: penjualanToDelete.jenis_id 
        });

      if (stockError) {
        console.error('Error incrementing stock:', stockError);
      }

      // 7. Update status in pembelian table back to 'tersedia'
      const { error: pembelianError } = await supabase
        .from('pembelian')
        .update({ status: 'tersedia' })
        .eq('id', penjualanToDelete.pembelian_id);

      if (pembelianError) {
        console.error('Error updating pembelian status:', pembelianError);
      }

      // 8. Finally, delete the penjualan record
      const { error: deleteError } = await supabase
        .from('penjualans')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      return penjualanToDelete;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Data penjualan berhasil dihapus, stok motor dikembalikan, dan modal company disesuaikan"
      });
    },
    onError: (error) => {
      console.error('Error deleting penjualan:', error);
      toast({
        title: "Error",
        description: "Gagal menghapus data penjualan",
        variant: "destructive"
      });
    },
  });
};