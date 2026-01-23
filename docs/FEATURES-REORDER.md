# FEATURES: Drag to Reorder + Compact Task Layout

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**

---

## Overview

| Section | Feature |
|---------|---------|
| 1 | Install @dnd-kit |
| 2 | Compact TaskCard layout (single horizontal line) |
| 3 | Add drag-to-reorder within lists |
| 4 | Fix list card text contrast (white on dark) |

---

## SECTION 1: Install @dnd-kit

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Commit:**
```bash
git add -A && git commit -m "feat: Install @dnd-kit for drag and drop"
```

---

## SECTION 2: Compact TaskCard Layout

Redesign TaskCard to fit everything on one horizontal line.

### 2.1 Update `src/components/Tasks/TaskCard.tsx`

Replace the entire component with this compact version:

```tsx
'use client'

import { Trash2 } from 'lucide-react'
import { getColor } from '@/lib/palettes'

interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  isScheduled: boolean
  isDaily: boolean
  isInPurgatory: boolean
  isHighlight: boolean
  canHighlight: boolean
  energyLevel: 'high' | 'medium' | 'low'
  paletteId: string
  onDurationClick: (reverse: boolean) => void
  onEnergyChange: (level: 'high' | 'medium' | 'low') => void
  onDailyToggle: () => void
  onHighlightToggle: () => void
  onDelete: () => void
}

// Energy cycle: medium -> high -> low -> medium
const ENERGY_CYCLE: Record<string, 'high' | 'medium' | 'low'> = {
  medium: 'high',
  high: 'low',
  low: 'medium',
}

const ENERGY_ICONS: Record<string, string> = {
  high: '🔥',
  medium: '⚡',
  low: '🌙',
}

export function TaskCard({
  id,
  title,
  durationMinutes,
  colorIndex,
  isCompleted,
  isScheduled,
  isDaily,
  isInPurgatory,
  isHighlight,
  canHighlight,
  energyLevel,
  paletteId,
  onDurationClick,
  onEnergyChange,
  onDailyToggle,
  onHighlightToggle,
  onDelete,
}: TaskCardProps) {
  const bgColor = getColor(paletteId, colorIndex)
  
  const handleEnergyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEnergyChange(ENERGY_CYCLE[energyLevel])
  }
  
  // Format duration compactly
  const durationLabel = durationMinutes >= 60 
    ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? durationMinutes % 60 : ''}`
    : `${durationMinutes}m`
  
  return (
    <div
      className={`fc-event px-3 py-2 rounded-lg group relative ${
        isHighlight ? 'ring-2 ring-yellow-400' : ''
      } ${
        isCompleted ? 'opacity-50' : 
        isScheduled && !isInPurgatory ? 'opacity-60' : ''
      }`}
      style={{ backgroundColor: bgColor }}
      data-task-id={id}
      data-title={title}
      data-duration={durationMinutes}
      data-color-index={colorIndex}
      data-color={bgColor}
    >
      {/* Single horizontal line layout */}
      <div className="flex items-center gap-2">
        {/* Color dot - click to open color picker could be added later */}
        <div
          className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
          style={{ backgroundColor: bgColor }}
        />
        
        {/* Title - takes remaining space */}
        <span className={`flex-1 text-white font-medium truncate ${
          isCompleted ? 'line-through' : ''
        }`}>
          {title}
        </span>
        
        {/* Duration - tap to cycle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDurationClick(e.shiftKey)
          }}
          className="text-white/80 hover:text-white text-sm font-medium min-w-[32px] text-right"
          title="Click to change duration (Shift+click to decrease)"
        >
          {durationLabel}
        </button>
        
        {/* Energy - tap to cycle */}
        <button
          onClick={handleEnergyClick}
          className="text-sm hover:scale-110 transition-transform"
          title={`Energy: ${energyLevel} (click to change)`}
        >
          {ENERGY_ICONS[energyLevel]}
        </button>
        
        {/* Daily checkbox */}
        <label 
          className="flex items-center cursor-pointer"
          title="Repeat daily"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isDaily}
            onChange={onDailyToggle}
            className="w-3.5 h-3.5 rounded border-white/50 bg-transparent checked:bg-white/30"
          />
        </label>
        
        {/* Highlight star - only for date lists */}
        {canHighlight && (
          <button
            onClick={(e) => { e.stopPropagation(); onHighlightToggle(); }}
            className={`text-sm transition-opacity ${
              isHighlight ? 'opacity-100' : 'opacity-40 hover:opacity-100'
            }`}
            title={isHighlight ? 'Remove highlight' : 'Set as highlight'}
          >
            {isHighlight ? '⭐' : '☆'}
          </button>
        )}
        
        {/* Delete - visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-white/80 hover:text-white transition-opacity"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

**Note:** This removes the color picker popover for simplicity. If needed, it can be added back as a separate feature.

### 2.2 Update ListCard to remove color picker state if present

In `src/components/Lists/ListCard.tsx`, remove any `colorPickerTaskId` state and related props since we've simplified TaskCard.

If TaskCard was receiving `isColorPickerOpen`, `onColorClick`, `onColorSelect` props, remove them from the TaskCard usage.

**Commit:**
```bash
git add -A && git commit -m "feat: Compact single-line TaskCard layout"
```

---

## SECTION 3: Drag to Reorder Within Lists

### 3.1 Create a SortableTaskCard wrapper

Create `src/components/Tasks/SortableTaskCard.tsx`:

```tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
import { GripVertical } from 'lucide-react'

interface SortableTaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  isScheduled: boolean
  isDaily: boolean
  isInPurgatory: boolean
  isHighlight: boolean
  canHighlight: boolean
  energyLevel: 'high' | 'medium' | 'low'
  paletteId: string
  onDurationClick: (reverse: boolean) => void
  onEnergyChange: (level: 'high' | 'medium' | 'low') => void
  onDailyToggle: () => void
  onHighlightToggle: () => void
  onDelete: () => void
}

export function SortableTaskCard(props: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }
  
  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-50 hover:!opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-white/60" />
      </div>
      
      {/* Actual card with left padding for drag handle */}
      <div className="pl-5">
        <TaskCard {...props} />
      </div>
    </div>
  )
}
```

### 3.2 Update `src/components/Tasks/index.ts`

Add export:

```tsx
export { TaskCard } from './TaskCard'
export { SortableTaskCard } from './SortableTaskCard'
export { AddTaskInput } from './AddTaskInput'
```

### 3.3 Update ListCard to use sortable context

Update `src/components/Lists/ListCard.tsx`:

**Add imports:**

```tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableTaskCard } from '@/components/Tasks'
```

**Add to props interface:**

```tsx
interface ListCardProps {
  // ... existing props
  onReorderTasks: (listId: string, taskIds: string[]) => void
}
```

**Add sensors and handler inside the component:**

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement before drag starts
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event
  
  if (over && active.id !== over.id) {
    const oldIndex = taskIds.indexOf(active.id as string)
    const newIndex = taskIds.indexOf(over.id as string)
    const newOrder = arrayMove(taskIds, oldIndex, newIndex)
    onReorderTasks(list.id, newOrder)
  }
}

// Get task IDs for sortable context
const tasksForList = tasks.filter(t => t.list_id === list.id && !t.is_completed)
const taskIds = tasksForList.map(t => t.id)
```

**Wrap the task list in DndContext and SortableContext:**

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
    <div className="space-y-2 p-3">
      {tasksForList.map(task => (
        <SortableTaskCard
          key={task.id}
          id={task.id}
          title={task.title}
          durationMinutes={task.duration_minutes}
          colorIndex={task.color_index}
          isCompleted={task.is_completed}
          isScheduled={scheduledTaskIds.includes(task.id)}
          isDaily={task.is_daily}
          isInPurgatory={list.system_type === 'purgatory'}
          isHighlight={task.is_daily_highlight}
          canHighlight={list.system_type === 'date'}
          energyLevel={task.energy_level || 'medium'}
          paletteId={paletteId}
          onDurationClick={(reverse) => onTaskDurationClick(task.id, task.duration_minutes, reverse)}
          onEnergyChange={(level) => onTaskEnergyChange(task.id, level)}
          onDailyToggle={() => onTaskDailyToggle(task.id)}
          onHighlightToggle={() => onTaskHighlightToggle(task.id)}
          onDelete={() => onTaskDelete(task.id)}
        />
      ))}
    </div>
  </SortableContext>
</DndContext>
```

### 3.4 Update ListPanel to pass onReorderTasks

Update `src/components/Lists/ListPanel.tsx`:

**Add to interface:**

```tsx
interface ListPanelProps {
  // ... existing props
  onReorderTasks: (listId: string, taskIds: string[]) => void
}
```

**Pass to ListCard:**

```tsx
onReorderTasks={onReorderTasks}
```

### 3.5 Add API function to update task positions

Update `src/api/tasks.ts`:

```tsx
export async function reorderTasks(taskIds: string[]) {
  const supabase = getSupabase()
  
  // Update each task's position based on array order
  const updates = taskIds.map((id, index) => 
    supabase
      .from('tasks')
      .update({ position: index })
      .eq('id', id)
  )
  
  await Promise.all(updates)
}
```

### 3.6 Update `src/api/index.ts`

Add export:

```tsx
export { ..., reorderTasks } from './tasks'
```

### 3.7 Update task store

Update `src/state/useTaskStore.ts`:

**Add import:**

```tsx
import { ..., reorderTasks as apiReorderTasks } from '@/api'
```

**Add to interface:**

```tsx
reorderTasks: (listId: string, taskIds: string[]) => Promise<void>
```

**Add action:**

```tsx
reorderTasks: async (listId, taskIds) => {
  // Optimistically update local state
  const updatedTasks = get().tasks.map(task => {
    const newIndex = taskIds.indexOf(task.id)
    if (newIndex !== -1) {
      return { ...task, position: newIndex }
    }
    return task
  })
  
  // Sort by position within each list
  updatedTasks.sort((a, b) => {
    if (a.list_id === b.list_id) {
      return a.position - b.position
    }
    return 0
  })
  
  set({ tasks: updatedTasks })
  
  // Persist to database
  await apiReorderTasks(taskIds)
},
```

### 3.8 Update page.tsx

**Add to store destructuring:**

```tsx
const { ..., reorderTasks } = useTaskStore()
```

**Add handler:**

```tsx
const handleReorderTasks = async (listId: string, taskIds: string[]) => {
  await reorderTasks(listId, taskIds)
}
```

**Pass to ListPanel:**

```tsx
onReorderTasks={handleReorderTasks}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Drag to reorder tasks within lists"
```

---

## SECTION 4: Fix List Card Text Contrast

The text on dark blue cards is too dark. Make it white/light.

### 4.1 Update `src/components/Lists/ListCard.tsx`

Find the list name and task count elements. Update their classes:

**List name:**
```tsx
<span className="font-semibold text-white">{list.name}</span>
```

**Task count:**
```tsx
<span className="text-sm text-white/70">{taskCount} tasks</span>
```

**Chevron icon:**
```tsx
<ChevronDown className="h-5 w-5 text-white/60" />
```

Or if using ChevronUp:
```tsx
<ChevronUp className="h-5 w-5 text-white/60" />
```

**Any other text that appears on the dark card background should be `text-white` or `text-white/XX` for opacity.**

**Commit:**
```bash
git add -A && git commit -m "fix: List card text contrast - white on dark background"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ TaskCard is compact - all elements on single line
2. ✅ Duration shows as "30m" or "1h30" format
3. ✅ Energy shows single icon, clicking cycles through 🔥⚡🌙
4. ✅ Daily checkbox is inline
5. ✅ Highlight star is inline (date lists only)
6. ✅ Delete icon appears on hover
7. ✅ Drag handle appears on left when hovering task
8. ✅ Can drag tasks up/down within a list
9. ✅ Order persists after refresh
10. ✅ List card text is white and readable
11. ✅ Task count shows in light gray (white/70)

---

## Summary

| File | Changes |
|------|---------|
| `package.json` | Add @dnd-kit dependencies |
| `src/components/Tasks/TaskCard.tsx` | Complete rewrite - compact single line |
| `src/components/Tasks/SortableTaskCard.tsx` | NEW - Wrapper with drag handle |
| `src/components/Tasks/index.ts` | Export SortableTaskCard |
| `src/components/Lists/ListCard.tsx` | DndContext, SortableContext, text contrast |
| `src/components/Lists/ListPanel.tsx` | Pass onReorderTasks |
| `src/api/tasks.ts` | Add reorderTasks function |
| `src/api/index.ts` | Export reorderTasks |
| `src/state/useTaskStore.ts` | Add reorderTasks action |
| `src/app/page.tsx` | Add handleReorderTasks |
