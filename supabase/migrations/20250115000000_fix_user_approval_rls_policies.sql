-- Fix user approval RLS policies
-- The issue is that there are conflicting policies that prevent user approval from working

-- First, drop the conflicting old policy that only allows users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Drop the admin policy that has incorrect role name
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create a new comprehensive policy that allows:
-- 1. Users to update their own profile
-- 2. Administrators to update any profile (for user approval)
CREATE POLICY "Users can update own profile or admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Users can update their own profile
  auth.uid() = id 
  OR 
  -- Administrators can update any profile
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.role_name IN ('administrator', 'admin', 'Administrator')
  )
);

-- Also fix the SELECT policy to be more permissive for user management
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a policy that allows users to view all profiles (needed for user management)
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Ensure we have the correct admin role
INSERT INTO public.roles (role_name, description) 
VALUES ('administrator', 'Administrator role with full access')
ON CONFLICT (role_name) DO NOTHING;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.role_name IN ('administrator', 'admin', 'Administrator')
  );
$$;
