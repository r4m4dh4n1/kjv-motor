-- Function untuk update modal perusahaan dari pembayaran biro jasa
CREATE OR REPLACE FUNCTION public.update_modal_from_biro_jasa_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update modal perusahaan berdasarkan tujuan_pembayaran_id
  IF NEW.tujuan_pembayaran_id IS NOT NULL THEN
    UPDATE companies 
    SET modal = modal + NEW.jumlah_bayar
    WHERE id = NEW.tujuan_pembayaran_id;
    
    -- Log untuk debugging
    RAISE NOTICE 'Modal perusahaan ID % ditambah sebesar %', NEW.tujuan_pembayaran_id, NEW.jumlah_bayar;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk biro_jasa_cicilan (pembayaran cicilan)
CREATE OR REPLACE TRIGGER trigger_update_modal_biro_jasa_cicilan
  AFTER INSERT ON biro_jasa_cicilan
  FOR EACH ROW
  EXECUTE FUNCTION update_modal_from_biro_jasa_payment();

-- Function untuk update modal perusahaan dari DP biro jasa
CREATE OR REPLACE FUNCTION public.update_modal_from_biro_jasa_dp()
RETURNS TRIGGER AS $$
BEGIN
  -- Ketika DP diubah, update modal perusahaan
  IF NEW.dp != OLD.dp AND NEW.rekening_tujuan_id IS NOT NULL THEN
    -- Hitung selisih DP
    DECLARE
      dp_difference NUMERIC := NEW.dp - OLD.dp;
    BEGIN
      IF dp_difference != 0 THEN
        UPDATE companies 
        SET modal = modal + dp_difference
        WHERE id = NEW.rekening_tujuan_id;
        
        -- Log untuk debugging
        RAISE NOTICE 'Modal perusahaan ID % diubah sebesar % dari DP biro jasa', NEW.rekening_tujuan_id, dp_difference;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk biro_jasa (DP)
CREATE OR REPLACE TRIGGER trigger_update_modal_biro_jasa_dp
  AFTER UPDATE ON biro_jasa
  FOR EACH ROW
  EXECUTE FUNCTION update_modal_from_biro_jasa_dp();

-- Function untuk handle insert biro_jasa dengan DP
CREATE OR REPLACE FUNCTION public.handle_biro_jasa_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Ketika biro jasa baru dibuat dengan DP, update modal perusahaan
  IF NEW.dp > 0 AND NEW.rekening_tujuan_id IS NOT NULL THEN
    UPDATE companies 
    SET modal = modal + NEW.dp
    WHERE id = NEW.rekening_tujuan_id;
    
    -- Log untuk debugging
    RAISE NOTICE 'Modal perusahaan ID % ditambah sebesar % dari DP biro jasa baru', NEW.rekening_tujuan_id, NEW.dp;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk insert biro_jasa
CREATE OR REPLACE TRIGGER trigger_handle_biro_jasa_insert
  AFTER INSERT ON biro_jasa
  FOR EACH ROW
  EXECUTE FUNCTION handle_biro_jasa_insert();