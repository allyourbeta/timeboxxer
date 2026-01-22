# Spec: System Lists Self-Healing - Final Implementation

## Problem

When a user completes a task, it should move to the Completed list. Currently:
1. `completeTask()` queries for the Completed list directly
2. If the list doesn't exist, it throws an error
3. Task disappears from original list but never arrives in Completed
4. Task is effectively lost

## Solution

Make `completeTask()` and `uncompleteTask()` self-healing by using existing helper functions that create system lists if missing.

## Files to Modify

Only 2 files:
1. `src/api/lists.ts` - Fix `getCompletedList()` and `getParkedList()` 
2. `src/api/tasks.ts` - Use the helpers instead of direct queries

---

## File 1: `src/api/lists.ts`

### Function: `getCompletedList()`

Find this function and replace it entirely with:

```typescript
export async function getCompletedList(): Promise<List> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Step 1: Try to find existing Completed list
  const { data: existing, error: findError } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', user.id)
    .eq('list_type', 'completed')
    .single()

  // If found, return it
  if (!findError && existing) {
    return existing as List
  }

  // Step 2: Only proceed to create if error is "no rows found" (PGRST116)
  // Any other error (network, RLS, schema) should be thrown
  if (findError && (findError as any).code !== 'PGRST116') {
    throw findError
  }

  // Step 3: Create the Completed list
  const { data: created, error: createError } = await supabase
    .from('lists')
    .insert({
      user_id: user.id,
      name: 'Completed',
      list_type: 'completed'
    })
    .select()
    .single()

  // Step 4: Handle race condition - another tab may have created it
  if (createError) {
    if ((createError as any).code === '23505') {
      // Unique constraint violation - list was created by another tab
      // Re-fetch and return
      const { data: existing2, error: refetchError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('list_type', 'completed')
        .single()

      if (refetchError) throw refetchError
      if (!existing2) throw new Error('Completed list not found after race condition')
      return existing2 as List
    }
    throw createError
  }

  // Step 5: Guard against null response
  if (!created) {
    throw new Error('Failed to create Completed list (no data returned)')
  }

  return created as List
}
```

### Function: `getParkedList()`

Find this function and replace it entirely with:

```typescript
export async function getParkedList(): Promise<List> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Step 1: Try to find existing Parked list
  const { data: existing, error: findError } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', user.id)
    .eq('list_type', 'parked')
    .single()

  // If found, return it
  if (!findError && existing) {
    return existing as List
  }

  // Step 2: Only proceed to create if error is "no rows found" (PGRST116)
  // Any other error (network, RLS, schema) should be thrown
  if (findError && (findError as any).code !== 'PGRST116') {
    throw findError
  }

  // Step 3: Create the Parked list
  const { data: created, error: createError } = await supabase
    .from('lists')
    .insert({
      user_id: user.id,
      name: 'Parked Items',
      list_type: 'parked'
    })
    .select()
    .single()

  // Step 4: Handle race condition - another tab may have created it
  if (createError) {
    if ((createError as any).code === '23505') {
      // Unique constraint violation - list was created by another tab
      // Re-fetch and return
      const { data: existing2, error: refetchError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('list_type', 'parked')
        .single()

      if (refetchError) throw refetchError
      if (!existing2) throw new Error('Parked list not found after race condition')
      return existing2 as List
    }
    throw createError
  }

  // Step 5: Guard against null response
  if (!created) {
    throw new Error('Failed to create Parked list (no data returned)')
  }

  return created as List
}
```

---

## File 2: `src/api/tasks.ts`

### Step 1: Add Import

At the top of the file, add:

```typescript
import { getCompletedList, getParkedList } from './lists'
```

### Step 2: Replace `completeTask()` Function

Find the `completeTask` function and replace it entirely with:

```typescript
export async function completeTask(taskId: string): Promise<void> {
  const supabase = createClient()

  // Step 1: Get the task's current list_id (for previous_list_id)
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('list_id')
    .eq('id', taskId)
    .single()

  if (taskError) throw taskError
  if (!task) throw new Error('Task not found')

  // Step 2: Get Completed list (creates if missing)
  const completedList = await getCompletedList()

  // Step 3: Update the task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      previous_list_id: task.list_id,
      list_id: completedList.id,
      completed_at: new Date().toISOString(),
      scheduled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (updateError) throw updateError
}
```

### Step 3: Replace `uncompleteTask()` Function

Find the `uncompleteTask` function and replace it entirely with:

```typescript
export async function uncompleteTask(taskId: string): Promise<void> {
  const supabase = createClient()

  // Step 1: Get the task's previous_list_id
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('list_id, previous_list_id')
    .eq('id', taskId)
    .single()

  if (taskError) throw taskError
  if (!task) throw new Error('Task not found')

  // Step 2: Determine target list
  let targetListId = task.previous_list_id

  // Step 3: Check if previous list still exists
  if (targetListId) {
    const { data: previousList, error: checkError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', targetListId)
      .single()

    // If error or not found, clear targetListId
    if (checkError || !previousList) {
      targetListId = null
    }
  }

  // Step 4: Fall back to Parked list if no valid previous list
  if (!targetListId) {
    const parkedList = await getParkedList()
    targetListId = parkedList.id
  }

  // Step 5: Update the task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      list_id: targetListId,
      previous_list_id: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (updateError) throw updateError
}
```

---

## Zustand Store Updates

The Zustand stores (`useTaskStore.ts`) call the API functions and update local state. They should already work correctly if the API functions work correctly.

However, verify that `completeTask` and `uncompleteTask` in `useTaskStore.ts`:
1. Call the API functions from `src/api/tasks.ts`
2. Update local state to reflect the changes

If the store functions are doing their own database calls instead of using the API layer, they need to be updated to call the API functions.

### Expected Pattern in `useTaskStore.ts`:

```typescript
completeTask: async (taskId: string) => {
  // Call API
  await apiCompleteTask(taskId)
  
  // Update local state
  const completedList = useListStore.getState().lists.find(l => l.list_type === 'completed')
  
  set({
    tasks: get().tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            previous_list_id: t.list_id,
            list_id: completedList?.id || t.list_id,
            completed_at: new Date().toISOString(),
            scheduled_at: null,
          }
        : t
    )
  })
}
```

**Important:** After completing a task, the local state needs to know the Completed list ID. The store should get this from `useListStore`. If the Completed list was just created by the API call, `useListStore` may need to reload lists.

### Simpler Alternative for Local State:

If the above is complex, a simpler pattern is to reload tasks after complete/uncomplete:

```typescript
completeTask: async (taskId: string) => {
  await apiCompleteTask(taskId)
  await get().loadTasks()  // Refresh from database
}

uncompleteTask: async (taskId: string) => {
  await apiUncompleteTask(taskId)
  await get().loadTasks()  // Refresh from database
}
```

This is less efficient but guaranteed correct.

---

## Error Codes Reference

| Code | Meaning | Action |
|------|---------|--------|
| `PGRST116` | No rows returned from `.single()` | Proceed to create |
| `23505` | Unique constraint violation | Re-fetch (race condition) |
| Any other | Real error | Throw |

---

## Testing Checklist

After implementation, test each scenario:

### Completing Tasks
- [ ] Complete a task when Completed list exists → Task moves to Completed
- [ ] Complete a task when Completed list is missing → List is created, task moves to it
- [ ] Completed task appears in Completed view
- [ ] Completed task no longer in original list
- [ ] Completed task no longer on calendar (if was scheduled)
- [ ] Completed task has `completed_at` timestamp
- [ ] Completed task has `previous_list_id` set to original list

### Uncompleting Tasks
- [ ] Uncomplete a task → Returns to previous list
- [ ] Uncomplete when previous list was deleted → Goes to Parked list
- [ ] Uncomplete when Parked list is missing → Parked list created, task goes there
- [ ] Uncompleted task has `completed_at` cleared
- [ ] Uncompleted task has `previous_list_id` cleared

### Race Conditions
- [ ] Open app in two browser tabs as a new user (no Completed list yet)
- [ ] Complete a task in tab 1
- [ ] Complete a different task in tab 2 at the same time
- [ ] Both should succeed without errors
- [ ] Only one Completed list exists in database

### Error Handling
- [ ] Disconnect network, try to complete → Error shown, task not lost
- [ ] Task that doesn't exist → Error thrown

---

## What NOT to Change

- Do NOT modify `page.tsx` or initialization sequence
- Do NOT add new functions to Zustand stores
- Do NOT modify UI components
- Do NOT change database schema or migrations

---

## Summary

This fix makes two API functions (`completeTask`, `uncompleteTask`) self-healing by using helpers (`getCompletedList`, `getParkedList`) that create system lists if missing.

The helpers are updated to:
1. Only create on "not found" errors (not network/RLS errors)
2. Handle race conditions when two tabs create simultaneously

Total changes: 2 files, 4 functions.
