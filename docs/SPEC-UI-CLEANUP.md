# Spec: Hide Completed List + Fix Calendar Icons

## Overview

Two small UI fixes:
1. Hide the Completed list from the left panel (keep the Completed button in header)
2. Update calendar task icons to match list task icons

---

## Change 1: Hide Completed List from Left Panel

### Current Behavior
The Completed list appears in the left panel alongside other lists, showing "Completed - 0 tasks". Users can expand it, see an "Add task" input, etc. This is confusing because:
- Completed tasks are accessed via the "Completed" button in the header
- The Completed list in the left panel always shows 0 tasks (due to a filter bug)
- Users shouldn't manually add tasks to the Completed list

### Desired Behavior
- The Completed list should NOT appear in the left panel
- The "Completed" button in the header should continue to work (opens CompletedView)
- Tasks should still be moved to the Completed list when completed (database unchanged)

### Implementation

**File:** `src/components/Lists/ListPanel.tsx`

Find the lists.map() call (around line 98) and filter out the completed list:

**Before:**
```typescript
{lists.map((list) => {
```

**After:**
```typescript
{lists.filter(l => l.list_type !== 'completed').map((list) => {
```

That's it. One line change.

### Testing
- [ ] Completed list no longer appears in left panel
- [ ] Other lists (user, date, parked) still appear
- [ ] "Completed" button in header still works
- [ ] Completing a task still moves it to Completed (viewable via header button)

---

## Change 2: Fix Calendar Task Icons

### Current Behavior
Calendar tasks show action buttons when clicked, but the icons don't match the list task icons:
- Calendar uses `Check` and `X`
- List uses `CheckCircle` and `Trash2`

Also, the calendar "X" button calls unschedule, not delete - but the icon implies delete.

### Desired Behavior
- **Complete button:** Use `CheckCircle` (same as list) - moves task to Completed list
- **Unschedule button:** Use `CalendarX` (clear meaning) - removes from calendar, keeps in list

### Implementation

**File:** `src/components/Calendar/CalendarView.tsx`

**Step 1:** Update the import (around line 6 or wherever lucide-react is imported)

Find:
```typescript
import { Check, X } from 'lucide-react'
```

Replace with:
```typescript
import { CheckCircle, CalendarX } from 'lucide-react'
```

**Step 2:** Update the Complete button

Find the complete button (should have `Check` icon):
```typescript
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
```

Replace `<Check className="h-3 w-3" />` with:
```typescript
<CheckCircle className="h-4 w-4" />
```

(Slightly larger to match list style)

**Step 3:** Update the Unschedule button

Find the unschedule button (should have `X` icon):
```typescript
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
```

Replace `<X className="h-3 w-3" />` with:
```typescript
<CalendarX className="h-4 w-4" />
```

### Testing
- [ ] Click calendar task → buttons appear
- [ ] Complete button shows CheckCircle icon (green, matches list)
- [ ] Unschedule button shows CalendarX icon (gray, calendar-specific)
- [ ] Complete moves task to Completed list
- [ ] Unschedule removes task from calendar but keeps in list

---

## Files Modified

1. `src/components/Lists/ListPanel.tsx` - Filter out completed list (1 line)
2. `src/components/Calendar/CalendarView.tsx` - Update icons (3 small changes)

---

## Build and Commit

```bash
npm run build
```

```bash
git add -A && git commit -m "fix: hide Completed list from left panel, update calendar icons

- Filter out Completed list from left panel display
- Completed tasks still accessible via header button
- Calendar complete button now uses CheckCircle (matches list)
- Calendar unschedule button now uses CalendarX (clearer meaning)"
```
