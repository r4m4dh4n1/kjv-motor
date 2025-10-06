-- Fix existing data with incorrect original_month format
-- Convert any YYYY-MM format to YYYY-MM-01 format in the operational table

UPDATE operational 
SET original_month = original_month || '-01'
WHERE original_month IS NOT NULL 
  AND LENGTH(original_month) = 7 
  AND original_month ~ '^\d{4}-\d{2}$';

-- Add a comment to document this fix
COMMENT ON COLUMN operational.original_month IS 'Stores the first day of the month for retroactive adjustments (YYYY-MM-DD format)';