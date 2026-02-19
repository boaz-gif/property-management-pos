-- PHASE 3: Organizations, Teams, Workflows (additive)

CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_properties_org_id ON properties(organization_id);

ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_user_roles_org_user ON user_roles(organization_id, user_id);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id),
  UNIQUE (organization_id, resource_type, name)
);

CREATE TABLE IF NOT EXISTS workflow_states (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL,
  name TEXT NOT NULL,
  is_initial BOOLEAN NOT NULL DEFAULT FALSE,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (workflow_id, state_key)
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  from_state_id INTEGER NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
  to_state_id INTEGER NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_wf_from ON workflow_transitions(workflow_id, from_state_id);

CREATE TABLE IF NOT EXISTS work_items (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id INTEGER NOT NULL,
  workflow_id INTEGER NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  current_state_id INTEGER NOT NULL REFERENCES workflow_states(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (organization_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_work_items_org_resource ON work_items(organization_id, resource_type, resource_id);

INSERT INTO permissions (resource, action)
SELECT v.resource, v.action
FROM (VALUES
  ('organization','create'),
  ('organization','read'),
  ('organization','update'),
  ('organization','delete'),
  ('organization','manage'),
  ('team','create'),
  ('team','read'),
  ('team','update'),
  ('team','delete'),
  ('team','manage'),
  ('workflow','create'),
  ('workflow','read'),
  ('workflow','update'),
  ('workflow','delete'),
  ('workflow','manage'),
  ('work_item','create'),
  ('work_item','read'),
  ('work_item','update'),
  ('work_item','delete'),
  ('work_item','manage')
) AS v(resource, action)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.resource = v.resource AND p.action = v.action
);

WITH role_ids AS (
  SELECT id, name FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN')
),
perm_ids AS (
  SELECT id, resource, action FROM permissions
  WHERE resource IN ('organization','team','workflow','work_item')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_ids r
JOIN perm_ids p ON TRUE
ON CONFLICT DO NOTHING;

WITH orgs AS (
  INSERT INTO organizations (name, slug, owner_user_id, created_at, updated_at)
  SELECT
    COALESCE(u.name, ('Organization ' || u.id)) || ' Organization',
    ('org-' || u.id),
    u.id,
    NOW(),
    NOW()
  FROM (
    SELECT DISTINCT p.admin_id
    FROM properties p
    WHERE p.admin_id IS NOT NULL AND p.deleted_at IS NULL
  ) x
  JOIN users u ON u.id = x.admin_id AND u.deleted_at IS NULL
  WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.owner_user_id = u.id)
  RETURNING id, owner_user_id
)
INSERT INTO organization_members (organization_id, user_id, member_role)
SELECT orgs.id, orgs.owner_user_id, 'owner'
FROM orgs
ON CONFLICT DO NOTHING;

UPDATE properties p
SET organization_id = o.id
FROM organizations o
WHERE p.organization_id IS NULL
  AND p.admin_id = o.owner_user_id
  AND p.deleted_at IS NULL;

INSERT INTO workflow_definitions (organization_id, name, resource_type, is_active, created_at, updated_at)
SELECT o.id, 'Default Maintenance Workflow', 'maintenance', TRUE, NOW(), NOW()
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_definitions wd
  WHERE wd.organization_id = o.id AND wd.resource_type = 'maintenance' AND wd.name = 'Default Maintenance Workflow'
);

WITH wf AS (
  SELECT id AS workflow_id, organization_id
  FROM workflow_definitions
  WHERE resource_type = 'maintenance' AND name = 'Default Maintenance Workflow'
),
ins_states AS (
  INSERT INTO workflow_states (workflow_id, state_key, name, is_initial, is_terminal, sort_order)
  SELECT wf.workflow_id, s.state_key, s.name, s.is_initial, s.is_terminal, s.sort_order
  FROM wf
  JOIN (VALUES
    ('open', 'Open', TRUE, FALSE, 10),
    ('in_progress', 'In Progress', FALSE, FALSE, 20),
    ('resolved', 'Resolved', FALSE, TRUE, 30)
  ) AS s(state_key, name, is_initial, is_terminal, sort_order) ON TRUE
  WHERE NOT EXISTS (
    SELECT 1 FROM workflow_states ws
    WHERE ws.workflow_id = wf.workflow_id AND ws.state_key = s.state_key
  )
  RETURNING workflow_id
)
SELECT 1;

WITH wf AS (
  SELECT id AS workflow_id
  FROM workflow_definitions
  WHERE resource_type = 'maintenance' AND name = 'Default Maintenance Workflow'
),
states AS (
  SELECT ws.workflow_id, ws.id, ws.state_key
  FROM workflow_states ws
  JOIN wf ON wf.workflow_id = ws.workflow_id
),
transitions AS (
  SELECT wf.workflow_id,
         s_from.id AS from_id,
         s_to.id AS to_id,
         t.name AS name
  FROM wf
  JOIN states s_from ON s_from.workflow_id = wf.workflow_id
  JOIN states s_to ON s_to.workflow_id = wf.workflow_id
  JOIN (VALUES
    ('open','in_progress','Start Work'),
    ('in_progress','resolved','Resolve')
  ) AS t(from_key, to_key, name)
    ON t.from_key = s_from.state_key AND t.to_key = s_to.state_key
)
INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, name)
SELECT workflow_id, from_id, to_id, name
FROM transitions
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_transitions wt
  WHERE wt.workflow_id = transitions.workflow_id
    AND wt.from_state_id = transitions.from_id
    AND wt.to_state_id = transitions.to_id
);

-- ROLLBACK SCRIPT
DELETE FROM workflow_transitions wt
USING workflow_definitions wd
WHERE wt.workflow_id = wd.id AND wd.resource_type = 'maintenance' AND wd.name = 'Default Maintenance Workflow';

DELETE FROM workflow_states ws
USING workflow_definitions wd
WHERE ws.workflow_id = wd.id AND wd.resource_type = 'maintenance' AND wd.name = 'Default Maintenance Workflow';

DELETE FROM workflow_definitions wd
WHERE wd.resource_type = 'maintenance' AND wd.name = 'Default Maintenance Workflow';

ALTER TABLE user_roles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE properties DROP COLUMN IF EXISTS organization_id;

DROP TABLE IF EXISTS work_items;
DROP TABLE IF EXISTS workflow_transitions;
DROP TABLE IF EXISTS workflow_states;
DROP TABLE IF EXISTS workflow_definitions;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

DELETE FROM role_permissions rp
USING permissions p
WHERE rp.permission_id = p.id
  AND p.resource IN ('organization','team','workflow','work_item');

DELETE FROM permissions p
WHERE p.resource IN ('organization','team','workflow','work_item');

