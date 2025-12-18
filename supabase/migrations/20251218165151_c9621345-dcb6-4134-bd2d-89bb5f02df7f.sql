-- Create qc_report_history table to store QC iterations
CREATE TABLE IF NOT EXISTS public.qc_report_history (
    id BIGSERIAL PRIMARY KEY,
    qc_report_id BIGINT NOT NULL,
    pembelian_id BIGINT NOT NULL,
    estimasi_nominal_qc NUMERIC NOT NULL DEFAULT 0,
    real_nominal_qc NUMERIC NOT NULL DEFAULT 0,
    keterangan TEXT,
    estimasi_tanggal_selesai DATE,
    tanggal_selesai_qc DATE,
    iteration_number INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_qc_report_history_pembelian_id ON public.qc_report_history(pembelian_id);
CREATE INDEX IF NOT EXISTS idx_qc_report_history_qc_report_id ON public.qc_report_history(qc_report_id);

-- Enable RLS
ALTER TABLE public.qc_report_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "authenticated_users_can_select_qc_report_history"
ON public.qc_report_history FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_insert_qc_report_history"
ON public.qc_report_history FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_update_qc_report_history"
ON public.qc_report_history FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_can_delete_qc_report_history"
ON public.qc_report_history FOR DELETE
USING (auth.role() = 'authenticated');

-- Add iteration_number column to qc_report if not exists
ALTER TABLE public.qc_report ADD COLUMN IF NOT EXISTS iteration_number INT DEFAULT 1;