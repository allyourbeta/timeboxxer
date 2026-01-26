# SPEC: Batch Reorder Database Operations

> **Goal**: Replace N individual database updates during drag-and-drop reordering with a single atomic batch operation.

## Problem Statement

Currently, reordering tasks or lists fires N separate HTTP requests to Supabase:

```typescript
// src/api/tasks.ts - reorderTask() and moveTaskWithPosition()
const updates = orderedTaskIds.map((id, index) =>
  supabase.from("tasks").update({ position: ... }).eq("id", id)
);
await Promise.all(updates);
```

**Impact:**
- **Latency**: Dragging in a list of 20 tasks fires 20 round-trips (~50-200ms each = 1-4 seconds total)
- **Partial failure**: If network drops mid-batch, some rows update and others don't → inconsistent state
- **Timestamps**: Each row gets a different `updated_at` value (minor but annoying for debugging)

## Solution Overview

Create two Postgres RPC functions that accept arrays and update all rows in a single transaction:

1. `batch_update_task_positions(task_ids UUID[], positions INT[])` 
2. `batch_update_list_positions(list_id UUID, column INT, list_ids UUID[], positions INT[])`

Then update the API layer to call these RPCs instead of N individual updates.

---

## Database Changes

### New Migration: `009_batch_reorder_functions.sql`

```sql
-- ============================================================================
-- BATCH REORDER FUNCTIONS
-- Migration: 009_batch_reorder_functions.sql
-- 
-- Provides atomic batch position updates for tasks and lists.
-- Reduces N network round-trips to 1 for drag-and-drop reordering.
-- ============================================================================

-- =============================================================================
-- BATCH UPDATE TASK POSITIONS
-- =============================================================================
-- Updates positions for multiple tasks in a single transaction.
-- Used when reordering tasks within a list or moving a task between lists.
--
-- @param p_task_ids UUID[] - Array of task IDs in desired order
-- @param p_positions INT[] - Array of corresponding positions (parallel to task_ids)
-- @returns void
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_update_task_positions(
  p_task_ids UUID[],
  p_positions INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_now := NOW();
  
  -- Validate arrays have same length
  IF array_length(p_task_ids, 1) != array_length(p_positions, 1) THEN
    RAISE EXCEPTION 'task_ids and positions arrays must have same length';
  END IF;
  
  -- Update all tasks in a single statement
  -- Uses unnest to join arrays with their indices
  UPDATE tasks t
  SET 
    position = u.new_position,
    updated_at = v_now
  FROM (
    SELECT 
      unnest(p_task_ids) AS task_id,
      unnest(p_positions) AS new_position
  ) u
  WHERE t.id = u.task_id
    AND t.user_id = v_user_id;
    
  -- Verify all tasks were updated (owned by user)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tasks updated - verify ownership';
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_task_positions(UUID[], INT[]) TO authenticated;


-- =============================================================================
-- BATCH UPDATE LIST POSITIONS
-- =============================================================================
-- Updates positions and optionally column for multiple lists in a single transaction.
-- Used when reordering lists within a column or moving between columns.
--
-- @param p_moved_list_id UUID - The list being moved (will have its column updated)
-- @param p_target_column INT - Column to move the list to (0 = left, 1 = right)
-- @param p_list_ids UUID[] - Array of list IDs in the target column in desired order
-- @param p_positions INT[] - Array of corresponding positions
-- @returns void
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_update_list_positions(
  p_moved_list_id UUID,
  p_target_column INT,
  p_list_ids UUID[],
  p_positions INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_now := NOW();
  
  -- Validate column value
  IF p_target_column NOT IN (0, 1) THEN
    RAISE EXCEPTION 'target_column must be 0 or 1';
  END IF;
  
  -- Validate arrays have same length
  IF array_length(p_list_ids, 1) != array_length(p_positions, 1) THEN
    RAISE EXCEPTION 'list_ids and positions arrays must have same length';
  END IF;
  
  -- First, update the moved list's column
  UPDATE lists
  SET 
    panel_column = p_target_column,
    updated_at = v_now
  WHERE id = p_moved_list_id
    AND user_id = v_user_id;
  
  -- Then update all list positions in target column
  UPDATE lists l
  SET 
    position = u.new_position,
    updated_at = v_now
  FROM (
    SELECT 
      unnest(p_list_ids) AS list_id,
      unnest(p_positions) AS new_position
  ) u
  WHERE l.id = u.list_id
    AND l.user_id = v_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_list_positions(UUID, INT, UUID[], INT[]) TO authenticated;


-- =============================================================================
-- MOVE TASK WITH POSITION (ATOMIC)
-- =============================================================================
-- Moves a task to a new list AND updates positions in one transaction.
-- Replaces the two-step move + reorder pattern.
--
-- @param p_task_id UUID - The task being moved
-- @param p_new_list_id UUID - Destination list
-- @param p_task_ids UUID[] - All tasks in destination list in new order
-- @param p_positions INT[] - Corresponding positions
-- @returns void
-- =============================================================================
CREATE OR REPLACE FUNCTION move_task_with_positions(
  p_task_id UUID,
  p_new_list_id UUID,
  p_task_ids UUID[],
  p_positions INT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_now := NOW();
  
  -- Validate arrays have same length
  IF array_length(p_task_ids, 1) != array_length(p_positions, 1) THEN
    RAISE EXCEPTION 'task_ids and positions arrays must have same length';
  END IF;
  
  -- Verify destination list belongs to user
  IF NOT EXISTS (SELECT 1 FROM lists WHERE id = p_new_list_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Destination list not found or not owned by user';
  END IF;
  
  -- Move the task to new list (clears soft-link and schedule)
  UPDATE tasks
  SET 
    list_id = p_new_list_id,
    planned_list_date = NULL,
    calendar_slot_time = NULL,
    updated_at = v_now
  WHERE id = p_task_id
    AND user_id = v_user_id;
  
  -- Update positions for all tasks in destination list
  UPDATE tasks t
  SET 
    position = u.new_position,
    updated_at = v_now
  FROM (
    SELECT 
      unnest(p_task_ids) AS task_id,
      unnest(p_positions) AS new_position
  ) u
  WHERE t.id = u.task_id
    AND t.user_id = v_user_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION move_task_with_positions(UUID, UUID, UUID[], INT[]) TO authenticated;
```

---

## API Layer Changes

### `src/api/tasks.ts`

Replace `reorderTask()` and `moveTaskWithPosition()`:

```typescript
// BEFORE (N updates)
export async function reorderTask(
  taskId: string,
  orderedTaskIds: string[]
): Promise<void> {
  const supabase = createClient();
  const POSITION_GAP = 1000;

  const updates = orderedTaskIds.map((id, index) =>
    supabase
      .from("tasks")
      .update({ position: (index + 1) * POSITION_GAP, updated_at: new Date().toISOString() })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  // ... error handling
}

// AFTER (1 RPC call)
export async function reorderTask(
  taskId: string,
  orderedTaskIds: string[]
): Promise<void> {
  const supabase = createClient();
  const POSITION_GAP = 1000;

  const positions = orderedTaskIds.map((_, index) => (index + 1) * POSITION_GAP);

  const { error } = await supabase.rpc('batch_update_task_positions', {
    p_task_ids: orderedTaskIds,
    p_positions: positions
  });

  if (error) throw error;
}
```

```typescript
// BEFORE (1 move + N position updates)
export async function moveTaskWithPosition(
  taskId: string,
  newListId: string,
  orderedTaskIds: string[],
): Promise<void> {
  const supabase = createClient();
  const POSITION_GAP = 1000;

  // First, move the task
  const { error: moveError } = await supabase
    .from("tasks")
    .update({ list_id: newListId, ... })
    .eq("id", taskId);

  if (moveError) throw moveError;

  // Then update positions (N updates)
  const updates = orderedTaskIds.map((id, index) => ...);
  await Promise.all(updates);
}

// AFTER (1 RPC call)
export async function moveTaskWithPosition(
  taskId: string,
  newListId: string,
  orderedTaskIds: string[],
): Promise<void> {
  const supabase = createClient();
  const POSITION_GAP = 1000;

  const positions = orderedTaskIds.map((_, index) => (index + 1) * POSITION_GAP);

  const { error } = await supabase.rpc('move_task_with_positions', {
    p_task_id: taskId,
    p_new_list_id: newListId,
    p_task_ids: orderedTaskIds,
    p_positions: positions
  });

  if (error) throw error;
}
```

### `src/api/lists.ts`

Replace `reorderList()`:

```typescript
// BEFORE (1 column update + N position updates)
export async function reorderList(
  listId: string,
  targetColumn: 0 | 1,
  orderedListIds: string[]
): Promise<void> {
  // ... N separate updates
}

// AFTER (1 RPC call)
export async function reorderList(
  listId: string,
  targetColumn: 0 | 1,
  orderedListIds: string[]
): Promise<void> {
  const supabase = createClient();
  const POSITION_GAP = 1000;

  const positions = orderedListIds.map((_, index) => (index + 1) * POSITION_GAP);

  const { error } = await supabase.rpc('batch_update_list_positions', {
    p_moved_list_id: listId,
    p_target_column: targetColumn,
    p_list_ids: orderedListIds,
    p_positions: positions
  });

  if (error) throw error;
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/009_batch_reorder_functions.sql` | **CREATE** - New migration with RPC functions |
| `src/api/tasks.ts` | **MODIFY** - `reorderTask()`, `moveTaskWithPosition()` to use RPC |
| `src/api/lists.ts` | **MODIFY** - `reorderList()` to use RPC |

**No changes needed to:**
- Zustand stores (optimistic updates stay the same)
- Components (they don't know about API internals)
- Types

---

## Testing Plan

### Manual Testing
1. **Task reorder within list**: Drag task up/down in same list → verify smooth, no snap-back
2. **Task move between lists**: Drag task to different list → verify it moves and maintains position
3. **List reorder within column**: Drag list up/down → verify smooth reorder
4. **List move between columns**: Drag list to other column → verify column + position update
5. **Error recovery**: Disable network mid-drag → verify UI reverts on error
6. **Concurrent edits**: Open two tabs, reorder in both → verify no corruption

### Edge Cases
- Empty arrays (should be no-op or error gracefully)
- Single item reorder (should still work)
- Large lists (20+ items) - verify no timeout
- Rapid successive drags - verify no race conditions

---

## Rollback Plan

If issues arise:
1. The old N-update code can coexist temporarily
2. RPC functions can be dropped without data migration
3. API functions can fall back to old implementation behind a feature flag

---

## Success Metrics

- **Before**: 20-item reorder = 20 requests × ~100ms = ~2 seconds
- **After**: 20-item reorder = 1 request × ~100ms = ~100ms
- **Target**: 95th percentile reorder latency < 200ms
