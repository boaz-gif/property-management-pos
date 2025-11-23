-- Database Schema Fixes for Property Management System
-- This script safely aligns the database with API models

-- Check current notifications table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- The schema.sql already has the correct structure (is_read, title)
-- The issue is the actual database might have been created differently
-- Let's recreate the tables with correct schema

-- Drop and recreate notifications table with correct schema
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    tenant_id INTEGER,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure maintenance table has title column (it should from schema.sql)
-- This is just a safety check
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'maintenance' AND column_name = 'title'
    ) THEN
        ALTER TABLE maintenance ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Maintenance Request';
    END IF;
END $$;

-- Verify final structure
SELECT 'Notifications columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

SELECT 'Maintenance columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'maintenance' 
ORDER BY ordinal_position;
