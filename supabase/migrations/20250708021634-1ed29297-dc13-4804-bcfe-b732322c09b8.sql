-- Create Employee Table
CREATE TABLE public.employees (
  employee_id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create User Table
CREATE TABLE public.users (
  user_id SERIAL PRIMARY KEY,
  employee_id INTEGER UNIQUE NOT NULL REFERENCES public.employees(employee_id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Role Table
CREATE TABLE public.roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Permission Table
CREATE TABLE public.permissions (
  permission_id SERIAL PRIMARY KEY,
  permission_name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RolePermission Table
CREATE TABLE public.role_permissions (
  role_id INTEGER NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES public.permissions(permission_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- Create UserRole Table
CREATE TABLE public.user_roles (
  user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Enable RLS on all tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees
CREATE POLICY "Enable read access for all users" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.employees FOR DELETE USING (true);

-- Create RLS policies for users
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.users FOR DELETE USING (true);

-- Create RLS policies for roles
CREATE POLICY "Enable read access for all users" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.roles FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.roles FOR DELETE USING (true);

-- Create RLS policies for permissions
CREATE POLICY "Enable read access for all users" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.permissions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.permissions FOR DELETE USING (true);

-- Create RLS policies for role_permissions
CREATE POLICY "Enable read access for all users" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.role_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.role_permissions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.role_permissions FOR DELETE USING (true);

-- Create RLS policies for user_roles
CREATE POLICY "Enable read access for all users" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.user_roles FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.user_roles FOR DELETE USING (true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON public.permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default roles
INSERT INTO public.roles (role_name, description) VALUES
('Administrator', 'Full system access and administration'),
('Manager HR', 'Human Resources management access'),
('Staff Keuangan', 'Finance and accounting access'),
('Karyawan Biasa', 'Basic employee access');

-- Insert some default permissions
INSERT INTO public.permissions (permission_name, description) VALUES
('create_user', 'Create new users'),
('edit_employee_data', 'Edit employee information'),
('view_finance_report', 'View financial reports'),
('manage_roles', 'Manage roles and permissions'),
('view_dashboard', 'Access to dashboard'),
('manage_transactions', 'Manage transactions'),
('manage_master_data', 'Manage master data'),
('view_reports', 'View reports');