-- Add purgatory tracking fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS moved_to_purgatory_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_list_id UUID REFERENCES lists(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_list_name TEXT;

-- Add daily task flag
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_daily BOOLEAN DEFAULT FALSE;

-- Add daily task source tracking (which daily task spawned this instance)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS daily_source_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Add system list flag
ALTER TABLE lists ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS system_type TEXT; -- 'purgatory' or 'date'

-- Create Purgatory system list (run once)
INSERT INTO lists (id, user_id, name, position, is_system, system_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Purgatory',
  0,
  true,
  'purgatory'
) ON CONFLICT (id) DO NOTHING;