-- Fix pembelian status update issue
-- It seems that RLS policies might differ or be missing for UPDATE on pembelian table
-- This migration ensures that authenticated users can update the status of pembelian

-- Enable RLS just in case (is idempotent)
ALTER TABLE "public"."pembelian" ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists to avoid conflicts (and replace it with a broader one)
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."pembelian";
DROP POLICY IF EXISTS "Authenticated users can update pembelian" ON "public"."pembelian";
DROP POLICY IF EXISTS "Users can update their own pembelian" ON "public"."pembelian";

-- Create a permissive update policy for authenticated users
-- This allows any authenticated user (staff/admin) to update the status of a motor (pembelian)
-- which is necessary when selling a motor that might have been input by someone else
CREATE POLICY "Enable update for authenticated users" 
ON "public"."pembelian"
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);
