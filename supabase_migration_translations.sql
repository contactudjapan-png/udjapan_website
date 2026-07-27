CREATE TABLE IF NOT EXISTS translations (
  key    TEXT NOT NULL,
  locale TEXT NOT NULL,
  value  TEXT NOT NULL,
  PRIMARY KEY (key, locale)
);
