-- Fix the foreign key constraint to allow NULL values for company_id_2
ALTER TABLE penjualans DROP CONSTRAINT IF EXISTS "FK_penjualans_company_2";

-- Recreate the constraint to allow NULL values
ALTER TABLE penjualans 
ADD CONSTRAINT "FK_penjualans_company_2" 
FOREIGN KEY (company_id_2) 
REFERENCES companies(id) 
ON DELETE SET NULL;