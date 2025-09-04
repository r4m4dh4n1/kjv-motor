-- Create table to track ongkir payments for penjualan
CREATE TABLE IF NOT EXISTS public.ongkir_payments (
  id BIGSERIAL PRIMARY KEY,
  penjualan_id BIGINT NOT NULL,
  tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
  nominal_titip_ongkir NUMERIC NOT NULL DEFAULT 0,
  keterangan TEXT,
  sumber_dana_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ongkir_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "authenticated_users_can_select_ongkir_payments" 
ON public.ongkir_payments 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_insert_ongkir_payments" 
ON public.ongkir_payments 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_update_ongkir_payments" 
ON public.ongkir_payments 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_delete_ongkir_payments" 
ON public.ongkir_payments 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Create trigger for updated_at
CREATE TRIGGER update_ongkir_payments_updated_at
BEFORE UPDATE ON public.ongkir_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();