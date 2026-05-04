-- Insert default permissions for the system
INSERT INTO public.permissions (permission_name, description) VALUES
('dashboard.view', 'Akses dashboard dan statistik'),
('master.brands.view', 'Lihat data brand'),
('master.brands.create', 'Tambah brand baru'),
('master.brands.edit', 'Edit data brand'),
('master.brands.delete', 'Hapus data brand'),
('master.jenis_motor.view', 'Lihat data jenis motor'),
('master.jenis_motor.create', 'Tambah jenis motor baru'),
('master.jenis_motor.edit', 'Edit data jenis motor'),
('master.jenis_motor.delete', 'Hapus data jenis motor'),
('master.companies.view', 'Lihat data perusahaan'),
('master.companies.create', 'Tambah perusahaan baru'),
('master.companies.edit', 'Edit data perusahaan'),
('master.companies.delete', 'Hapus data perusahaan'),
('master.cabang.view', 'Lihat data cabang'),
('master.cabang.create', 'Tambah cabang baru'),
('master.cabang.edit', 'Edit data cabang'),
('master.cabang.delete', 'Hapus data cabang'),
('master.employees.view', 'Lihat data karyawan'),
('master.employees.create', 'Tambah karyawan baru'),
('master.employees.edit', 'Edit data karyawan'),
('master.employees.delete', 'Hapus data karyawan'),
('master.users.view', 'Lihat data user'),
('master.users.create', 'Tambah user baru'),
('master.users.edit', 'Edit data user'),
('master.users.delete', 'Hapus data user'),
('master.assets.view', 'Lihat data asset'),
('master.assets.create', 'Tambah asset baru'),
('master.assets.edit', 'Edit data asset'),
('master.assets.delete', 'Hapus data asset'),
('master.modal_history.view', 'Lihat riwayat modal'),
('transaction.pembelian.view', 'Lihat data pembelian'),
('transaction.pembelian.create', 'Tambah pembelian baru'),
('transaction.pembelian.edit', 'Edit data pembelian'),
('transaction.pembelian.delete', 'Hapus data pembelian'),
('transaction.penjualan.view', 'Lihat data penjualan'),
('transaction.penjualan.create', 'Tambah penjualan baru'),
('transaction.penjualan.edit', 'Edit data penjualan'),
('transaction.penjualan.delete', 'Hapus data penjualan'),
('transaction.biro_jasa.view', 'Lihat data biro jasa'),
('transaction.biro_jasa.create', 'Tambah biro jasa baru'),
('transaction.biro_jasa.edit', 'Edit data biro jasa'),
('transaction.biro_jasa.delete', 'Hapus data biro jasa'),
('transaction.fee_penjualan.view', 'Lihat data fee penjualan'),
('transaction.fee_penjualan.create', 'Tambah fee penjualan baru'),
('transaction.fee_penjualan.edit', 'Edit data fee penjualan'),
('transaction.fee_penjualan.delete', 'Hapus data fee penjualan'),
('transaction.operational.view', 'Lihat data operasional'),
('transaction.operational.create', 'Tambah operasional baru'),
('transaction.operational.edit', 'Edit data operasional'),
('transaction.operational.delete', 'Hapus data operasional'),
('transaction.cicilan.view', 'Lihat data cicilan'),
('transaction.cicilan.create', 'Tambah cicilan baru'),
('transaction.cicilan.edit', 'Edit data cicilan'),
('transaction.cicilan.delete', 'Hapus data cicilan'),
('finance.pembukuan.view', 'Lihat data pembukuan'),
('reports.view', 'Akses laporan'),
('rbac.roles.view', 'Lihat data roles'),
('rbac.roles.create', 'Tambah role baru'),
('rbac.roles.edit', 'Edit data role'),
('rbac.roles.delete', 'Hapus data role'),
('rbac.permissions.view', 'Lihat data permissions'),
('rbac.permissions.create', 'Tambah permission baru'),
('rbac.permissions.edit', 'Edit data permission'),
('rbac.permissions.delete', 'Hapus data permission'),
('rbac.role_permissions.view', 'Lihat role permissions'),
('rbac.role_permissions.manage', 'Kelola role permissions'),
('rbac.user_roles.view', 'Lihat user roles'),
('rbac.user_roles.manage', 'Kelola user roles')
ON CONFLICT (permission_name) DO NOTHING;

-- Insert default roles
INSERT INTO public.roles (role_name, description) VALUES
('administrator', 'Administrator sistem dengan akses penuh'),
('manager', 'Manager dengan akses terbatas'),
('staff', 'Staff dengan akses dasar'),
('viewer', 'Hanya dapat melihat data')
ON CONFLICT (role_name) DO NOTHING;

-- Get role IDs for role permissions setup
DO $$
DECLARE
    admin_role_id INTEGER;
    manager_role_id INTEGER;
    staff_role_id INTEGER;
    viewer_role_id INTEGER;
    perm_record RECORD;
BEGIN
    -- Get role IDs
    SELECT role_id INTO admin_role_id FROM public.roles WHERE role_name = 'administrator';
    SELECT role_id INTO manager_role_id FROM public.roles WHERE role_name = 'manager';
    SELECT role_id INTO staff_role_id FROM public.roles WHERE role_name = 'staff';
    SELECT role_id INTO viewer_role_id FROM public.roles WHERE role_name = 'viewer';

    -- Administrator gets ALL permissions
    FOR perm_record IN SELECT permission_id FROM public.permissions LOOP
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (admin_role_id, perm_record.permission_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Manager gets most permissions except RBAC management
    FOR perm_record IN 
        SELECT permission_id FROM public.permissions 
        WHERE permission_name NOT LIKE 'rbac.%' 
        OR permission_name IN ('rbac.roles.view', 'rbac.permissions.view', 'rbac.role_permissions.view', 'rbac.user_roles.view')
    LOOP
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (manager_role_id, perm_record.permission_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Staff gets transaction and view permissions
    FOR perm_record IN 
        SELECT permission_id FROM public.permissions 
        WHERE permission_name LIKE '%.view' 
        OR permission_name LIKE 'transaction.%'
        OR permission_name = 'dashboard.view'
    LOOP
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (staff_role_id, perm_record.permission_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Viewer gets only view permissions
    FOR perm_record IN 
        SELECT permission_id FROM public.permissions 
        WHERE permission_name LIKE '%.view' 
        OR permission_name = 'dashboard.view'
        OR permission_name = 'reports.view'
    LOOP
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES (viewer_role_id, perm_record.permission_id)
        ON CONFLICT DO NOTHING;
    END LOOP;

END $$;

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id_param INTEGER, permission_name_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id_param INTEGER)
RETURNS TABLE(permission_name TEXT, description TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_user_role(user_id_param INTEGER, role_name_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;