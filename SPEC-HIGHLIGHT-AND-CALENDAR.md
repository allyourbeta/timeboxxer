# Spec: Highlight Feature + Completed Tasks on Calendar

## Overview

Two features:
1. Implement the star/highlight feature for date list tasks (max 5 per list)
2. Keep completed tasks visible on calendar with a checkmark overlay

---

## Feature 1: Highlight/Star for Date Lists

### Database Change

Add `is_highlight` column to tasks table.

**Run this SQL in Supabase:**
```sql
ALTER TABLE tasks ADD COLUMN is_highlight BOOLEAN DEFAULT FALSE;
```

### Type Change

**File: `src/types/app.ts`**

Find the Task interface (around line 31) and add `is_highlight`:

```typescript
export interface Task {
  id: string;
  user_id: string;
  list_id: string;
  
  title: string;
  notes: string | null;
  duration_minutes: number;
  color_index: number;
  energy_level: 'high' | 'medium';
  is_highlight: boolean;  // ADD THIS LINE
  
  scheduled_at: string | null;
  previous_list_id: string | null;
  completed_at: string | null;
  
  created_at: string;
  updated_at: string;
}
```

### API Function

**File: `src/api/tasks.ts`**

Add this function:

```typescript
export async function toggleHighlight(taskId: string, listId: string, tasks: Task[], lists: List[]): Promise<Task> {
  const supabase = createClient()
  
  const task = tasks.find(t => t.id === taskId)
  if (!task) throw new Error('Task not found')
  
  const list = lists.find(l => l.id === listId)
  if (!list || list.list_type !== 'date') {
    throw new Error('Highlights only allowed on date lists')
  }
  
  // If turning highlight ON, check the limit
  if (!task.is_highlight) {
    const highlightedCount = tasks.filter(t => 
      t.list_id === listId && t.is_highlight
    ).length
    
    if (highlightedCount >= 5) {
      throw new Error('Maximum 5 highlights per date list')
    }
  }
  
  const newValue = !task.is_highlight
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ is_highlight: newValue })
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### Store Action

**File: `src/state/useTaskStore.ts`**

Add to the interface:
```typescript
toggleHighlight: (taskId: string, listId: string) => Promise<void>
```

Add the implementation:
```typescript
toggleHighlight: async (taskId, listId) => {
  const { tasks } = get()
  const task = tasks.find(t => t.id === taskId)
  if (!task) return
  
  // Optimistic update
  set(state => ({
    tasks: state.tasks.map(t =>
      t.id === taskId ? { ...t, is_highlight: !t.is_highlight } : t
    )
  }))
  
  try {
    await apiToggleHighlight(taskId)
  } catch (error) {
    // Revert on error
    await get().loadTasks()
    throw error
  }
}
```

Wait - we need a simpler API. Let me revise:

**File: `src/api/tasks.ts`**

Add this simpler function:

```typescript
export async function toggleHighlight(taskId: string): Promise<Task> {
  const supabase = createClient()
  
  // Get current value
  const { data: current, error: fetchError } = await supabase
    .from('tasks')
    .select('is_highlight')
    .eq('id', taskId)
    .single()
  
  if (fetchError) throw fetchError
  
  // Toggle it
  const { data, error } = await supabase
    .from('tasks')
    .update({ is_highlight: !current.is_highlight })
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

The 5-limit check will be done in the UI before calling this.

### Handler

**File: `src/hooks/useTaskHandlers.ts`**

Add:
```typescript
const handleHighlightToggle = async (taskId: string, listId: string) => {
  const task = useTaskStore.getState().tasks.find(t => t.id === taskId)
  if (!task) return
  
  // Check 5-limit before toggling ON
  if (!task.is_highlight) {
    const tasks = useTaskStore.getState().tasks
    const highlightedCount = tasks.filter(t => 
      t.list_id === listId && t.is_highlight
    ).length
    
    if (highlightedCount >= 5) {
      // Silent fail - already at limit
      return
    }
  }
  
  try {
    await toggleHighlight(taskId)
  } catch (error) {
    console.error('Failed to toggle highlight:', error)
  }
}
```

Return it from the hook.

### Wire Up in ListCard

**File: `src/components/Lists/ListCard.tsx`**

Find where TaskCard is rendered (around line 218). Change:

```typescript
isHighlight={false}
canHighlight={false}
onHighlightToggle={() => {}}
```

To:

```typescript
isHighlight={task.is_highlight || false}
canHighlight={isDateList}
onHighlightToggle={() => onHighlightToggle(task.id)}
```

Add `onHighlightToggle` to the ListCard props interface:
```typescript
onHighlightToggle: (taskId: string) => void
```

### Wire Up in ListPanel

**File: `src/components/Lists/ListPanel.tsx`**

Pass the handler to ListCard:
```typescript
onHighlightToggle={(taskId) => onHighlightToggle(taskId, list.id)}
```

Add to props interface and pass from page.tsx.

---

## Feature 2: Completed Tasks Stay on Calendar

### Change Calendar Filter

**File: `src/components/Calendar/CalendarView.tsx`**

Find the line that filters scheduled tasks (around line 119):

```typescript
const scheduledTasks = tasks.filter(task => task.scheduled_at && !task.completed_at)
```

Change to:

```typescript
const scheduledTasks = tasks.filter(task => task.scheduled_at)
```

This includes completed tasks.

### Add Checkmark Overlay for Completed Tasks

In the same file, find where task cards are rendered. Add a checkmark overlay:

```typescript
{/* Task card */}
<div
  className="absolute mx-1 rounded-lg bg-theme-secondary border border-theme shadow-sm ..."
  style={{ borderLeftWidth: '4px', borderLeftColor: taskColor, ... }}
>
  {/* Completed overlay */}
  {task.completed_at && (
    <div className="absolute inset-0 bg-white/50 dark:bg-black/30 rounded-lg flex items-center justify-center">
      <CheckCircle className="h-6 w-6 text-green-500" />
    </div>
  )}
  
  {/* Existing task content */}
  <div className="p-2 ...">
    ...
  </div>
</div>
```

Make sure `CheckCircle` is imported:
```typescript
import { CheckCircle, CalendarX } from 'lucide-react'
```

---

## Summary of Changes

### Files to modify:
1. `src/types/app.ts` - Add `is_highlight` to Task
2. `src/api/tasks.ts` - Add `toggleHighlight` function
3. `src/state/useTaskStore.ts` - Add `toggleHighlight` action
4. `src/hooks/useTaskHandlers.ts` - Add `handleHighlightToggle` with 5-limit check
5. `src/components/Lists/ListCard.tsx` - Wire up highlight props
6. `src/components/Lists/ListPanel.tsx` - Pass highlight handler
7. `src/app/page.tsx` - Pass highlight handler
8. `src/components/Calendar/CalendarView.tsx` - Remove `!completed_at` filter, add checkmark overlay

### Database:
Run: `ALTER TABLE tasks ADD COLUMN is_highlight BOOLEAN DEFAULT FALSE;`

---

## Testing

### Highlight:
- [ ] Star icon appears only on date list tasks
- [ ] Clicking star toggles highlight on/off
- [ ] Can highlight up to 5 tasks in a date list
- [ ] 6th highlight attempt does nothing (silent fail)
- [ ] Highlight persists after page refresh

### Calendar completed:
- [ ] Complete a scheduled task
- [ ] Task remains on calendar with green checkmark overlay
- [ ] Can still click task to uncomplete it
- [ ] Deleted tasks are removed from calendar (not just completed)
