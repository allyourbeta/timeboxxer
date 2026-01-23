# Spec: Calendar Fixes - No Horizontal Scroll + Overlap Handling

## Bug 1: Horizontal Scroll in Calendar

### Problem
The calendar container allows horizontal scrolling, which hides the time labels on the left.

### Fix
Set `overflow-x: hidden` on the calendar container. The calendar should only scroll vertically.

### File to Modify
`src/components/Calendar/CalendarView.tsx`

Find the scrollable container div and add `overflow-x-hidden`:

```tsx
<div 
  ref={containerRef}
  className="flex-1 overflow-y-auto overflow-x-hidden relative"
  // ...
>
```

---

## Bug 2: Overlapping Tasks Disappear

### Problem
When two tasks are scheduled at overlapping times, the second task disappears (renders behind the first).

### Solution
Tasks that overlap should display side-by-side, each at 50% width.

### The Rule

1. For each task, check every 15-minute slot it occupies
2. If ANY of those slots has another task in it, this task is 50% width
3. Otherwise, 100% width
4. Tasks are always rectangles (constant width for entire duration)

### Algorithm

```typescript
function calculateTaskWidths(tasks: ScheduledTask[]): Map<string, { width: number, column: number }> {
  const result = new Map()
  
  // Step 1: Build a map of which tasks occupy which 15-min slots
  const slotOccupancy: Map<number, string[]> = new Map()  // slot index -> task IDs
  
  for (const task of tasks) {
    const startSlot = timeToSlotIndex(task.scheduled_at)  // e.g., 9:00 -> 36
    const endSlot = startSlot + Math.ceil(task.duration_minutes / 15)
    
    for (let slot = startSlot; slot < endSlot; slot++) {
      if (!slotOccupancy.has(slot)) {
        slotOccupancy.set(slot, [])
      }
      slotOccupancy.get(slot)!.push(task.id)
    }
  }
  
  // Step 2: For each task, check if it shares ANY slot with another task
  for (const task of tasks) {
    const startSlot = timeToSlotIndex(task.scheduled_at)
    const endSlot = startSlot + Math.ceil(task.duration_minutes / 15)
    
    let hasOverlap = false
    let overlapPartner: string | null = null
    
    for (let slot = startSlot; slot < endSlot; slot++) {
      const tasksInSlot = slotOccupancy.get(slot) || []
      if (tasksInSlot.length > 1) {
        hasOverlap = true
        // Find the other task in this slot
        overlapPartner = tasksInSlot.find(id => id !== task.id) || null
        break
      }
    }
    
    if (hasOverlap) {
      // 50% width, assign column based on start time
      const partnerTask = tasks.find(t => t.id === overlapPartner)
      const thisStart = new Date(task.scheduled_at).getTime()
      const partnerStart = partnerTask ? new Date(partnerTask.scheduled_at).getTime() : Infinity
      
      // Earlier task gets column 0 (left), later gets column 1 (right)
      const column = thisStart <= partnerStart ? 0 : 1
      result.set(task.id, { width: 50, column })
    } else {
      // 100% width, column 0
      result.set(task.id, { width: 100, column: 0 })
    }
  }
  
  return result
}
```

### Rendering

Apply width and left offset to each task block:

```tsx
const layout = calculateTaskWidths(scheduledTasks)

{scheduledTasks.map(task => {
  const { width, column } = layout.get(task.id) || { width: 100, column: 0 }
  const leftPercent = column * 50  // 0% or 50%
  
  return (
    <div
      style={{
        position: 'absolute',
        top: `${startPixels}px`,
        height: `${height}px`,
        width: `${width}%`,
        left: `${leftPercent}%`,
      }}
    >
      {/* task content */}
    </div>
  )
})}
```

---

## Max 2 Overlap Enforcement

### Rule
A maximum of 2 tasks can occupy any 15-minute slot. If a user tries to drop a 3rd task, block it.

### Implementation

In the drag handler, before scheduling a task:

```typescript
function canScheduleTask(
  tasks: Task[], 
  newTaskId: string, 
  scheduledAt: string, 
  durationMinutes: number
): { allowed: boolean, message?: string } {
  
  const startSlot = timeToSlotIndex(scheduledAt)
  const endSlot = startSlot + Math.ceil(durationMinutes / 15)
  
  // Count tasks in each slot (excluding the task being moved)
  for (let slot = startSlot; slot < endSlot; slot++) {
    const tasksInSlot = tasks.filter(t => {
      if (t.id === newTaskId) return false  // Don't count itself
      if (!t.scheduled_at) return false
      
      const tStart = timeToSlotIndex(t.scheduled_at)
      const tEnd = tStart + Math.ceil(t.duration_minutes / 15)
      
      return slot >= tStart && slot < tEnd
    })
    
    if (tasksInSlot.length >= 2) {
      return { 
        allowed: false, 
        message: 'Maximum 2 tasks can overlap. Move or complete a task first.' 
      }
    }
  }
  
  return { allowed: true }
}
```

### In Drag Handler

```typescript
// Before scheduling
const canSchedule = canScheduleTask(tasks, taskId, scheduledAt, task.duration_minutes)
if (!canSchedule.allowed) {
  alert(canSchedule.message)  // Or use a toast
  return
}

// Proceed with scheduling
await scheduleTask(taskId, scheduledAt)
```

---

## Helper Function

```typescript
function timeToSlotIndex(scheduledAt: string): number {
  // scheduledAt is like "2026-01-22T09:30:00"
  const time = scheduledAt.split('T')[1]  // "09:30:00"
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 4 + Math.floor(minutes / 15)  // 9:30 -> 38
}
```

---

## Files to Modify

1. `src/components/Calendar/CalendarView.tsx`
   - Add `overflow-x-hidden` to container
   - Add `calculateTaskWidths` function
   - Apply width/column to task blocks

2. `src/hooks/useAppHandlers.ts` (or wherever drag is handled)
   - Add `canScheduleTask` check before scheduling
   - Show message if blocked

3. `src/lib/calendarUtils.ts`
   - Add `timeToSlotIndex` helper if not already there
   - Add `canScheduleTask` function

---

## Testing Checklist

### Horizontal Scroll
- [ ] Calendar only scrolls vertically
- [ ] Time labels always visible on left side

### Single Task
- [ ] Task displays at 100% width
- [ ] Task is a rectangle

### Two Overlapping Tasks
- [ ] Both tasks display at 50% width
- [ ] Tasks are side-by-side (not stacked)
- [ ] Earlier task on left, later task on right
- [ ] Both tasks are rectangles

### Partial Overlap
- [ ] Task A: 9:00-9:30, Task B: 9:15-9:45
- [ ] Both are 50% width for their ENTIRE duration
- [ ] Both remain rectangles (no L-shapes)

### Chain Overlap
- [ ] Task A: 9:00-10:00, Task B: 9:30-10:30, Task C: 10:00-11:00
- [ ] All three are 50% width (B connects A and C)

### Max 2 Enforcement
- [ ] Two tasks already at 9:00
- [ ] Try to drag third task to 9:00
- [ ] Drop is blocked with message
- [ ] Original two tasks unchanged

### Edge Cases
- [ ] Task at 11:45 PM with 30 min duration (spans to next day?) - probably just clip at midnight
- [ ] Very short task (15 min) overlapping long task (2 hours) - both 50% width
