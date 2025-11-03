-- Step 1: Check if profile exists for admin@gmail.com
SELECT p.*, u.email 
FROM public.profiles p
RIGHT JOIN auth.users u ON p.id = u.id
WHERE u.email = 'admin@gmail.com';

-- Step 2: If profile doesn't exist, create it
INSERT INTO public.profiles (id, email, full_name, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', 'Administrator'),
    NOW()
FROM auth.users u
WHERE u.email = 'admin@gmail.com'
AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Step 3: Check RLS policies on profiles table
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Step 4: If no policies or wrong policies, create proper ones
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

-- Create policies that allow authenticated users to see profiles
CREATE POLICY "Enable read access for authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable update for users based on id"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Step 5: Check RLS on user_roles
SELECT * FROM pg_policies WHERE tablename = 'user_roles';

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_roles;

-- Allow authenticated users to see user_roles (needed for joins)
CREATE POLICY "Enable read access for authenticated users"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

-- Also need policy for roles table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.roles;

CREATE POLICY "Enable read access for authenticated users"
ON public.roles FOR SELECT
TO authenticated
USING (true);

-- Step 6: Verify the setup
SELECT 
    u.email,
    p.id as profile_id,
    p.full_name,
    ur.role_id,
    r.role_name
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id
WHERE u.email = 'admin@gmail.com';
