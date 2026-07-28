CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_admins (
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, admin_id)
);
