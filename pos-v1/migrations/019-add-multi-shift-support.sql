-- Migration 019: Add multi-shift support for workers
-- Allow workers to check in/out multiple times per day for split shifts

-- Add shiftNumber column to track multiple shifts on the same day
ALTER TABLE staff_attendance ADD COLUMN shiftNumber INTEGER DEFAULT 1;

-- Add createdAt and updatedAt timestamps for better tracking
ALTER TABLE staff_attendance ADD COLUMN createdAt INTEGER;
ALTER TABLE staff_attendance ADD COLUMN updatedAt INTEGER;

-- Create index for efficient querying of shifts
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON staff_attendance(staffId, attendanceDate, shiftNumber);

-- Note: The combination of (staffId, attendanceDate, shiftNumber) becomes the unique identifier
-- This allows multiple check-ins per day with different shift numbers
