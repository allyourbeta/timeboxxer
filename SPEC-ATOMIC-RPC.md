# SPEC: Atomic RPC Functions for Multi-Step Operations

## The Problem

Several operations in Timeboxxer involve multiple database calls:

| Operation | Current Implementation | Risk |
|-----------|----------------------|------|
| `reorderTasks` | N separate UPDATE calls | Partial reorder if browser closes mid-operation |
| `duplicateList` | SELECT + SELECT + INSERT + INSERT | Orphaned list or missing tasks |
| `rollOverTasks` | SELECT + N UPDATEs | Some tasks moved, others stuck |

With multiple users or browser tabs, these can cause:
- Partial state (half-done operations)
- Race conditions (two tabs reordering same list)
- Inconsistent data

## The Solution

Move these operations to **Postgres RPC functions** that run in a single transaction. Either everything succeeds, or everything rolls back.

## RPC Function 1: reorder_tasks

**Current JS code:**
```typescript
export async function reorderTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient()
  const updates = taskIds.map((id, index) => 
    supabase.from('tasks').update({ position: index }).eq('id', id)
  )
  await Promise.all(updates)  // N separate calls!
}
```

**New Postgres function:**

```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION reorder_tasks(task_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  i INT;
  task_id UUID;
BEGIN
  -- Verify all tasks belong to the calling user
  IF EXISTS (
    SELECT 1 FROM unnest(task_ids) AS tid
    LEFT JOIN tasks t ON t.id = tid
    WHERE t.user_id != auth.uid() OR t.id IS NULL
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
```

**New JS code:**
```typescript
export async function reorderTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reorder_tasks', { task_ids: taskIds })
  if (error) throw error
}
```

## RPC Function 2: duplicate_list

**Current JS code does:**
1. SELECT original list
2. SELECT all tasks in list
3. INSERT new list
4. INSERT all tasks (copied)

**New Postgres function:**

```sql
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
  SELECT v_user_id, new_list_name, v_next_position, false, false, NULL
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
```

**New JS code:**
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

## RPC Function 3: roll_over_tasks

**New Postgres function:**

```sql
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
```

**New JS code:**
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

## Implementation Steps

### Step 1: Create RPC functions in Supabase

Run all three `CREATE OR REPLACE FUNCTION` statements in Supabase SQL Editor.

### Step 2: Update TypeScript code

**src/api/tasks/crud.ts** - Update `reorderTasks`:
```typescript
export async function reorderTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reorder_tasks', { task_ids: taskIds })
  if (error) throw error
}
```

**src/api/tasks/scheduling.ts** - Update `rollOverTasks`:
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

**src/api/lists.ts** - Update `duplicateList`:
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

### Step 3: Test

1. **Reorder:** Drag tasks to reorder, refresh page, order should persist
2. **Duplicate:** Duplicate a list with tasks, both list and tasks should appear
3. **Roll over:** Click "Roll over to tomorrow", tasks should move atomically

### Step 4: Deploy

```bash
npm run build
git add -A && git commit -m "feat: atomic RPC functions for multi-step operations

- reorder_tasks: single transaction for reordering
- duplicate_list: atomic list + tasks duplication  
- roll_over_tasks: atomic task migration between lists

All operations now run server-side in transactions, preventing partial state from browser disconnects or race conditions."
vercel --prod
```

## Benefits

| Before | After |
|--------|-------|
| N round trips to database | 1 round trip |
| Partial failures possible | All-or-nothing |
| Race conditions between tabs | Server handles atomically |
| Client must be trusted | Server validates ownership |

## Security Note

All functions use `SECURITY DEFINER` and check `auth.uid()` to ensure users can only operate on their own data. This is defense-in-depth on top of RLS policies.
