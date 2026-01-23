# SPEC: Proper Task Position Handling

## The Rule

**When a task moves to a different list, it must get a new position = max(destination list positions) + 1**

This ensures:
1. No duplicate positions within a list
2. New tasks appear at the bottom of the destination list
3. Safe for concurrent access (two browser tabs)

## Functions That Move Tasks

### 1. moveToPurgatory (src/api/tasks/scheduling.ts)

Current code moves task but keeps its old position.

**Fix:**
```typescript
export async function moveToPurgatory(taskId: string, originalListId: string, originalListName: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  const { data: purgatoryList, error: listError } = await supabase
    .from('lists')
    .select('id')
    .eq('system_type', 'purgatory')
    .eq('user_id', userId)
    .single()
  
  if (listError || !purgatoryList) {
    throw new Error('Purgatory list not found')
  }
  
  // GET NEW POSITION IN DESTINATION LIST
  const { data: maxPosData } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', purgatoryList.id)
    .order('position', { ascending: false })
    .limit(1)
  
  const newPosition = (maxPosData?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      list_id: purgatoryList.id,
      position: newPosition,  // NEW POSITION
      moved_to_purgatory_at: new Date().toISOString(),
      original_list_id: originalListId,
      original_list_name: originalListName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### 2. moveFromPurgatory (src/api/tasks/scheduling.ts)

**Fix:**
```typescript
export async function moveFromPurgatory(taskId: string, newListId: string) {
  const supabase = createClient()
  
  // GET NEW POSITION IN DESTINATION LIST
  const { data: maxPosData } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', newListId)
    .order('position', { ascending: false })
    .limit(1)
  
  const newPosition = (maxPosData?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      list_id: newListId,
      position: newPosition,  // NEW POSITION
      moved_to_purgatory_at: null,
      original_list_id: null,
      original_list_name: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### 3. rollOverTasks (src/api/tasks/scheduling.ts)

This moves multiple tasks at once. Each needs a unique position.

**Fix:**
```typescript
export async function rollOverTasks(fromListId: string, toListId: string): Promise<number> {
  const supabase = createClient()
  
  // Get all incomplete tasks from source
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('list_id', fromListId)
    .eq('is_completed', false)
    .order('position')  // Preserve relative order
  
  if (fetchError) throw fetchError
  if (!tasks || tasks.length === 0) return 0
  
  // Get max position in destination
  const { data: maxPosData } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', toListId)
    .order('position', { ascending: false })
    .limit(1)
  
  const startPosition = (maxPosData?.[0]?.position ?? -1) + 1
  
  // Update each task with new sequential position
  const updates = tasks.map((task: { id: string }, index: number) => 
    supabase
      .from('tasks')
      .update({ 
        list_id: toListId,
        position: startPosition + index 
      })
      .eq('id', task.id)
  )
  
  await Promise.all(updates)
  
  return tasks.length
}
```

### 4. moveTaskToList (src/api/tasks/crud.ts)

General purpose move function.

**Fix:**
```typescript
export async function moveTaskToList(taskId: string, newListId: string | null) {
  const supabase = createClient()
  
  let newPosition = 0
  
  if (newListId) {
    // GET NEW POSITION IN DESTINATION LIST
    const { data: maxPosData } = await supabase
      .from('tasks')
      .select('position')
      .eq('list_id', newListId)
      .order('position', { ascending: false })
      .limit(1)
    
    newPosition = (maxPosData?.[0]?.position ?? -1) + 1
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      list_id: newListId,
      position: newPosition 
    })
    .eq('id', taskId)
    .select()
    .single()
    
  if (error) throw error
  return data
}
```

## Helper Function (Optional Refactor)

To avoid repeating the "get max position" logic, create a helper:

```typescript
// src/api/tasks/utils.ts
import { createClient } from '@/utils/supabase/client'

export async function getNextPositionInList(listId: string): Promise<number> {
  const supabase = createClient()
  
  const { data } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
  
  return (data?.[0]?.position ?? -1) + 1
}
```

Then each move function just calls:
```typescript
const newPosition = await getNextPositionInList(destinationListId)
```

## After Code Changes - Re-add Constraint

Once all move functions assign proper positions:

```sql
-- First fix any existing duplicates
WITH ranked AS (
  SELECT id, list_id, 
    ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY position, created_at) - 1 as new_pos
  FROM tasks
  WHERE list_id IS NOT NULL
)
UPDATE tasks t
SET position = r.new_pos
FROM ranked r
WHERE t.id = r.id;

-- Then add the constraint
CREATE UNIQUE INDEX IF NOT EXISTS tasks_list_position_unique 
ON tasks(list_id, position) 
WHERE list_id IS NOT NULL;
```

## Testing

1. Open app in two browser tabs
2. In Tab A: drag task from Jan 18 list to calendar
3. In Tab B: drag different task from Jan 18 list to calendar
4. Both should succeed without errors
5. Check Scheduled list - both tasks should be there with different positions
