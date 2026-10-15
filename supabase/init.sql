-- Supabase init SQL: añade tabla settings

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  role text,
  content text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  day date,
  chats_used int DEFAULT 0,
  images_used int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Insert default site config
INSERT INTO settings (key, value) VALUES (
  'site_config',
  '{"colors": {"primary":"#4f46e5","background":"#f7f7f8"}, "limits": {"anon": {"chats":5, "images":3}, "auth": {"chats":10, "images":6}, "bonus": {"chats":10, "images":3}}, "view_images_limit":10 }'
) ON CONFLICT (key) DO NOTHING;
