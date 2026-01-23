# Timeboxxer Data Layer Rewrite Specification v4

## Document Purpose

This spec defines a complete rewrite of Timeboxxer's data layer. 

**Version 4 contains exactly four targeted fixes from final review:**

| # | Bug | Source | Fix |
|---|-----|--------|-----|
| 1 | Performance: getTasks fetches ALL tasks | DeepSeek | Fetch only incomplete; add separate getCompletedTasks() |
| 2 | State rollback discards concurrent changes | DeepSeek | Reload from server on error instead of snapshot rollback |
| 3 | TIMESTAMPTZ + "no Z" mismatch | ChatGPT | Change column to TIMESTAMP (no timezone) |
| 4 | List position index blocks system lists | ChatGPT | Add `WHERE is_system = false` to index |

**All other content is identical to v3.**

---

# V4 CHANGES ONLY

The following sections show ONLY what changed from v3. All other v3 content remains unchanged.

---

## Change 1: Task Schema - scheduled_at column type

**v3 (wrong):**
```sql
scheduled_at        TIMESTAMPTZ,
```

**v4 (fixed):**
```sql
-- WHEN scheduled (appears on calendar)
-- Using TIMESTAMP (no timezone) because this is wall-clock time
-- "2:30 PM" means 2:30 PM on user's calendar, not an absolute instant
scheduled_at        TIMESTAMP,
```

**Rationale:** A scheduled time is wall-clock time. If user schedules "2:30 PM" and travels to a different timezone, they still want to see "2:30 PM" - it's not an absolute instant.

---

## Change 2: List Schema - position index excludes system lists

**v3 (wrong):**
```sql
CREATE UNIQUE INDEX idx_lists_user_position ON lists(user_id, position);
```

**v4 (fixed):**
```sql
-- Unique position only for user-created lists
-- System lists (Grab Bag, date lists) can share position 0
CREATE UNIQUE INDEX idx_lists_user_position 
  ON lists(user_id, position) 
  WHERE is_system = false;
```

**Rationale:** `ensure_grab_bag()` and `ensure_date_list()` both insert at position 0. Without the filter, these would fail if any user list exists at position 0.

---

## Change 3: Timezone Handling - simplified and consistent

**v3 (wrong):**
```
Column: TIMESTAMPTZ (stores absolute instant)
Rule: "Never append Z" (treats as local)
Result: Mismatch - Supabase interprets as UTC, displays wrong time
```

**v4 (fixed):**
```
Column: TIMESTAMP (no timezone, stores wall-clock time)
Rule: Send 'YYYY-MM-DDTHH:mm:00' (no Z, no offset)
Result: Consistent - what you send is what you get back
```

**Updated dateUtils.ts:**

```typescript
/**
 * Create a timestamp for scheduling
 * Format: 'YYYY-MM-DDTHH:mm:00' (no Z, no offset)
 * 
 * This is WALL-CLOCK time, not an absolute instant.
 * "2:30 PM" means 2:30 PM on the user's calendar.
 */
export function createLocalTimestamp(date: string, time: string): string {
  return `${date}T${time}:00`
}

/**
 * Parse a TIMESTAMP from DB into date and time parts
 * No timezone conversion needed - it's wall-clock time
 */
export function parseTimestamp(timestamp: string): { date: string; time: string } {
  // TIMESTAMP comes back as 'YYYY-MM-DDTHH:mm:00' 
  const [datePart, timePart] = timestamp.split('T')
  const time = timePart.substring(0, 5)  // 'HH:mm'
  return { date: datePart, time }
}

/**
 * Get tasks for a specific calendar date
 * Simple string comparison - no timezone math needed
 */
export function getTasksForCalendarDate(
  tasks: Array<{ scheduled_at: string | null; is_completed: boolean }>,
  targetDate: string
): typeof tasks {
  return tasks.filter(t => {
    if (!t.scheduled_at || t.is_completed) return false
    const taskDate = t.scheduled_at.split('T')[0]
    return taskDate === targetDate
  })
}
```

**Note:** `completed_at` remains TIMESTAMPTZ because it IS an absolute instant (for audit purposes).

---

## Change 4: API - getTasks fetches only incomplete

**v3 (wrong):**
```typescript
export async function getTasks(): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position')
  
  if (error) throw error
  return data || []
}
```

**v4 (fixed):**
```typescript
/**
 * Fetch incomplete tasks for the current user
 * Completed tasks are fetched separately with pagination
 */
export async function getTasks(): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_completed', false)  // FIX: Only fetch incomplete
    .order('position')
  
  if (error) throw error
  return data || []
}

/**
 * Fetch completed tasks with pagination
 * @param limit - Number of tasks to fetch (default 50)
 * @param offset - Number of tasks to skip (default 0)
 */
export async function getCompletedTasks(limit = 50, offset = 0): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) throw error
  return data || []
}
```

---

## Change 5: State Store - reload on error instead of rollback

**v3 (wrong):**
```typescript
scheduleTask: async (taskId, scheduledAt) => {
  const previousTasks = get().tasks  // Snapshot
  
  set({
    tasks: previousTasks.map(t =>
      t.id === taskId ? { ...t, scheduled_at: scheduledAt } : t
    ),
  })
  
  try {
    await api.scheduleTask(taskId, scheduledAt)
  } catch (error) {
    set({ tasks: previousTasks, error: (error as Error).message })  // Rollback to stale snapshot
    throw error
  }
},
```

**v4 (fixed):**
```typescript
scheduleTask: async (taskId, scheduledAt) => {
  // Optimistic update
  set(state => ({
    tasks: state.tasks.map(t =>
      t.id === taskId ? { ...t, scheduled_at: scheduledAt } : t
    ),
  }))
  
  try {
    await api.scheduleTask(taskId, scheduledAt)
  } catch (error) {
    // FIX: Reload from server instead of rollback to stale snapshot
    await get().loadTasks()
    set({ error: (error as Error).message })
    throw error
  }
},
```

**Apply this pattern to ALL store actions that have optimistic updates:**
- updateTask
- scheduleTask
- unscheduleTask
- commitTask
- uncommitTask
- completeTask
- uncompleteTask
- setTaskHighlight
- rollOverTasks
- deleteTask

---

## Change 6: RPC function signatures - TIMESTAMP instead of TIMESTAMPTZ

**v3:**
```sql
CREATE OR REPLACE FUNCTION create_task(
  ...
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
```

**v4:**
```sql
CREATE OR REPLACE FUNCTION create_task(
  ...
  p_scheduled_at TIMESTAMP DEFAULT NULL  -- Changed from TIMESTAMPTZ
)
```

---

# COMPLETE v4 STATE STORE

For clarity, here is the complete updated state store with all fixes applied:

```typescript
import { create } from 'zustand'
import type { Task } from '@/types/database'
import * as api from '@/api'

interface TaskState {
  tasks: Task[]
  completedTasks: Task[]
  loading: boolean
  error: string | null
}

interface TaskActions {
  loadTasks: () => Promise<void>
  loadCompletedTasks: (limit?: number, offset?: number) => Promise<void>
  createTask: (input: api.CreateTaskInput) => Promise<string>
  updateTask: (taskId: string, input: api.UpdateTaskInput) => Promise<void>
  scheduleTask: (taskId: string, scheduledAt: string) => Promise<void>
  unscheduleTask: (taskId: string) => Promise<void>
  commitTask: (taskId: string, date: string) => Promise<void>
  uncommitTask: (taskId: string) => Promise<void>
  moveTaskHome: (taskId: string, newHomeListId: string) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  uncompleteTask: (taskId: string) => Promise<void>
  setTaskHighlight: (taskId: string, date: string | null) => Promise<void>
  reorderTasks: (taskIds: string[]) => Promise<void>
  rollOverTasks: (fromDate: string, toDate: string) => Promise<number>
  deleteTask: (taskId: string) => Promise<void>
}

type TaskStore = TaskState & TaskActions

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  completedTasks: [],
  loading: true,
  error: null,
  
  loadTasks: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await api.getTasks()  // Now fetches only incomplete
      set({ tasks, loading: false })
    } catch (error) {
      console.error('Failed to load tasks:', error)
      set({ loading: false, error: (error as Error).message })
      throw error
    }
  },
  
  loadCompletedTasks: async (limit = 50, offset = 0) => {
    try {
      const completedTasks = await api.getCompletedTasks(limit, offset)
      set({ completedTasks })
    } catch (error) {
      console.error('Failed to load completed tasks:', error)
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  createTask: async (input) => {
    const taskId = await api.createTask(input)
    await get().loadTasks()
    return taskId
  },
  
  updateTask: async (taskId, input) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, ...input, updated_at: new Date().toISOString() } : t
      ),
    }))
    
    try {
      await api.updateTask(taskId, input)
    } catch (error) {
      await get().loadTasks()  // Reload on error
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  scheduleTask: async (taskId, scheduledAt) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, scheduled_at: scheduledAt } : t
      ),
    }))
    
    try {
      await api.scheduleTask(taskId, scheduledAt)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  unscheduleTask: async (taskId) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, scheduled_at: null } : t
      ),
    }))
    
    try {
      await api.unscheduleTask(taskId)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  commitTask: async (taskId, date) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, committed_date: date } : t
      ),
    }))
    
    try {
      await api.commitTask(taskId, date)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  uncommitTask: async (taskId) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, committed_date: null } : t
      ),
    }))
    
    try {
      await api.uncommitTask(taskId)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  moveTaskHome: async (taskId, newHomeListId) => {
    await api.moveTaskHome(taskId, newHomeListId)
    await get().loadTasks()
  },
  
  completeTask: async (taskId) => {
    // Remove from tasks (optimistic)
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== taskId),
    }))
    
    try {
      await api.completeTask(taskId)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  uncompleteTask: async (taskId) => {
    try {
      await api.uncompleteTask(taskId)
      await get().loadTasks()  // Reload to get the task back in incomplete list
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  setTaskHighlight: async (taskId, date) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, highlight_date: date } : t
      ),
    }))
    
    try {
      await api.setTaskHighlight(taskId, date)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  reorderTasks: async (taskIds) => {
    await api.reorderTasks(taskIds)
    await get().loadTasks()
  },
  
  rollOverTasks: async (fromDate, toDate) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.committed_date === fromDate && !t.is_completed
          ? { ...t, committed_date: toDate }
          : t
      ),
    }))
    
    try {
      return await api.rollOverTasks(fromDate, toDate)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  deleteTask: async (taskId) => {
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== taskId),
    }))
    
    try {
      await api.deleteTask(taskId)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
}))
```

---

# MIGRATION SQL CHANGES

Add to migration:

```sql
-- FIX: Change scheduled_at from TIMESTAMPTZ to TIMESTAMP
ALTER TABLE tasks ALTER COLUMN scheduled_at TYPE TIMESTAMP USING scheduled_at::timestamp;

-- FIX: Update list position index to exclude system lists
DROP INDEX IF EXISTS idx_lists_user_position;
CREATE UNIQUE INDEX idx_lists_user_position 
  ON lists(user_id, position) 
  WHERE is_system = false;
```

---

# SUMMARY OF ALL V4 CHANGES

| File/Location | Change |
|---------------|--------|
| Schema: tasks.scheduled_at | `TIMESTAMPTZ` → `TIMESTAMP` |
| Schema: idx_lists_user_position | Added `WHERE is_system = false` |
| RPC: create_task | `p_scheduled_at TIMESTAMPTZ` → `p_scheduled_at TIMESTAMP` |
| dateUtils.ts | Simplified parseTimestamp (no timezone conversion) |
| api/tasks.ts: getTasks | Added `.eq('is_completed', false)` |
| api/tasks.ts | Added `getCompletedTasks(limit, offset)` |
| state/useTaskStore.ts | All error handlers: `set({ tasks: previousTasks })` → `await get().loadTasks()` |
| state/useTaskStore.ts | Added `completedTasks` state and `loadCompletedTasks` action |

---

# IMPLEMENTATION ORDER

1. **Run migration SQL** (schema changes)
2. **Drop and recreate RPC functions** (with TIMESTAMP type)
3. **Replace TypeScript files** (api, state, dateUtils)
4. **Update components** to use loadCompletedTasks for Completed view
5. **Test**

---

# WHAT DID NOT CHANGE FROM V3

Everything else in v3 remains unchanged:
- Core data model (home_list_id, committed_date, highlight_date)
- All other constraints and indexes
- All other RPC functions
- List API
- Calendar handlers
- Visibility rules (except simplified timezone handling)
