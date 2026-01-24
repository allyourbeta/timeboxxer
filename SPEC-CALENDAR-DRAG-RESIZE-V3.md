# Spec: Calendar Task Drag and Resize (V3 - Final)

## Overview

Enable users to drag scheduled tasks to different times and resize them to change duration, directly on the calendar. Must work on both desktop (mouse) and mobile (touch).

**Revision notes:** This spec incorporates two rounds of code review feedback, addressing event listener performance, scroll-aware coordinate math, touch compatibility, pointer capture, RAF throttling, and edge cases.

---

## Current State

**What exists:**
- `CalendarView.tsx` renders tasks as absolutely-positioned `<div>` elements
- Time slots are `<Droppable>` components (from @hello-pangea/dnd) for dropping tasks FROM lists
- `onEventMove(taskId: string, time: string)` handler exists - updates task's scheduled_at
- `onDurationChange(taskId: string, newDuration: number)` handler exists - updates task's duration_minutes
- Helper functions: `pixelsToTime()`, `timeToPixels()`, `calculateDropTime()`, `createLocalTimestamp()`, etc.
- Constants: `SLOT_HEIGHT = 180px` per hour, `SLOTS_PER_HOUR = 4` (15-min slots = 45px each)

**What's missing:**
- Tasks on calendar cannot be dragged to a new time
- Tasks on calendar cannot be resized to change duration
- No visual feedback during drag/resize operations

---

## Implementation Requirements (Critical)

1. **Use `createLocalTimestamp(date, time)` for all `scheduled_at` string creation** - maintains consistency with existing codebase and handles timezone correctly

2. **`pointercancel` always cancels (revert)** - never commit changes on cancel; only commit on `pointerup`

3. **Document listeners must be removed on:** `pointerup`, `pointercancel`, AND component unmount

4. **Release pointer capture** in end/cancel handlers via `releasePointerCapture()`

5. **Visual updates throttled to RAF** - pointer handlers update refs only; a single RAF loop drives visual updates

6. **Use `transform: translateY()` during drag preview** - avoids layout thrashing; only set `top` on commit

7. **Refs are authoritative for gesture state** - `activeGesture` React state is derived/visual only

---

## Stability Requirements (Critical for Correct Implementation)

1. **Document handlers must be stable references**
   - All document-level handlers (`handleDragMove`, `handleDragUp`, `handleDragCancel`, `handleResizeMove`, `handleResizeUp`, `handleResizeCancel`) MUST be stable references via `useCallback` with empty deps
   - These handlers MUST read from refs (not props/state) to avoid stale closures
   - `removeEventListener` only works if the function reference is identical to what was added

2. **Store capture element in gesture ref; release from that element**
   - On `pointerdown`, store `captureEl: e.currentTarget` in the gesture ref
   - On `pointerup`/`pointercancel`, release via `drag.captureEl?.releasePointerCapture(drag.pointerId)`
   - Do NOT use `e.target` in document handlers - it's often not the capturing element

3. **RAF loop must be idempotent and self-stopping**
   - `startRafLoop()` MUST no-op if `rafRef.current` is already non-null
   - RAF loop MUST check if gesture refs are null and stop itself if both are null
   - Prevents multiple RAF chains and runaway re-renders

4. **Validate using refs, not captured variables**
   - Keep `tasksRef` updated: `useEffect(() => { tasksRef.current = tasks }, [tasks])`
   - Document handlers validate against `tasksRef.current`, not `tasks`
   - Same pattern for any other props used in document handlers (`onEventMove`, `onDurationChange`)

5. **CSS for iOS long-press prevention**
   - Apply `-webkit-touch-callout: none` and `user-select: none` to draggable elements
   - Use the `.dragging-active` class on body or calendar container during gestures

---

## Design Decisions (Explicit)

### Invalid moves: Silent snap-back
- If a drag/resize would create >2 overlapping tasks, the task silently returns to its original position/duration
- No alert is shown (bypass the existing `onEventMove` alert for this code path)
- Rationale: Alerts during drag feel jarring; visual snap-back is sufficient feedback

### Overlap widths during drag: Static (not preview)
- Task widths stay fixed during drag; overlap layout only recalculates after drop
- Rationale: Simpler implementation, avoids performance issues, acceptable UX

### Completed tasks: Not draggable or resizable
- Completed tasks (those with `completed_at`) cannot be dragged or resized
- They CAN still be clicked to select (show unschedule button)
- They CAN be unscheduled (removed from calendar)
- Rationale: Completed tasks are "done" - their time is historical record

### Snapping behavior: Round to nearest
- Both drag and resize snap to nearest 15-minute slot using `Math.round()`
- This feels predictable; "sticky" directional snapping adds complexity

### Touch-action strategy
- Resize handle: always `touch-action: none`
- Task body: `touch-action: none` only while actively dragging (via `isActive` class)
- Rationale: Allows normal scroll when swiping on inactive tasks

---

## Coordinate System (Critical)

All drag/resize math uses **calendar-content coordinates**, not viewport coordinates.

```typescript
// Convert pointer event to calendar-content Y position
function getContentY(e: PointerEvent, container: HTMLElement): number {
  const rect = container.getBoundingClientRect()
  return e.clientY - rect.top + container.scrollTop
}
```

This ensures correct behavior even if:
- The calendar is scrolled
- The user scrolls during a drag
- Momentum scrolling occurs on mobile

---

## Constants

```typescript
// Existing
const SLOT_HEIGHT = 180          // pixels per hour
const SLOTS_PER_HOUR = 4         // 15-minute slots
const SLOT_HEIGHT_PX = SLOT_HEIGHT / SLOTS_PER_HOUR  // 45px per slot

// New
const DRAG_THRESHOLD = 5         // pixels of movement before drag activates
const MIN_DURATION_MINUTES = 15  // minimum task duration
const MAX_DURATION_MINUTES = 240 // maximum task duration (4 hours)
const DAY_MINUTES = 24 * 60      // 1440
```

---

## Architecture: Ref-Based Gesture Tracking + RAF

**Key insight:** Using React state for every pointer move causes:
- Effect cleanup/re-attachment thrashing
- Dropped events on mobile
- Poor performance (re-renders on every frame)

**Solution:** 
1. Use refs for mutable gesture data
2. Pointer handlers update refs only (no React state)
3. A single RAF loop reads refs and triggers re-render when needed
4. Use CSS transforms during drag for 60fps performance

### Gesture Refs

```typescript
// Drag gesture tracking (mutable, no re-renders)
const dragRef = useRef<{
  taskId: string
  originalScheduledAt: string  // full timestamp for date extraction
  startContentY: number        // pointer Y in content coords at start
  taskOriginalTop: number      // task's original top position in pixels
  taskDuration: number         // task's duration in minutes
  currentTop: number           // current visual position (pixels)
  hasMoved: boolean            // crossed drag threshold?
  pointerId: number
  captureEl: HTMLElement       // element that captured the pointer
} | null>(null)

// Resize gesture tracking (mutable, no re-renders)
const resizeRef = useRef<{
  taskId: string
  scheduledAt: string          // full timestamp for validation
  startContentY: number        // pointer Y in content coords at start
  taskStartMinutes: number     // task start time in minutes from midnight
  originalDuration: number     // original duration in minutes
  currentDuration: number      // current visual duration
  pointerId: number
  captureEl: HTMLElement       // element that captured the pointer
} | null>(null)

// Keep tasks in ref for stable handler access
const tasksRef = useRef(tasks)
useEffect(() => { tasksRef.current = tasks }, [tasks])

// Keep callbacks in refs for stable handler access
const onEventMoveRef = useRef(onEventMove)
useEffect(() => { onEventMoveRef.current = onEventMove }, [onEventMove])

const onDurationChangeRef = useRef(onDurationChange)
useEffect(() => { onDurationChangeRef.current = onDurationChange }, [onDurationChange])

// RAF loop control
const rafRef = useRef<number | null>(null)

// Force re-render trigger
const [, forceRender] = useReducer(x => x + 1, 0)
```

### RAF Loop for Visual Updates

```typescript
// Start RAF loop when gesture begins (idempotent)
const startRafLoop = () => {
  if (rafRef.current) return  // Already running
  
  const loop = () => {
    // Self-stop if no active gesture
    if (!dragRef.current && !resizeRef.current) {
      stopRafLoop()
      return
    }
    forceRender()
    rafRef.current = requestAnimationFrame(loop)
  }
  rafRef.current = requestAnimationFrame(loop)
}

// Stop RAF loop when gesture ends
const stopRafLoop = () => {
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }
}
```

### Cleanup on Unmount

```typescript
// Clean up all gesture state and listeners on unmount
useEffect(() => {
  return () => {
    stopRafLoop()
    cleanupDragListeners()
    cleanupResizeListeners()
  }
}, [])

const cleanupDragListeners = () => {
  document.removeEventListener('pointermove', handleDragMove)
  document.removeEventListener('pointerup', handleDragUp)
  document.removeEventListener('pointercancel', handleDragCancel)
}

const cleanupResizeListeners = () => {
  document.removeEventListener('pointermove', handleResizeMove)
  document.removeEventListener('pointerup', handleResizeUp)
  document.removeEventListener('pointercancel', handleResizeCancel)
}
```

---

## Feature 1: Drag to Move

### User Interaction
1. User presses on a calendar task (not on resize handle or buttons)
2. After 5px movement, drag mode activates
3. Task visually follows pointer, snapping to 15-minute slots
4. On release (`pointerup`):
   - If valid position: task moves to new time
   - If invalid (>2 overlaps): task snaps back to original position
5. On cancel (`pointercancel`): always revert, never commit
6. If no movement threshold crossed: treat as click (toggle selection)

### Implementation

**Pointer down handler:**
```typescript
const handleTaskPointerDown = useCallback((e: React.PointerEvent, task: Task) => {
  // Ignore completed tasks
  if (task.completed_at) return
  
  // Ignore if clicking on interactive elements
  if ((e.target as HTMLElement).closest('button, a, input, textarea, select, [data-no-drag], [data-resize-handle]')) return
  
  // Ignore if another gesture is active (refs are authoritative)
  if (dragRef.current || resizeRef.current) return
  
  const container = containerRef.current
  if (!container) return
  
  const contentY = getContentY(e.nativeEvent, container)
  const startTime = timestampToTime(task.scheduled_at!)
  const taskTop = timeToPixels(startTime)
  
  dragRef.current = {
    taskId: task.id,
    originalScheduledAt: task.scheduled_at!,
    startContentY: contentY,
    taskOriginalTop: taskTop,
    taskDuration: task.duration_minutes,
    currentTop: taskTop,
    hasMoved: false,
    pointerId: e.pointerId,
    captureEl: e.currentTarget as HTMLElement,
  }
  
  // Capture pointer on the currentTarget (the task element)
  e.currentTarget.setPointerCapture(e.pointerId)
  
  // Prevent text selection and context menus
  e.preventDefault()
  
  // Attach document listeners (once per gesture)
  document.addEventListener('pointermove', handleDragMove)
  document.addEventListener('pointerup', handleDragUp)
  document.addEventListener('pointercancel', handleDragCancel)
}, []) // Empty deps - reads from refs only
```

**Pointer move handler (document level, stable reference):**
```typescript
const handleDragMove = useCallback((e: PointerEvent) => {
  const drag = dragRef.current
  if (!drag || e.pointerId !== drag.pointerId) return
  
  const container = containerRef.current
  if (!container) return
  
  const contentY = getContentY(e, container)
  const deltaY = contentY - drag.startContentY
  
  // Check drag threshold
  if (!drag.hasMoved && Math.abs(deltaY) > DRAG_THRESHOLD) {
    drag.hasMoved = true
    startRafLoop()
  }
  
  if (!drag.hasMoved) return
  
  // Calculate new position
  const rawTop = drag.taskOriginalTop + deltaY
  
  // Snap to 15-minute slots
  const snappedTop = Math.round(rawTop / SLOT_HEIGHT_PX) * SLOT_HEIGHT_PX
  
  // Clamp to valid range
  // Min: 0 (midnight)
  // Max: enough room for task duration before end of day
  const taskHeightPx = (drag.taskDuration / 60) * SLOT_HEIGHT
  const maxTop = (24 * SLOT_HEIGHT) - taskHeightPx
  const clampedTop = Math.max(0, Math.min(snappedTop, maxTop))
  
  drag.currentTop = clampedTop
  // RAF loop handles visual updates
}, []) // Empty deps - reads from refs only
```

**Pointer up handler (commit, stable reference):**
```typescript
const handleDragUp = useCallback((e: PointerEvent) => {
  const drag = dragRef.current
  if (!drag || e.pointerId !== drag.pointerId) return
  
  // Release pointer capture from the original capturing element
  try {
    drag.captureEl?.releasePointerCapture(drag.pointerId)
  } catch {}
  
  // Remove document listeners
  cleanupDragListeners()
  stopRafLoop()
  
  if (drag.hasMoved) {
    // Convert pixels to time
    const newTime = pixelsToTime(drag.currentTop)
    
    // Validate (max 2 overlaps) using tasksRef for fresh data
    const task = tasksRef.current.find(t => t.id === drag.taskId)
    if (task) {
      const date = drag.originalScheduledAt.split('T')[0]
      const newScheduledAt = createLocalTimestamp(date, newTime)
      const validation = canScheduleTask(tasksRef.current, task.id, newScheduledAt, drag.taskDuration)
      
      if (validation.allowed) {
        onEventMoveRef.current(drag.taskId, newTime)
      }
      // If not allowed, task visually snaps back (we just don't call onEventMove)
    }
  } else {
    // It was a click, not a drag - toggle selection
    setSelectedTaskId(prev => prev === drag.taskId ? null : drag.taskId)
  }
  
  // Clear gesture state
  dragRef.current = null
  forceRender()  // Final render to clear visual state
}, []) // Empty deps - reads from refs only
```

**Pointer cancel handler (always revert, stable reference):**
```typescript
const handleDragCancel = useCallback((e: PointerEvent) => {
  const drag = dragRef.current
  if (!drag || e.pointerId !== drag.pointerId) return
  
  // Release pointer capture from the original capturing element
  try {
    drag.captureEl?.releasePointerCapture(drag.pointerId)
  } catch {}
  
  // Remove document listeners
  cleanupDragListeners()
  stopRafLoop()
  
  // Always revert on cancel - never commit
  dragRef.current = null
  forceRender()
}, []) // Empty deps - reads from refs only
```

---

## Feature 2: Resize to Change Duration

### User Interaction
1. User presses on the bottom edge of a task (resize handle)
2. Drag up/down to change duration
3. Duration snaps to 15-minute increments
4. Constraints:
   - Minimum: 15 minutes
   - Maximum: 4 hours OR end of day, whichever is less
5. On release (`pointerup`):
   - If valid: duration updates
   - If invalid (>2 overlaps): snaps back to original
6. On cancel (`pointercancel`): always revert

### Resize Handle Element

```typescript
{/* Resize handle at bottom of task - only for non-completed */}
{!task.completed_at && (
  <div
    data-resize-handle
    className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/10"
    style={{ touchAction: 'none' }}
    onPointerDown={(e) => handleResizePointerDown(e, task)}
  />
)}
```

### Implementation

**Pointer down handler:**
```typescript
const handleResizePointerDown = useCallback((e: React.PointerEvent, task: Task) => {
  // Ignore completed tasks
  if (task.completed_at) return
  
  // Ignore if another gesture is active
  if (dragRef.current || resizeRef.current) return
  
  e.stopPropagation()  // Don't trigger task drag
  
  const container = containerRef.current
  if (!container) return
  
  const contentY = getContentY(e.nativeEvent, container)
  const startTime = timestampToTime(task.scheduled_at!)
  const taskStartMinutes = timeToMinutes(startTime)  // Helper: "09:30" -> 570
  
  resizeRef.current = {
    taskId: task.id,
    scheduledAt: task.scheduled_at!,
    startContentY: contentY,
    taskStartMinutes: taskStartMinutes,
    originalDuration: task.duration_minutes,
    currentDuration: task.duration_minutes,
    pointerId: e.pointerId,
    captureEl: e.currentTarget as HTMLElement,
  }
  
  e.currentTarget.setPointerCapture(e.pointerId)
  e.preventDefault()
  
  startRafLoop()
  
  document.addEventListener('pointermove', handleResizeMove)
  document.addEventListener('pointerup', handleResizeUp)
  document.addEventListener('pointercancel', handleResizeCancel)
}, []) // Empty deps - reads from refs only
```

**Helper function for time to minutes:**
```typescript
// Convert "HH:mm" to minutes from midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
```

**Pointer move handler (stable reference):**
```typescript
const handleResizeMove = useCallback((e: PointerEvent) => {
  const resize = resizeRef.current
  if (!resize || e.pointerId !== resize.pointerId) return
  
  const container = containerRef.current
  if (!container) return
  
  const contentY = getContentY(e, container)
  const deltaY = contentY - resize.startContentY
  
  // Convert pixel delta to minutes
  const deltaMinutes = (deltaY / SLOT_HEIGHT) * 60
  
  // Calculate new duration, snap to 15-minute increments
  const rawDuration = resize.originalDuration + deltaMinutes
  const snappedDuration = Math.round(rawDuration / 15) * 15
  
  // Calculate max duration (can't extend past midnight)
  const maxDurationByEndOfDay = DAY_MINUTES - resize.taskStartMinutes
  const maxDuration = Math.min(MAX_DURATION_MINUTES, maxDurationByEndOfDay)
  
  // Clamp
  const clampedDuration = Math.max(MIN_DURATION_MINUTES, Math.min(snappedDuration, maxDuration))
  
  resize.currentDuration = clampedDuration
  // RAF loop handles visual updates
}, []) // Empty deps - reads from refs only
```

**Pointer up handler (commit, stable reference):**
```typescript
const handleResizeUp = useCallback((e: PointerEvent) => {
  const resize = resizeRef.current
  if (!resize || e.pointerId !== resize.pointerId) return
  
  try {
    resize.captureEl?.releasePointerCapture(resize.pointerId)
  } catch {}
  
  cleanupResizeListeners()
  stopRafLoop()
  
  if (resize.currentDuration !== resize.originalDuration) {
    // Validate using tasksRef for fresh data
    const task = tasksRef.current.find(t => t.id === resize.taskId)
    if (task) {
      const validation = canScheduleTask(
        tasksRef.current,
        task.id,
        resize.scheduledAt,
        resize.currentDuration
      )
      
      if (validation.allowed) {
        onDurationChangeRef.current(resize.taskId, resize.currentDuration)
      }
      // If not allowed, snaps back visually
    }
  }
  
  resizeRef.current = null
  forceRender()
}, []) // Empty deps - reads from refs only
```

**Pointer cancel handler (always revert, stable reference):**
```typescript
const handleResizeCancel = useCallback((e: PointerEvent) => {
  const resize = resizeRef.current
  if (!resize || e.pointerId !== resize.pointerId) return
  
  try {
    resize.captureEl?.releasePointerCapture(resize.pointerId)
  } catch {}
  
  cleanupResizeListeners()
  stopRafLoop()
  
  // Always revert on cancel
  resizeRef.current = null
  forceRender()
}, []) // Empty deps - reads from refs only
```

---

## Visual Rendering During Gestures

```typescript
// In the task rendering loop:
{scheduledTasks.map((task) => {
  const drag = dragRef.current
  const resize = resizeRef.current
  
  const isBeingDragged = drag?.taskId === task.id && drag.hasMoved
  const isBeingResized = resize?.taskId === task.id
  const isActive = isBeingDragged || isBeingResized
  
  // Base position from task data
  const baseTop = timeToPixels(timestampToTime(task.scheduled_at!))
  
  // Calculate transform offset for drag (avoids layout thrashing)
  const dragOffset = isBeingDragged ? drag!.currentTop - drag!.taskOriginalTop : 0
  
  // Duration from resize state or task data
  const displayDuration = isBeingResized ? resize!.currentDuration : task.duration_minutes
  const displayHeight = (displayDuration / 60) * SLOT_HEIGHT
  
  return (
    <div
      key={task.id}
      className={`
        absolute mx-1 rounded-lg bg-theme-secondary border border-theme 
        overflow-hidden cursor-pointer transition-shadow
        ${isActive ? 'shadow-lg ring-2 ring-blue-400 z-50' : 'shadow-sm hover:shadow-md'}
      `}
      style={{
        top: `${baseTop}px`,
        height: `${Math.max(displayHeight, SLOT_HEIGHT_PX)}px`,
        transform: isBeingDragged ? `translateY(${dragOffset}px)` : undefined,
        touchAction: isActive ? 'none' : undefined,  // Only block scroll when dragging
        // ... other styles (width, left, borderLeft)
      }}
      onPointerDown={(e) => handleTaskPointerDown(e, task)}
    >
      {/* Task content */}
      <div className="flex items-center h-full px-2">
        <span className="truncate text-sm font-medium text-theme-primary flex-1">
          {task.title}
        </span>
        {/* Action buttons... */}
      </div>
      
      {/* Resize handle - only for non-completed tasks */}
      {!task.completed_at && (
        <div
          data-resize-handle
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize hover:bg-black/10"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => handleResizePointerDown(e, task)}
        />
      )}
    </div>
  )
})}
```

---

## CSS Requirements

```css
/* In globals.css */

/* Resize handle cursor */
[data-resize-handle] {
  cursor: ns-resize;
}

/* Prevent text selection and iOS callouts during drag */
.dragging-active {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Apply to calendar tasks for smooth drag */
.calendar-task {
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}

/* Smooth transform during drag */
.calendar-task-dragging {
  will-change: transform;
}
```

---

## Edge Cases

### 1. Gesture mutual exclusion
- Refs are authoritative: check `dragRef.current || resizeRef.current`
- If either is set, ignore new gesture pointer downs

### 2. Pointer up vs cancel
- `pointerup` → commit changes (if valid)
- `pointercancel` → always revert, never commit

### 3. Multi-touch
- Only track the original `pointerId`
- Ignore pointer events with different IDs

### 4. Clicking interactive elements
- Exclude: `button, a, input, textarea, select, [data-no-drag], [data-resize-handle]`
- Use `closest()` check in pointer down

### 5. Scroll during drag
- Handled by using content coordinates (includes scrollTop)
- Works correctly even with momentum scrolling

### 6. Component unmount during gesture
- `useEffect` cleanup removes all listeners and cancels RAF

### 7. Pointer capture release
- Always call `releasePointerCapture()` in up/cancel handlers
- Wrap in try/catch in case element is gone

### 8. Task minimum visual height
- Visual minimum is 45px (one 15-minute slot = SLOT_HEIGHT_PX)
- Matches MIN_DURATION_MINUTES = 15

---

## Files to Modify

1. **`src/components/Calendar/CalendarView.tsx`**
   - Add refs: `dragRef`, `resizeRef`, `rafRef`
   - Add helper: `getContentY()`, `timeToMinutes()`
   - Add RAF functions: `startRafLoop()`, `stopRafLoop()`
   - Add cleanup functions: `cleanupDragListeners()`, `cleanupResizeListeners()`
   - Add unmount cleanup effect
   - Add drag handlers: `handleTaskPointerDown`, `handleDragMove`, `handleDragUp`, `handleDragCancel`
   - Add resize handlers: `handleResizePointerDown`, `handleResizeMove`, `handleResizeUp`, `handleResizeCancel`
   - Update task rendering with transform-based drag preview
   - Add resize handle element
   - Add conditional `touchAction` styles

2. **`src/app/globals.css`**
   - Add resize handle cursor style
   - Add user-select prevention class
   - Add will-change hint for calendar tasks

3. **`src/hooks/useScheduleHandlers.ts`** (optional cleanup)
   - Remove the `alert()` in `handleEventMove` since we use silent snap-back

---

## Testing Checklist

### Drag (Desktop)
- [ ] Click on task (no movement) → toggles selection
- [ ] Drag task down → moves to later time
- [ ] Drag task up → moves to earlier time
- [ ] Drag snaps to 15-minute slots
- [ ] Drag to invalid position (>2 overlaps) → snaps back silently
- [ ] Drag while calendar is scrolled → correct position
- [ ] Scroll during drag → correct position
- [ ] Click on Complete button → doesn't start drag
- [ ] Click on Unschedule button → doesn't start drag

### Drag (Mobile/Touch)
- [ ] Touch and drag → moves task
- [ ] Touch on inactive task and swipe → scrolls calendar (not drag)
- [ ] Touch on active/dragging task → doesn't scroll
- [ ] Long press doesn't show context menu

### Resize (Desktop)
- [ ] Drag bottom handle down → increases duration
- [ ] Drag bottom handle up → decreases duration
- [ ] Resize snaps to 15-minute increments
- [ ] Cannot resize below 15 minutes
- [ ] Cannot resize past end of day
- [ ] Cannot resize above 4 hours
- [ ] Resize to invalid (>2 overlaps) → snaps back

### Resize (Mobile/Touch)
- [ ] Touch and drag resize handle → changes duration
- [ ] Resize handle doesn't trigger task drag

### Visual
- [ ] Active task has shadow and blue ring
- [ ] Resize handle shows cursor change on hover
- [ ] Smooth visual updates during gesture (60fps)
- [ ] No jank or dropped frames
- [ ] Uses CSS transform during drag (not top)

### Edge Cases
- [ ] Completed tasks cannot be dragged
- [ ] Completed tasks cannot be resized
- [ ] Completed tasks CAN be clicked to select
- [ ] `pointercancel` (e.g., incoming call) → reverts, doesn't commit
- [ ] Starting drag then resize (or vice versa) blocked
- [ ] Navigate away during drag → no console errors, listeners cleaned up

---

## Performance Requirements

- Dragging must maintain 60fps on modern phones
- RAF-throttled visual updates (not per-pointermove)
- CSS transforms for drag preview (not layout-triggering `top`)
- Event listeners attached once per gesture, not once per frame

---

## Not Included (Future Enhancements)

1. **Auto-scroll** - scroll calendar when dragging near edges
2. **Preview layout** - show overlap width changes during drag
3. **Keyboard support** - arrow keys to nudge selected task
4. **Undo** - revert accidental moves
5. **Ghost preview** - faded preview at new position
6. **Multi-select drag** - move multiple tasks at once
