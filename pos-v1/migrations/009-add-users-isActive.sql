-- ===================================
-- Migration 009: Add isActive column to users table
-- ===================================

-- Add isActive column to users table (default to 1 = active)
ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1;

-- Update schema version
INSERT INTO schema_version (version, description, applied_at, applied_by)
VALUES (10, 'Add isActive column to users table', strftime('%s', 'now') * 1000, 'System');
