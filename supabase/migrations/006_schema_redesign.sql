-- ============================================================================
-- SCHEMA REDESIGN MIGRATION
-- Migration: 006_schema_redesign.sql
-- 
-- BREAKING CHANGE: Complete schema redesign
-- 
-- Old model (removed):
-- - home_list_id + committed_date (could get out of sync)
-- - is_completed boolean
-- 
-- New model:
-- - list_id (the ONE list a task belongs to)
-- - scheduled_at (if set, appears on calendar)
-- - previous_list_id (for uncomplete)
-- - completed_at (when completed)
-- ============================================================================

-- Step 1: Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS previous_list_id UUID REFERENCES lists(id) ON DELETE SET NULL;

-- Step 2: Update lists table to use new schema
-- Add list_type column (replaces is_system/system_type)
ALTER TABLE lists ADD COLUMN IF NOT EXISTS list_type TEXT;
ALTER TABLE lists ADD CONSTRAINT list_type_check CHECK (list_type IN ('user', 'date', 'completed', 'parked'));

-- Migrate existing list types
UPDATE lists SET list_type = 'parked' WHERE system_type = 'parked';
UPDATE lists SET list_type = 'date' WHERE system_type = 'date';
UPDATE lists SET list_type = 'user' WHERE system_type IS NULL AND is_system = false;

-- Make list_type NOT NULL after migration
ALTER TABLE lists ALTER COLUMN list_type SET NOT NULL;

-- Add date list constraint
ALTER TABLE lists ADD CONSTRAINT date_list_has_date CHECK (
  (list_type = 'date' AND list_date IS NOT NULL) OR
  (list_type != 'date' AND list_date IS NULL)
);

-- Step 3: Ensure system lists exist for all users
-- Create Completed lists
INSERT INTO lists (user_id, name, list_type)
SELECT DISTINCT user_id, 'Completed', 'completed' 
FROM tasks
ON CONFLICT DO NOTHING;

-- Create Parked lists  
INSERT INTO lists (user_id, name, list_type)
SELECT DISTINCT user_id, 'Parked Items', 'parked'
FROM tasks
ON CONFLICT DO NOTHING;

-- Step 4: Create date lists for all existing committed_dates
INSERT INTO lists (user_id, name, list_type, list_date)
SELECT DISTINCT 
  user_id, 
  to_char(committed_date::date, 'Mon DD, YYYY'), 
  'date', 
  committed_date::date
FROM tasks
WHERE committed_date IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 5: Ensure tasks have list_id column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lists(id) ON DELETE CASCADE;

-- Step 6: Migrate task data

-- 6a: Move completed tasks to Completed list
UPDATE tasks t
SET list_id = (
  SELECT id FROM lists 
  WHERE user_id = t.user_id AND list_type = 'completed'
  LIMIT 1
)
WHERE is_completed = true;

-- 6b: Move tasks with committed_date to date lists
UPDATE tasks t
SET list_id = (
  SELECT id FROM lists 
  WHERE user_id = t.user_id 
    AND list_type = 'date' 
    AND list_date = t.committed_date::date
  LIMIT 1
)
WHERE committed_date IS NOT NULL 
  AND (is_completed = false OR is_completed IS NULL);

-- 6c: Keep remaining tasks in their home_list_id (becomes list_id)
UPDATE tasks SET list_id = home_list_id 
WHERE list_id IS NULL AND home_list_id IS NOT NULL;

-- 6d: Any remaining tasks without list_id go to Parked
UPDATE tasks t
SET list_id = (
  SELECT id FROM lists 
  WHERE user_id = t.user_id AND list_type = 'parked'
  LIMIT 1
)
WHERE list_id IS NULL;

-- Step 7: Make list_id NOT NULL after migration
ALTER TABLE tasks ALTER COLUMN list_id SET NOT NULL;

-- Step 8: Update indexes
DROP INDEX IF EXISTS idx_tasks_user_list;
DROP INDEX IF EXISTS idx_tasks_completed;

CREATE INDEX idx_tasks_list_id ON tasks(list_id);
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Create unique indexes for system lists
CREATE UNIQUE INDEX idx_lists_user_completed ON lists(user_id) WHERE list_type = 'completed';
CREATE UNIQUE INDEX idx_lists_user_parked ON lists(user_id) WHERE list_type = 'parked';
CREATE UNIQUE INDEX idx_lists_user_date ON lists(user_id, list_date) WHERE list_type = 'date';

-- Step 9: Drop old columns
ALTER TABLE tasks DROP COLUMN IF EXISTS home_list_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS committed_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS is_completed;

-- Drop old list columns
ALTER TABLE lists DROP COLUMN IF EXISTS is_system;
ALTER TABLE lists DROP COLUMN IF EXISTS system_type;
ALTER TABLE lists DROP COLUMN IF EXISTS is_inbox;
ALTER TABLE lists DROP COLUMN IF EXISTS position;

-- Step 10: Update RLS policies
DROP POLICY IF EXISTS "Users can view own lists" ON lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON lists;
DROP POLICY IF EXISTS "Users can update own lists" ON lists;  
DROP POLICY IF EXISTS "Users can delete own lists" ON lists;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- New simplified policies
CREATE POLICY lists_user_policy ON lists
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY tasks_user_policy ON tasks  
  FOR ALL USING (user_id = auth.uid());

-- Additional policy to ensure users can only move tasks to their own lists
CREATE POLICY tasks_move_policy ON tasks
  FOR UPDATE USING (
    user_id = auth.uid() 
    AND list_id IN (SELECT id FROM lists WHERE user_id = auth.uid())
  );

-- Step 11: Update functions to work with new schema

-- Update delete_list_safe function
CREATE OR REPLACE FUNCTION delete_list_safe(p_list_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_list_type TEXT;
  v_list_date DATE;
  v_parked_list_id UUID;
  v_task_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify ownership and get list info
  SELECT list_type, list_date INTO v_list_type, v_list_date
  FROM lists 
  WHERE id = p_list_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'List not found or not owned by user';
  END IF;
  
  -- Block system lists
  IF v_list_type IN ('completed', 'parked') THEN
    RAISE EXCEPTION 'Cannot delete system lists';
  END IF;
  
  -- Block today and future date lists
  IF v_list_type = 'date' AND v_list_date >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot delete current or future date lists';
  END IF;
  
  -- Check if list has tasks
  SELECT COUNT(*) INTO v_task_count
  FROM tasks
  WHERE list_id = p_list_id;
  
  IF v_task_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete non-empty list';
  END IF;
  
  -- Delete the list
  DELETE FROM lists 
  WHERE id = p_list_id 
    AND user_id = v_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION delete_list_safe(UUID) TO authenticated;

-- Remove old functions that reference old columns
DROP FUNCTION IF EXISTS complete_task(UUID);
DROP FUNCTION IF EXISTS set_task_highlight(UUID, DATE);
DROP FUNCTION IF EXISTS reorder_tasks(UUID[]);
DROP FUNCTION IF EXISTS roll_over_tasks(DATE, DATE);
DROP FUNCTION IF EXISTS spawn_daily_tasks(DATE);