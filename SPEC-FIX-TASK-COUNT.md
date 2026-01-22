# Spec: Fix Task Count Consistency for List Operations

## Problem

When trying to delete a list that shows "0 tasks", the delete fails with "Cannot delete non-empty list". 

**Root cause:** The handlers in `useAppHandlers.ts` count ALL tasks (including completed), but the UI only shows incomplete tasks. A list can show "0 tasks" but still have completed tasks in the database.

## Current State

| Location | What it counts | Filter |
|----------|---------------|--------|
| ListPanel `getTasksForList()` | Visible tasks | `!t.is_completed` ✅ |
| ListCard `tasks.length` | Passed from above | Already filtered ✅ |
| `handleClearListClick` | All tasks | None ❌ |
| `handleDeleteListClick` | All tasks | None ❌ |

## The Fix

In `useAppHandlers.ts`, update both handlers to only count **incomplete** tasks:

### 1. handleClearListClick (line ~241)

**Before:**
```typescript
const taskCount = tasks.filter(t => t.home_list_id === listId).length
```

**After:**
```typescript
const taskCount = tasks.filter(t => t.home_list_id === listId && !t.is_completed).length
```

### 2. handleDeleteListClick (line ~285)

**Before:**
```typescript
const taskCount = tasks.filter(t => t.home_list_id === listId).length
```

**After:**
```typescript
const taskCount = tasks.filter(t => t.home_list_id === listId && !t.is_completed).length
```

## Files to Modify

Only one file: `src/hooks/useAppHandlers.ts`

## Testing

1. Create a list with tasks
2. Complete all tasks in the list
3. List should show "0 tasks"
4. Click menu → "Delete List" should be enabled
5. Click Delete → List should be deleted successfully
6. No console errors

Also test:
- List with incomplete tasks → Delete should be disabled
- Clear List on a list with only completed tasks → Should show "List is already empty" (taskCount = 0)

## Git Commit

```bash
git add -A && git commit -m "fix: count only incomplete tasks for list delete/clear checks

- handleClearListClick now counts only incomplete tasks
- handleDeleteListClick now counts only incomplete tasks
- Matches UI which shows only incomplete tasks
- Allows deleting lists that have only completed tasks"
```
