-- Check all foreign key constraints on user_roles table
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='user_roles'
    AND tc.table_schema='public'
ORDER BY tc.constraint_name;

-- Also check what relationships PostgREST sees
-- Run this query to see the exact foreign key constraint name
SELECT conname as constraint_name,
       conrelid::regclass as table_name,
       a.attname as column_name,
       confrelid::regclass as foreign_table_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE contype = 'f'
  AND conrelid = 'user_roles'::regclass
  AND confrelid = 'roles'::regclass;
