-- Per-person entry tickets: one row per adult in a registration.
-- Each ticket has its own single-use QR token.
CREATE TABLE IF NOT EXISTS registration_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  ticket_number    INTEGER NOT NULL,
  qr_token         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  used_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_reg_id   ON registration_tickets(registration_id);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_token ON registration_tickets(qr_token);

-- Add ticket_id tracking to scan_logs
ALTER TABLE scan_logs ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES registration_tickets(id) ON DELETE SET NULL;

-- Expand result constraint to include already_used
ALTER TABLE scan_logs DROP CONSTRAINT IF EXISTS scan_logs_result_check;
ALTER TABLE scan_logs ADD CONSTRAINT scan_logs_result_check
  CHECK (result IN ('valid', 'invalid', 'already_used'));
