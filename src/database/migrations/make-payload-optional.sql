-- Migration: Make payload column nullable in notifications table
-- This allows notifications to be created without payload data

ALTER TABLE notifications
ALTER COLUMN payload DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN notifications.payload IS 'Optional JSON payload with additional notification data';
