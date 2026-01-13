-- ============================================================================
-- TIMEBOXXER INITIAL SCHEMA
-- Migration: 001_initial_schema.sql
-- Created: 2026-01-12
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  current_palette_id TEXT NOT NULL DEFAULT 'ocean-bold',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lists table
CREATE TABLE IF NOT EXISTS lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_inbox BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, position)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  color_index INTEGER NOT NULL DEFAULT 0,
  position INTEGER,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scheduled tasks table
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(task_id)  -- A task can only be scheduled once
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_lists_user_position ON lists(user_id, position);
CREATE INDEX idx_tasks_user_list ON tasks(user_id, list_id);
CREATE INDEX idx_tasks_completed ON tasks(user_id, is_completed, completed_at DESC)
  WHERE is_completed = true;
CREATE INDEX idx_scheduled_user_date ON scheduled_tasks(user_id, scheduled_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Lists policies
CREATE POLICY "Users can view own lists" ON lists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lists" ON lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lists" ON lists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lists" ON lists
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Scheduled tasks policies
CREATE POLICY "Users can view own scheduled tasks" ON scheduled_tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scheduled tasks" ON scheduled_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scheduled tasks" ON scheduled_tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scheduled tasks" ON scheduled_tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Create profile and Inbox on signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Create Inbox list
  INSERT INTO lists (user_id, name, is_inbox, position)
  VALUES (NEW.id, 'Inbox', true, 0);
  
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- Duplicate list function
CREATE OR REPLACE FUNCTION duplicate_list(
  p_list_id UUID,
  p_new_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_list_id UUID;
  v_max_position INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM lists WHERE id = p_list_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'List not found or not owned by user';
  END IF;
  
  -- Get next position
  SELECT COALESCE(MAX(position), -1) + 1 INTO v_max_position
  FROM lists WHERE user_id = v_user_id;
  
  -- Create new list
  INSERT INTO lists (user_id, name, is_inbox, position)
  VALUES (v_user_id, p_new_name, false, v_max_position)
  RETURNING id INTO v_new_list_id;
  
  -- Copy tasks (reset completion status, not scheduled)
  INSERT INTO tasks (user_id, list_id, title, notes, duration_minutes, color_index, position)
  SELECT v_user_id, v_new_list_id, title, notes, duration_minutes, color_index, position
  FROM tasks
  WHERE list_id = p_list_id AND user_id = v_user_id;
  
  RETURN v_new_list_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION duplicate_list(UUID, TEXT) TO authenticated;
