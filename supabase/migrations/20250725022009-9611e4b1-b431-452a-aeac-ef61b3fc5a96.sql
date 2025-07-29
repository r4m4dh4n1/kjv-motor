-- Fix the qc_history table RLS policies
ALTER TABLE public.qc_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for qc_history table
CREATE POLICY "Users can view all qc_history records" 
ON public.qc_history 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert qc_history records" 
ON public.qc_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update qc_history records" 
ON public.qc_history 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete qc_history records" 
ON public.qc_history 
FOR DELETE 
USING (true);

-- Update database functions to include proper search_path settings for security
CREATE OR REPLACE FUNCTION public.increment_qty(jenis_motor_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE jenis_motor 
  SET qty = qty + 1 
  WHERE id = jenis_motor_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_qty(jenis_motor_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE jenis_motor 
  SET qty = qty - 1 
  WHERE id = jenis_motor_id AND qty > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_company_modal(company_id bigint, amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE companies 
  SET modal = modal + amount
  WHERE id = company_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_permission(user_id_param integer, permission_name_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    has_perm BOOLEAN := FALSE;
BEGIN
    -- Check if user has administrator role (gets all permissions)
    SELECT EXISTS(
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = user_id_param 
        AND r.role_name = 'administrator'
    ) INTO has_perm;
    
    IF has_perm THEN
        RETURN TRUE;
    END IF;
    
    -- Check specific permission
    SELECT EXISTS(
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.permission_id
        WHERE ur.user_id = user_id_param 
        AND p.permission_name = permission_name_param
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id_param integer)
 RETURNS TABLE(permission_name text, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
    -- If user is administrator, return all permissions
    IF EXISTS(
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = user_id_param 
        AND r.role_name = 'administrator'
    ) THEN
        RETURN QUERY
        SELECT p.permission_name, p.description
        FROM public.permissions p
        ORDER BY p.permission_name;
    ELSE
        -- Return specific permissions for user
        RETURN QUERY
        SELECT p.permission_name, p.description
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.permission_id
        WHERE ur.user_id = user_id_param
        ORDER BY p.permission_name;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_user_role(user_id_param integer, role_name_param text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    target_role_id INTEGER;
BEGIN
    -- Get role ID
    SELECT role_id INTO target_role_id 
    FROM public.roles 
    WHERE role_name = role_name_param;
    
    IF target_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % not found', role_name_param;
    END IF;
    
    -- Insert user role
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (user_id_param, target_role_id)
    ON CONFLICT DO NOTHING;
    
    RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;