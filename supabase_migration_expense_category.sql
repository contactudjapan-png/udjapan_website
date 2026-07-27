ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;

INSERT INTO app_settings (key, value)
VALUES ('expense_categories', 'ভেন্যু ভাড়া
খাবার ও পানীয়
পোশাক
সাজসজ্জা
প্রিন্ট ও ডিজাইন
যানবাহন
অন্যান্য')
ON CONFLICT (key) DO NOTHING;
