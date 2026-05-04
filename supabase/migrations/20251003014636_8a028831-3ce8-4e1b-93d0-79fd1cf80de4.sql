-- Add original_month field to operational table to track retroactive adjustments
ALTER TABLE public.operational 
ADD COLUMN IF NOT EXISTS original_month DATE;

COMMENT ON COLUMN public.operational.original_month IS 'Stores the original month for retroactive adjustments (stored as first day of month)';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_operational_original_month 
ON public.operational(original_month) 
WHERE original_month IS NOT NULL;