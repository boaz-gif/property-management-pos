-- PHASE 5.3: Dashboard personalization (additive)

CREATE TABLE IF NOT EXISTS user_dashboard_widgets (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50),
  widget_type VARCHAR(50) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, widget_type)
);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_widgets_user_pos ON user_dashboard_widgets(user_id, position);

INSERT INTO permissions (resource, action)
SELECT v.resource, v.action
FROM (VALUES
  ('dashboard','update')
) AS v(resource, action)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.resource = v.resource AND p.action = v.action
);

WITH role_ids AS (
  SELECT id, name FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER', 'TENANT')
),
perm_ids AS (
  SELECT id FROM permissions WHERE resource = 'dashboard' AND action = 'update'
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_ids r
JOIN perm_ids p ON TRUE
ON CONFLICT DO NOTHING;

-- ROLLBACK SCRIPT
DELETE FROM role_permissions rp
USING permissions p
WHERE rp.permission_id = p.id
  AND p.resource = 'dashboard'
  AND p.action = 'update';

DELETE FROM permissions p
WHERE p.resource = 'dashboard' AND p.action = 'update';

DROP TABLE IF EXISTS user_dashboard_widgets;
