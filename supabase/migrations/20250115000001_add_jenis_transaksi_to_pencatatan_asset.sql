-- Add jenis_transaksi field to pencatatan_asset table
-- This field is needed to distinguish between pengeluaran (expense) and pemasukan (income) asset transactions

-- Add jenis_transaksi column to pencatatan_asset table
ALTER TABLE public.pencatatan_asset 
ADD COLUMN jenis_transaksi VARCHAR(20) NOT NULL DEFAULT 'pengeluaran';

-- Add comment for clarity
COMMENT ON COLUMN public.pencatatan_asset.jenis_transaksi IS 'Jenis transaksi asset: pengeluaran (mengurangi modal) atau pemasukan (menambah modal)';

-- Add jenis_transaksi column to pencatatan_asset_history table as well
ALTER TABLE public.pencatatan_asset_history 
ADD COLUMN jenis_transaksi VARCHAR(20) NOT NULL DEFAULT 'pengeluaran';

-- Add comment for clarity
COMMENT ON COLUMN public.pencatatan_asset_history.jenis_transaksi IS 'Jenis transaksi asset: pengeluaran (mengurangi modal) atau pemasukan (menambah modal)';

-- Update existing records to have default value
UPDATE public.pencatatan_asset 
SET jenis_transaksi = 'pengeluaran' 
WHERE jenis_transaksi IS NULL;

UPDATE public.pencatatan_asset_history 
SET jenis_transaksi = 'pengeluaran' 
WHERE jenis_transaksi IS NULL;
