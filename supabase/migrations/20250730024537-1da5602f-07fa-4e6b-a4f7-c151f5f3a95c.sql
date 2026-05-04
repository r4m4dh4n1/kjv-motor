-- Check table schemas to verify ID constraints
SELECT 
  table_name,
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'id'
  AND table_name IN (
    'assets', 'biro_jasa', 'pembukuan', 'fee_penjualan', 
    'operational', 'pembelian', 'penjualans', 'cicilan',
    'monthly_closures'
  )
ORDER BY table_name;