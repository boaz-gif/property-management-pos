-- PHASE 5.1: Unified Communication Hub (additive)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  subject VARCHAR(255),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_org_property ON conversations(organization_id, property_id);
CREATE INDEX IF NOT EXISTS idx_conversations_entity ON conversations(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_at_time VARCHAR(50),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP,
  last_read_message_id UUID,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at DESC);

ALTER TABLE conversation_participants
  ADD CONSTRAINT fk_conversation_participants_last_read_message
  FOREIGN KEY (last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_preference_types (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_preference_types_user ON notification_preference_types(user_id);

INSERT INTO permissions (resource, action)
SELECT v.resource, v.action
FROM (VALUES
  ('conversation','create'),
  ('conversation','read'),
  ('conversation','update'),
  ('conversation','delete'),
  ('conversation','manage'),
  ('message','create'),
  ('message','read'),
  ('message','update'),
  ('message','delete'),
  ('message','manage')
) AS v(resource, action)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.resource = v.resource AND p.action = v.action
);

WITH role_ids AS (
  SELECT id, name FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER', 'TENANT', 'MAINTENANCE_STAFF')
),
perm_ids AS (
  SELECT id, resource, action
  FROM permissions
  WHERE resource IN ('conversation','message')
),
role_perm_map AS (
  SELECT r.id AS role_id, p.id AS permission_id
  FROM role_ids r
  JOIN perm_ids p ON TRUE
  WHERE
    r.name IN ('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER')
    OR (
      r.name = 'TENANT'
      AND (p.action IN ('create','read') AND p.resource IN ('conversation','message'))
    )
    OR (
      r.name = 'MAINTENANCE_STAFF'
      AND (
        (p.resource = 'conversation' AND p.action = 'read')
        OR (p.resource = 'message' AND p.action IN ('create','read'))
      )
    )
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM role_perm_map
ON CONFLICT DO NOTHING;

-- ROLLBACK SCRIPT
DELETE FROM role_permissions rp
USING permissions p
WHERE rp.permission_id = p.id
  AND p.resource IN ('conversation','message');

DELETE FROM permissions p
WHERE p.resource IN ('conversation','message');

DROP TABLE IF EXISTS notification_preference_types;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS conversations;
