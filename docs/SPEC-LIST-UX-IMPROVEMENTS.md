# SPEC: List UX Improvements & Quick Fixes

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**

---

## Overview

| Section | Feature | Effort |
|---------|---------|--------|
| 1 | Add max-height scrolling to expanded lists | Small |
| 2 | Empty lists default to collapsed | Small |
| 3 | Add "Collapse All" button | Small |
| 4 | Fix tab title to "Timeboxxer" | Trivial |
| 5 | Fix duration increment (45 → 15 bug) | Trivial |

---

## SECTION 1: Add Max-Height Scrolling to Expanded Lists

### Problem
When a list has many tasks (e.g., 13+ tasks), the list pushes the entire page down and makes it hard to see other lists or the calendar. Tasks should scroll within a bounded container.

### File to Modify
`src/components/Lists/ListCard.tsx`

### Current Code (lines 227-279)
The expanded content section currently has no height constraint:

```tsx
{isExpanded && (
  <div className="px-4 pb-4">
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-2"
          >
            {/* tasks mapped here */}
          </div>
        )}
      </Droppable>
    </DragDropContext>
    
    {/* Add task input */}
    <AddTaskInput onAdd={onTaskAdd} />
  </div>
)}
```

### Required Changes

1. **Wrap the task list (NOT the AddTaskInput) in a scrollable container**

Find this div inside the `{isExpanded && (...)}` block:
```tsx
<div
  ref={provided.innerRef}
  {...provided.droppableProps}
  className="space-y-2"
>
```

Change it to:
```tsx
<div
  ref={provided.innerRef}
  {...provided.droppableProps}
  className="space-y-2 max-h-[60vh] overflow-y-auto pr-1"
>
```

**Explanation:**
- `max-h-[60vh]` — Maximum height is 60% of viewport height
- `overflow-y-auto` — Show scrollbar only when content exceeds max height
- `pr-1` — Small right padding so scrollbar doesn't overlap task cards

2. **IMPORTANT: The `AddTaskInput` must remain OUTSIDE the scrollable area**

The AddTaskInput should always be visible at the bottom of the list, not scrolled away. The current structure already has AddTaskInput outside the Droppable, which is correct. Just make sure the max-height is only on the droppable div, not the outer `px-4 pb-4` div.

### Verification
- Open a list with 10+ tasks
- The task area should scroll internally
- The "Add task..." input should always be visible at the bottom
- Scrollbar should appear only when needed

---

## SECTION 2: Empty Lists Default to Collapsed

### Problem
Lists with 0 tasks (like "Jan 16, 2026" in the screenshot) are expanded by default, taking up space for no reason. Empty lists should default to collapsed.

### File to Modify
`src/components/Lists/ListPanel.tsx`

### Current Code (lines 137-139)
```tsx
{lists.map((list, index) => {
  const column = index % 2
  const isExpanded = expandedListByColumn[column] === list.id
```

### Required Changes

1. **Compute whether the list has tasks**

After line 139, add logic to check if the list is empty:

```tsx
{lists.map((list, index) => {
  const column = index % 2
  const listTasks = getTasksForList(list.id)
  const hasNoTasks = listTasks.length === 0
  
  // If list is empty, force collapsed (ignore expandedListByColumn)
  // Otherwise, use the normal expansion state
  const isExpanded = hasNoTasks ? false : expandedListByColumn[column] === list.id
```

2. **Update the ListCard rendering to pass the computed isExpanded**

The ListCard already receives `isExpanded` as a prop, so no changes needed there.

### Alternative Approach (if above causes issues with toggling)

If we want users to still be able to manually expand empty lists, use this approach instead:

In `src/state/useUIStore.ts`, modify the initial state or add logic in `toggleListExpanded` to check task count. However, this requires passing task counts to the store which adds complexity.

**Recommendation:** Use the simpler approach above. If a list has no tasks, there's nothing to see, so forcing it collapsed makes sense. Users can still add tasks via the collapsed header's menu or by creating tasks elsewhere and moving them.

### Verification
- Load the app with an empty list (like tomorrow's date list)
- Empty list should appear collapsed (just header visible)
- Lists with tasks should still expand/collapse normally
- Clicking an empty list header should still toggle it (it will expand to show just the "Add task" input)

**Wait — reconsideration:** Actually, users might want to expand an empty list to add tasks to it. Let me revise:

### Revised Approach

Instead of forcing empty lists to stay collapsed, just make them **default** to collapsed on initial load. Users can still click to expand them.

This requires a different approach — we need to track which lists have been manually toggled vs. using defaults.

**Simpler solution:** On initial app load, auto-expand only lists that have tasks. This is handled in `useUIStore`'s initial state.

**File to Modify:** `src/components/Lists/ListPanel.tsx`

Add an effect that sets initial expansion state based on task count:

```tsx
// Add this import at the top
import { useEffect, useRef } from 'react'

// Inside the component, add:
const initializedRef = useRef(false)

useEffect(() => {
  // Only run once on mount
  if (initializedRef.current) return
  initializedRef.current = true
  
  // Auto-expand the first list in each column that has tasks
  lists.forEach((list, index) => {
    const column = index % 2
    const listTasks = getTasksForList(list.id)
    
    // If this column doesn't have an expanded list yet,
    // and this list has tasks, expand it
    if (expandedListByColumn[column] === null && listTasks.length > 0) {
      onToggleListExpanded(list.id, column)
    }
  })
}, [lists, expandedListByColumn, onToggleListExpanded, getTasksForList])
```

**Actually, this is getting complicated.** Let me simplify:

### Final Simplified Approach

Just change the condition for `isExpanded` to also consider task count for the DEFAULT state:

```tsx
const listTasks = getTasksForList(list.id)

// A list is expanded if:
// 1. It's explicitly set as expanded in the store, OR
// 2. It's the first list in its column AND has tasks (auto-expand)
const isExplicitlyExpanded = expandedListByColumn[column] === list.id
const isFirstInColumn = lists.filter((_, i) => i % 2 === column).indexOf(list) === 0
const shouldAutoExpand = isFirstInColumn && listTasks.length > 0 && expandedListByColumn[column] === null

const isExpanded = isExplicitlyExpanded || shouldAutoExpand
```

Hmm, this is still complex. Let me think again...

### FINAL DECISION — Simplest Approach

Keep the expansion logic as-is, but modify the **initial state** in `useUIStore.ts`:

**File:** `src/state/useUIStore.ts`

The current initial state is:
```tsx
expandedListByColumn: { 0: null, 1: null, 2: null },
```

This means no lists are expanded by default. The issue is that the code probably auto-expands something elsewhere, or the behavior we're seeing is from a previous session.

**Actually, looking at the screenshot again:** Both Jan 15 and Jan 16 are expanded. This suggests either:
1. There's auto-expand logic somewhere, or
2. The state persists somehow

Let me just implement: **Empty lists cannot be expanded** (since there's nothing to show except AddTaskInput, which we can still show).

**No wait** — users need to be able to expand empty lists to add tasks!

### TRULY FINAL APPROACH

Keep it simple. In `ListPanel.tsx`, just don't auto-expand empty lists. If a user manually clicks to expand an empty list, that's fine.

The real fix is to ensure the **initial/default expansion state** prefers non-empty lists.

**File:** `src/components/Lists/ListPanel.tsx`

Add a `useEffect` that runs once on mount to set sensible defaults:

```tsx
// At the top of the component, add a ref to track initialization
const hasInitializedExpansion = useRef(false)

// Add this useEffect after other useEffects
useEffect(() => {
  // Only run once when lists are first loaded
  if (hasInitializedExpansion.current || lists.length === 0) return
  hasInitializedExpansion.current = true
  
  // For each column, expand the first list that has tasks
  const columnsToInit = [0, 1]
  columnsToInit.forEach(column => {
    // Get lists in this column
    const listsInColumn = lists.filter((_, index) => index % 2 === column)
    
    // Find first list with tasks
    const firstWithTasks = listsInColumn.find(list => {
      const taskCount = tasks.filter(t => t.list_id === list.id && !t.is_completed).length
      return taskCount > 0
    })
    
    // If found and nothing is currently expanded in this column, expand it
    if (firstWithTasks && expandedListByColumn[column] === null) {
      onToggleListExpanded(firstWithTasks.id, column)
    }
  })
}, [lists, tasks, expandedListByColumn, onToggleListExpanded])
```

### Verification
- On fresh load, lists with tasks should be expanded
- Empty lists should be collapsed by default
- User can still manually expand/collapse any list
- If all lists in a column are empty, none are expanded (correct)

---

## SECTION 3: Add "Collapse All" Button

### Problem
When multiple lists are expanded, the UI gets cluttered. Users need a quick way to collapse everything.

### File to Modify
`src/state/useUIStore.ts` — Add a `collapseAllLists` action
`src/components/Layout/Header.tsx` — Add the button
`src/app/page.tsx` — Wire up the handler

### Changes to `src/state/useUIStore.ts`

1. Add a new action to the interface (around line 31):
```tsx
collapseAllLists: () => void
```

2. Add the implementation (around line 64, after `toggleListExpanded`):
```tsx
collapseAllLists: () => set({
  expandedListByColumn: { 0: null, 1: null, 2: null }
}),
```

### Changes to `src/components/Layout/Header.tsx`

1. Add import for the icon (line 5):
```tsx
import { Sun, Moon, List, Calendar, LayoutGrid, Plus, X, Shuffle, ChevronsDownUp } from 'lucide-react'
```

2. Add a new prop to the interface (around line 17):
```tsx
onCollapseAll: () => void
```

3. Add the button in the header, near the panel mode controls. Find this section (around line 110-143):
```tsx
{/* Panel Mode Controls - only show on main view */}
{currentView === 'main' && (
  <div className="flex h-9 items-center bg-muted rounded-lg p-1 gap-1">
```

Add the Collapse All button just BEFORE this div:
```tsx
{/* Collapse All button - only show on main view */}
{currentView === 'main' && (
  <Button
    variant="outline"
    size="sm"
    onClick={onCollapseAll}
    className="h-9"
    title="Collapse all lists"
  >
    <ChevronsDownUp className="h-4 w-4" />
  </Button>
)}

{/* Panel Mode Controls - only show on main view */}
```

### Changes to `src/app/page.tsx`

1. Import `collapseAllLists` from the store. Find the existing useUIStore destructuring (around line 20-27):
```tsx
const {
  currentView, setCurrentView,
  panelMode, setPanelMode,
  editingListId, setEditingListId,
  duplicatingListId, setDuplicatingListId,
  showNewListInput, setShowNewListInput,
  expandedListByColumn, toggleListExpanded,
} = useUIStore()
```

Add `collapseAllLists`:
```tsx
const {
  currentView, setCurrentView,
  panelMode, setPanelMode,
  editingListId, setEditingListId,
  duplicatingListId, setDuplicatingListId,
  showNewListInput, setShowNewListInput,
  expandedListByColumn, toggleListExpanded,
  collapseAllLists,
} = useUIStore()
```

2. Pass it to the Header component. Find the Header component (around line 126-139 and 151-166):
```tsx
<Header
  currentView={currentView}
  panelMode={panelMode}
  onViewChange={setCurrentView}
  onPanelModeChange={setPanelMode}
  onParkThought={handleParkThought}
  onJustStart={() => {
    // ...
  }}
  completedToday={completedToday}
  weekData={getWeekData()}
/>
```

Add the new prop:
```tsx
<Header
  currentView={currentView}
  panelMode={panelMode}
  onViewChange={setCurrentView}
  onPanelModeChange={setPanelMode}
  onParkThought={handleParkThought}
  onCollapseAll={collapseAllLists}
  onJustStart={() => {
    // ...
  }}
  completedToday={completedToday}
  weekData={getWeekData()}
/>
```

**Note:** The Header component is rendered twice in page.tsx (once for main view, once for completed view). Add `onCollapseAll={collapseAllLists}` to BOTH instances.

### Verification
- Button appears in header (icon: two chevrons pointing inward)
- Clicking it collapses all expanded lists
- Button only shows on main view, not completed view
- Tooltip shows "Collapse all lists" on hover

---

## SECTION 4: Fix Tab Title to "Timeboxxer"

### Problem
The browser tab shows "Create Next App" instead of "Timeboxxer".

### File to Modify
`src/app/layout.tsx`

### Current Code (lines 12-15)
```tsx
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};
```

### Required Changes
```tsx
export const metadata: Metadata = {
  title: "Timeboxxer",
  description: "A time-boxing app for daily planning",
};
```

### Verification
- Browser tab shows "Timeboxxer"
- If you share the link, preview shows correct title/description

---

## SECTION 5: Fix Duration Increment Bug

### Problem
User reports: "task increment increases by 45 minutes - should be 15"

This suggests clicking the duration cycles incorrectly. Let me check the cycle logic.

### File to Check
`src/components/Lists/ListPanel.tsx` — lines 123-132

### Current Code
```tsx
const cycleDuration = (current: number, reverse: boolean) => {
  const durations = [15, 30, 45, 60]
  const idx = durations.indexOf(current)
  if (idx === -1) return 30 // Default if current not in list
  
  if (reverse) {
    return durations[(idx - 1 + durations.length) % durations.length]
  }
  return durations[(idx + 1) % durations.length]
}
```

This looks correct:
- 15 → 30 → 45 → 60 → 15 (forward)
- 15 → 60 → 45 → 30 → 15 (reverse with Shift)

### Possible Issue
The bug might be elsewhere. Check if there's another duration cycle in `TaskCard.tsx` or in the store.

**Actually, I see the issue!** Look at the `onTaskDurationClick` prop passed to TaskCard (line 265 in ListCard.tsx):

```tsx
onDurationClick={(reverse) => onTaskDurationClick(task.id, task.duration_minutes, reverse)}
```

And in ListPanel.tsx line 168-169:
```tsx
onTaskDurationClick={(taskId, duration, reverse) => 
  onTaskDurationChange(taskId, cycleDuration(duration, reverse))
}
```

The cycle itself looks fine. Let me check if there's a different issue...

**Hypothesis:** Maybe the bug is that the FIRST click jumps from 15 to 60 instead of 15 to 30? That would happen if the cycle is running backwards accidentally.

Or maybe there's a separate handler that's not using cycleDuration?

### Verification Steps
1. Create a new task (default 15m)
2. Click the duration once — should become 30m
3. Click again — should become 45m
4. Click again — should become 60m
5. Click again — should become 15m

If step 2 produces 60m instead of 30m, the cycle is running backwards.

### If Bug Confirmed
Check if `reverse` is somehow being passed as `true` when it shouldn't be. In TaskCard.tsx line 102-105:

```tsx
onClick={(e) => {
  e.stopPropagation()
  onDurationClick(e.shiftKey)
}}
```

This looks correct — only passes `true` if Shift is held.

### For Now
Mark this as "needs investigation" — the code looks correct. Ask user to:
1. Confirm exact reproduction steps
2. Check if Shift key is stuck or if there's a keyboard issue

**If no bug is found, skip this section.**

---

## Commit Messages

After each section, commit with these messages:

1. `feat: Add max-height scrolling to expanded lists (60vh)`
2. `feat: Empty lists default to collapsed on initial load`
3. `feat: Add Collapse All button to header`
4. `fix: Update tab title and description to Timeboxxer`
5. `fix: Duration cycle bug` (if applicable)

---

## Final Verification Checklist

After all sections:

- [ ] Long lists scroll internally (don't push page down)
- [ ] Empty lists are collapsed by default
- [ ] Collapse All button works
- [ ] Browser tab shows "Timeboxxer"
- [ ] Duration cycling works correctly (15→30→45→60→15)
- [ ] `npm run build` passes
- [ ] No files over 300 lines
