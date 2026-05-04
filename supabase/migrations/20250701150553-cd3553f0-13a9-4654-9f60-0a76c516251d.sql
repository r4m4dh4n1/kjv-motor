
-- First, let's check what the current constraint allows and drop it
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_divisi_check;

-- Create a new constraint that allows 'sport' and 'start' values
ALTER TABLE companies ADD CONSTRAINT companies_divisi_check 
  CHECK (divisi IN ('sport', 'start'));

-- Also update the jenis_motor table constraint if it exists
ALTER TABLE jenis_motor DROP CONSTRAINT IF EXISTS jenis_motor_divisi_check;
ALTER TABLE jenis_motor ADD CONSTRAINT jenis_motor_divisi_check 
  CHECK (divisi IN ('sport', 'start'));
