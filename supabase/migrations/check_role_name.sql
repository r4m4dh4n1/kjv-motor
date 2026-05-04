-- Check exact role name for role_id = 11
SELECT 
    role_id,
    role_name,
    description,
    LENGTH(role_name) as name_length
FROM public.roles 
WHERE role_id = 11;

-- Also check all roles
SELECT * FROM public.roles ORDER BY role_id;
