# Spec: Split Oversized Files + Code Cleanup

## Overview

This spec addresses the architectural issues found in the code review:
1. Split 4 files that exceed 300 lines
2. Remove console.log statements
3. Fix hardcoded values
4. Add Knip for dead code detection

---

## Part 1: Split useAppHandlers.ts (388 → ~100 each)

### Current Structure
`src/hooks/useAppHandlers.ts` contains ALL handler logic:
- Task handlers (add, delete, complete, duration, energy)
- List handlers (create, edit, delete, clear)
- Focus mode handlers
- Drag handlers
- Park thought handler
- Roll over handler

### New Structure

**File 1: `src/hooks/useTaskHandlers.ts` (~100 lines)**
```typescript
export function useTaskHandlers() {
  // From useTaskStore
  const { createTask, updateTask, deleteTask, completeTask, uncompleteTask } = useTaskStore()
  
  // Task CRUD
  const handleTaskAdd = async (listId: string, title: string) => {...}
  const handleTaskDelete = async (taskId: string) => {...}
  const handleTaskComplete = async (taskId: string) => {...}
  const handleTaskUncomplete = async (taskId: string) => {...}
  const handleTaskDurationClick = async (taskId: string, currentDuration: number, reverse: boolean) => {...}
  const handleTaskEnergyChange = async (taskId: string, level: 'high' | 'medium' | 'low') => {...}
  
  // Discard confirmation state
  const [discardConfirm, setDiscardConfirm] = useState(...)
  const handleTaskDiscardClick = ...
  const handleTaskDiscardConfirm = ...
  const handleTaskDiscardCancel = ...
  
  return { 
    handleTaskAdd, handleTaskDelete, handleTaskComplete, handleTaskUncomplete,
    handleTaskDurationClick, handleTaskEnergyChange,
    discardConfirm, handleTaskDiscardClick, handleTaskDiscardConfirm, handleTaskDiscardCancel
  }
}
```

**File 2: `src/hooks/useListHandlers.ts` (~80 lines)**
```typescript
export function useListHandlers() {
  const { lists, createList, deleteList, updateList, ensureDateList } = useListStore()
  const { tasks, moveTask, clearTasksInList } = useTaskStore()
  
  const handleListCreate = async (name: string) => {...}
  const handleListEdit = async (listId: string, newName: string) => {...}
  const handleDeleteListClick = async (listId: string) => {...}
  const handleUndoDelete = async () => {...}
  
  // Clear list confirmation state
  const [clearListConfirm, setClearListConfirm] = useState(...)
  const handleClearListClick = ...
  const handleClearListConfirm = ...
  const handleClearListCancel = ...
  
  // Pending delete state
  const [pendingDelete, setPendingDelete] = useState(...)
  
  return {
    handleListCreate, handleListEdit, handleDeleteListClick, handleUndoDelete,
    clearListConfirm, handleClearListClick, handleClearListConfirm, handleClearListCancel,
    pendingDelete, setPendingDelete
  }
}
```

**File 3: `src/hooks/useFocusHandlers.ts` (~40 lines)**
```typescript
export function useFocusHandlers() {
  const { completeTask } = useTaskStore()
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  
  const handleStartFocus = (taskId: string) => {...}
  const handleExitFocus = () => {...}
  const handleFocusComplete = async (taskId: string) => {...}
  
  return { focusTaskId, handleStartFocus, handleExitFocus, handleFocusComplete }
}
```

**File 4: `src/hooks/useDragHandlers.ts` (~50 lines)**
```typescript
export function useDragHandlers() {
  const { tasks, scheduleTask, moveTask } = useTaskStore()
  const { lists } = useListStore()
  
  const handleDragEnd = async (result: DropResult) => {...}
  
  return { handleDragEnd }
}
```

**File 5: `src/hooks/useRolloverHandlers.ts` (~40 lines)**
```typescript
export function useRolloverHandlers() {
  const { tasks, moveTask } = useTaskStore()
  const { lists, ensureDateList } = useListStore()
  
  const handleRollOverTasks = async (fromListId: string) => {...}
  const handleParkThought = async (title: string) => {...}
  
  return { handleRollOverTasks, handleParkThought }
}
```

**File 6: `src/hooks/useAppHandlers.ts` (~30 lines) - Facade**
```typescript
// Re-export all handlers as a single hook for backward compatibility
export function useAppHandlers() {
  const taskHandlers = useTaskHandlers()
  const listHandlers = useListHandlers()
  const focusHandlers = useFocusHandlers()
  const dragHandlers = useDragHandlers()
  const rolloverHandlers = useRolloverHandlers()
  
  return {
    ...taskHandlers,
    ...listHandlers,
    ...focusHandlers,
    ...dragHandlers,
    ...rolloverHandlers,
  }
}
```

### Update hooks/index.ts
```typescript
export { useAppHandlers } from './useAppHandlers'
export { useTaskHandlers } from './useTaskHandlers'
export { useListHandlers } from './useListHandlers'
export { useFocusHandlers } from './useFocusHandlers'
export { useDragHandlers } from './useDragHandlers'
export { useRolloverHandlers } from './useRolloverHandlers'
export { useAuth } from './useAuth'
export { useScheduleHandlers } from './useScheduleHandlers'
```

---

## Part 2: Split calendarUtils.ts (322 → ~100 each)

### New Structure

**File 1: `src/lib/calendar/calendarTime.ts` (~80 lines)**
- `SLOT_HEIGHT`, `MINUTES_PER_SLOT`, `SLOTS_PER_HOUR` constants
- `timeToPixels()`
- `pixelsToTime()`
- `getCurrentTimePixels()`
- `getInitialScrollPosition()`
- `timestampToTime()`
- `createLocalTimestamp()`

**File 2: `src/lib/calendar/calendarSlots.ts` (~80 lines)**
- `formatSlotId()`
- `parseSlotId()`
- `slotIdToTimestamp()`
- `generateAllSlotIds()`
- `getHourLabels()`
- `calculateSlotIndex()`
- `getSlotFromPosition()`

**File 3: `src/lib/calendar/calendarLayout.ts` (~80 lines)**
- `calculateTaskWidths()`
- `buildSlotOccupancy()`
- Column assignment logic

**File 4: `src/lib/calendarUtils.ts` (~20 lines) - Re-exports**
```typescript
// Re-export everything for backward compatibility
export * from './calendar/calendarTime'
export * from './calendar/calendarSlots'
export * from './calendar/calendarLayout'
```

---

## Part 3: Extract CalendarView Components (317 → ~150)

### Current Structure
`CalendarView.tsx` contains:
- SlotInput component (defined inline)
- Main CalendarView component with:
  - Slot rendering
  - Task rendering
  - Time line rendering

### New Structure

**File 1: `src/components/Calendar/SlotInput.tsx` (~50 lines)**
Extract the existing SlotInput component to its own file.

**File 2: `src/components/Calendar/ScheduledTask.tsx` (~60 lines)**
Extract the scheduled task rendering (lines 259-284) into a component:
```typescript
interface ScheduledTaskProps {
  task: Task
  layout: { width: number; column: number }
  paletteId: string
  isSelected: boolean
  onSelect: () => void
  onComplete: () => void
  onUnschedule: () => void
}
```

**File 3: `src/components/Calendar/CalendarView.tsx` (~150 lines)**
Main component, imports SlotInput and ScheduledTask.

**Update index.ts:**
```typescript
export { CalendarView } from './CalendarView'
export { SlotInput } from './SlotInput'
export { ScheduledTask } from './ScheduledTask'
```

---

## Part 4: Simplify page.tsx (338 → ~200)

### Extract View Components

**File 1: `src/components/Views/MainAppView.tsx` (~150 lines)**
Extract the main DragDropContext and panel layout.

**File 2: `src/components/Views/CompletedPageView.tsx` (~30 lines)**
Extract the completed view wrapper with header.

**page.tsx becomes orchestrator (~150 lines):**
- Authentication check
- Data loading
- View switching
- Confirmation dialogs

---

## Part 5: Remove Console.log Statements

Remove all 12 console.log statements from:
- `src/app/page.tsx` (5 statements)
- `src/state/useListStore.ts` (5 statements)
- `src/hooks/useScheduleHandlers.ts` (1 statement)
- `src/components/Lists/ListCard.tsx` (1 statement)

---

## Part 6: Fix Hardcoded Values

### Fix 1: Duration array in ListPanel.tsx

**File:** `src/components/Lists/ListPanel.tsx`

Find line 85:
```typescript
const durations = [15, 30, 45, 60]
```

Replace with:
```typescript
import { DURATION_OPTIONS } from '@/lib/constants'
// ...
const durations = [...DURATION_OPTIONS] as number[]
```

### Fix 2: Palette ID in page.tsx

**File:** `src/app/page.tsx`

Move to constants:
```typescript
// In src/lib/constants.ts, add:
export const DEFAULT_PALETTE_ID = 'rainbow-bright'
```

Then in page.tsx:
```typescript
import { DEFAULT_PALETTE_ID } from '@/lib/constants'
// Remove: const PALETTE_ID = 'rainbow-bright'
// Use DEFAULT_PALETTE_ID instead
```

---

## Part 7: Add Knip Configuration

### Install
```bash
npm install -D knip
```

### Create knip.json
```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "entry": [
    "src/app/**/*.tsx",
    "src/app/**/*.ts"
  ],
  "project": [
    "src/**/*.tsx",
    "src/**/*.ts"
  ],
  "ignore": [
    "**/*.d.ts",
    "src/types/**"
  ],
  "ignoreDependencies": [
    "autoprefixer",
    "postcss",
    "tailwindcss"
  ]
}
```

### Add script to package.json
```json
{
  "scripts": {
    "knip": "knip",
    "knip:fix": "knip --fix"
  }
}
```

---

## Part 8: Create Shared Task Utilities

**File:** `src/lib/taskUtils.ts`

```typescript
import type { Task } from '@/types/app'

/**
 * Get incomplete tasks for a specific list
 */
export function getIncompleteTasksForList(tasks: Task[], listId: string): Task[] {
  return tasks.filter(t => t.list_id === listId && !t.completed_at)
}

/**
 * Get all scheduled (incomplete) tasks
 */
export function getScheduledTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.scheduled_at && !t.completed_at)
}

/**
 * Get completed tasks
 */
export function getCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.completed_at)
}

/**
 * Count incomplete tasks in a list
 */
export function countIncompleteTasks(tasks: Task[], listId: string): number {
  return getIncompleteTasksForList(tasks, listId).length
}
```

Then update all 6 places that use the filter pattern to use these utilities.

---

## Implementation Order

### Phase 1: Quick Wins (30 min)
1. Remove 12 console.log statements
2. Fix hardcoded duration array
3. Move palette ID to constants
4. Add Knip configuration

### Phase 2: useAppHandlers Split (1 hour)
1. Create 5 new handler files
2. Move code from useAppHandlers.ts
3. Update useAppHandlers.ts as facade
4. Update hooks/index.ts
5. Verify build passes

### Phase 3: calendarUtils Split (45 min)
1. Create src/lib/calendar/ directory
2. Create 3 new files
3. Update calendarUtils.ts as re-export
4. Verify all imports still work

### Phase 4: CalendarView Split (30 min)
1. Extract SlotInput.tsx
2. Extract ScheduledTask.tsx
3. Update CalendarView.tsx
4. Update index.ts

### Phase 5: Create Task Utilities (20 min)
1. Create taskUtils.ts
2. Update 6 files to use new utilities

### Phase 6: page.tsx Split (45 min) - Optional
Can be deferred if time-constrained.

---

## Verification Checklist

After each phase:
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] App functions correctly
- [ ] No files over 300 lines (for modified files)

Final checks:
- [ ] `npm run knip` shows no issues (or only expected ones)
- [ ] All console.log statements removed
- [ ] No hardcoded values remain
