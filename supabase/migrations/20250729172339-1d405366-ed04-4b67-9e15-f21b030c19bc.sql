-- Clean up duplicate admin roles, keep only 'Administrator'
DELETE FROM user_roles WHERE role_id IN (5, 9); -- Remove references to admin and administrator
DELETE FROM role_permissions WHERE role_id IN (5, 9); -- Remove permissions for admin and administrator
DELETE FROM roles WHERE role_id IN (5, 9); -- Remove admin and administrator roles

-- Insert missing profiles for existing users
INSERT INTO public.profiles (id, username, full_name, is_approved)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data ->> 'full_name', email),
  CASE 
    WHEN email = 'admin@gmail.com' THEN true 
    ELSE false 
  END
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.profiles);