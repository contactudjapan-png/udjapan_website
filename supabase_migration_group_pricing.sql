-- Add group pricing fields to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS group_min_size integer,
  ADD COLUMN IF NOT EXISTS group_discount numeric(10,2);
