# FEATURES: Purgatory List + Daily Tasks

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Check with `wc -l` after every change.
2. **Run `npm run build` after EACH section.** Fix errors before moving on.
3. **Commit after EACH section**, not at the end.

---

## Overview

| Feature | Description |
|---------|-------------|
| Purgatory List | System list where tasks go after being scheduled. Shows original list name and move date. |
| Daily Tasks | Checkbox to mark task as daily. Daily tasks auto-spawn into today's date-list each day. |

---

## SECTION 1: Database Schema Updates

### 1.1 Update tasks table

Add new columns to track purgatory metadata and daily flag.

Create migration file `supabase/migrations/002_purgatory_and_daily.sql`:

```sql
-- Add purgatory tracking fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS moved_to_purgatory_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_list_id UUID REFERENCES lists(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_list_name TEXT;

-- Add daily task flag
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_daily BOOLEAN DEFAULT FALSE;

-- Add daily task source tracking (which daily task spawned this instance)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS daily_source_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
```

### 1.2 Update lists table

Add flag for system lists that can't be renamed/deleted.

```sql
-- Add system list flag
ALTER TABLE lists ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS system_type TEXT; -- 'purgatory' or 'date'
```

### 1.3 Create Purgatory list

```sql
-- Create Purgatory system list (run once)
INSERT INTO lists (id, user_id, name, position, is_system, system_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Purgatory',
  -1000,
  true,
  'purgatory'
) ON CONFLICT (id) DO NOTHING;
```

**Run the migration:**
```bash
# If using Supabase CLI:
npx supabase db push

# Or run SQL directly in Supabase dashboard
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add database schema for purgatory and daily tasks"
```

---

## SECTION 2: Update TypeScript Types

### Update `src/types/app.ts`:

Add the new fields to the Task and List types:

```typescript
export interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  completed_at: string | null
  position: number
  notes: string | null
  // Purgatory fields
  moved_to_purgatory_at: string | null
  original_list_id: string | null
  original_list_name: string | null
  // Daily task fields
  is_daily: boolean
  daily_source_id: string | null
}

export interface List {
  id: string
  user_id: string
  name: string
  position: number
  is_collapsed: boolean
  // System list fields
  is_system: boolean
  system_type: 'purgatory' | 'date' | null
}
```

### Update `src/state/useTaskStore.ts`:

Update the Task interface to match:

```typescript
interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  completed_at: string | null
  // Purgatory fields
  moved_to_purgatory_at: string | null
  original_list_id: string | null
  original_list_name: string | null
  // Daily task fields
  is_daily: boolean
  daily_source_id: string | null
}
```

### Update `src/state/useListStore.ts`:

Update the List interface:

```typescript
interface List {
  id: string
  name: string
  position: number
  is_collapsed: boolean
  is_system: boolean
  system_type: 'purgatory' | 'date' | null
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Update TypeScript types for purgatory and daily tasks"
```

---

## SECTION 3: Purgatory Logic

### 3.1 Create constants file

Create `src/lib/constants.ts`:

```typescript
// System list IDs
export const PURGATORY_LIST_ID = '00000000-0000-0000-0000-000000000001'

// Dev user ID
export const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'
```

### 3.2 Update API to use constants

Update `src/api/tasks.ts`:

Replace:
```typescript
const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'
```

With:
```typescript
import { DEV_USER_ID, PURGATORY_LIST_ID } from '@/lib/constants'
```

### 3.3 Add moveToPurgatory function

Add to `src/api/tasks.ts`:

```typescript
export async function moveToPurgatory(taskId: string, originalListId: string, originalListName: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      list_id: PURGATORY_LIST_ID,
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

### 3.4 Add moveFromPurgatory function

Add to `src/api/tasks.ts`:

```typescript
export async function moveFromPurgatory(taskId: string, newListId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      list_id: newListId,
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

### 3.5 Update task store

Update `src/state/useTaskStore.ts` to add purgatory actions:

Add to the interface:
```typescript
moveToPurgatory: (taskId: string, originalListId: string, originalListName: string) => Promise<void>
moveFromPurgatory: (taskId: string, newListId: string) => Promise<void>
```

Add imports:
```typescript
import { 
  getTasks, 
  createTask as apiCreateTask, 
  updateTask as apiUpdateTask, 
  deleteTask as apiDeleteTask, 
  completeTask as apiCompleteTask, 
  uncompleteTask as apiUncompleteTask,
  moveToPurgatory as apiMoveToPurgatory,
  moveFromPurgatory as apiMoveFromPurgatory,
} from '@/api'
```

Add actions:
```typescript
moveToPurgatory: async (taskId, originalListId, originalListName) => {
  const updatedTask = await apiMoveToPurgatory(taskId, originalListId, originalListName)
  set({
    tasks: get().tasks.map(t => t.id === taskId ? updatedTask : t)
  })
},

moveFromPurgatory: async (taskId, newListId) => {
  const updatedTask = await apiMoveFromPurgatory(taskId, newListId)
  set({
    tasks: get().tasks.map(t => t.id === taskId ? updatedTask : t)
  })
},
```

### 3.6 Update page.tsx to move task to Purgatory on schedule

In `src/app/page.tsx`, update `handleExternalDrop`:

```typescript
const handleExternalDrop = async (taskId: string, time: string) => {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return
  
  const today = new Date().toISOString().split('T')[0]
  await scheduleTask(taskId, today, time + ':00')
  
  // Move task to Purgatory if not already there
  if (task.list_id !== PURGATORY_LIST_ID) {
    const originalList = lists.find(l => l.id === task.list_id)
    await moveToPurgatory(taskId, task.list_id || '', originalList?.name || 'Unknown')
  }
}
```

Add import at top:
```typescript
import { PURGATORY_LIST_ID } from '@/lib/constants'
```

Add to store destructuring:
```typescript
const { tasks, loading: tasksLoading, loadTasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask, moveToPurgatory } = useTaskStore()
```

**Commit:**
```bash
git add -A && git commit -m "feat: Implement purgatory list logic"
```

---

## SECTION 4: Update TaskCard UI for Purgatory

### 4.1 Update TaskCard props

Update `src/components/Tasks/TaskCard.tsx` interface:

```typescript
interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  isScheduled: boolean
  isDaily: boolean  // ADD
  paletteId: string
  isColorPickerOpen: boolean
  // Purgatory info (optional)
  purgatoryInfo?: {
    movedAt: string
    originalListName: string
  }
  onDurationClick: (reverse: boolean) => void
  onColorClick: () => void
  onColorSelect: (colorIndex: number) => void
  onDelete: () => void
  onDailyToggle: () => void  // ADD
}
```

### 4.2 Update TaskCard to show purgatory info and daily checkbox

Update `src/components/Tasks/TaskCard.tsx`:

Add to destructuring:
```typescript
export function TaskCard({
  // ... existing props
  isDaily,
  purgatoryInfo,
  onDailyToggle,
}: TaskCardProps) {
```

Add purgatory info display after the title section (inside the flex-1 div):

```typescript
{purgatoryInfo && (
  <div className="text-xs text-white/60 mt-1">
    From: {purgatoryInfo.originalListName} • {new Date(purgatoryInfo.movedAt).toLocaleDateString()}
  </div>
)}
```

Add daily checkbox after the duration button:

```typescript
<label className="flex items-center gap-1 text-sm text-white/70 hover:text-white cursor-pointer">
  <input
    type="checkbox"
    checked={isDaily}
    onChange={(e) => {
      e.stopPropagation()
      onDailyToggle()
    }}
    className="w-3 h-3 rounded"
  />
  <span className="text-xs">Daily</span>
</label>
```

### 4.3 Update ListCard to pass new props

Update `src/components/Lists/ListCard.tsx`:

Add to interface:
```typescript
onTaskDailyToggle: (taskId: string) => void
```

Update TaskCard usage:
```typescript
<TaskCard
  key={task.id}
  id={task.id}
  title={task.title}
  durationMinutes={task.duration_minutes}
  colorIndex={task.color_index}
  isCompleted={task.is_completed}
  isScheduled={scheduledTaskIds.includes(task.id)}
  isDaily={task.is_daily}
  paletteId={paletteId}
  isColorPickerOpen={colorPickerTaskId === task.id}
  purgatoryInfo={task.moved_to_purgatory_at ? {
    movedAt: task.moved_to_purgatory_at,
    originalListName: task.original_list_name || 'Unknown'
  } : undefined}
  onDurationClick={(reverse) => onTaskDurationClick(task.id, task.duration_minutes, reverse)}
  onColorClick={() => onTaskColorClick(task.id)}
  onColorSelect={(colorIndex) => onTaskColorSelect(task.id, colorIndex)}
  onDelete={() => onTaskDelete(task.id)}
  onDailyToggle={() => onTaskDailyToggle(task.id)}
/>
```

### 4.4 Update ListPanel to pass onTaskDailyToggle

Update `src/components/Lists/ListPanel.tsx`:

Add to interface:
```typescript
onTaskDailyToggle: (taskId: string) => void
```

Pass to ListCard:
```typescript
onTaskDailyToggle={onTaskDailyToggle}
```

### 4.5 Update page.tsx to handle daily toggle

Add handler in `src/app/page.tsx`:

```typescript
const handleDailyToggle = async (taskId: string) => {
  const task = tasks.find(t => t.id === taskId)
  if (task) {
    await updateTask(taskId, { is_daily: !task.is_daily })
  }
}
```

Pass to ListPanel:
```typescript
onTaskDailyToggle={handleDailyToggle}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add purgatory info display and daily checkbox to TaskCard"
```

---

## SECTION 5: Prevent Purgatory List Rename/Delete

### 5.1 Update ListCard to disable edit/delete for system lists

In `src/components/Lists/ListCard.tsx`, find the edit and delete buttons and wrap them with a condition:

```typescript
{!list.is_system && (
  <>
    {/* Edit button */}
    <Button ... />
    {/* Delete button */}
    <Button ... />
  </>
)}
```

Or disable the buttons:
```typescript
<Button
  disabled={list.is_system}
  // ... rest of props
/>
```

### 5.2 Update ListPanel to prevent Purgatory deletion

In any delete handlers, add a check:

```typescript
const handleDeleteList = async (listId: string) => {
  const list = lists.find(l => l.id === listId)
  if (list?.is_system) {
    console.warn('Cannot delete system list')
    return
  }
  await onDeleteList(listId)
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Prevent rename/delete of system lists"
```

---

## SECTION 6: Daily Task Auto-Generation (Basic Setup)

### 6.1 Create date list utility

Create `src/lib/dateList.ts`:

```typescript
import { DEV_USER_ID } from './constants'

/**
 * Format today's date as a list name
 * e.g., "13 Jan 2026"
 */
export function getTodayListName(): string {
  const today = new Date()
  return today.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}
```

### 6.2 Add API function to ensure today's list exists

Add to `src/api/lists.ts`:

```typescript
import { DEV_USER_ID } from '@/lib/constants'
import { getTodayListName, getTodayISO } from '@/lib/dateList'

export async function ensureTodayList() {
  const supabase = getSupabase()
  const todayName = getTodayListName()
  const todayISO = getTodayISO()
  
  // Check if today's list already exists
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('system_type', 'date')
    .eq('name', todayName)
    .single()
  
  if (existing) return existing
  
  // Create today's list
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: DEV_USER_ID,
      name: todayName,
      position: -500, // Show near top
      is_system: true,
      system_type: 'date',
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### 6.3 Add API function to spawn daily tasks

Add to `src/api/tasks.ts`:

```typescript
export async function spawnDailyTasks(todayListId: string) {
  const supabase = getSupabase()
  
  // Get all daily tasks that haven't been spawned today
  const { data: dailyTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_daily', true)
    .is('daily_source_id', null) // Original daily tasks, not spawned instances
  
  if (!dailyTasks || dailyTasks.length === 0) return []
  
  // Check which ones already have today's instance
  const { data: existingToday } = await supabase
    .from('tasks')
    .select('daily_source_id')
    .eq('list_id', todayListId)
    .not('daily_source_id', 'is', null)
  
  const alreadySpawnedIds = new Set(existingToday?.map(t => t.daily_source_id) || [])
  
  // Spawn new instances for tasks not yet spawned today
  const toSpawn = dailyTasks.filter(t => !alreadySpawnedIds.has(t.id))
  
  if (toSpawn.length === 0) return []
  
  const newTasks = toSpawn.map(task => ({
    user_id: DEV_USER_ID,
    list_id: todayListId,
    title: task.title,
    duration_minutes: task.duration_minutes,
    color_index: task.color_index,
    is_daily: false, // Spawned instance is not itself daily
    daily_source_id: task.id, // Reference to original daily task
    position: task.position,
  }))
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(newTasks)
    .select()
  
  if (error) throw error
  return data
}
```

### 6.4 Update list store to handle daily task initialization

Update `src/state/useListStore.ts`:

Add import:
```typescript
import { getLists, createList as apiCreateList, updateList as apiUpdateList, deleteList as apiDeleteList, duplicateList as apiDuplicateList, ensureTodayList } from '@/api'
```

Update loadLists:
```typescript
loadLists: async () => {
  // Ensure today's date list exists
  await ensureTodayList()
  
  const data = await getLists()
  set({ lists: data || [], loading: false })
},
```

### 6.5 Update task store to spawn daily tasks on load

Update `src/state/useTaskStore.ts`:

Add import:
```typescript
import { spawnDailyTasks } from '@/api'
import { PURGATORY_LIST_ID } from '@/lib/constants'
```

This is getting complex - the daily spawn should happen after we know today's list ID. 

For now, let's keep it simple: add a separate action that page.tsx can call:

```typescript
spawnDailyTasksForToday: async (todayListId: string) => {
  const newTasks = await spawnDailyTasks(todayListId)
  if (newTasks && newTasks.length > 0) {
    set({ tasks: [...get().tasks, ...newTasks] })
  }
},
```

### 6.6 Update page.tsx to initialize daily tasks

In `src/app/page.tsx`, update the useEffect:

```typescript
useEffect(() => {
  const init = async () => {
    await loadLists()
    await loadTasks()
    await loadSchedule()
    
    // Spawn daily tasks into today's list
    const todayList = lists.find(l => l.system_type === 'date')
    if (todayList) {
      await spawnDailyTasksForToday(todayList.id)
    }
  }
  init()
}, [])
```

Note: This has a timing issue since `lists` won't be populated yet. A better approach:

```typescript
useEffect(() => {
  loadLists()
  loadTasks()
  loadSchedule()
}, [loadLists, loadTasks, loadSchedule])

// Separate effect for spawning daily tasks after lists are loaded
useEffect(() => {
  if (!listsLoading && lists.length > 0) {
    const todayList = lists.find(l => l.system_type === 'date')
    if (todayList) {
      spawnDailyTasksForToday(todayList.id)
    }
  }
}, [listsLoading, lists])
```

Add to store destructuring:
```typescript
const { tasks, ..., spawnDailyTasksForToday } = useTaskStore()
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add daily task auto-generation system"
```

---

## SECTION 7: Export API Functions

### Update `src/api/index.ts`:

Make sure all new functions are exported:

```typescript
export { getTasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask, moveToPurgatory, moveFromPurgatory, spawnDailyTasks } from './tasks'
export { getLists, createList, updateList, deleteList, duplicateList, ensureTodayList } from './lists'
export { getScheduledTasks, scheduleTask, unscheduleTask, updateScheduleTime } from './scheduled'
```

**Commit:**
```bash
git add -A && git commit -m "feat: Export all new API functions"
```

---

## Verification

After all sections:

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ Purgatory list appears in the UI
2. ✅ Dragging task to calendar moves it to Purgatory
3. ✅ Purgatory tasks show "From: [list name] • [date]"
4. ✅ Cannot rename or delete Purgatory list
5. ✅ Daily checkbox appears on task cards
6. ✅ Checking "Daily" on a task persists
7. ✅ Today's date list auto-creates on app load
8. ✅ Daily tasks spawn into today's list

---

## Known Issues to Fix Later

1. **Colors mismatch** - List and calendar show different colors (separate bug)
2. **Font not Nunito** - Font configuration issue (separate bug)
3. **Duration click** - May not be working (separate bug)
4. **Padding hours** - User wants 1-1.5 hours instead of 2 hours

These should be addressed in a separate FIXES spec after this feature work.
