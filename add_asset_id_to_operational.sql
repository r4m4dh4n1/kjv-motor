-- Add asset_id column to operational table for special categories (Kasbon, STARGAZER, ASET LAINNYA, Sewa Ruko)
-- These categories will use asset_id instead of company_id

-- 1. Add asset_id to operational table (main active data)
ALTER TABLE public.operational 
ADD COLUMN IF NOT EXISTS asset_id INTEGER REFERENCES public.assets(id);

-- 2. Add asset_id to operational_history table (closed month data)
ALTER TABLE public.operational_history
ADD COLUMN IF NOT EXISTS asset_id INTEGER;

-- 3. Add asset_id to retroactive_operational table (retroactive adjustment data)
ALTER TABLE public.retroactive_operational
ADD COLUMN IF NOT EXISTS asset_id INTEGER REFERENCES public.assets(id);

-- Add comments to explain the field
COMMENT ON COLUMN public.operational.asset_id IS 'Used for special categories: Kasbon, STARGAZER, ASET LAINNYA, Sewa Ruko. Replaces company_id for these categories.';
COMMENT ON COLUMN public.operational_history.asset_id IS 'Used for special categories: Kasbon, STARGAZER, ASET LAINNYA, Sewa Ruko. Replaces company_id for these categories.';
COMMENT ON COLUMN public.retroactive_operational.asset_id IS 'Used for special categories: Kasbon, STARGAZER, ASET LAINNYA, Sewa Ruko. Replaces company_id for these categories.';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_operational_asset_id ON public.operational(asset_id);
CREATE INDEX IF NOT EXISTS idx_operational_history_asset_id ON public.operational_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_asset_id ON public.retroactive_operational(asset_id);

-- Update operational_combined view to include asset_id
DROP VIEW IF EXISTS public.operational_combined;

CREATE VIEW public.operational_combined AS
SELECT 
  id, 
  tanggal, 
  divisi, 
  kategori, 
  deskripsi, 
  nominal, 
  cabang_id, 
  company_id,
  asset_id, -- NEW: Include asset_id
  created_at, 
  updated_at,
  'active' as data_source,
  NULL::integer as closed_month,
  NULL::integer as closed_year,
  NULL::timestamp with time zone as closed_at,
  is_retroactive,
  original_month
FROM public.operational

UNION ALL

SELECT 
  id, 
  tanggal, 
  divisi, 
  kategori, 
  deskripsi, 
  nominal, 
  cabang_id, 
  company_id,
  asset_id, -- NEW: Include asset_id
  created_at, 
  updated_at,
  'history' as data_source,
  closed_month,
  closed_year,
  closed_at,
  NULL::boolean as is_retroactive,
  NULL::date as original_month
FROM public.operational_history;

-- Grant permissions
GRANT SELECT ON public.operational_combined TO authenticated;
GRANT SELECT ON public.operational_combined TO anon;

-- Add comment to document the change
COMMENT ON VIEW public.operational_combined IS 'Combined view of operational and operational_history tables with asset_id support for special categories (Kasbon, STARGAZER, ASET LAINNYA, Sewa Ruko)';
