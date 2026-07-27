-- ── New columns on existing tables ──────────────────────────────────────────

ALTER TABLE events ADD COLUMN IF NOT EXISTS description_en TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_description_en TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_description_de TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS description_de TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url_nilkantha TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url_kokila TEXT DEFAULT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS banner_url_bd TEXT DEFAULT NULL;

ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS title_en TEXT DEFAULT NULL;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS title_de TEXT DEFAULT NULL;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS description_en TEXT DEFAULT NULL;
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS description_de TEXT DEFAULT NULL;

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title_en TEXT DEFAULT NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title_de TEXT DEFAULT NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content_en TEXT DEFAULT NULL;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS content_de TEXT DEFAULT NULL;

ALTER TABLE registrations ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS transaction_id TEXT DEFAULT NULL;

ALTER TABLE stalls ADD COLUMN IF NOT EXISTS fee NUMERIC(10,2) DEFAULT NULL;

ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS preferred_task TEXT DEFAULT NULL;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS preferred_duration TEXT DEFAULT NULL;
-- If preferred_time column exists from older migration, rename it:
-- ALTER TABLE volunteers RENAME COLUMN preferred_time TO preferred_duration;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS session_token TEXT DEFAULT NULL;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 120;
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS session_used BOOLEAN DEFAULT FALSE;

-- ── New tables ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  transaction_id TEXT,
  payer_name TEXT,
  payer_email TEXT,
  payment_date TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- If incomes table already exists:
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_income_txn ON incomes(transaction_id) WHERE transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT DEFAULT 'rating',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS feedback_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  question_id UUID REFERENCES feedback_questions(id) ON DELETE CASCADE,
  rating INTEGER,
  text_response TEXT,
  respondent_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instruments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  volunteer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Default settings ──────────────────────────────────────────────────────────

INSERT INTO app_settings (key, value)
VALUES ('income_categories', E'নিবন্ধন ফি\nস্টল ফি\nঅনুদান\nস্পনসরশিপ\nঅন্যান্য')
ON CONFLICT (key) DO NOTHING;
