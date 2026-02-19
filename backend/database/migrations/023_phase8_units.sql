-- PHASE 8: Units (property-scoped) + tenant unit linkage + safer occupancy invariants (additive)

BEGIN;

CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_units_property_unit_number'
  ) THEN
    IF (
      SELECT COUNT(*)
      FROM (
        SELECT property_id, unit_number
        FROM units
        WHERE deleted_at IS NULL
        GROUP BY property_id, unit_number
        HAVING COUNT(*) > 1
      ) d
    ) = 0 THEN
      EXECUTE 'CREATE UNIQUE INDEX uq_units_property_unit_number ON units(property_id, unit_number) WHERE deleted_at IS NULL';
    END IF;
  END IF;
END $$;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_active_tenant_per_unit_string'
  ) THEN
    IF (
      SELECT COUNT(*)
      FROM (
        SELECT property_id, unit
        FROM tenants
        WHERE deleted_at IS NULL AND status = 'active'
        GROUP BY property_id, unit
        HAVING COUNT(*) > 1
      ) d
    ) = 0 THEN
      EXECUTE 'CREATE UNIQUE INDEX uq_active_tenant_per_unit_string ON tenants(property_id, unit) WHERE deleted_at IS NULL AND status = ''active''';
    END IF;
  END IF;
END $$;

COMMIT;

-- ROLLBACK SCRIPT
BEGIN;
DROP INDEX IF EXISTS uq_active_tenant_per_unit_string;
DROP INDEX IF EXISTS idx_tenants_unit_id;
ALTER TABLE tenants DROP COLUMN IF EXISTS unit_id;
DROP INDEX IF EXISTS uq_units_property_unit_number;
DROP INDEX IF EXISTS idx_units_property_id;
DROP TABLE IF EXISTS units;
COMMIT;

