-- Check user role assignment for admin@gmail.com
SELECT 
    u.email,
    u.id as user_id,
    ur.role_id,
    r.role_name,
    r.description
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id
WHERE u.email = 'admin@gmail.com';

-- Also check if profile exists
SELECT 
    p.id,
    p.email,
    p.full_name
FROM public.profiles p
WHERE p.email = 'admin@gmail.com';

-- Check what roles are available
SELECT * FROM public.roles;

-- Check all user_roles assignments
SELECT 
    ur.*,
    r.role_name
FROM public.user_roles ur
LEFT JOIN public.roles r ON ur.role_id = r.role_id;
