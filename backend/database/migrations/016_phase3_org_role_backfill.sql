-- PHASE 3: Backfill org scope for RBAC assignments (additive)

UPDATE user_roles ur
SET organization_id = p.organization_id
FROM properties p
WHERE ur.organization_id IS NULL
  AND ur.property_id IS NOT NULL
  AND p.id = ur.property_id
  AND p.organization_id IS NOT NULL;

INSERT INTO user_roles (user_id, role_id, organization_id, property_id, valid_from)
SELECT o.owner_user_id, r.id, o.id, NULL, NOW()
FROM organizations o
JOIN roles r ON r.name = 'ADMIN'
WHERE o.owner_user_id IS NOT NULL
  AND o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = o.owner_user_id
      AND ur.role_id = r.id
      AND ur.organization_id = o.id
      AND ur.property_id IS NULL
  );

-- ROLLBACK SCRIPT
DELETE FROM user_roles ur
USING organizations o, roles r
WHERE ur.organization_id = o.id
  AND ur.role_id = r.id
  AND r.name = 'ADMIN'
  AND ur.property_id IS NULL
  AND o.owner_user_id = ur.user_id;

UPDATE user_roles
SET organization_id = NULL
WHERE property_id IS NOT NULL;
