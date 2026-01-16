-- Add energy level to tasks (high, medium, low)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS energy_level TEXT DEFAULT 'medium';

-- Add daily highlight flag
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_daily_highlight BOOLEAN DEFAULT FALSE;

-- Create "Parked" system list for quick capture
INSERT INTO lists (id, user_id, name, position, is_system, system_type)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'Parked',
  0,
  true,
  'parked'
) ON CONFLICT (id) DO NOTHING;