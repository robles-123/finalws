-- Create attendance table for VPAA system
-- Run this in Supabase SQL editor if the table doesn't already exist

CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seminar_id UUID NOT NULL REFERENCES seminars(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  time_in TIMESTAMPTZ NULL,
  time_out TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_seminar ON attendance(seminar_id);
CREATE INDEX IF NOT EXISTS idx_attendance_email ON attendance(participant_email);
CREATE INDEX IF NOT EXISTS idx_attendance_seminar_email ON attendance(seminar_id, participant_email);

-- Add constraint to prevent duplicate attendance records per seminar
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique ON attendance(seminar_id, participant_email);
