-- Fix search_path issues in functions
CREATE OR REPLACE FUNCTION public.is_user_approved(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE((SELECT is_approved FROM public.profiles WHERE id = user_id), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT r.role_name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.role_id
  WHERE ur.user_id = user_id
  LIMIT 1;
$$;