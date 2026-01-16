# SPEC: Roll Over Tasks to Tomorrow

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**
4. **Read existing code before modifying.**

---

## Overview

This spec adds a "Roll over to tomorrow" button on date lists, allowing users to quickly move incomplete tasks to the next day.

| Section | Feature | Effort |
|---------|---------|--------|
| 1 | Verify date list creation logic (today + tomorrow only) | Verify |
| 2 | Add Roll Over API function | Small |
| 3 | Add Roll Over button to date list UI | Small |
| 4 | Fix expiry warning colors | Trivial |

---

## SECTION 1: Verify Date List Creation Logic

### Expected Behavior
- On app load, only TODAY and TOMORROW date lists are created
- If user logs in after a week vacation, they should NOT see empty lists for missed days
- Old date lists with tasks remain; users can manually delete them

### Files to Check
- `src/api/lists.ts` — `ensureTodayList()` and `ensureTomorrowList()`
- `src/state/useListStore.ts` — `loadLists()` calls these functions

### Verification Steps

1. Check `src/api/lists.ts`:
   - `ensureTodayList()` should ONLY create a list named with today's date
   - `ensureTomorrowList()` should ONLY create a list named with tomorrow's date
   - Neither function should loop through dates or create multiple lists

2. Check `src/state/useListStore.ts`:
   - `loadLists()` should call `ensureTodayList()` and `ensureTomorrowList()`
   - Should NOT call any function that creates lists for other dates

### Current Code Review

The current implementation in `src/api/lists.ts` is CORRECT:

```typescript
// ensureTodayList() - lines 128-170
// - Gets today's date name via getTodayListName()
// - Checks if list exists with that exact name
// - Creates ONLY if it doesn't exist
// - No loops, no multiple days

// ensureTomorrowList() - lines 172-214
// - Gets tomorrow's date name via getTomorrowListName()
// - Same pattern as above
// - No loops, no multiple days
```

The current implementation in `src/state/useListStore.ts` is CORRECT:

```typescript
// loadLists() - lines 29-37
// - Calls ensureTodayList()
// - Calls ensureTomorrowList()
// - Then fetches all lists
// - No other date creation logic
```

### Action
**No code changes needed.** The logic is already correct. Just confirm this during implementation by reading the code.

If for some reason the code does NOT match the above description, fix it to match.

---

## SECTION 2: Add Roll Over API Function

### File: `src/api/tasks.ts`

Add a new function to move all incomplete tasks from one list to another:

```typescript
export async function rollOverTasks(fromListId: string, toListId: string): Promise<number> {
  const supabase = getSupabase()
  
  // Get all incomplete tasks from the source list
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('list_id', fromListId)
    .eq('is_completed', false)
  
  if (fetchError) throw fetchError
  if (!tasks || tasks.length === 0) return 0
  
  // Move them to the destination list
  const taskIds = tasks.map(t => t.id)
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ list_id: toListId })
    .in('id', taskIds)
  
  if (updateError) throw updateError
  
  return taskIds.length
}
```

### File: `src/api/index.ts`

Add export:

```typescript
export { 
  // ... existing exports
  rollOverTasks 
} from './tasks'
```

---

## SECTION 3: Add Roll Over Button to Date List UI

### File: `src/components/Lists/ListCard.tsx`

#### 3.1 Add new prop for roll over handler

Find the `ListCardProps` interface and add:

```typescript
interface ListCardProps {
  // ... existing props
  onRollOver?: () => void  // Only provided for date lists that can roll over
}
```

Add to destructured props:

```typescript
export function ListCard({
  // ... existing props
  onRollOver,
}: ListCardProps) {
```

#### 3.2 Add Roll Over button in the expanded content

Find the expanded content section (after the DragDropContext/tasks, before AddTaskInput).

Add the Roll Over button for date lists with incomplete tasks:

```tsx
{/* Roll Over button - only for date lists with incomplete tasks */}
{isDateList && !isInbox && tasks.filter(t => !t.is_completed).length > 0 && onRollOver && (
  <button
    onClick={onRollOver}
    className="w-full mt-2 mb-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md border border-dashed border-slate-300 dark:border-slate-600 transition-colors flex items-center justify-center gap-2"
  >
    <span>→</span>
    <span>Roll over to tomorrow</span>
  </button>
)}

{/* Add task input */}
<AddTaskInput onAdd={onTaskAdd} />
```

**Note:** Place this AFTER the task list but BEFORE the AddTaskInput.

---

## SECTION 4: Wire Up Roll Over in ListPanel and Page

### File: `src/components/Lists/ListPanel.tsx`

#### 4.1 Add handler prop to interface

```typescript
interface ListPanelProps {
  // ... existing props
  onRollOverTasks: (fromListId: string) => void
}
```

#### 4.2 Pass to ListCard

In the lists.map(), pass the onRollOver prop to date lists:

```tsx
<ListCard
  // ... existing props
  onRollOver={
    list.system_type === 'date' 
      ? () => onRollOverTasks(list.id)
      : undefined
  }
/>
```

### File: `src/hooks/useAppHandlers.ts`

#### 4.3 Add roll over handler

Import the API function:

```typescript
import { rollOverTasks } from '@/api'
```

Add the handler:

```typescript
const handleRollOverTasks = async (fromListId: string) => {
  // Find tomorrow's list
  const tomorrowList = lists.find(l => {
    if (l.system_type !== 'date') return false
    // Check if this is tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowName = tomorrow.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    return l.name === tomorrowName
  })
  
  if (!tomorrowList) {
    console.error('Tomorrow list not found')
    return
  }
  
  const count = await rollOverTasks(fromListId, tomorrowList.id)
  
  if (count > 0) {
    // Reload tasks to reflect the move
    const { loadTasks } = useTaskStore.getState()
    await loadTasks()
  }
}
```

Add to return object:

```typescript
return {
  // ... existing
  handleRollOverTasks,
}
```

### File: `src/app/page.tsx`

#### 4.4 Get handler and pass to ListPanel

Get from useAppHandlers:

```typescript
const {
  // ... existing
  handleRollOverTasks,
} = useAppHandlers()
```

Pass to ListPanel:

```tsx
<ListPanel
  // ... existing props
  onRollOverTasks={handleRollOverTasks}
/>
```

---

## SECTION 5: Fix Expiry Warning Colors

### File: `src/components/Lists/ListCard.tsx`

Find the expiry notice (should be in the expanded content for Scheduled/purgatory list):

**Current (if it exists with amber colors):**
```tsx
{isInbox && tasks.length > 0 && (
  <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
    <p className="text-xs text-amber-700 dark:text-amber-400">
      ⏳ Tasks here expire after 7 days if not moved to another list.
    </p>
  </div>
)}
```

**Replace with:**
```tsx
{isInbox && tasks.length > 0 && (
  <div className="mb-3 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
    <p className="text-xs text-slate-600 dark:text-slate-300">
      ⏳ Tasks expire after 7 days.
    </p>
  </div>
)}
```

**Changes:**
- Amber → Slate colors (better contrast in both modes)
- Shortened text: "Tasks expire after 7 days."

---

## Verification Checklist

After all sections:

- [ ] Date list creation only creates Today and Tomorrow (verified by reading code)
- [ ] Roll Over button appears on date lists with incomplete tasks
- [ ] Roll Over button does NOT appear on:
  - Scheduled list (isInbox)
  - TBD Grab Bag (parked)
  - Empty date lists
  - Date lists where all tasks are completed
- [ ] Clicking Roll Over moves incomplete tasks to tomorrow's list
- [ ] Task count updates after roll over
- [ ] Expiry warning is readable (slate colors, not amber)
- [ ] Expiry warning text is short: "Tasks expire after 7 days."
- [ ] `npm run build` passes

---

## Commit Messages

1. `verify: Date list creation only creates today and tomorrow`
2. `feat: Add rollOverTasks API function`
3. `feat: Add Roll Over button to date list cards`
4. `feat: Wire up Roll Over handler in ListPanel and page`
5. `fix: Change expiry warning to slate colors and shorten text`

---

## User Flow

1. User has tasks in "Jan 16" list
2. End of day, some tasks not done
3. User expands "Jan 16" list
4. Sees "→ Roll over to tomorrow" button below tasks
5. Clicks it
6. All incomplete tasks move to "Jan 17" list
7. "Jan 16" now shows only completed tasks (or is empty)
8. User can delete "Jan 16" via three-dots menu if desired
