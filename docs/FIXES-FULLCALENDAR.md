# FIXES: FullCalendar Integration Issues

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Check with `wc -l` after every change.
2. **Run `npm run build` after EACH fix.** Fix errors before moving on.
3. **Test in browser after each fix** to verify behavior.
4. **Commit after EACH fix**, not at the end.

---

## Overview

The FullCalendar refactor is mostly complete, but external drag-and-drop from the task list to the calendar doesn't work. This is because FullCalendar requires its own `Draggable` class for external elements — native HTML5 drag won't work.

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Can't drag tasks to calendar | Missing FullCalendar `Draggable` setup | Initialize `Draggable` on task list |
| Calendar won't scroll fully | `height="auto"` limits rendering | Change to `height="100%"` with proper container |
| Drag state management | Using Zustand state instead of FC data | Pass data via `data-*` attributes |

---

## FIX 1: Update TaskCard with Data Attributes

FullCalendar's `Draggable` reads event data from DOM attributes. Update TaskCard to include all necessary data.

### Update `src/components/Tasks/TaskCard.tsx`:

Find this div (around line 38-47):

```typescript
<div
  draggable={!isCompleted}
  onDragStart={onDragStart}
  className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] group relative ${
    isCompleted ? 'opacity-50' : ''
  }`}
  style={{ backgroundColor: bgColor }}
  data-task-id={id}
>
```

Replace with:

```typescript
<div
  className={`fc-event p-3 rounded-lg cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] group relative ${
    isCompleted ? 'opacity-50 pointer-events-none' : ''
  }`}
  style={{ backgroundColor: bgColor }}
  data-task-id={id}
  data-title={title}
  data-duration={durationMinutes}
  data-color-index={colorIndex}
  data-color={bgColor}
>
```

**Note:** Removed `draggable` and `onDragStart` — FullCalendar's Draggable will handle this. Added `fc-event` class which FullCalendar recognizes.

**Commit:**
```bash
git add -A && git commit -m "fix: Add data attributes to TaskCard for FullCalendar drag"
```

---

## FIX 2: Update ListPanel with Draggable Container

Add an ID to the task container and initialize FullCalendar's `Draggable`.

### Update `src/components/Lists/ListPanel.tsx`:

**Step 2.1:** Add imports at the top:

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { Draggable } from '@fullcalendar/interaction'
import { Plus } from 'lucide-react'
// ... rest of imports
```

**Step 2.2:** Inside the `ListPanel` function, add a ref and useEffect:

After the existing state declarations (around line 71), add:

```typescript
const containerRef = useRef<HTMLDivElement>(null)

// Initialize FullCalendar Draggable for external drag
useEffect(() => {
  if (!containerRef.current) return
  
  const draggable = new Draggable(containerRef.current, {
    itemSelector: '[data-task-id]',
    eventData: (eventEl) => {
      const taskId = eventEl.getAttribute('data-task-id')
      const title = eventEl.getAttribute('data-title')
      const duration = parseInt(eventEl.getAttribute('data-duration') || '30', 10)
      const color = eventEl.getAttribute('data-color')
      
      return {
        id: `temp-${taskId}`,
        title: title || 'Task',
        duration: { minutes: duration },
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          taskId,
          isExternal: true
        }
      }
    }
  })
  
  return () => draggable.destroy()
}, [])
```

**Step 2.3:** Add the ref to the container div.

Find the outer container div (around line 83):

```typescript
<div className="border-r overflow-y-auto bg-background">
```

Change to:

```typescript
<div ref={containerRef} className="border-r overflow-y-auto bg-background">
```

**Commit:**
```bash
git add -A && git commit -m "fix: Initialize FullCalendar Draggable in ListPanel"
```

---

## FIX 3: Update FullCalendarView for External Drops

Add proper height, eventReceive callback, and remove the select handler (it conflicts with external drop).

### Update `src/components/Calendar/FullCalendarView.tsx`:

**Step 3.1:** Update the props interface (around line 22):

```typescript
interface FullCalendarViewProps {
  tasks: Task[]
  scheduled: ScheduledTask[]
  paletteId: string
  onExternalDrop: (taskId: string, time: string) => void  // CHANGED
  onEventMove: (taskId: string, time: string) => void     // NEW - for moving existing events
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
  onDurationChange: (taskId: string, newDuration: number) => void
}
```

**Step 3.2:** Update the function signature and destructuring (around line 41):

```typescript
export function FullCalendarView({
  tasks,
  scheduled,
  paletteId,
  onExternalDrop,
  onEventMove,
  onUnschedule,
  onComplete,
  onDurationChange,
}: FullCalendarViewProps) {
```

**Step 3.3:** Update handleEventDrop (around line 86):

```typescript
// Handle event drop (moving existing scheduled tasks)
const handleEventDrop = useCallback((dropInfo: EventDropArg) => {
  const newStart = dropInfo.event.start
  if (!newStart) return
  
  const taskId = dropInfo.event.extendedProps.taskId
  const timeString = `${newStart.getHours().toString().padStart(2, '0')}:${newStart.getMinutes().toString().padStart(2, '0')}`
  
  onEventMove(taskId, timeString)
}, [onEventMove])
```

**Step 3.4:** Add eventReceive handler after handleEventDrop:

```typescript
// Handle external drop (dragging from task list)
const handleEventReceive = useCallback((info: any) => {
  const taskId = info.event.extendedProps.taskId
  const start = info.event.start
  
  if (!taskId || !start) {
    info.revert()
    return
  }
  
  const timeString = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`
  
  // Remove the temporary event - we'll add the real one via state
  info.event.remove()
  
  // Trigger the actual scheduling
  onExternalDrop(taskId, timeString)
}, [onExternalDrop])
```

**Step 3.5:** Update the FullCalendar component props.

Replace the entire `<FullCalendar ... />` component (around line 158-195) with:

```typescript
<FullCalendar
  ref={calendarRef}
  plugins={[timeGridPlugin, interactionPlugin]}
  initialView="timeGridDay"
  headerToolbar={false}
  slotMinTime="06:00:00"
  slotMaxTime="22:00:00"
  slotDuration="00:15:00"
  snapDuration="00:15:00"
  slotLabelInterval="01:00:00"
  allDaySlot={false}
  editable={true}
  droppable={true}
  dayMaxEvents={true}
  nowIndicator={true}
  height="100%"
  events={events}
  eventDrop={handleEventDrop}
  eventResize={handleEventResize}
  eventReceive={handleEventReceive}
  eventClick={handleEventClick}
  slotLabelFormat={{
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }}
  eventTimeFormat={{
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }}
/>
```

**Key changes:**
- Added `snapDuration="00:15:00"` for proper snapping
- Changed `height="100%"` (was `"auto"`)
- Added `eventReceive={handleEventReceive}`
- Removed `selectable`, `selectMirror`, and `select` (were causing conflicts)

**Step 3.6:** Update the container div for proper height.

Find (around line 151-157):

```typescript
<div className="flex-1 overflow-hidden flex flex-col bg-background">
  <div className="flex gap-2 p-4 border-b">
    <h2 className="text-lg font-semibold text-foreground">Today</h2>
  </div>
  
  <div className="flex-1 p-4">
```

Change to:

```typescript
<div className="flex-1 overflow-hidden flex flex-col bg-background">
  <div className="flex gap-2 p-4 border-b">
    <h2 className="text-lg font-semibold text-foreground">Today</h2>
  </div>
  
  <div className="flex-1 overflow-auto p-4">
```

**Commit:**
```bash
git add -A && git commit -m "fix: Add eventReceive handler and fix calendar height"
```

---

## FIX 4: Update page.tsx for New Props

Update the main page to pass the correct props to FullCalendarView.

### Update `src/app/page.tsx`:

**Step 4.1:** Update handleDrop to be handleExternalDrop (around line 53):

```typescript
const handleExternalDrop = async (taskId: string, time: string) => {
  const today = new Date().toISOString().split('T')[0]
  await scheduleTask(taskId, today, time + ':00')
}

const handleEventMove = async (taskId: string, time: string) => {
  const today = new Date().toISOString().split('T')[0]
  // First unschedule, then reschedule at new time
  await unscheduleTask(taskId)
  await scheduleTask(taskId, today, time + ':00')
}
```

**Step 4.2:** Update FullCalendarView props (around line 112-121):

```typescript
<FullCalendarView
  tasks={tasks}
  scheduled={scheduled}
  paletteId={PALETTE_ID}
  onExternalDrop={handleExternalDrop}
  onEventMove={handleEventMove}
  onUnschedule={unscheduleTask}
  onComplete={completeTask}
  onDurationChange={handleDurationChange}
/>
```

**Step 4.3:** Clean up unused state.

The `draggedTaskId` and `setDraggedTaskId` are no longer needed for calendar drag (FullCalendar handles it). However, keep them if they're used elsewhere (like visual feedback). 

If they're ONLY used for calendar drag, you can remove:
- `draggedTaskId, setDraggedTaskId` from the useUIStore destructuring
- `onTaskDragStart={setDraggedTaskId}` from ListPanel props
- The `onDragStart` prop from TaskCard entirely

For now, just leave them — they don't hurt anything.

**Commit:**
```bash
git add -A && git commit -m "fix: Update page.tsx with new FullCalendar handlers"
```

---

## FIX 5: Update ListPanel Props (Cleanup)

Since we're no longer using the Zustand drag state, we can simplify ListPanel.

### Update `src/components/Lists/ListPanel.tsx`:

**Step 5.1:** Remove `onTaskDragStart` from the interface (around line 39):

```typescript
// REMOVE this line from ListPanelProps:
onTaskDragStart: (taskId: string) => void
```

**Step 5.2:** Remove from destructuring (around line 70):

```typescript
// REMOVE onTaskDragStart from the destructured props
```

**Step 5.3:** Remove from ListCard usage (around line 114):

```typescript
// REMOVE this line:
onTaskDragStart={onTaskDragStart}
```

### Update `src/components/Lists/ListCard.tsx`:

**Step 5.4:** Remove `onTaskDragStart` from interface and props.

Remove from interface (around line 32):
```typescript
// REMOVE:
onTaskDragStart: (taskId: string) => void
```

Remove from destructuring (around line 64):
```typescript
// REMOVE onTaskDragStart
```

Remove from TaskCard usage (around line 176):
```typescript
// REMOVE:
onDragStart={() => onTaskDragStart(task.id)}
```

### Update `src/components/Tasks/TaskCard.tsx`:

**Step 5.5:** Remove `onDragStart` from interface and props.

Remove from interface (around line 16):
```typescript
// REMOVE:
onDragStart: () => void
```

Remove from destructuring (around line 30):
```typescript
// REMOVE onDragStart
```

### Update `src/app/page.tsx`:

**Step 5.6:** Remove the prop from ListPanel (around line 100):

```typescript
// REMOVE:
onTaskDragStart={setDraggedTaskId}
```

**Commit:**
```bash
git add -A && git commit -m "fix: Remove unused drag state props"
```

---

## Verification

After all fixes:

```bash
# Build should pass
npm run build

# Check file sizes
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "OVER 300: " $0}'

# Start dev server and test:
# 1. Can you drag a task from the list to the calendar?
# 2. Does it snap to 15-minute boundaries?
# 3. Can you scroll the calendar up and down freely?
# 4. Can you move an existing scheduled task to a new time?
# 5. Can you resize a scheduled task?
# 6. Does the theme toggle still work?
npm run dev
```

---

## Summary of Changes

### Modified Files:
- `src/components/Tasks/TaskCard.tsx` — Added data attributes, removed native drag
- `src/components/Lists/ListPanel.tsx` — Added Draggable initialization
- `src/components/Lists/ListCard.tsx` — Removed onTaskDragStart prop
- `src/components/Calendar/FullCalendarView.tsx` — Added eventReceive, fixed height
- `src/app/page.tsx` — Updated handlers for new prop structure

### Key Concepts:
1. FullCalendar's `Draggable` class handles external drag-and-drop
2. Data is passed via `data-*` attributes on draggable elements
3. `eventReceive` callback fires when external item is dropped
4. `eventDrop` callback fires when existing event is moved
5. `height="100%"` allows full scrolling within flex container
