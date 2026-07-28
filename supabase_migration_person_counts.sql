-- Migration: Add person counts and special needs to registrations & submissions
-- Also adds link_url / link_text to announcements

-- registrations
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS adults_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS children_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_special_needs boolean NOT NULL DEFAULT false;

-- submissions
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS adults_count    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS children_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_special_needs boolean NOT NULL DEFAULT false;

-- announcements: optional call-to-action link
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS link_url   text,
  ADD COLUMN IF NOT EXISTS link_text  text;
