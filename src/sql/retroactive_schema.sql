-- Tabel untuk menyimpan pengajuan retroactive operational
CREATE TABLE IF NOT EXISTS retroactive_operational (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    original_year INTEGER NOT NULL,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(100) NOT NULL,
    nominal DECIMAL(15,2) NOT NULL CHECK (nominal > 0),
    description TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    divisi VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rejected_reason TEXT,
    notes TEXT,
    auto_approved BOOLEAN DEFAULT TRUE, -- Menandakan apakah otomatis disetujui
    requires_approval BOOLEAN DEFAULT FALSE, -- Konfigurasi apakah perlu approval
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk tracking adjustment per bulan
CREATE TABLE IF NOT EXISTS monthly_adjustments (
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

-- Tabel untuk tracking bulan yang sudah di-close
CREATE TABLE IF NOT EXISTS monthly_closures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    divisi VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'closed' CHECK (status IN ('closed', 'restored')),
    closed_by UUID REFERENCES auth.users(id),
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restored_by UUID REFERENCES auth.users(id),
    restored_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(month, year, divisi)
);

-- Menambahkan kolom is_retroactive ke tabel operational
ALTER TABLE operational 
ADD COLUMN IF NOT EXISTS is_retroactive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retroactive_id UUID REFERENCES retroactive_operational(id);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_status ON retroactive_operational(status);
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_divisi ON retroactive_operational(divisi);
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_original_month ON retroactive_operational(original_month);
CREATE INDEX IF NOT EXISTS idx_retroactive_operational_created_at ON retroactive_operational(created_at);

CREATE INDEX IF NOT EXISTS idx_monthly_adjustments_month_divisi ON monthly_adjustments(month, divisi);
CREATE INDEX IF NOT EXISTS idx_monthly_closures_month_year_divisi ON monthly_closures(month, year, divisi);

CREATE INDEX IF NOT EXISTS idx_operational_is_retroactive ON operational(is_retroactive);
CREATE INDEX IF NOT EXISTS idx_operational_retroactive_id ON operational(retroactive_id);

-- RLS Policies
ALTER TABLE retroactive_operational ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_closures ENABLE ROW LEVEL SECURITY;

-- Policy untuk retroactive_operational
CREATE POLICY "Users can view retroactive_operational based on role" ON retroactive_operational
    FOR SELECT USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'manager', 'finance')
        )
    );

CREATE POLICY "Users can insert their own retroactive_operational" ON retroactive_operational
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only managers can update retroactive_operational status" ON retroactive_operational
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'manager')
        )
    );

-- Policy untuk monthly_adjustments
CREATE POLICY "Users can view monthly_adjustments based on role" ON monthly_adjustments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'manager', 'finance')
        )
    );

CREATE POLICY "System can manage monthly_adjustments" ON monthly_adjustments
    FOR ALL USING (true);

-- Policy untuk monthly_closures
CREATE POLICY "Users can view monthly_closures based on role" ON monthly_closures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'manager', 'finance')
        )
    );

CREATE POLICY "Only managers can manage monthly_closures" ON monthly_closures
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.name IN ('admin', 'manager')
        )
    );

-- Function untuk mendapatkan total profit adjustments
CREATE OR REPLACE FUNCTION get_profit_adjustments_total(
    p_divisi TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_deductions DECIMAL,
    total_restorations DECIMAL,
    net_adjustment DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN ro.status = 'approved' AND ro.category = 'Gaji Kurang Profit' THEN ro.nominal ELSE 0 END), 0) as total_deductions,
        COALESCE(SUM(CASE WHEN ro.status = 'approved' AND ro.category != 'Gaji Kurang Profit' THEN ro.nominal ELSE 0 END), 0) as total_restorations,
        COALESCE(SUM(CASE WHEN ro.status = 'approved' AND ro.category != 'Gaji Kurang Profit' THEN ro.nominal ELSE -ro.nominal END), 0) as net_adjustment
    FROM retroactive_operational ro
    WHERE 
        (p_divisi IS NULL OR ro.divisi = p_divisi)
        AND (p_start_date IS NULL OR ro.adjustment_date >= p_start_date)
        AND (p_end_date IS NULL OR ro.adjustment_date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk validasi bulan sudah close
CREATE OR REPLACE FUNCTION is_month_closed(
    p_month INTEGER,
    p_year INTEGER,
    p_divisi TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM monthly_closures 
        WHERE month = p_month 
        AND year = p_year 
        AND divisi = p_divisi 
        AND status = 'closed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk update modal perusahaan
CREATE OR REPLACE FUNCTION update_company_capital(
    p_company_id UUID,
    p_amount DECIMAL
)
RETURNS VOID AS $$
BEGIN
    UPDATE companies 
    SET modal = modal + p_amount,
        updated_at = NOW()
    WHERE id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Company with id % not found', p_company_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function untuk mengurangi profit perusahaan
CREATE OR REPLACE FUNCTION deduct_profit(
    p_company_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Update profit di tabel companies (asumsi ada kolom profit)
    UPDATE companies 
    SET profit = COALESCE(profit, 0) - p_amount,
        updated_at = NOW()
    WHERE id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Company with id % not found', p_company_id;
    END IF;
    
    -- Insert ke tabel profit_adjustments jika ada
    INSERT INTO profit_adjustments (
        company_id,
        amount,
        type,
        description,
        created_at
    ) VALUES (
        p_company_id,
        -p_amount,
        'deduction',
        COALESCE(p_description, 'Profit deduction'),
        NOW()
    ) ON CONFLICT DO NOTHING; -- Ignore jika tabel tidak ada
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_retroactive_operational_updated_at 
    BEFORE UPDATE ON retroactive_operational 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_adjustments_updated_at 
    BEFORE UPDATE ON monthly_adjustments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();