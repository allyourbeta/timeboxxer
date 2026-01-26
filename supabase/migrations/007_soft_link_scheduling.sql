-- ============================================================================
-- SOFT-LINK SCHEDULING MIGRATION
-- ============================================================================

-- Step 1: Add scheduled_date to tasks
-- This is the date a task is scheduled for (independent of list_id)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Step 2: Create index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date 
ON tasks(user_id, scheduled_date) 
WHERE scheduled_date IS NOT NULL;

-- Step 3: Rename list_type 'parked' to 'inbox'
-- First, update existing rows
UPDATE lists 
SET list_type = 'inbox', name = 'Inbox'
WHERE list_type = 'parked';

-- Step 4: Migrate existing scheduled_at to scheduled_date
-- Extract date portion from scheduled_at timestamp
UPDATE tasks 
SET scheduled_date = DATE(scheduled_at::timestamp)
WHERE scheduled_at IS NOT NULL AND scheduled_date IS NULL;

-- Note: We keep scheduled_at for the TIME component (calendar slot)
-- scheduled_date = which day it appears on
-- scheduled_at = what time slot on the calendar

-- Step 5: Update trigger function for new users
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  -- Create Inbox list (was Parked)
  INSERT INTO lists (user_id, name, list_type)
  VALUES (NEW.id, 'Inbox', 'inbox');
  
  RETURN NEW;
END;
$$;
