-- Add keuntungan field to assets table
ALTER TABLE public.assets 
ADD COLUMN keuntungan BIGINT;

-- Add comment for clarity
COMMENT ON COLUMN public.assets.keuntungan IS 'Keuntungan dari penjualan asset (Harga Jual - Harga Beli)';