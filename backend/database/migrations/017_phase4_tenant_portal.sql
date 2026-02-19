-- PHASE 4: Tenant Portal (dashboard, announcements, preferences, widgets) + tenant home summary

CREATE TABLE IF NOT EXISTS tenant_preferences (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,
  payment_reminders BOOLEAN DEFAULT TRUE,
  maintenance_updates BOOLEAN DEFAULT TRUE,
  lease_reminders BOOLEAN DEFAULT TRUE,
  community_announcements BOOLEAN DEFAULT TRUE,
  preferred_contact_method VARCHAR(50) DEFAULT 'email',
  preferred_contact_time VARCHAR(50),
  dashboard_layout VARCHAR(50) DEFAULT 'default',
  theme VARCHAR(50) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  auto_pay_enabled BOOLEAN DEFAULT FALSE,
  auto_pay_method VARCHAR(50),
  auto_pay_day_of_month INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_quick_actions_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  action_type VARCHAR(100),
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_dashboard_widgets (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  widget_type VARCHAR(50),
  position INTEGER DEFAULT 0,
  visible BOOLEAN DEFAULT TRUE,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (tenant_id, widget_type)
);

CREATE TABLE IF NOT EXISTS property_announcements (
  id SERIAL PRIMARY KEY,
  property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'normal',
  target_all_tenants BOOLEAN DEFAULT TRUE,
  target_specific_units JSONB,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  views_count INTEGER DEFAULT 0,
  acknowledged_count INTEGER DEFAULT 0,
  attachments JSONB,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  deleted_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_property_announcements_property_id ON property_announcements(property_id);

CREATE TABLE IF NOT EXISTS tenant_announcement_reads (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER REFERENCES property_announcements(id) ON DELETE CASCADE,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP,
  UNIQUE (announcement_id, tenant_id)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'tenant_home_summary') THEN
    RETURN;
  END IF;

  EXECUTE $SQL$
    CREATE MATERIALIZED VIEW tenant_home_summary AS
    SELECT
      t.id AS tenant_id,
      t.user_id,
      t.property_id,
      t.name AS tenant_name,
      t.balance,
      t.rent,
      COALESCE(l.status, 'unknown') AS lease_status,
      CASE
        WHEN l.end_date IS NULL THEN NULL
        ELSE GREATEST(0, (l.end_date::date - CURRENT_DATE))
      END AS days_until_lease_end,
      (
        SELECT COUNT(*)
        FROM maintenance m
        WHERE m.tenant_id = t.id
          AND m.deleted_at IS NULL
          AND m.status IN ('open', 'pending', 'in_progress')
      ) AS open_maintenance_count,
      (
        SELECT COUNT(*)
        FROM notifications n
        WHERE n.user_id = t.user_id
          AND n.deleted_at IS NULL
          AND n.is_read = FALSE
      ) AS unread_notifications_count,
      (
        SELECT COUNT(*)
        FROM property_announcements pa
        LEFT JOIN tenant_announcement_reads tar
          ON tar.announcement_id = pa.id AND tar.tenant_id = t.id
        WHERE pa.property_id = t.property_id
          AND pa.deleted_at IS NULL
          AND pa.published = TRUE
          AND (pa.expires_at IS NULL OR pa.expires_at > NOW())
          AND tar.id IS NULL
      ) AS unread_announcements_count
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT l.*
      FROM leases l
      WHERE l.tenant_id = t.id AND l.deleted_at IS NULL
      ORDER BY l.created_at DESC
      LIMIT 1
    ) l ON TRUE
    WHERE t.deleted_at IS NULL;
  $SQL$;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_home_summary_tenant ON tenant_home_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_home_summary_property ON tenant_home_summary(property_id);

-- ROLLBACK SCRIPT
DROP MATERIALIZED VIEW IF EXISTS tenant_home_summary;
DROP TABLE IF EXISTS tenant_announcement_reads;
DROP TABLE IF EXISTS property_announcements;
DROP TABLE IF EXISTS tenant_dashboard_widgets;
DROP TABLE IF EXISTS tenant_quick_actions_log;
DROP TABLE IF EXISTS tenant_preferences;

