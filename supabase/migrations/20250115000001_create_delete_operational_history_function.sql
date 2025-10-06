-- Create function to safely delete operational_history records
-- This function only deletes from operational_history table and does NOT affect:
-- 1. pembukuan table (accounting records)
-- 2. companies.modal (company capital)
-- 3. Any other financial calculations

CREATE OR REPLACE FUNCTION public.delete_operational_history_records(
  p_record_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
    record_details jsonb[];
    record_detail jsonb;
    rec record;
BEGIN
    -- Validate input
    IF p_record_ids IS NULL OR array_length(p_record_ids, 1) = 0 THEN
        RAISE EXCEPTION 'No record IDs provided';
    END IF;

    -- Get details of records to be deleted for audit purposes
    FOR rec IN 
        SELECT id, tanggal, divisi, kategori, deskripsi, nominal, closed_month, closed_year
        FROM operational_history 
        WHERE id = ANY(p_record_ids)
    LOOP
        record_detail := jsonb_build_object(
            'id', rec.id,
            'tanggal', rec.tanggal,
            'divisi', rec.divisi,
            'kategori', rec.kategori,
            'deskripsi', rec.deskripsi,
            'nominal', rec.nominal,
            'closed_month', rec.closed_month,
            'closed_year', rec.closed_year
        );
        record_details := array_append(record_details, record_detail);
    END LOOP;

    -- Delete the records from operational_history ONLY
    DELETE FROM operational_history 
    WHERE id = ANY(p_record_ids);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the deletion for audit trail
    INSERT INTO audit_log (
        table_name,
        operation,
        record_id,
        old_values,
        user_id,
        timestamp
    )
    SELECT 
        'operational_history',
        'DELETE',
        (detail->>'id')::uuid,
        detail,
        auth.uid(),
        NOW()
    FROM unnest(record_details) AS detail;

    -- Return summary
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Records deleted successfully from operational_history',
        'deleted_count', deleted_count,
        'deleted_records', record_details,
        'note', 'This operation only affects operational_history table and does not impact pembukuan or company modal'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Failed to delete operational_history records'
        );
END;
$$;

-- Create function to get potential duplicate operational_history records
CREATE OR REPLACE FUNCTION public.get_potential_duplicate_operational_history(
  p_divisi text DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_year integer DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    tanggal date,
    divisi text,
    kategori text,
    deskripsi text,
    nominal numeric,
    closed_month integer,
    closed_year integer,
    created_at timestamp with time zone,
    duplicate_group_id text,
    duplicate_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH duplicate_groups AS (
        SELECT 
            oh.*,
            CONCAT(
                oh.tanggal::text, '|',
                oh.divisi, '|',
                oh.kategori, '|',
                oh.deskripsi, '|',
                oh.nominal::text
            ) as duplicate_group_id,
            COUNT(*) OVER (
                PARTITION BY oh.tanggal, oh.divisi, oh.kategori, oh.deskripsi, oh.nominal
            ) as duplicate_count
        FROM operational_history oh
        WHERE 
            (p_divisi IS NULL OR oh.divisi = p_divisi)
            AND (p_month IS NULL OR oh.closed_month = p_month)
            AND (p_year IS NULL OR oh.closed_year = p_year)
    )
    SELECT 
        dg.id,
        dg.tanggal,
        dg.divisi,
        dg.kategori,
        dg.deskripsi,
        dg.nominal,
        dg.closed_month,
        dg.closed_year,
        dg.created_at,
        dg.duplicate_group_id,
        dg.duplicate_count
    FROM duplicate_groups dg
    WHERE dg.duplicate_count > 1
    ORDER BY dg.duplicate_group_id, dg.created_at;
END;
$$;

-- Create audit_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name text NOT NULL,
    operation text NOT NULL,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    user_id uuid REFERENCES auth.users(id),
    timestamp timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for audit_log
CREATE POLICY "authenticated_users_can_select_audit_log" 
ON public.audit_log 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "authenticated_users_can_insert_audit_log" 
ON public.audit_log 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_operational_history_records(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_potential_duplicate_operational_history(text, integer, integer) TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.delete_operational_history_records(uuid[]) IS 
'Safely deletes operational_history records without affecting pembukuan or company modal. Only removes data from operational_history table.';

COMMENT ON FUNCTION public.get_potential_duplicate_operational_history(text, integer, integer) IS 
'Identifies potential duplicate records in operational_history based on tanggal, divisi, kategori, deskripsi, and nominal.';