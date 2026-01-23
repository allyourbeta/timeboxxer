# Database Schema Documentation

> **IMPORTANT**: This file documents the actual database schema.
> Before writing any SQL or database-related code, READ THIS FILE.
> After running any migration, UPDATE THIS FILE.
>
> Last verified: 2026-01-12

---

## Overview

Timeboxxer uses Supabase (Postgres) with Row Level Security (RLS) for multi-user data isolation.

**Key principle**: Every table has `user_id` and RLS policies ensuring users only see/modify their own data.

---

## Tables

### profiles

Extends Supabase `auth.users`. Created automatically via trigger on signup.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | - | PK, references auth.users(id) |
| email | TEXT | YES | - | User's email |
| display_name | TEXT | YES | - | Display name |
| current_palette_id | TEXT | NO | 'ocean-bold' | Active color palette |
| created_at | TIMESTAMPTZ | NO | NOW() | Record creation |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update |

**RLS**: Users can only read/update their own profile.

---

### lists

Task containers. Each user has one special "Inbox" list.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → auth.users, owner |
| name | TEXT | NO | - | List name |
| is_inbox | BOOLEAN | NO | false | True for the Inbox list |
| position | INTEGER | NO | 0 | Display order (unique per user) |
| created_at | TIMESTAMPTZ | NO | NOW() | Record creation |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update |

**Constraints**:
- `UNIQUE(user_id, position)` — No duplicate positions per user
- Only one `is_inbox = true` per user (enforced by trigger or app logic)

**RLS**: Users can only CRUD their own lists.

---

### tasks

Individual tasks belonging to a list (or orphaned if moved to calendar).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → auth.users, owner |
| list_id | UUID | YES | - | FK → lists, NULL if moved to calendar |
| title | TEXT | NO | - | Task description |
| notes | TEXT | YES | - | Free-form notes/comments |
| duration_minutes | INTEGER | NO | 15 | Duration: 15, 30, 45, 60, etc. |
| color_index | INTEGER | NO | 0 | Index into user's current palette (0-11) |
| position | INTEGER | YES | - | Order within list, NULL if not in list |
| is_completed | BOOLEAN | NO | false | Completion status |
| completed_at | TIMESTAMPTZ | YES | - | When completed, NULL if not done |
| created_at | TIMESTAMPTZ | NO | NOW() | Record creation |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update |

**Constraints**:
- `UNIQUE(list_id, position) WHERE list_id IS NOT NULL` — No duplicate positions within a list
- `duration_minutes` should be multiples of 15 (enforced by app)

**RLS**: Users can only CRUD their own tasks.

---

### scheduled_tasks

Join table linking tasks to calendar slots. A task can only be scheduled once.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → auth.users, owner |
| task_id | UUID | NO | - | FK → tasks (UNIQUE - one schedule per task) |
| scheduled_date | DATE | NO | - | The date scheduled |
| start_time | TIME | NO | - | Start time (e.g., '14:30:00') |
| created_at | TIMESTAMPTZ | NO | NOW() | Record creation |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update |

**Constraints**:
- `UNIQUE(task_id)` — A task can only be scheduled once at a time

**RLS**: Users can only CRUD their own scheduled tasks.

---

## Indexes

```sql
-- Lists: fast lookup by user, ordered by position
CREATE INDEX idx_lists_user_position ON lists(user_id, position);

-- Tasks: fast lookup by user and list
CREATE INDEX idx_tasks_user_list ON tasks(user_id, list_id);

-- Tasks: fast lookup of completed tasks for "what did I do?" queries
CREATE INDEX idx_tasks_completed ON tasks(user_id, is_completed, completed_at DESC)
  WHERE is_completed = true;

-- Scheduled: fast lookup by user and date (today's calendar)
CREATE INDEX idx_scheduled_user_date ON scheduled_tasks(user_id, scheduled_date);
```

---

## Row Level Security (RLS)

All tables have RLS enabled with identical policy pattern:

```sql
-- Enable RLS
ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;

-- SELECT: user can only see their own rows
CREATE POLICY "Users can view own [table]" ON [table]
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: user can only insert rows for themselves
CREATE POLICY "Users can insert own [table]" ON [table]
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can only update their own rows
CREATE POLICY "Users can update own [table]" ON [table]
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: user can only delete their own rows
CREATE POLICY "Users can delete own [table]" ON [table]
  FOR DELETE USING (auth.uid() = user_id);
```

---

## Functions

### create_profile_for_user()

Trigger function that creates a profile and Inbox list when a new user signs up.

```sql
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
  
  -- Create Inbox list
  INSERT INTO lists (user_id, name, is_inbox, position)
  VALUES (NEW.id, 'Inbox', true, 0);
  
  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();
```

### reorder_list_positions(p_user_id, p_list_id, p_new_position)

Safely reorders lists or tasks within a list, handling position conflicts.

```sql
CREATE OR REPLACE FUNCTION reorder_list_positions(
  p_list_id UUID,
  p_new_position INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_old_position INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  -- Get current position
  SELECT position INTO v_old_position
  FROM lists
  WHERE id = p_list_id AND user_id = v_user_id;
  
  IF v_old_position IS NULL THEN
    RAISE EXCEPTION 'List not found or not owned by user';
  END IF;
  
  IF v_old_position = p_new_position THEN
    RETURN; -- No change needed
  END IF;
  
  -- Shift other lists
  IF p_new_position < v_old_position THEN
    -- Moving up: shift others down
    UPDATE lists
    SET position = position + 1, updated_at = NOW()
    WHERE user_id = v_user_id
      AND position >= p_new_position
      AND position < v_old_position;
  ELSE
    -- Moving down: shift others up
    UPDATE lists
    SET position = position - 1, updated_at = NOW()
    WHERE user_id = v_user_id
      AND position > v_old_position
      AND position <= p_new_position;
  END IF;
  
  -- Move target list
  UPDATE lists
  SET position = p_new_position, updated_at = NOW()
  WHERE id = p_list_id AND user_id = v_user_id;
END;
$$;
```

### duplicate_list(p_list_id, p_new_name)

Duplicates a list and all its tasks.

```sql
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
  
  -- Copy tasks (not scheduled, not completed)
  INSERT INTO tasks (user_id, list_id, title, notes, duration_minutes, color_index, position)
  SELECT v_user_id, v_new_list_id, title, notes, duration_minutes, color_index, position
  FROM tasks
  WHERE list_id = p_list_id AND user_id = v_user_id;
  
  RETURN v_new_list_id;
END;
$$;
```

---

## Migration: Initial Schema

File: `supabase/migrations/001_initial_schema.sql`

```sql
-- ============================================================================
-- TIMEBOXXER INITIAL SCHEMA
-- ============================================================================

-- Profiles table
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
  
  UNIQUE(task_id)
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
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO lists (user_id, name, is_inbox, position)
  VALUES (NEW.id, 'Inbox', true, 0);
  
  RETURN NEW;
END;
$$;

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
  
  IF NOT EXISTS (SELECT 1 FROM lists WHERE id = p_list_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'List not found or not owned by user';
  END IF;
  
  SELECT COALESCE(MAX(position), -1) + 1 INTO v_max_position
  FROM lists WHERE user_id = v_user_id;
  
  INSERT INTO lists (user_id, name, is_inbox, position)
  VALUES (v_user_id, p_new_name, false, v_max_position)
  RETURNING id INTO v_new_list_id;
  
  INSERT INTO tasks (user_id, list_id, title, notes, duration_minutes, color_index, position)
  SELECT v_user_id, v_new_list_id, title, notes, duration_minutes, color_index, position
  FROM tasks
  WHERE list_id = p_list_id AND user_id = v_user_id;
  
  RETURN v_new_list_id;
END;
$$;
```

---

## Common Queries

### Get today's calendar

```sql
SELECT 
  st.id,
  st.scheduled_date,
  st.start_time,
  t.id as task_id,
  t.title,
  t.duration_minutes,
  t.color_index,
  t.is_completed,
  t.notes
FROM scheduled_tasks st
JOIN tasks t ON st.task_id = t.id
WHERE st.user_id = auth.uid()
  AND st.scheduled_date = CURRENT_DATE
ORDER BY st.start_time;
```

### Get tasks in a list

```sql
SELECT *
FROM tasks
WHERE list_id = $1 AND user_id = auth.uid()
ORDER BY position;
```

### Get completed tasks this week

```sql
SELECT *
FROM tasks
WHERE user_id = auth.uid()
  AND is_completed = true
  AND completed_at >= NOW() - INTERVAL '7 days'
ORDER BY completed_at DESC;
```

### Move task to calendar (remove from list)

```sql
-- Set list_id to NULL (task is now calendar-only)
UPDATE tasks
SET list_id = NULL, position = NULL, updated_at = NOW()
WHERE id = $1 AND user_id = auth.uid();
```

### Copy task to calendar (keep in list)

```sql
-- Just create scheduled_task, don't modify the task itself
INSERT INTO scheduled_tasks (user_id, task_id, scheduled_date, start_time)
VALUES (auth.uid(), $1, $2, $3);
```

---

## Updating This File

After running any migration:

1. Run this query to verify schema:
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

2. Update relevant table section above
3. Commit with message: `docs: Update SCHEMA.md after [migration name]`
