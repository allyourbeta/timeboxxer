# Timeboxxer Schema Redesign - Final Spec

## Background

We spent several days debugging issues caused by a flawed data model. The old model had:
- `home_list_id` - where a task "lives"
- `committed_date` - which date list it appears in

These two fields could get out of sync, creating "ghost tasks" that existed but were invisible, and lists that showed "0 tasks" but couldn't be deleted.

**The fix:** One task, one list. Simple.

---

## The Model

### Lists

| Type | Description | Created by | Can be deleted? |
|------|-------------|------------|-----------------|
| `user` | Custom lists | User | Yes (if empty) |
| `date` | Date-based lists | System (auto-created) | Yes (if empty and in past) |
| `completed` | Finished tasks | System (one per user) | **No** |
| `parked` | Quick thoughts inbox | System (one per user) | **No** |

### Tasks

Each task has:
- `list_id` - The ONE list this task belongs to
- `scheduled_at` - If set, task appears on calendar (task stays in its list)
- `previous_list_id` - Where it was before completion (for uncomplete)
- `completed_at` - When it was completed

**Key insight:** A task on the calendar does NOT move to a different list. It stays in its list and has `scheduled_at` set. This keeps things simple.

---

## Operations

### Create Task

```
INSERT INTO tasks (list_id, title, ...)
```

Task belongs to that list. Done.

### Move Task (Drag between lists)

```
UPDATE tasks SET list_id = new_list_id, scheduled_at = NULL WHERE id = task_id
```

- Task moves to new list
- `scheduled_at` is cleared (if it was scheduled, it's no longer on calendar)

### Schedule Task (Drag to calendar)

```
UPDATE tasks SET scheduled_at = '2026-01-22T14:30:00' WHERE id = task_id
```

- Task stays in its current list
- Task appears on calendar at that time
- Task is still visible in its list (but maybe styled differently to show it's scheduled)

### Reschedule Task (Drag to different time on calendar)

```
UPDATE tasks SET scheduled_at = '2026-01-22T16:00:00' WHERE id = task_id
```

- Just update the time

### Unschedule Task (Drag from calendar to a list)

```
UPDATE tasks SET list_id = new_list_id, scheduled_at = NULL WHERE id = task_id
```

- Task moves to the target list
- `scheduled_at` is cleared

### Complete Task

```
UPDATE tasks SET 
  previous_list_id = list_id,
  list_id = completed_list_id,
  completed_at = NOW(),
  scheduled_at = NULL
WHERE id = task_id
```

- Remember where it came from
- Move to Completed list
- Clear schedule (no longer on calendar)

### Uncomplete Task

```
-- First, check if previous_list_id still exists
-- If not, use Parked list

UPDATE tasks SET 
  list_id = COALESCE(previous_list_id, parked_list_id),
  previous_list_id = NULL,
  completed_at = NULL
WHERE id = task_id
```

- Move back to where it was (or Parked if that list is gone)
- Clear the completion timestamp

### Delete Task

```
DELETE FROM tasks WHERE id = task_id
```

### Clear List

```
DELETE FROM tasks WHERE list_id = list_id
```

### Delete List

Only allowed if:
1. List is empty (no tasks)
2. List is not Completed or Parked (system lists)
3. If date list, date must be in the past

```
DELETE FROM lists WHERE id = list_id
```

---

## Database Schema

### lists

```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  list_type TEXT NOT NULL CHECK (list_type IN ('user', 'date', 'completed', 'parked')),
  list_date DATE,  -- Only for list_type = 'date'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Date lists must have a date, others must not
  CONSTRAINT date_list_has_date CHECK (
    (list_type = 'date' AND list_date IS NOT NULL) OR
    (list_type != 'date' AND list_date IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_lists_user_id ON lists(user_id);
CREATE UNIQUE INDEX idx_lists_user_date ON lists(user_id, list_date) WHERE list_type = 'date';
CREATE UNIQUE INDEX idx_lists_user_completed ON lists(user_id) WHERE list_type = 'completed';
CREATE UNIQUE INDEX idx_lists_user_parked ON lists(user_id) WHERE list_type = 'parked';
```

### tasks

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  notes TEXT,
  
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color_index INTEGER NOT NULL DEFAULT 0,
  energy_level TEXT NOT NULL DEFAULT 'medium' CHECK (energy_level IN ('high', 'medium', 'low')),
  
  scheduled_at TIMESTAMP,  -- Local time, no timezone. If set, appears on calendar.
  
  previous_list_id UUID REFERENCES lists(id) ON DELETE SET NULL,  -- For uncomplete
  completed_at TIMESTAMPTZ,  -- When completed
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_list_id ON tasks(list_id);
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_at) WHERE scheduled_at IS NOT NULL;
```

### Row Level Security (RLS)

```sql
-- Users can only see their own lists
CREATE POLICY lists_user_policy ON lists
  FOR ALL USING (user_id = auth.uid());

-- Users can only see their own tasks
CREATE POLICY tasks_user_policy ON tasks
  FOR ALL USING (user_id = auth.uid());

-- Users can only move tasks to their own lists
CREATE POLICY tasks_move_policy ON tasks
  FOR UPDATE USING (
    user_id = auth.uid() 
    AND list_id IN (SELECT id FROM lists WHERE user_id = auth.uid())
  );
```

---

## System List Initialization

On user signup (or first app load), ensure these exist:

```sql
-- Completed list
INSERT INTO lists (user_id, name, list_type)
VALUES (auth.uid(), 'Completed', 'completed')
ON CONFLICT DO NOTHING;

-- Parked list  
INSERT INTO lists (user_id, name, list_type)
VALUES (auth.uid(), 'Parked Items', 'parked')
ON CONFLICT DO NOTHING;
```

---

## Migration from Old Schema

### Step 1: Add new columns

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS previous_list_id UUID REFERENCES lists(id) ON DELETE SET NULL;
```

### Step 2: Ensure system lists exist

```sql
-- For each user, create Completed and Parked if missing
INSERT INTO lists (user_id, name, list_type)
SELECT DISTINCT user_id, 'Completed', 'completed' FROM tasks
ON CONFLICT DO NOTHING;

INSERT INTO lists (user_id, name, list_type)
SELECT DISTINCT user_id, 'Parked Items', 'parked' FROM tasks
ON CONFLICT DO NOTHING;
```

### Step 3: Create date lists for all committed_dates

```sql
-- Ensure date lists exist for every committed_date
INSERT INTO lists (user_id, name, list_type, list_date)
SELECT DISTINCT user_id, to_char(committed_date, 'Mon DD, YYYY'), 'date', committed_date
FROM tasks
WHERE committed_date IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Step 4: Move completed tasks

```sql
UPDATE tasks t
SET list_id = (
  SELECT id FROM lists 
  WHERE user_id = t.user_id AND list_type = 'completed'
)
WHERE is_completed = true;
```

### Step 5: Move tasks with committed_date to date lists

```sql
-- For non-completed tasks with a committed_date, move to the date list
UPDATE tasks t
SET list_id = (
  SELECT id FROM lists 
  WHERE user_id = t.user_id 
    AND list_type = 'date' 
    AND list_date = t.committed_date
)
WHERE committed_date IS NOT NULL 
  AND is_completed = false;
```

### Step 6: Keep remaining tasks in home_list_id

Tasks that have no `committed_date` and are not completed stay where they are. Their `home_list_id` becomes `list_id`.

```sql
-- Rename column (if home_list_id exists and list_id doesn't)
-- Or just ensure list_id = home_list_id for remaining tasks
UPDATE tasks SET list_id = home_list_id 
WHERE list_id IS NULL AND home_list_id IS NOT NULL;
```

### Step 7: Handle ghost tasks

Ghost tasks have `home_list_id` pointing to a date list but `committed_date = NULL`. After step 6, they'll be in the date list (visible now). This is correct - they were always supposed to be there.

### Step 8: Drop old columns

```sql
ALTER TABLE tasks DROP COLUMN IF EXISTS home_list_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS committed_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS is_completed;
```

---

## Frontend Changes

### Task Store (useTaskStore)

```typescript
interface TaskStore {
  tasks: Task[]
  
  // Load
  loadTasks: () => Promise<void>
  
  // CRUD
  createTask: (listId: string, title: string) => Promise<Task>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  
  // Move
  moveTask: (taskId: string, newListId: string) => Promise<void>
  
  // Schedule
  scheduleTask: (taskId: string, scheduledAt: string) => Promise<void>
  unscheduleTask: (taskId: string) => Promise<void>
  
  // Complete
  completeTask: (taskId: string) => Promise<void>
  uncompleteTask: (taskId: string) => Promise<void>
  
  // Bulk
  clearList: (listId: string) => Promise<void>
}
```

### List Store (useListStore)

```typescript
interface ListStore {
  lists: List[]
  
  // Load
  loadLists: () => Promise<void>
  
  // CRUD
  createList: (name: string) => Promise<List>
  updateList: (listId: string, name: string) => Promise<void>
  deleteList: (listId: string) => Promise<void>
  
  // System
  ensureDateList: (date: string) => Promise<List>
  getCompletedList: () => List
  getParkedList: () => List
}
```

### Drag Handler

```typescript
const handleDragEnd = async (result: DropResult) => {
  const { source, destination, draggableId } = result
  if (!destination) return
  
  const taskId = draggableId
  const destId = destination.droppableId
  
  // Drag to calendar slot
  if (destId.startsWith('calendar-slot-')) {
    const time = parseSlotTime(destId)  // e.g., "14:30"
    const today = getLocalTodayISO()
    const scheduledAt = `${today}T${time}:00`
    await scheduleTask(taskId, scheduledAt)
    return
  }
  
  // Drag to a list
  await moveTask(taskId, destId)
}
```

### Display Logic

```typescript
// Tasks for a list
const getTasksForList = (listId: string) => {
  return tasks.filter(t => t.list_id === listId)
}

// Tasks on calendar (from ANY list)
const getScheduledTasks = () => {
  return tasks.filter(t => t.scheduled_at !== null)
}
```

This is the key simplification: **display logic is trivial**. No special cases.

---

## Testing Checklist

### Basic CRUD
- [ ] Create task in user list → appears in that list
- [ ] Create task in date list → appears in that list
- [ ] Create task in Parked list → appears there
- [ ] Delete task → gone

### Moving
- [ ] Drag from user list to user list → moves
- [ ] Drag from user list to date list → moves
- [ ] Drag from date list to user list → moves
- [ ] Drag from date list to date list → moves

### Calendar
- [ ] Drag task to calendar → appears at that time, stays in original list
- [ ] Drag scheduled task to different time → time updates
- [ ] Drag scheduled task to a list → moves to list, removed from calendar
- [ ] Task visible in both its list AND on calendar when scheduled

### Complete / Uncomplete
- [ ] Complete task → moves to Completed list
- [ ] Complete scheduled task → moves to Completed, removed from calendar
- [ ] Uncomplete task → returns to previous list
- [ ] Uncomplete when previous list deleted → goes to Parked

### List Operations
- [ ] Clear list → all tasks deleted
- [ ] Delete empty user list → list gone
- [ ] Delete non-empty list → blocked
- [ ] Cannot delete Completed list
- [ ] Cannot delete Parked list
- [ ] Delete past date list (empty) → list gone
- [ ] Cannot delete today/future date list

### Edge Cases
- [ ] Create task in date list, schedule it → visible in list AND calendar
- [ ] Move scheduled task to different list → stays on calendar
- [ ] Complete task that was in a now-deleted list → uncomplete goes to Parked

---

## What We're NOT Implementing (Yet)

- Manual reorder (tasks ordered by created_at)
- Highlights
- Daily recurring tasks
- Rollover
- Soft delete

These can be added later, one at a time, after the core is stable.

---

## Summary

**Before:** Two fields (`home_list_id`, `committed_date`) that could get out of sync.

**After:** One field (`list_id`). A task belongs to one list. Period.

**Calendar:** Setting `scheduled_at` puts a task on the calendar. The task stays in its list. This avoids the complexity of a separate "Scheduled" list.

**Complete:** Task moves to Completed list. `previous_list_id` remembers where it was. Uncomplete returns it.

This is the simplest possible model that supports all required operations.
