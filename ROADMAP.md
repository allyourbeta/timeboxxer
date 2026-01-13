# Timeboxxer Development Roadmap

> **FOR CLAUDE CODE**: Execute these features in order. Do NOT ask for confirmation.
> Make decisions based on CLAUDE.md architecture. Run `npm run build` after each feature.
> If build fails, fix it. If a file exceeds 300 lines, split it immediately.

---

## Phase 2: Core Functionality

### 2.1 Create API Layer

**Task:** Create the API layer with all CRUD operations.

**Create `src/api/tasks.ts`:**
```typescript
import { getSupabase } from '@/lib/supabase'

const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'

export async function getTasks() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position')
  if (error) throw error
  return data
}

export async function createTask(listId: string, title: string) {
  const supabase = getSupabase()
  
  // Get next position
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = existing?.[0]?.position ?? -1 + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: DEV_USER_ID,
      list_id: listId,
      title,
      duration_minutes: 15,
      color_index: 0,
      position: nextPosition,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateTask(taskId: string, updates: {
  title?: string
  duration_minutes?: number
  color_index?: number
  notes?: string
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeTask(taskId: string) {
  const supabase = getSupabase()
  
  // Mark complete
  const { error: taskError } = await supabase
    .from('tasks')
    .update({ 
      is_completed: true, 
      completed_at: new Date().toISOString() 
    })
    .eq('id', taskId)
  
  if (taskError) throw taskError
  
  // Remove from schedule
  await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('task_id', taskId)
}

export async function uncompleteTask(taskId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('tasks')
    .update({ is_completed: false, completed_at: null })
    .eq('id', taskId)
  if (error) throw error
}

export async function deleteTask(taskId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  if (error) throw error
}

export async function moveTaskToList(taskId: string, newListId: string | null) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({ list_id: newListId })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}
```

**Create `src/api/lists.ts`:**
```typescript
import { getSupabase } from '@/lib/supabase'

const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'

export async function getLists() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('position')
  if (error) throw error
  return data
}

export async function createList(name: string) {
  const supabase = getSupabase()
  
  const { data: existing } = await supabase
    .from('lists')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: DEV_USER_ID,
      name,
      position: nextPosition,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateList(listId: string, name: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('lists')
    .update({ name })
    .eq('id', listId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteList(listId: string) {
  const supabase = getSupabase()
  // Tasks will have list_id set to NULL due to ON DELETE SET NULL
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId)
  if (error) throw error
}

export async function duplicateList(listId: string, newName: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .rpc('duplicate_list', { p_list_id: listId, p_new_name: newName })
  if (error) throw error
  return data
}
```

**Create `src/api/scheduled.ts`:**
```typescript
import { getSupabase } from '@/lib/supabase'

const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'

export async function getScheduledTasks(date?: string) {
  const supabase = getSupabase()
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('scheduled_date', targetDate)
  
  if (error) throw error
  return data
}

export async function scheduleTask(taskId: string, date: string, startTime: string) {
  const supabase = getSupabase()
  
  // Remove existing schedule for this task if any
  await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('task_id', taskId)
  
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .insert({
      user_id: DEV_USER_ID,
      task_id: taskId,
      scheduled_date: date,
      start_time: startTime,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function unscheduleTask(taskId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('task_id', taskId)
  if (error) throw error
}

export async function updateScheduleTime(scheduleId: string, startTime: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .update({ start_time: startTime })
    .eq('id', scheduleId)
    .select()
    .single()
  if (error) throw error
  return data
}
```

**Create `src/api/index.ts`:**
```typescript
export * from './tasks'
export * from './lists'
export * from './scheduled'
```

---

### 2.2 Mark Task Complete

**Trigger:** User clicks checkmark icon on a scheduled task in the calendar.

**Behavior:**
1. Call `completeTask(taskId)` from API
2. Task disappears from calendar
3. Task shows as completed (strikethrough, opacity-50) in its list

**UI Changes to `src/app/page.tsx`:**
- Add a checkmark button (✓) in top-right corner of scheduled task blocks
- On click, call API and update local state
- In list view, completed tasks show with `line-through` and `opacity-50`
- Filter: Don't show completed tasks on calendar

**Acceptance test:**
- Click ✓ on "Review PRD" in calendar
- It disappears from calendar
- It shows faded with strikethrough in "Today" list

---

### 2.3 Unschedule Task

**Trigger:** User clicks X icon on a scheduled task in calendar.

**Behavior:**
1. Call `unscheduleTask(taskId)` from API
2. Task disappears from calendar
3. Task remains in its list unchanged

**UI Changes:**
- Add X button next to checkmark on scheduled tasks
- On click, call API and update local state

**Acceptance test:**
- Schedule "Run" to 10:00
- Click X on it
- It disappears from calendar but remains in Fitness list

---

### 2.4 Add New Task

**Trigger:** User types in input field at bottom of a list, presses Enter.

**Behavior:**
1. Call `createTask(listId, title)` from API
2. New task appears at bottom of list
3. Clear input field

**UI Changes:**
- Add `<input>` at bottom of each list with placeholder "Add task..."
- On Enter keypress, create task if input not empty
- Optimistic update: show task immediately, rollback on error

**Acceptance test:**
- Type "Buy groceries" in Inbox, press Enter
- Task appears with 15 min, first color

---

### 2.5 Delete Task

**Trigger:** User clicks trash icon on a task in a list.

**Behavior:**
1. Call `deleteTask(taskId)` from API
2. Task disappears from list and calendar (if scheduled)

**UI Changes:**
- Show trash icon on task hover (right side)
- Confirm? No — just delete. Keep it fast.

**Acceptance test:**
- Hover "Stretch", click trash
- It's gone from Fitness list

---

### 2.6 Change Task Duration

**Trigger:** User clicks duration badge on a task in list view.

**Behavior:**
1. Cycle: 15 → 30 → 45 → 60 → 15
2. Call `updateTask(taskId, { duration_minutes })` from API
3. Update UI immediately (optimistic)
4. If task is scheduled, calendar block resizes

**UI Changes:**
- Make duration badge clickable with `cursor-pointer`
- Add hover state (slight highlight)

**Acceptance test:**
- Click "15 min" on a task
- It becomes "30 min"
- If scheduled, calendar block is now taller

---

### 2.7 Change Task Color

**Trigger:** User clicks color dot/swatch on a task in list view.

**Behavior:**
1. Show small popover with 12 color swatches from current palette
2. On click, call `updateTask(taskId, { color_index })` from API
3. Update UI immediately

**UI Changes:**
- Add small colored circle before task title
- On click, show color picker popover
- Clicking outside closes popover

**Acceptance test:**
- Click color dot on "Run"
- Popover shows 12 colors
- Click a different color
- Task and scheduled block (if any) update

---

### 2.8 Add New List

**Trigger:** User clicks "+ Add List" button below all lists.

**Behavior:**
1. Prompt for name (inline input, not modal)
2. Call `createList(name)` from API
3. New empty list appears

**UI Changes:**
- Add "+ Add List" button at bottom of lists panel
- On click, show inline input
- On Enter, create list
- On Escape or blur, cancel

**Acceptance test:**
- Click "+ Add List"
- Type "Shopping", Enter
- Empty "Shopping" list appears

---

### 2.9 Rename List

**Trigger:** User double-clicks list name.

**Behavior:**
1. Name becomes editable input
2. On Enter or blur, call `updateList(listId, name)` from API
3. On Escape, cancel edit

**UI Changes:**
- Double-click list header to edit
- Show input with current name selected

**Acceptance test:**
- Double-click "Today"
- Change to "Monday"
- Press Enter
- List is now "Monday"

---

### 2.10 Delete List

**Trigger:** User clicks trash icon on list header (shown on hover).

**Behavior:**
1. Call `deleteList(listId)` from API
2. List disappears
3. Tasks in that list have `list_id` set to NULL (orphaned)
4. Orphaned tasks should appear in Inbox

**UI Changes:**
- Show trash icon on list header hover
- After delete, re-fetch tasks to show orphaned ones in Inbox

**Note:** Don't allow deleting Inbox (is_inbox = true)

**Acceptance test:**
- Create list "Test", add a task
- Delete "Test"
- Task appears in Inbox

---

### 2.11 Duplicate List

**Trigger:** User clicks duplicate icon on list header (shown on hover).

**Behavior:**
1. Prompt for new name (default: "[Original] Copy")
2. Call `duplicateList(listId, newName)` from API
3. New list appears with copied tasks

**UI Changes:**
- Show duplicate icon (📋 or similar) on list header hover
- Inline input for new name

**Acceptance test:**
- Duplicate "Fitness"
- Name it "Fitness Tuesday"
- New list has "Run" and "Stretch" tasks

---

### 2.12 Completed Tasks View

**Trigger:** User clicks "Completed" button/tab in header.

**Behavior:**
1. Show list of completed tasks, sorted by `completed_at` desc
2. Each item shows: title, completed date/time, original list name
3. Option to "uncomplete" (restore task)

**UI Changes:**
- Add "Completed" button in header
- Toggle between main view and completed view
- In completed view, show flat list of done tasks

**Acceptance test:**
- Complete "Review PRD"
- Click "Completed" in header
- See "Review PRD" with timestamp
- Click "Restore"
- Task is back in Today list, uncompleted

---

## Phase 3: Polish & UX

### 3.1 Scroll Calendar to 9am on Load

**Behavior:** When page loads, calendar scrolls to 9:00 AM position.

**Implementation:** Use `useEffect` with `ref.scrollTo()` after render.

---

### 3.2 Current Time Indicator

**Behavior:** Red horizontal line showing current time, updates every minute.

**Implementation:** 
- Calculate position based on current time
- `setInterval` to update every 60 seconds
- Red line with "Now" label

---

### 3.3 Drag Task to Different List

**Behavior:** User can drag task from one list to another list (not just to calendar).

**Implementation:**
- Lists are drop targets
- On drop, call `moveTaskToList(taskId, newListId)`

---

### 3.4 Reorder Tasks Within List

**Behavior:** User can drag tasks to reorder within a list.

**Implementation:**
- Track drag index and drop index
- Update `position` field for affected tasks
- Optimistic update

---

### 3.5 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | Focus "add task" input in first list |
| `Escape` | Cancel current action, close popovers |
| `?` | Show keyboard shortcuts help |

---

## Phase 4: Proper Architecture Refactor

After features work, refactor to match CLAUDE.md architecture:

### 4.1 Create Zustand Stores

**Create `src/state/useTaskStore.ts`:**
- Holds tasks array
- Actions: loadTasks, createTask, updateTask, deleteTask, completeTask

**Create `src/state/useListStore.ts`:**
- Holds lists array
- Actions: loadLists, createList, updateList, deleteList, duplicateList

**Create `src/state/useScheduleStore.ts`:**
- Holds scheduled tasks for current day
- Actions: loadSchedule, scheduleTask, unscheduleTask, updateTime

**Create `src/state/useUIStore.ts`:**
- Holds: draggedTask, colorPickerOpen, editingListId, view ('main' | 'completed')
- Actions: setDraggedTask, openColorPicker, etc.

### 4.2 Extract Components

Split `page.tsx` into:
- `src/components/Layout/AppShell.tsx` — Overall layout
- `src/components/Lists/ListPanel.tsx` — Left sidebar with all lists
- `src/components/Lists/ListCard.tsx` — Single list with tasks
- `src/components/Tasks/TaskCard.tsx` — Single task in list
- `src/components/Tasks/AddTaskInput.tsx` — Input for new task
- `src/components/Calendar/DayView.tsx` — Right side calendar
- `src/components/Calendar/TimeSlot.tsx` — Single time slot
- `src/components/Calendar/ScheduledTaskBlock.tsx` — Task on calendar

Each component < 200 lines, no business logic, just props and events.

### 4.3 Create Services

**Create `src/services/timeboxing.ts`:**
```typescript
// Pure functions, no React, no database

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  // implementation
}

export function doTimeSlotsOverlap(
  start1: string, duration1: number,
  start2: string, duration2: number
): boolean {
  // implementation
}

export function getNextAvailableSlot(
  scheduled: Array<{ start_time: string; duration_minutes: number }>,
  preferredStart: string,
  duration: number
): string | null {
  // implementation
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}
```

---

## Verification Checklist

After completing each feature:

1. `npm run build` passes
2. No TypeScript errors
3. No files over 300 lines
4. Test the feature manually in browser
5. Commit with descriptive message

After Phase 4:

1. Run `./scripts/verify.sh`
2. All checks pass
3. Components have no direct Supabase imports
4. Services have no React imports

---

## Git Commit Strategy

Commit after each numbered feature:
- `feat: 2.1 - Create API layer`
- `feat: 2.2 - Mark task complete`
- `feat: 2.3 - Unschedule task`
- etc.

