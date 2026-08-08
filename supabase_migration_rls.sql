-- Enable Row-Level Security on all tables.
-- The backend uses SUPABASE_SERVICE_KEY which bypasses RLS, so no policies
-- are needed for the app to function. Enabling RLS alone blocks anonymous
-- and unauthenticated direct API access (anon key / PostgREST).

ALTER TABLE events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_tickets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE stalls                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stall_observations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist                ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options            ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs                    ENABLE ROW LEVEL SECURITY;
