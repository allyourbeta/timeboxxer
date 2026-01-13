-- DEV SEED DATA - Run in Supabase SQL Editor

-- Create a dev user (fixed UUID for consistency)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'dev@timeboxxer.local',
  '',
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Dev User"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Add sample lists (Inbox created by trigger, but let's ensure we have data)
INSERT INTO lists (id, user_id, name, is_inbox, position) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Today', false, 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Fitness', false, 2)
ON CONFLICT DO NOTHING;

-- Add sample tasks
INSERT INTO tasks (user_id, list_id, title, duration_minutes, color_index, position) VALUES
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Review PRD', 30, 0, 0),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Team standup', 15, 1, 1),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Write design doc', 60, 2, 2),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Run', 45, 3, 0),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Stretch', 15, 4, 1)
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Setup complete!' as status;
