CREATE TABLE IF NOT EXISTS help_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  reporter_name TEXT,
  priority TEXT DEFAULT 'normal',
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_requests_event_id ON help_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_resolved ON help_requests(resolved);
