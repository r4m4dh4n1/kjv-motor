-- Update tanggal_lunas for completed cash transactions
UPDATE penjualans 
SET tanggal_lunas = tanggal 
WHERE tanggal_lunas IS NULL 
  AND status = 'selesai' 
  AND jenis_pembayaran = 'cash_penuh';