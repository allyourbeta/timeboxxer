# Spec: Create Task Directly in Calendar Slot

## Overview

Users can create a task by clicking on an empty area of a calendar time slot and typing directly into an inline input field.

## User Flow

1. User sees calendar with time slots
2. User clicks on empty space within a time slot (e.g., the 11:00 row)
3. An inline text input appears in that slot, auto-focused
4. User types a task title (e.g., "Team meeting")
5. User presses Enter
6. Task is created at that time, input disappears, task renders in the slot
7. (Alternative) User presses Escape → input disappears, nothing created

## Detailed Behavior

### Triggering Edit Mode

| User Action | Result |
|-------------|--------|
| Click on empty space in slot | Show input in that slot |
| Click on existing task | Do NOT show input (task might have its own click handler later) |
| Click on slot with 2 tasks | Do NOT show input (max 2 rule) |
| Double-click anywhere | Not used - single click only |

### How to Detect "Empty Space"

The click target matters:
- If user clicks on a task element → do nothing (let task handle it)
- If user clicks on the slot background → show input

Implementation: Add `onClick` to the slot container, check if `event.target === event.currentTarget` or if target is the slot background div (not a task child).

```typescript
const handleSlotClick = (e: React.MouseEvent, slotTime: string) => {
  // Only trigger if clicking the slot itself, not a task inside it
  if (e.target !== e.currentTarget) return
  
  // Check max 2 rule
  const tasksInSlot = getTasksInSlot(slotTime)
  if (tasksInSlot.length >= 2) return
  
  setEditingSlot(slotTime)
}
```

### Input Behavior

| User Action | Result |
|-------------|--------|
| Type text + Enter | Create task, close input |
| Type text + Tab | Create task, close input |
| Enter with empty text | Close input, no task created |
| Escape | Close input, no task created |
| Click outside input | Close input, no task created |
| Input loses focus (blur) | Close input, no task created |

### Task Creation Details

When user submits a valid title:

```typescript
const createCalendarTask = async (slotTime: string, title: string) => {
  // 1. Get or create today's date list
  const today = getLocalTodayISO()  // e.g., "2026-01-23"
  const dateList = await ensureDateList(today)
  
  // 2. Create task in that list
  const task = await createTask(dateList.id, title.trim())
  
  // 3. Schedule it at the slot time
  const scheduledAt = `${today}T${slotTime}:00`  // e.g., "2026-01-23T11:00:00"
  await scheduleTask(task.id, scheduledAt)
}
```

### Task Defaults

| Property | Value |
|----------|-------|
| `list_id` | Today's date list |
| `scheduled_at` | The slot time (e.g., "2026-01-23T11:00:00") |
| `duration_minutes` | 30 (default) |
| `color_index` | Next in rotation (same as list task creation) |
| `energy_level` | "medium" (default) |

### Input Positioning

The input should appear:
- Inside the time slot row
- Full width of the content area (same width as a 100% task would be)
- Same height as a 15-min slot (or slightly smaller with padding)
- Visually distinct (white background, border, or slight shadow)

```tsx
// Inside the slot rendering
{editingSlot === slotTime && (
  <input
    type="text"
    autoFocus
    placeholder="Task name..."
    className="absolute inset-x-0 top-0 h-full px-2 py-1 text-sm 
               bg-white border-2 border-blue-500 rounded z-50
               focus:outline-none"
    onKeyDown={handleInputKeyDown}
    onBlur={handleInputBlur}
  />
)}
```

### Z-Index Considerations

The input needs to appear above:
- The slot background
- The drop zone overlay (if any)
- But NOT above the current-time indicator line

Suggested: `z-index: 50` for the input.

### State

Add to UI state (could be in component local state or UIStore):

```typescript
// Local state in CalendarView.tsx is fine
const [editingSlot, setEditingSlot] = useState<string | null>(null)
const [inputValue, setInputValue] = useState('')
```

When `editingSlot` changes, reset `inputValue`:

```typescript
useEffect(() => {
  if (editingSlot) {
    setInputValue('')
  }
}, [editingSlot])
```

## Edge Cases

### Edge Case 1: Slot Has 1 Task

- Input appears in the slot
- Existing task stays visible (maybe shifts to 50% width while editing? Or stays 100% and input overlays?)
- On submit: new task created, both render at 50%

**Decision:** Input overlays the slot. Keep it simple. The existing task may be partially hidden during the brief editing moment. This is fine.

### Edge Case 2: User Drags Task While Editing

- Drag operation should take priority
- Cancel the editing (clear `editingSlot`)
- Complete the drag normally

**Implementation:** In `handleDragStart`, add:
```typescript
setEditingSlot(null)
```

### Edge Case 3: User Scrolls While Editing

- Input stays in position (it's part of the slot DOM)
- No special handling needed

### Edge Case 4: User Clicks Different Slot While Editing

- Close current input (no save)
- Open input in new slot

**Implementation:** The click handler on the new slot will call `setEditingSlot(newSlot)`, which automatically replaces the old value.

### Edge Case 5: Very Long Task Title

- Input should not expand the slot height
- Text truncates or scrolls within input
- On save, full title is stored
- Task rendering truncates with ellipsis as usual

### Edge Case 6: Creating at 23:45 (Late Night)

- Task is created at 23:45 with default 30 min duration
- Task extends to 00:15 next day? No - we clip at midnight
- Task renders from 23:45 to 00:00 (15 min visible)
- This matches existing behavior for tasks dragged to late slots

**Decision:** For MVP, just create the task. Duration handling near midnight can be refined later.

### Edge Case 7: Date List Doesn't Exist Yet

- `ensureDateList(today)` handles this
- Creates the list if needed, returns it
- This already works for drag-to-calendar

### Edge Case 8: Network Error During Save

- Show error toast
- Keep input open so user can retry
- Or close input and show error

**Decision:** Close input, show error toast, user can try again. Keep it simple.

## Implementation Checklist

### Files to Modify

1. **`src/components/Calendar/CalendarView.tsx`**
   - Add `editingSlot` and `inputValue` state
   - Add click handler to slot backgrounds
   - Render input when `editingSlot` matches
   - Handle Enter/Escape/Blur

2. **`src/hooks/useAppHandlers.ts`** (or create `useCalendarHandlers.ts`)
   - Add `handleCreateCalendarTask(slotTime: string, title: string)`

3. **`src/state/useListStore.ts`**
   - Ensure `ensureDateList` works correctly (should already exist)

### New Handler

```typescript
const handleCreateCalendarTask = async (slotTime: string, title: string) => {
  if (!title.trim()) return
  
  try {
    const today = getLocalTodayISO()
    const dateList = await ensureDateList(today)
    
    // Create task
    const newTask = await createTask(dateList.id, title.trim())
    
    // Schedule it
    const scheduledAt = `${today}T${slotTime}:00`
    await updateTask(newTask.id, { scheduled_at: scheduledAt })
    
  } catch (error) {
    console.error('Failed to create calendar task:', error)
    // Show toast or alert
  }
}
```

### Input Component

```tsx
interface SlotInputProps {
  slotTime: string
  onSubmit: (title: string) => void
  onCancel: () => void
}

function SlotInput({ slotTime, onSubmit, onCancel }: SlotInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) {
        onSubmit(value.trim())
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }
  
  const handleBlur = () => {
    // Small delay to allow click events to process first
    setTimeout(() => {
      onCancel()
    }, 100)
  }
  
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder="New task..."
      className="absolute inset-x-0 top-0 h-8 px-2 text-sm
                 bg-white border-2 border-blue-500 rounded shadow-lg
                 focus:outline-none z-50"
    />
  )
}
```

## Testing Checklist

### Basic Flow
- [ ] Click empty slot → input appears
- [ ] Type "Test" + Enter → task created at that time
- [ ] Task appears in slot with correct time
- [ ] Task has default 30 min duration
- [ ] Task belongs to today's date list

### Cancel Flow
- [ ] Click slot → input appears
- [ ] Press Escape → input disappears, no task
- [ ] Click slot → input appears
- [ ] Click elsewhere → input disappears, no task
- [ ] Click slot → type text → press Escape → no task created

### Empty Title
- [ ] Click slot → press Enter immediately → no task, input closes
- [ ] Click slot → type spaces only → press Enter → no task, input closes

### Max 2 Rule
- [ ] Slot has 0 tasks → click works, can create
- [ ] Slot has 1 task → click works, can create, both at 50%
- [ ] Slot has 2 tasks → click does nothing

### Interaction with Drag
- [ ] Start editing slot A
- [ ] Drag a task from list to slot B
- [ ] Editing should cancel, drag should complete

### Multiple Slots
- [ ] Click slot A → input appears
- [ ] Click slot B → input moves to slot B (A closes)

### Keyboard
- [ ] Tab after typing → creates task (same as Enter)
- [ ] Input is auto-focused when it appears

## NOT Implementing (Future)

- Click on task to edit title inline
- Creating task with custom duration (always 30 min)
- Creating task on a different day's calendar
- Keyboard shortcuts to move between slots
- Sequential task creation (Enter creates task and opens next slot)
