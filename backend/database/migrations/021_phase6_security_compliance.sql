-- PHASE 6: Security & Compliance Enhancements (additive)

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS encryption_iv BYTEA,
  ADD COLUMN IF NOT EXISTS encryption_auth_tag BYTEA,
  ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS encryption_algorithm VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_documents_is_encrypted ON documents(is_encrypted);

INSERT INTO permissions (resource, action)
SELECT v.resource, v.action
FROM (VALUES
  ('privacy','export'),
  ('privacy','delete')
) AS v(resource, action)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.resource = v.resource AND p.action = v.action
);

WITH role_ids AS (
  SELECT id, name FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'TENANT')
),
perm_ids AS (
  SELECT id FROM permissions WHERE resource = 'privacy' AND action IN ('export','delete')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_ids r
JOIN perm_ids p ON TRUE
WHERE NOT (r.name = 'TENANT' AND EXISTS (SELECT 1 FROM permissions p2 WHERE p2.id = p.id AND p2.action = 'delete'))
ON CONFLICT DO NOTHING;

-- ROLLBACK SCRIPT
DELETE FROM role_permissions rp
USING permissions p
WHERE rp.permission_id = p.id
  AND p.resource = 'privacy'
  AND p.action IN ('export','delete');

DELETE FROM permissions p
WHERE p.resource = 'privacy' AND p.action IN ('export','delete');

ALTER TABLE documents
  DROP COLUMN IF EXISTS encryption_algorithm,
  DROP COLUMN IF EXISTS encryption_key_id,
  DROP COLUMN IF EXISTS encryption_auth_tag,
  DROP COLUMN IF EXISTS encryption_iv,
  DROP COLUMN IF EXISTS is_encrypted;
