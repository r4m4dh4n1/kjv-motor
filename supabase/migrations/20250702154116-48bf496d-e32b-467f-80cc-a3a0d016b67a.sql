-- Create function to decrement qty in jenis_motor table
CREATE OR REPLACE FUNCTION decrement_qty(jenis_motor_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE jenis_motor 
  SET qty = qty - 1 
  WHERE id = jenis_motor_id AND qty > 0;
END;
$$ LANGUAGE plpgsql;