-- Migration: Add retroactive fields and recreate operational_combined view
-- Created: 2025-11-01
-- Description: Adds is_retroactive and original_month fields to operational tables
--              and recreates operational_combined view to include these fields

-- Add fields to operational table
ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE;

ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS original_month DATE;

-- Add fields to operational_history table
ALTER TABLE operational_history 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE;

ALTER TABLE operational_history 
ADD COLUMN IF NOT EXISTS original_month DATE;

-- Add comments
COMMENT ON COLUMN operational.is_retroactive IS 'Flag untuk transaksi retroaktif (dibuat setelah bulan ditutup)';
COMMENT ON COLUMN operational.original_month IS 'Bulan asli transaksi untuk transaksi retroaktif (format: YYYY-MM-DD)';
COMMENT ON COLUMN operational_history.is_retroactive IS 'Flag untuk transaksi retroaktif (dibuat setelah bulan ditutup)';
COMMENT ON COLUMN operational_history.original_month IS 'Bulan asli transaksi untuk transaksi retroaktif (format: YYYY-MM-DD)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_operational_is_retroactive 
ON operational(is_retroactive) WHERE is_retroactive = TRUE;

CREATE INDEX IF NOT EXISTS idx_operational_original_month 
ON operational(original_month) WHERE original_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operational_history_is_retroactive 
ON operational_history(is_retroactive) WHERE is_retroactive = TRUE;

CREATE INDEX IF NOT EXISTS idx_operational_history_original_month 
ON operational_history(original_month) WHERE original_month IS NOT NULL;

-- Recreate operational_combined view
DROP VIEW IF EXISTS operational_combined;

CREATE OR REPLACE VIEW operational_combined AS
SELECT 
    id,
    tanggal,
    kategori,
    nominal,
    deskripsi,
    divisi,
    cabang_id,
    company_id,
    asset_id,
    is_retroactive,
    original_month,
    created_at,
    updated_at,
    'active' as data_source
FROM operational

UNION ALL

SELECT 
    id,
    tanggal,
    kategori,
    nominal,
    deskripsi,
    divisi,
    cabang_id,
    company_id,
    asset_id,
    is_retroactive,
    original_month,
    created_at,
    updated_at,
    'history' as data_source
FROM operational_history;
