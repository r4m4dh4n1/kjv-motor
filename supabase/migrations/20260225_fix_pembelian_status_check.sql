-- Fix pembelian_status_check constraint to include 'ready' as a valid status
-- The constraint currently doesn't allow 'ready', which is the actual status used in the app

-- Drop the existing constraint
ALTER TABLE "public"."pembelian" DROP CONSTRAINT IF EXISTS "pembelian_status_check";

-- Re-create with all valid status values including 'ready'
ALTER TABLE "public"."pembelian" ADD CONSTRAINT "pembelian_status_check"
  CHECK (status IN ('ready', 'tersedia', 'booked', 'terjual', 'sold'));
