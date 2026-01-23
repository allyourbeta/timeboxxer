# Spec: Bug Fixes - Comprehensive Cleanup

## Overview

This spec addresses 10 bugs found during code review. They are organized by priority.

---

## CRITICAL BUGS

### Bug 1: completeTask Removes Task Instead of Updating It

**File:** `src/state/useTaskStore.ts`

**Problem:**
When completing a task, the optimistic update removes the task from the array entirely:

```typescript
completeTask: async (taskId) => {
  set(state => ({
    tasks: state.tasks.filter(t => t.id !== taskId)  // REMOVES the task!
  }))
```

The task disappears from the UI immediately and never appears in the Completed list because it's been removed from the `tasks` array that CompletedView filters.

**Root Cause:**
The code assumes completed tasks should be removed from the main array. But `CompletedView` gets tasks from the same array via `tasks.filter(t => t.completed_at)`. If the task is removed, it can't be filtered.

**Fix:**
Update the task's fields instead of removing it:

```typescript
completeTask: async (taskId) => {
  const task = get().tasks.find(t => t.id === taskId)
  if (!task) return

  // Optimistic update - update fields, don't remove
  set(state => ({
    tasks: state.tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            previous_list_id: t.list_id,
            completed_at: new Date().toISOString(),
            scheduled_at: null,
          }
        : t
    )
  }))

  try {
    await apiCompleteTask(taskId)
    // Reload to get correct list_id from server
    await get().loadTasks()
  } catch (error) {
    // Reload to revert on error
    await get().loadTasks()
    set({ error: (error as Error).message })
    throw error
  }
}
```

**Testing:**
- [ ] Complete a task from a list → Task appears in Completed view
- [ ] Task disappears from original list
- [ ] Task count updates correctly
- [ ] CompletedView shows the task with correct details

---

### Bug 2: Calendar Tasks Have No Complete/Delete Actions

**File:** `src/components/Calendar/CalendarView.tsx`

**Problem:**
Lines 270-273 have a TODO instead of actual functionality:

```typescript
onClick={() => {
  // TODO: Show task actions popover
  console.log('Task clicked:', task.id)
}}
```

Users cannot complete or manage tasks from the calendar view.

**Fix:**
Add a simple action menu when clicking a calendar task. Options:
- ✓ Complete
- ✕ Remove from calendar (unschedule)

**Implementation:**

Add state for selected task:
```typescript
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
```

Update the onClick:
```typescript
onClick={(e) => {
  e.stopPropagation()
  setSelectedTaskId(selectedTaskId === task.id ? null : task.id)
}}
```

Add action buttons that appear when task is selected:
```typescript
{selectedTaskId === task.id && (
  <div className="absolute top-1 right-1 flex gap-1 z-10">
    <button
      onClick={(e) => {
        e.stopPropagation()
        onComplete(task.id)
        setSelectedTaskId(null)
      }}
      className="p-1 bg-green-500 hover:bg-green-600 rounded text-white"
      title="Complete"
    >
      <Check className="h-3 w-3" />
    </button>
    <button
      onClick={(e) => {
        e.stopPropagation()
        onUnschedule(task.id)
        setSelectedTaskId(null)
      }}
      className="p-1 bg-gray-500 hover:bg-gray-600 rounded text-white"
      title="Remove from calendar"
    >
      <X className="h-3 w-3" />
    </button>
  </div>
)}
```

Add import at top:
```typescript
import { Check, X } from 'lucide-react'
```

Click outside to deselect:
```typescript
// Add to the container div
onClick={() => setSelectedTaskId(null)}
```

**Testing:**
- [ ] Click calendar task → Action buttons appear
- [ ] Click Complete → Task moves to Completed list, disappears from calendar
- [ ] Click Remove → Task removed from calendar, stays in its list
- [ ] Click elsewhere → Action buttons disappear

---

## MEDIUM PRIORITY BUGS

### Bug 3: Missing Error Handling in Async Handlers

**File:** `src/hooks/useAppHandlers.ts`

**Problem:**
Most async handlers don't have try/catch blocks. Errors are silently swallowed.

Example - no error handling:
```typescript
const handleTaskAdd = async (listId: string, title: string) => {
  await createTask(listId, title)
}
```

**Fix:**
Add try/catch with toast notification for user feedback:

```typescript
const handleTaskAdd = async (listId: string, title: string) => {
  try {
    await createTask(listId, title)
  } catch (error) {
    console.error('Failed to add task:', error)
    showToast('Failed to add task', 'error')
  }
}
```

**Handlers to update:**
- `handleTaskAdd`
- `handleTaskDelete`
- `handleTaskDiscardConfirm`
- `handleTaskDurationClick`
- `handleTaskComplete`
- `handleTaskUncomplete`
- `handleTaskEnergyChange`
- `handleListCreate`
- `handleListEdit`
- `handleDeleteListConfirm`
- `handleClearListConfirm`
- `handleExternalDrop`
- `handleEventMove`
- `handleUnschedule`
- `handleCreateCalendarTask`

Use the existing `showToast` from `useUIStore`:
```typescript
const { showToast } = useUIStore()
```

**Testing:**
- [ ] Disconnect network, try to add task → Error toast shown
- [ ] Errors logged to console
- [ ] App doesn't crash

---

### Bug 4: Missing Error Handling in useAuth

**File:** `src/hooks/useAuth.ts`

**Problem:**
Line 21 has no `.catch()` handler:
```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  setUser(session?.user ?? null)
  setLoading(false)
})
```

**Fix:**
```typescript
supabase.auth.getSession()
  .then(({ data: { session } }) => {
    setUser(session?.user ?? null)
    setLoading(false)
  })
  .catch((error) => {
    console.error('Failed to get session:', error)
    setLoading(false)
  })
```

---

### Bug 5: Debug Console Logs in Production Code

**Files:**
- `src/services/dragService.ts` - 30+ console.log statements
- `src/lib/calendarUtils.ts` - 6 console.log statements
- `src/hooks/useAppHandlers.ts` - Several console.log statements

**Fix:**
Remove all debug console.log statements, or wrap them:

Option A (Remove - Recommended):
```bash
# Find and review all console.log statements
grep -n "console.log" src/services/dragService.ts
# Then remove them manually
```

Option B (Wrap for dev only):
```typescript
const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG) console.log('...')
```

**Recommendation:** Remove them. They clutter the console and may leak information.

---

## LOW PRIORITY BUGS (Dead Code Cleanup)

### Bug 6: Dead Code - useTaskHandlers.ts

**File:** `src/hooks/useTaskHandlers.ts`

**Problem:**
Exported but never imported anywhere. Duplicates functionality in `useAppHandlers.ts`.

**Fix:**
Delete the file entirely.

Also update `src/hooks/index.ts` to remove the export:
```typescript
// Remove this line:
export { useTaskHandlers } from './useTaskHandlers'
```

---

### Bug 7: Dead Code - useListHandlers.ts

**File:** `src/hooks/useListHandlers.ts`

**Problem:**
Exported but never imported anywhere.

**Fix:**
Delete the file entirely.

Also update `src/hooks/index.ts` to remove the export:
```typescript
// Remove this line:
export { useListHandlers } from './useListHandlers'
```

---

### Bug 8: Dead Code - useFocusHandlers.ts

**File:** `src/hooks/useFocusHandlers.ts`

**Problem:**
Exported but never imported anywhere.

**Fix:**
Delete the file entirely.

Also update `src/hooks/index.ts` to remove the export:
```typescript
// Remove this line:
export { useFocusHandlers } from './useFocusHandlers'
```

---

### Bug 9: Dead Code - listSort.ts (Wrong Schema)

**File:** `src/lib/listSort.ts`

**Problem:**
Uses old schema fields that no longer exist:
- `system_type` (should be `list_type`)
- `is_system` (removed)
- `position` (removed)
- `is_collapsed` (removed)

Function `sortListsForDisplay` is commented out in useListStore.ts and not used.

**Fix:**
Delete the file entirely.

---

### Bug 10: Dead Code - getTasksForCalendarDate Function

**File:** `src/lib/dateUtils.ts`

**Problem:**
Lines 91-100 define `getTasksForCalendarDate` which:
1. Uses `is_completed` (old field, should be `completed_at`)
2. Is never called anywhere in the codebase

```typescript
export function getTasksForCalendarDate<T extends { scheduled_at: string | null; is_completed: boolean }>(
  tasks: T[],
  targetDate: string
): T[] {
  return tasks.filter(t => {
    if (!t.scheduled_at || t.is_completed) return false  // is_completed is wrong!
    const taskDate = t.scheduled_at.split('T')[0]
    return taskDate === targetDate
  })
}
```

**Fix:**
Delete the function (lines 85-100, including the JSDoc comment above it).

---

## Files Summary

### Files to Modify:
1. `src/state/useTaskStore.ts` - Fix completeTask
2. `src/components/Calendar/CalendarView.tsx` - Add task actions
3. `src/hooks/useAppHandlers.ts` - Add error handling, remove console.logs
4. `src/hooks/useAuth.ts` - Add .catch() handler
5. `src/services/dragService.ts` - Remove console.logs
6. `src/lib/calendarUtils.ts` - Remove console.logs
7. `src/lib/dateUtils.ts` - Remove dead function
8. `src/hooks/index.ts` - Remove dead exports

### Files to Delete:
1. `src/hooks/useTaskHandlers.ts`
2. `src/hooks/useListHandlers.ts`
3. `src/hooks/useFocusHandlers.ts`
4. `src/lib/listSort.ts`

---

## Testing Checklist

### Critical Functionality
- [ ] Complete task from list → Appears in Completed view
- [ ] Complete task from calendar → Appears in Completed view
- [ ] Uncomplete task → Returns to previous list
- [ ] Click calendar task → Action buttons appear
- [ ] Remove task from calendar → Task unscheduled

### Error Handling
- [ ] Network error during task add → Toast shown
- [ ] Network error during complete → Toast shown
- [ ] Auth error → Handled gracefully

### Code Quality
- [ ] No console.log statements in browser console (except errors)
- [ ] Build passes with no TypeScript errors
- [ ] No unused exports in hooks/index.ts
