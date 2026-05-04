-- Migration: Create Retroactive System
-- Description: Creates tables and functions needed for retroactive operational transactions

-- 1. Create retroactive_operational table
CREATE TABLE IF NOT EXISTS public.retroactive_operational (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    original_year INTEGER NOT NULL,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100) NOT NULL,
    nominal DECIMAL(15,2) NOT NULL CHECK (nominal > 0),
    description TEXT NOT NULL,
    company_id INTEGER NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    divisi VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rejected_reason TEXT,
    notes TEXT,
    auto_approved BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create monthly_adjustments table
CREATE TABLE IF NOT EXISTS public.monthly_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    year INTEGER NOT NULL,
    divisi VARCHAR(50) NOT NULL,
    total_adjustments DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_impact_profit DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_impact_modal DECIMAL(15,2) NOT NULL DEFAULT 0,
    adjustment_count INTEGER NOT NULL DEFAULT 0,
    last_adjustment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, divisi)
);

-- 3. Add retroactive columns to operational table
ALTER TABLE public.operational 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retroactive_id UUID REFERENCES public.retroactive_operational(id) ON DELETE SET NULL;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_status ON public.retroactive_operational(status);
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_divisi ON public.retroactive_operational(divisi);
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_original_month ON public.retroactive_operational(original_month);
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_created_at ON public.retroactive_operational(created_at);

CREATE INDEX IF NOT EXISTS idx_monthly_adjustments_month_divisi ON public.monthly_adjustments(month, divisi);

CREATE INDEX IF NOT EXISTS idx_operational_is_retroactive ON public.operational(is_retroactive);
CREATE INDEX IF NOT EXISTS idx_operational_retroactive_id ON public.operational(retroactive_id);

-- 5. Enable RLS
ALTER TABLE public.retroactive_operational ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_adjustments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for retroactive_operational
CREATE POLICY "authenticated_users_can_access_retroactive_operational"
ON public.retroactive_operational
FOR ALL
USING (true);

-- 7. Create RLS policies for monthly_adjustments  
CREATE POLICY "authenticated_users_can_access_monthly_adjustments"
ON public.monthly_adjustments
FOR ALL
USING (true);

-- 8. Create function to check if month is closed (compatible with existing monthly_closures)
CREATE OR REPLACE FUNCTION public.is_month_closed_retroactive(
    p_month INTEGER,
    p_year INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.monthly_closures 
        WHERE closure_month = p_month 
        AND closure_year = p_year
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to get closed months list
CREATE OR REPLACE FUNCTION public.get_closed_months()
RETURNS TABLE (
    month_year VARCHAR(7)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        LPAD(closure_year::text, 4, '0') || '-' || LPAD(closure_month::text, 2, '0') as month_year
    FROM public.monthly_closures 
    ORDER BY closure_year DESC, closure_month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create triggers
CREATE TRIGGER update_retroactive_operational_updated_at 
    BEFORE UPDATE ON public.retroactive_operational 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_adjustments_updated_at 
    BEFORE UPDATE ON public.monthly_adjustments 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Grant necessary permissions
GRANT ALL ON public.retroactive_operational TO authenticated;
GRANT ALL ON public.monthly_adjustments TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_month_closed_retroactive(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_closed_months() TO authenticated;