-- Run this in Supabase SQL editor
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_token TEXT,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  name TEXT,
  result TEXT CHECK (result IN ('valid', 'invalid')),
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_logs_event_id_idx ON scan_logs (event_id);
CREATE INDEX IF NOT EXISTS scan_logs_scanned_at_idx ON scan_logs (scanned_at DESC);
