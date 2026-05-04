-- Check and drop any remaining views with security definer
-- First check what views exist with SECURITY DEFINER
SELECT viewname FROM pg_views WHERE schemaname = 'public';