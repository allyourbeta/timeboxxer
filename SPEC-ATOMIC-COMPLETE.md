# SPEC: Atomic Database Operations

## Overview

This spec converts 7 multi-step operations into atomic Postgres functions. This prevents partial failures and race conditions.

---

# PART 1: SQL (You run this in Supabase SQL Editor)

Copy everything between the `=== START SQL ===` and `=== END SQL ===` markers into Supabase SQL Editor and click Run.

```
=== START SQL ===
```

```sql
-- ============================================================================
-- ATOMIC RPC FUNCTIONS FOR TIMEBOXXER
-- Run this entire block in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REORDER_TASKS
-- Updates positions for multiple tasks in a single transaction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reorder_tasks(task_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i INT;
  task_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify all tasks belong to the calling user
  IF EXISTS (
    SELECT 1 FROM unnest(task_ids) AS tid
    LEFT JOIN tasks t ON t.id = tid
    WHERE t.user_id != v_user_id OR t.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized or invalid task IDs';
  END IF;

  -- Update positions in a single transaction
  FOR i IN 1..array_length(task_ids, 1) LOOP
    task_id := task_ids[i];
    UPDATE tasks 
    SET position = i - 1, updated_at = NOW()
    WHERE id = task_id;
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. DUPLICATE_LIST
-- Creates a new list with copies of all tasks from source list
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION duplicate_list(
  source_list_id UUID,
  new_list_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_new_list_id UUID;
  v_next_position INT;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify source list belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM lists WHERE id = source_list_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'List not found or unauthorized';
  END IF;
  
  -- Get next position for new list
  SELECT COALESCE(MAX(position), -1) + 1 INTO v_next_position
  FROM lists WHERE user_id = v_user_id;
  
  -- Create new list
  INSERT INTO lists (user_id, name, position, is_inbox, is_system, system_type)
  VALUES (v_user_id, new_list_name, v_next_position, false, false, NULL)
  RETURNING id INTO v_new_list_id;
  
  -- Copy all tasks from source to new list
  INSERT INTO tasks (
    user_id, list_id, title, notes, duration_minutes, color_index,
    position, is_completed, is_daily, energy_level, is_daily_highlight
  )
  SELECT 
    v_user_id, v_new_list_id, title, notes, duration_minutes, color_index,
    position, false, is_daily, energy_level, is_daily_highlight
  FROM tasks
  WHERE list_id = source_list_id;
  
  RETURN v_new_list_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. ROLL_OVER_TASKS
-- Moves all incomplete tasks from one list to another with proper positions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION roll_over_tasks(
  from_list_id UUID,
  to_list_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_start_position INT;
  v_count INT;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify both lists belong to user
  IF NOT EXISTS (
    SELECT 1 FROM lists WHERE id = from_list_id AND user_id = v_user_id
  ) OR NOT EXISTS (
    SELECT 1 FROM lists WHERE id = to_list_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Lists not found or unauthorized';
  END IF;
  
  -- Get starting position in destination list
  SELECT COALESCE(MAX(position), -1) + 1 INTO v_start_position
  FROM tasks WHERE list_id = to_list_id;
  
  -- Count tasks to move
  SELECT COUNT(*) INTO v_count
  FROM tasks
  WHERE list_id = from_list_id AND is_completed = false;
  
  -- Move all incomplete tasks with sequential positions
  WITH to_move AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 as offset
    FROM tasks
    WHERE list_id = from_list_id AND is_completed = false
  )
  UPDATE tasks t
  SET 
    list_id = to_list_id,
    position = v_start_position + m.offset,
    updated_at = NOW()
  FROM to_move m
  WHERE t.id = m.id;
  
  RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. COMPLETE_TASK
-- Marks task complete AND removes from schedule in one transaction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_task(p_task_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify task belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Task not found or unauthorized';
  END IF;
  
  -- Mark task complete
  UPDATE tasks
  SET 
    is_completed = true,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_task_id;
  
  -- Remove from schedule
  DELETE FROM scheduled_tasks
  WHERE task_id = p_task_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. CREATE_CALENDAR_TASK
-- Creates a task AND schedules it in one transaction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_calendar_task(
  p_title TEXT,
  p_start_time TIME,
  p_date DATE,
  p_duration_minutes INT DEFAULT 30,
  p_color_index INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_task_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Create task
  INSERT INTO tasks (
    user_id, list_id, title, duration_minutes, color_index,
    energy_level, position, is_completed, is_daily, is_daily_highlight
  )
  VALUES (
    v_user_id, NULL, p_title, p_duration_minutes, p_color_index,
    'medium', 0, false, false, false
  )
  RETURNING id INTO v_task_id;
  
  -- Schedule it
  INSERT INTO scheduled_tasks (user_id, task_id, scheduled_date, start_time)
  VALUES (v_user_id, v_task_id, p_date, p_start_time);
  
  RETURN v_task_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. SCHEDULE_TASK
-- Removes existing schedule (if any) and creates new one atomically
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION schedule_task(
  p_task_id UUID,
  p_date DATE,
  p_start_time TIME
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_schedule_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify task belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM tasks WHERE id = p_task_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Task not found or unauthorized';
  END IF;
  
  -- Remove existing schedule for this task (if any)
  DELETE FROM scheduled_tasks WHERE task_id = p_task_id;
  
  -- Create new schedule
  INSERT INTO scheduled_tasks (user_id, task_id, scheduled_date, start_time)
  VALUES (v_user_id, p_task_id, p_date, p_start_time)
  RETURNING id INTO v_schedule_id;
  
  RETURN v_schedule_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. SPAWN_DAILY_TASKS
-- Spawns today's instances of daily tasks, preventing duplicates
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION spawn_daily_tasks(p_today_list_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INT;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify list belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM lists WHERE id = p_today_list_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'List not found or unauthorized';
  END IF;
  
  -- Insert spawned tasks for daily tasks that don't already have today's instance
  WITH to_spawn AS (
    SELECT t.*
    FROM tasks t
    WHERE t.user_id = v_user_id
      AND t.is_daily = true
      AND t.daily_source_id IS NULL  -- Original daily tasks only
      AND NOT EXISTS (
        -- Check if already spawned for this list
        SELECT 1 FROM tasks spawned
        WHERE spawned.daily_source_id = t.id
          AND spawned.list_id = p_today_list_id
      )
  )
  INSERT INTO tasks (
    user_id, list_id, title, duration_minutes, color_index,
    is_daily, daily_source_id, position, is_completed,
    energy_level, is_daily_highlight
  )
  SELECT 
    v_user_id, p_today_list_id, title, duration_minutes, color_index,
    false, id, position, false,
    energy_level, false
  FROM to_spawn;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION reorder_tasks(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION duplicate_list(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION roll_over_tasks(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_task(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_calendar_task(TEXT, TIME, DATE, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_task(UUID, DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION spawn_daily_tasks(UUID) TO authenticated;
```

```
=== END SQL ===
```

---

# PART 2: Claude Code Instructions

After you've run the SQL above in Supabase, give Claude Code this prompt:

```
We've created Postgres RPC functions for atomic operations. Update the TypeScript code to use them.

## 1. Update src/api/tasks/crud.ts

Replace reorderTasks:
```typescript
export async function reorderTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reorder_tasks', { task_ids: taskIds })
  if (error) throw error
}
```

Replace completeTask:
```typescript
export async function completeTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('complete_task', { p_task_id: taskId })
  if (error) throw error
}
```

## 2. Update src/api/tasks/scheduling.ts

Replace createCalendarTask:
```typescript
export async function createCalendarTask(title: string, startTime: string, date: string): Promise<{ id: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('create_calendar_task', {
    p_title: title,
    p_start_time: startTime + ':00',
    p_date: date,
    p_duration_minutes: DEFAULT_CALENDAR_TASK_DURATION,
    p_color_index: getRandomColorIndex()
  })
  if (error) throw error
  return { id: data as string }
}
```

Replace rollOverTasks:
```typescript
export async function rollOverTasks(fromListId: string, toListId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('roll_over_tasks', {
    from_list_id: fromListId,
    to_list_id: toListId
  })
  if (error) throw error
  return data as number
}
```

## 3. Update src/api/tasks/daily.ts

Replace spawnDailyTasks:
```typescript
export async function spawnDailyTasks(todayListId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('spawn_daily_tasks', {
    p_today_list_id: todayListId
  })
  if (error) throw error
  return data as number
}
```

## 4. Update src/api/lists.ts

Replace duplicateList:
```typescript
export async function duplicateList(listId: string, newName: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('duplicate_list', {
    source_list_id: listId,
    new_list_name: newName
  })
  if (error) throw error
  return data as string
}
```

## 5. Update src/api/scheduled.ts

Replace scheduleTask:
```typescript
export async function scheduleTask(taskId: string, date: string, startTime: string): Promise<{ id: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('schedule_task', {
    p_task_id: taskId,
    p_date: date,
    p_start_time: startTime
  })
  if (error) throw error
  return { id: data as string }
}
```

## 6. Update src/state/useTaskStore.ts

The spawnDailyTasksForToday function needs to handle the new return type (number instead of array):
- Find where it calls spawnDailyTasks
- It now returns a count, not an array of tasks
- After calling it, call loadTasks() to refresh the task list

## 7. Build, commit, and deploy

```bash
npm run build
git add -A && git commit -m "feat: use atomic RPC functions for multi-step operations

- reorder_tasks: atomic position updates
- duplicate_list: atomic list + tasks copy
- roll_over_tasks: atomic task migration
- complete_task: atomic complete + unschedule
- create_calendar_task: atomic create + schedule
- schedule_task: atomic reschedule
- spawn_daily_tasks: atomic spawn with duplicate prevention

All operations now run as database transactions."
vercel --prod
```
```

---

# PART 3: Verification

After deployment, test these scenarios:

1. **Reorder tasks** - Drag to reorder, refresh, order persists
2. **Complete task** - Complete a scheduled task, it disappears from calendar
3. **Create calendar task** - Click on calendar to create task, it appears
4. **Duplicate list** - Duplicate a list with tasks, both appear
5. **Roll over** - Click "Roll over to tomorrow", tasks move
6. **Schedule task** - Drag task to calendar, it schedules
7. **Daily tasks** - If you have daily tasks, they spawn once (not duplicated on refresh)

---

# Summary

| Step | Who | Action |
|------|-----|--------|
| 1 | You | Copy SQL from Part 1 into Supabase SQL Editor, click Run |
| 2 | You | Give Claude Code the prompt from Part 2 |
| 3 | Claude Code | Updates 5 TypeScript files |
| 4 | Claude Code | Builds, commits, deploys |
| 5 | You | Test per Part 3 |
