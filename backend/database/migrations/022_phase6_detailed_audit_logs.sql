-- PHASE 6.2: Detailed audit trail expansion (additive)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS detailed_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detailed_audit_user_time ON detailed_audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_detailed_audit_entity ON detailed_audit_logs(entity_type, entity_id);

-- ROLLBACK SCRIPT
DROP TABLE IF EXISTS detailed_audit_logs;
