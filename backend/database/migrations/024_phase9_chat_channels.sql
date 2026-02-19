BEGIN;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'general';

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS tenant_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_conversations_kind'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT chk_conversations_kind
      CHECK (kind IN ('general', 'tenant_community', 'tenant_admin_dm'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_conversations_tenant_admin_dm_fields'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT chk_conversations_tenant_admin_dm_fields
      CHECK (
        kind <> 'tenant_admin_dm'
        OR (
          property_id IS NOT NULL
          AND tenant_user_id IS NOT NULL
          AND admin_user_id IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_conversations_tenant_community_fields'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT chk_conversations_tenant_community_fields
      CHECK (
        kind <> 'tenant_community'
        OR (
          property_id IS NOT NULL
          AND tenant_user_id IS NULL
          AND admin_user_id IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_conversations_property_tenant_community'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_conversations_property_tenant_community ON conversations(property_id) WHERE kind = ''tenant_community'' AND archived_at IS NULL';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_conversations_property_tenant_admin_dm'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_conversations_property_tenant_admin_dm ON conversations(property_id, tenant_user_id) WHERE kind = ''tenant_admin_dm'' AND archived_at IS NULL';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION enforce_conversations_tenant_admin_dm_admin()
RETURNS trigger AS $$
DECLARE
  expected_admin_id INTEGER;
  tenant_role TEXT;
BEGIN
  IF NEW.kind = 'tenant_admin_dm' THEN
    SELECT admin_id INTO expected_admin_id
    FROM properties
    WHERE id = NEW.property_id AND deleted_at IS NULL;

    IF expected_admin_id IS NULL THEN
      RAISE EXCEPTION 'Invalid property for tenant_admin_dm';
    END IF;

    IF NEW.admin_user_id IS DISTINCT FROM expected_admin_id THEN
      RAISE EXCEPTION 'admin_user_id must match owning admin for property';
    END IF;

    SELECT role INTO tenant_role
    FROM users
    WHERE id = NEW.tenant_user_id AND deleted_at IS NULL;

    IF tenant_role IS DISTINCT FROM 'tenant' THEN
      RAISE EXCEPTION 'tenant_user_id must be a tenant user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_enforce_conversations_tenant_admin_dm_admin'
  ) THEN
    CREATE TRIGGER trg_enforce_conversations_tenant_admin_dm_admin
    BEFORE INSERT OR UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_conversations_tenant_admin_dm_admin();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION enforce_conversation_participant_rules()
RETURNS trigger AS $$
DECLARE
  conv_kind TEXT;
  conv_property_id INTEGER;
  conv_tenant_user_id INTEGER;
  conv_admin_user_id INTEGER;
  u_role TEXT;
  u_property_id INTEGER;
BEGIN
  SELECT kind, property_id, tenant_user_id, admin_user_id
  INTO conv_kind, conv_property_id, conv_tenant_user_id, conv_admin_user_id
  FROM conversations
  WHERE id = NEW.conversation_id;

  IF conv_kind = 'tenant_community' THEN
    SELECT role, property_id INTO u_role, u_property_id
    FROM users
    WHERE id = NEW.user_id AND deleted_at IS NULL;

    IF u_role IS DISTINCT FROM 'tenant' THEN
      RAISE EXCEPTION 'Only tenant users can join tenant community chat';
    END IF;

    IF u_property_id IS DISTINCT FROM conv_property_id THEN
      RAISE EXCEPTION 'Tenant must belong to property to join community chat';
    END IF;
  ELSIF conv_kind = 'tenant_admin_dm' THEN
    IF NEW.user_id IS DISTINCT FROM conv_tenant_user_id AND NEW.user_id IS DISTINCT FROM conv_admin_user_id THEN
      RAISE EXCEPTION 'Only the tenant and owning admin can join tenant-admin DM';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_enforce_conversation_participant_rules'
  ) THEN
    CREATE TRIGGER trg_enforce_conversation_participant_rules
    BEFORE INSERT OR UPDATE ON conversation_participants
    FOR EACH ROW
    EXECUTE FUNCTION enforce_conversation_participant_rules();
  END IF;
END $$;

COMMIT;

-- ROLLBACK SCRIPT
BEGIN;
DROP TRIGGER IF EXISTS trg_enforce_conversation_participant_rules ON conversation_participants;
DROP FUNCTION IF EXISTS enforce_conversation_participant_rules();
DROP TRIGGER IF EXISTS trg_enforce_conversations_tenant_admin_dm_admin ON conversations;
DROP FUNCTION IF EXISTS enforce_conversations_tenant_admin_dm_admin();
DROP INDEX IF EXISTS uq_conversations_property_tenant_admin_dm;
DROP INDEX IF EXISTS uq_conversations_property_tenant_community;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS chk_conversations_tenant_community_fields;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS chk_conversations_tenant_admin_dm_fields;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS chk_conversations_kind;
ALTER TABLE conversations DROP COLUMN IF EXISTS admin_user_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS tenant_user_id;
ALTER TABLE conversations DROP COLUMN IF EXISTS kind;
COMMIT;

