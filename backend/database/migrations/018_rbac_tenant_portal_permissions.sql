-- Additive RBAC updates for tenant portal mutation routes

INSERT INTO permissions (resource, action)
VALUES
  ('dashboard', 'create'),
  ('dashboard', 'update')
ON CONFLICT (resource, action) DO NOTHING;

-- TENANT: allow updating own portal state (preferences, read flags) and managing payment methods/autopay
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource, p.action) IN (
    ('tenant','update'),
    ('payment','update'),
    ('payment','delete'),
    ('dashboard','create'),
    ('dashboard','update')
  )
WHERE r.name = 'TENANT'
ON CONFLICT DO NOTHING;

-- ADMIN-like roles: include new dashboard permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource, p.action) IN (
    ('dashboard','create'),
    ('dashboard','update')
  )
WHERE r.name IN ('ADMIN','PROPERTY_MANAGER')
ON CONFLICT DO NOTHING;

-- ROLLBACK SCRIPT
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE (resource, action) IN (('dashboard','create'),('dashboard','update'))
);

DELETE FROM permissions
WHERE (resource, action) IN (('dashboard','create'),('dashboard','update'));

