-- Seed roles
INSERT INTO public.roles (role_name)
SELECT * FROM (VALUES
  ('qc_finance'),
  ('readonly_all')
) AS v(role_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles r WHERE r.role_name = v.role_name
);

-- Seed permissions
WITH perms(permission_name) AS (
  VALUES
    ('view_dashboard'),
    ('access_pembelian'),
    ('pembelian_report_qc'),
    ('pembelian_download_qc_report'),
    ('access_finance_all'),
    ('view_all'),
    ('search_all'),
    ('delete_all')
)
INSERT INTO public.permissions (permission_name)
SELECT p.permission_name FROM perms p
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions x WHERE x.permission_name = p.permission_name
);

WITH r AS (
  SELECT role_id FROM public.roles WHERE role_name = 'qc_finance'
), p AS (
  SELECT permission_id, permission_name FROM public.permissions
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM r
JOIN p ON p.permission_name IN (
  'view_dashboard',
  'access_pembelian',
  'pembelian_report_qc',
  'pembelian_download_qc_report',
  'access_finance_all'
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
);

WITH r AS (
  SELECT role_id FROM public.roles WHERE role_name = 'readonly_all'
), p AS (
  SELECT permission_id, permission_name FROM public.permissions
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM r
JOIN p ON p.permission_name IN (
  'view_dashboard',
  'view_all',
  'search_all',
  'delete_all'
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_permissions rp WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id
);
