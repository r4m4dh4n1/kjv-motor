-- Ensure RLS is enabled on pembelian table
ALTER TABLE "public"."pembelian" ENABLE ROW LEVEL SECURITY;

-- Drop simple update policies to replace with a comprehensive one
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."pembelian";
DROP POLICY IF EXISTS "Authenticated users can update pembelian" ON "public"."pembelian";
DROP POLICY IF EXISTS "Users can update their own pembelian" ON "public"."pembelian";

-- Create a permissive update policy for authenticated users
CREATE POLICY "Enable update for authenticated users"
ON "public"."pembelian"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Explicitly grant update permission to authenticated users (in case it was revoked)
GRANT UPDATE ON TABLE "public"."pembelian" TO authenticated;
