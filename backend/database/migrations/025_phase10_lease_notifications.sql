BEGIN;

CREATE TABLE IF NOT EXISTS property_lease_settings (
  property_id INTEGER PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  default_term_days INTEGER NOT NULL DEFAULT 365,
  reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[30, 14, 7],
  notify_tenant BOOLEAN NOT NULL DEFAULT TRUE,
  notify_admin BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lease_expiration_reminders (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL,
  sent_to_email TEXT,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_lease_expiration_reminders_tenant_type'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_lease_expiration_reminders_tenant_type ON lease_expiration_reminders(tenant_id, reminder_type)';
  END IF;
END $$;

COMMIT;

-- ROLLBACK SCRIPT
BEGIN;
DROP INDEX IF EXISTS uq_lease_expiration_reminders_tenant_type;
DROP TABLE IF EXISTS lease_expiration_reminders;
DROP TABLE IF EXISTS property_lease_settings;
COMMIT;

