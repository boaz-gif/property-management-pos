-- PHASE 2: RBAC FOUNDATION (additive)
-- Applies: roles, permissions, role_permissions, user_roles + backfill from users.role

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_role_id UUID REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_parent_role_id ON roles(parent_role_id);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    conditions JSONB,
    UNIQUE(resource, action)
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    property_id INTEGER REFERENCES properties(id),
    assigned_by INTEGER REFERENCES users(id),
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_roles_property_scope
    ON user_roles(user_id, role_id, property_id)
    WHERE property_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_roles_global_scope
    ON user_roles(user_id, role_id)
    WHERE property_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_property_id ON user_roles(property_id);

INSERT INTO roles (name, description, parent_role_id)
VALUES
  ('SUPER_ADMIN', 'System-wide access, user management, global settings', NULL),
  ('ADMIN', 'Property-scoped access with delegation capabilities', NULL),
  ('PROPERTY_MANAGER', 'Subset of admin per property', (SELECT id FROM roles WHERE name = 'ADMIN')),
  ('TENANT', 'Unit-scoped access; limited to own data', NULL),
  ('MAINTENANCE_STAFF', 'Work order access only', NULL),
  ('ACCOUNTANT', 'Financial read-only access', NULL)
ON CONFLICT (name) DO NOTHING;

WITH perm(resource, action) AS (
  VALUES
    ('property', 'create'), ('property', 'read'), ('property', 'update'), ('property', 'delete'), ('property', 'manage'),
    ('tenant', 'create'), ('tenant', 'read'), ('tenant', 'update'), ('tenant', 'delete'), ('tenant', 'manage'),
    ('payment', 'create'), ('payment', 'read'), ('payment', 'update'), ('payment', 'delete'), ('payment', 'manage'),
    ('maintenance', 'create'), ('maintenance', 'read'), ('maintenance', 'update'), ('maintenance', 'delete'), ('maintenance', 'manage'),
    ('document', 'create'), ('document', 'read'), ('document', 'update'), ('document', 'delete'), ('document', 'manage'),
    ('audit_log', 'read'),
    ('user', 'manage'),
    ('dashboard', 'read')
)
INSERT INTO permissions (resource, action)
SELECT p.resource, p.action
FROM perm p
ON CONFLICT (resource, action) DO NOTHING;

-- SUPER_ADMIN: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- ADMIN: manage most resources; excludes user.manage by default
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource IN ('property','tenant','payment','maintenance','document','audit_log','dashboard')
      AND p.action IN ('create','read','update','delete','manage'))
  OR (p.resource IN ('audit_log','dashboard') AND p.action = 'read')
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- PROPERTY_MANAGER: similar to ADMIN but no delete/manage on users (and no audit_log by default)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource IN ('property','tenant','payment','maintenance','document','dashboard')
      AND p.action IN ('create','read','update','delete','manage'))
WHERE r.name = 'PROPERTY_MANAGER'
ON CONFLICT DO NOTHING;

-- TENANT: tenant portal basics (no manage/delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource, p.action) IN (
    ('property','read'),
    ('tenant','read'),
    ('payment','create'), ('payment','read'),
    ('maintenance','create'), ('maintenance','read'),
    ('document','read'),
    ('dashboard','read')
  )
WHERE r.name = 'TENANT'
ON CONFLICT DO NOTHING;

-- MAINTENANCE_STAFF: maintenance read/update
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource, p.action) IN (
    ('maintenance','read'), ('maintenance','update'),
    ('document','create'), ('document','read')
  )
WHERE r.name = 'MAINTENANCE_STAFF'
ON CONFLICT DO NOTHING;

-- ACCOUNTANT: financial read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON (p.resource, p.action) IN (
    ('payment','read'),
    ('property','read'),
    ('tenant','read'),
    ('dashboard','read')
  )
WHERE r.name = 'ACCOUNTANT'
ON CONFLICT DO NOTHING;

-- Backfill: user_roles from existing users.role / users.properties / users.property_id
-- This is intentionally best-effort and additive; it does not remove/override existing user_roles.

-- SUPER_ADMIN global
INSERT INTO user_roles (user_id, role_id, property_id, assigned_by)
SELECT u.id, r.id, NULL, u.id
FROM users u
JOIN roles r ON r.name = 'SUPER_ADMIN'
WHERE u.deleted_at IS NULL
  AND u.role = 'super_admin'
ON CONFLICT DO NOTHING;

-- ADMIN property scoped via users.properties integer[]
INSERT INTO user_roles (user_id, role_id, property_id, assigned_by)
SELECT u.id, r.id, pid, u.id
FROM users u
JOIN roles r ON r.name = 'ADMIN'
JOIN LATERAL unnest(COALESCE(u.properties, ARRAY[]::integer[])) AS pid ON TRUE
WHERE u.deleted_at IS NULL
  AND u.role = 'admin'
ON CONFLICT DO NOTHING;

-- ADMIN fallback to users.property_id if properties is NULL/empty
INSERT INTO user_roles (user_id, role_id, property_id, assigned_by)
SELECT u.id, r.id, u.property_id, u.id
FROM users u
JOIN roles r ON r.name = 'ADMIN'
WHERE u.deleted_at IS NULL
  AND u.role = 'admin'
  AND (u.properties IS NULL OR array_length(u.properties, 1) IS NULL)
  AND u.property_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- TENANT property scoped via users.property_id
INSERT INTO user_roles (user_id, role_id, property_id, assigned_by)
SELECT u.id, r.id, u.property_id, u.id
FROM users u
JOIN roles r ON r.name = 'TENANT'
WHERE u.deleted_at IS NULL
  AND u.role = 'tenant'
  AND u.property_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ROLLBACK SCRIPT
-- Drop in reverse dependency order. Use with caution.
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
