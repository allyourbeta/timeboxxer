# SPEC: Inline Task Title Editing

> **Goal**: Allow users to edit task titles inline by double-clicking, in both list view and calendar view.

---

## Behavior

### Trigger
- **Double-click** on task title to enter edit mode

### Edit Mode
- Title text becomes an input field
- Input is auto-focused with all text selected
- Input has same styling as the title (font size, weight, color)

### Save
- **Enter** key → save and exit edit mode
- **Click outside** (blur) → save and exit edit mode
- Empty title → revert to original (don't save empty)

### Cancel
- **Escape** key → revert to original and exit edit mode

---

## Implementation

### Part 1: Create Reusable EditableTitle Component

**File**: `src/components/ui/EditableTitle.tsx`

```typescript
"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface EditableTitleProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
}

export function EditableTitle({ value, onSave, className = "" }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync with prop changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setEditValue(value); // Revert if empty or unchanged
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`bg-transparent border-none outline-none ring-1 ring-accent-primary rounded px-1 -mx-1 ${className}`}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={`cursor-text ${className}`}
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}
```

---

### Part 2: Update TaskCard (List View)

**File**: `src/components/Tasks/TaskCard.tsx`

1. Add `onTitleChange` prop to interface:
```typescript
interface TaskCardProps {
  // ... existing props
  onTitleChange: (newTitle: string) => void;
}
```

2. Import and use EditableTitle:
```typescript
import { EditableTitle } from "@/components/ui/EditableTitle";
```

3. Replace the title span with EditableTitle:
```typescript
// Before:
<span className={`flex-1 text-theme-primary font-medium text-sm truncate ${isCompleted ? "line-through" : ""}`}>
  {title}
</span>

// After:
<EditableTitle
  value={title}
  onSave={onTitleChange}
  className={`flex-1 text-theme-primary font-medium text-sm truncate ${isCompleted ? "line-through" : ""}`}
/>
```

---

### Part 3: Update ListCard to Pass Handler

**File**: `src/components/Lists/ListCard.tsx`

1. Add `onTaskTitleChange` prop:
```typescript
interface ListCardProps {
  // ... existing props
  onTaskTitleChange: (taskId: string, newTitle: string) => void;
}
```

2. Pass to TaskCard:
```typescript
<TaskCard
  // ... existing props
  onTitleChange={(newTitle) => onTaskTitleChange(task.id, newTitle)}
/>
```

---

### Part 4: Update ListPanel to Pass Handler

**File**: `src/components/Lists/ListPanel.tsx`

1. Add prop to interface:
```typescript
interface ListPanelProps {
  // ... existing props
  onTaskTitleChange: (taskId: string, newTitle: string) => void;
}
```

2. Pass through to ListCard:
```typescript
<ListCard
  // ... existing props
  onTaskTitleChange={onTaskTitleChange}
/>
```

---

### Part 5: Update Calendar View

**File**: `src/components/Calendar/CalendarView.tsx`

1. Find the scheduled task card section (where task.title is rendered)

2. Import EditableTitle:
```typescript
import { EditableTitle } from "@/components/ui/EditableTitle";
```

3. Add `onTitleChange` prop to CalendarViewProps:
```typescript
interface CalendarViewProps {
  // ... existing props
  onTitleChange: (taskId: string, newTitle: string) => void;
}
```

4. Replace title display with EditableTitle:
```typescript
// Before:
<div className="text-base font-medium text-foreground truncate">
  {task.title}
</div>

// After:
<EditableTitle
  value={task.title}
  onSave={(newTitle) => onTitleChange(task.id, newTitle)}
  className="text-base font-medium text-foreground truncate"
/>
```

---

### Part 6: Add Handler in Page

**File**: `src/app/page.tsx`

1. Create the handler (should use existing task update logic):
```typescript
const handleTaskTitleChange = useCallback(async (taskId: string, newTitle: string) => {
  await updateTask(taskId, { title: newTitle });
}, [updateTask]);
```

2. Pass to ListPanel:
```typescript
<ListPanel
  // ... existing props
  onTaskTitleChange={handleTaskTitleChange}
/>
```

3. Pass to CalendarView:
```typescript
<CalendarView
  // ... existing props
  onTitleChange={handleTaskTitleChange}
/>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/EditableTitle.tsx` | **CREATE** - new component |
| `src/components/Tasks/TaskCard.tsx` | Add `onTitleChange` prop, use EditableTitle |
| `src/components/Lists/ListCard.tsx` | Add `onTaskTitleChange` prop, pass to TaskCard |
| `src/components/Lists/ListPanel.tsx` | Add `onTaskTitleChange` prop, pass to ListCard |
| `src/components/Calendar/CalendarView.tsx` | Add `onTitleChange` prop, use EditableTitle |
| `src/app/page.tsx` | Add handler, pass to ListPanel and CalendarView |

---

## Testing Checklist

After implementation:

- [ ] Double-click task in list → input appears, text selected
- [ ] Type new title, press Enter → title updates
- [ ] Double-click task in list, press Escape → reverts to original
- [ ] Double-click task in list, click outside → saves
- [ ] Double-click task on calendar → input appears
- [ ] Edit task on calendar, press Enter → title updates
- [ ] Empty title → doesn't save, reverts to original
- [ ] Drag still works (single click doesn't trigger edit)

---

## Notes

1. **Stop propagation** - The input needs `onClick` and `onDoubleClick` with `stopPropagation()` to prevent drag/selection interference.

2. **Truncation** - The EditableTitle should handle truncation gracefully. When editing, the full title is shown in the input.

3. **Styling** - The input should visually match the original title as closely as possible to feel seamless.
