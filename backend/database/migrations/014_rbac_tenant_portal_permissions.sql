-- PHASE 2: Tenant portal permission refinements (additive)

WITH role AS (
  SELECT id FROM roles WHERE name = 'TENANT'
),
perms AS (
  SELECT id FROM permissions
  WHERE (resource, action) IN (
    ('payment','update'),
    ('payment','delete'),
    ('maintenance','update'),
    ('document','create')
  )
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role.id, perms.id
FROM role, perms
ON CONFLICT DO NOTHING;

-- ROLLBACK SCRIPT
DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.name = 'TENANT'
  AND (p.resource, p.action) IN (
    ('payment','update'),
    ('payment','delete'),
    ('maintenance','update'),
    ('document','create')
  );

