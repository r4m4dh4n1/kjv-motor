-- Add sale fields to assets table
ALTER TABLE public.assets 
ADD COLUMN tanggal_jual DATE,
ADD COLUMN harga_jual BIGINT,
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'tersedia';

-- Add comment for clarity
COMMENT ON COLUMN public.assets.status IS 'Status asset: tersedia, terjual';
COMMENT ON COLUMN public.assets.tanggal_jual IS 'Tanggal asset dijual';
COMMENT ON COLUMN public.assets.harga_jual IS 'Harga jual asset';