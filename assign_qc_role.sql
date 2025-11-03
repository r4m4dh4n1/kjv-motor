-- Step 1: Check if user lia@gmail.com exists
SELECT id, email FROM auth.users WHERE email = 'lia@gmail.com';

-- Step 2: Check if profile exists for lia@gmail.com
SELECT p.*, u.email 
FROM public.profiles p
RIGHT JOIN auth.users u ON p.id = u.id
WHERE u.email = 'lia@gmail.com';

-- Step 3: If profile doesn't exist, create it
INSERT INTO public.profiles (id, email, full_name, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', 'Lia'),
    NOW()
FROM auth.users u
WHERE u.email = 'lia@gmail.com'
AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Step 4: Check if QC role exists
SELECT role_id, role_name FROM public.roles WHERE role_name = 'qc';

-- Step 5: If QC role doesn't exist, create it
INSERT INTO public.roles (role_name, description, created_at, updated_at)
SELECT 'qc', 'Quality Control - Limited access to Dashboard and Pembelian only', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE role_name = 'qc');

-- Step 6: Assign QC role to lia@gmail.com
-- First, remove any existing role assignment
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'lia@gmail.com');

-- Then insert the QC role
INSERT INTO public.user_roles (user_id, role_id, created_at, updated_at)
SELECT 
    u.id,
    r.role_id,
    NOW(),
    NOW()
FROM auth.users u
CROSS JOIN public.roles r
WHERE u.email = 'lia@gmail.com'
AND r.role_name = 'qc';

-- Step 7: Verify the assignment
SELECT 
    u.email,
    p.id as profile_id,
    p.full_name,
    ur.role_id,
    r.role_name,
    r.description
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id
WHERE u.email = 'lia@gmail.com';
