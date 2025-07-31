-- Create a simple test restore function to identify the problematic table
CREATE OR REPLACE FUNCTION public.test_restore_assets_only(target_month integer, target_year integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assets_count integer := 0;
  result json;
BEGIN
  RAISE NOTICE 'Testing assets restoration only...';
  
  -- Try to restore only assets first
  INSERT INTO assets (
    jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
    keuntungan, status, created_at, updated_at
  )
  SELECT 
    jenis_asset, tanggal_perolehan, harga_asset, tanggal_jual, harga_jual,
    keuntungan, status, created_at, updated_at
  FROM assets_history 
  WHERE closed_month = target_month AND closed_year = target_year
  LIMIT 1; -- Just test with 1 record
  
  GET DIAGNOSTICS assets_count = ROW_COUNT;
  RAISE NOTICE 'Assets restored: %', assets_count;

  result := json_build_object(
    'success', true,
    'assets_count', assets_count
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in assets: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$function$;