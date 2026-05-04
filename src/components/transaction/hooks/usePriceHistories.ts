import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type PriceHistory =
  Database["public"]["Tables"]["price_histories_pembelian"]["Row"];

export const usePriceHistories = (
  pembelian_id: number | null,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ["price_histories", pembelian_id],
    queryFn: async () => {
      if (!pembelian_id) return [];

      const { data, error } = await supabase
        .from("price_histories_pembelian")
        .select("*")
        .eq("pembelian_id", pembelian_id)
        .order("tanggal_update", { ascending: false });

      if (error) {
        console.error("Error fetching price histories:", error);
        throw error;
      }

      return (data || []) as PriceHistory[];
    },
    enabled: enabled && !!pembelian_id,
    staleTime: 0, // Always fresh data
  });
};
