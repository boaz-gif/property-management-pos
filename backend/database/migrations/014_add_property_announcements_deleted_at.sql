-- Add deleted_at column to property_announcements table for soft deletes
ALTER TABLE property_announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- ROLLBACK SCRIPT
ALTER TABLE property_announcements DROP COLUMN IF EXISTS deleted_at;
