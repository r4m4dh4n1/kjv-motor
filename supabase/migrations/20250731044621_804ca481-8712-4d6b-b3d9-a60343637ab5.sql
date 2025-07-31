-- Add foreign key relationship between user_roles and profiles tables
-- First, let's check if user_id column exists in user_roles table and add foreign key constraint

-- Add foreign key constraint from user_roles to profiles
ALTER TABLE public.user_roles 
ADD CONSTRAINT fk_user_roles_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also add foreign key constraint from user_roles to roles if not exists
ALTER TABLE public.user_roles 
ADD CONSTRAINT fk_user_roles_role_id 
FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE CASCADE;