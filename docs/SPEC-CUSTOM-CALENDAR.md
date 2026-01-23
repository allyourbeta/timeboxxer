# Custom Calendar Component Specification

## Overview

Replace FullCalendar with a custom-built day-view calendar component. This eliminates the dual drag-system conflict and gives us full control over behavior.

The calendar receives tasks dragged from lists, displays scheduled tasks, and allows rescheduling and completion within the calendar.

---

## 1. Display Requirements

### Time Range
- 24-hour day view (00:00 to 24:00)
- Viewport shows a portion; user scrolls to see more
- Time labels in left gutter, every hour (12:00, 1:00, 2:00... or 00:00, 01:00 in 24h format - match user's system preference if feasible, otherwise 12-hour with AM/PM)

### Grid
- 15-minute slot granularity
- Visual grid lines at each hour (bold) and each 15-minute mark (subtle)
- 96 total slots

### Current Time Indicator
- Red horizontal line at current time
- Updates every 60 seconds
- Persists regardless of scroll position (it's at an absolute time position, not fixed to viewport)

### Scroll Behavior
- Standard vertical scroll within the calendar container
- On app load: scroll to current time, with ~1.5 hours of buffer visible above "now"
- Smooth scrolling preferred

---

## 2. Time Model

### Snapping
- All times snap to 15-minute increments
- Applies to: drops from lists, moves within calendar, resize operations
- Snap uses nearest slot (round to nearest 15 minutes)

### Storage
- Times stored as local time (not UTC)
- Format: ISO timestamp but interpreted as local (e.g., "2026-01-20T14:30:00")
- No timezone conversion - "9:00 AM" means 9:00 AM on the user's screen
- DST edge cases: out of scope for now (declare "local wall clock, ignore DST complexity")

### Day Boundaries
- Tasks cannot start before 00:00
- If a task would extend past 24:00:
  - **If simple to implement**: allow overflow, task visually extends to its true end time (even if past midnight), but is clamped to display within 24:00 boundary
  - **If complex**: clamp end time to 24:00 and truncate duration
- Decision can be revisited during implementation

### Duration Limits
- Minimum: 15 minutes
- Maximum: 8 hours (480 minutes)
- Enforced on resize and on any duration change

---

## 3. Overlap Policy

### Rules
- Maximum 2 tasks can overlap at any point in time
- If a drop/move would create a 3-way overlap, **reject the drop** and show brief feedback ("Too many overlapping tasks")
- Completed tasks **do not** count toward overlap limit (they're just visual history)

### Layout Algorithm
- When 2 tasks overlap, display side-by-side (each gets 50% width)
- Use stable column assignment: task A always stays in its column even as task B is dragged around
- Column assignment based on: earliest start time gets left column; ties broken by task ID for stability

---

## 4. Drag from Lists to Calendar

### Architecture
- Calendar is a single Droppable (`droppableId="calendar"`)
- On drop, calculate target time slot from Y-coordinate + scroll offset
- Formula: `slotIndex = Math.floor((dropY - calendarTop + scrollTop) / slotHeightPx)`
- Convert slot index to time: `minutes = slotIndex * 15`, then to hours:minutes

### Visual Feedback During Drag
- As user drags over calendar, highlight the target 15-minute slot
- Highlight is a semi-transparent colored band at the target slot position
- Highlight updates as mouse/pointer moves (throttled to ~60fps)
- Show a "ghost" preview of the task block at the target position

### On Drop
- Validate: would this create >2 overlapping tasks?
  - If yes: reject, show feedback, task returns to source
  - If no: schedule the task at the target time
- Call `scheduleTask(taskId, scheduledAt)` where `scheduledAt` is the computed timestamp

### Auto-Scroll During Drag
- When dragging near the top or bottom edge of the calendar viewport, auto-scroll in that direction
- Threshold: within 50px of edge
- Speed: gradual acceleration (slow start, faster the longer you hover at edge)
- Implemented via requestAnimationFrame loop during drag

---

## 5. Drag Within Calendar (Repositioning)

### Behavior
- Scheduled task blocks are Draggables
- Dragging moves the task to a new time slot
- Same snapping rules (15-minute)
- Same overlap validation (reject if would create >2 overlap)

### Visual Feedback
- Original position shows a faded "ghost" outline
- Dragged block follows pointer with slight opacity reduction
- Target slot highlighted as with external drops

### On Drop
- Update task's `scheduled_at` to new time
- Recompute overlap layout

---

## 6. Resize (Duration Change)

### Interaction
- Bottom edge of task block has a resize handle (visual: a small bar or grip area)
- Drag handle down to increase duration, up to decrease
- Resize handle captures pointer events; does NOT trigger the block's drag behavior

### Rules
- Start time remains fixed; only end time changes
- Snap to 15-minute increments during resize
- Enforce minimum duration: 15 minutes
- Enforce maximum duration: 8 hours
- Clamp at day boundary (cannot extend past 24:00)

### Visual Feedback
- Show updated duration in real-time (either as a tooltip or inline label)
- Task block visually grows/shrinks as user drags

### On Release
- Update task's `duration_minutes`
- Validate overlaps (if resize would create >2 overlap, revert to original duration and show feedback)

### Auto-Scroll During Resize
- Same as drag: auto-scroll when resize handle is near viewport edge

---

## 7. Click Interactions

### Click on Task Block
Opens a small popover/menu with options:
- **Complete**: Mark task as completed
  - Sets `is_completed = true`, `completed_at = now`
  - Task remains visible on calendar (visual change: muted colors, strikethrough, or checkmark)
  - Task no longer counts toward overlap limit
- **Cancel / Unschedule**: Remove from calendar
  - Clears `scheduled_at`
  - Task returns to its home list (still exists, just not scheduled)
- **Close**: Dismiss menu without action

### Click vs Drag Disambiguation
- Drag threshold: must move pointer >5px to initiate drag
- If pointer down and up without exceeding threshold, treat as click
- Resize handle area: pointer events are for resize only, not drag or click-to-open-menu

---

## 8. Completed Tasks

### Display
- Remain visible on calendar at their scheduled time
- Visual distinction: muted/grayed colors, reduced opacity, or strikethrough on title
- Do NOT count toward overlap limit (can have 2 active + N completed in same slot)

### Interactivity
- Still draggable (allows user to correct mistakes in time placement for accurate records)
- Can be "uncompleted" (click → menu → Restore/Uncomplete option)
- Resizable (same rules as active tasks)

---

## 9. Task Block Display

### Content
- Task title (truncate with ellipsis if too long)
- Duration indicator (optional: "30m", "1h", etc.)
- Color based on `color_index` from task's palette

### Sizing
- Height proportional to duration: `heightPx = (duration_minutes / 15) * slotHeightPx`
- Width: 100% of column (or 50% if side-by-side with overlapping task)
- Minimum readable height: even 15-minute tasks should show at least the title (define minimum slot height accordingly)

### Positioning
- Absolute positioning within calendar container
- `top` calculated from scheduled start time
- `left` and `width` calculated from overlap column assignment

---

## 10. Architecture

### Component Structure
```
CalendarView/
├── CalendarContainer.tsx    # Scroll container, DragDropContext integration
├── CalendarGrid.tsx         # Time slots grid (visual only, not Droppables)
├── CalendarDropZone.tsx     # Single Droppable covering the calendar
├── ScheduledTaskBlock.tsx   # Individual task block (Draggable + resize handle)
├── CurrentTimeIndicator.tsx # The red "now" line
├── SlotHighlight.tsx        # Visual feedback for drop target
└── TaskPopover.tsx          # Click menu for complete/cancel
```

### Pure Utility Functions (in services or lib)
Keep these separate from React/DnD for testability and future migration:

```typescript
// Time ↔ Position conversion
function timeToY(minutes: number, slotHeightPx: number): number
function yToTime(y: number, scrollTop: number, containerTop: number, slotHeightPx: number): number
function snapToSlot(minutes: number): number

// Overlap calculation
function computeOverlapColumns(tasks: ScheduledTask[]): Map<string, { column: number, totalColumns: number }>
function wouldExceedOverlapLimit(tasks: ScheduledTask[], newTask: { start: number, end: number }): boolean

// Validation
function clampDuration(minutes: number): number  // enforce min/max
function clampToDay(startMinutes: number, durationMinutes: number): { start: number, duration: number }
```

### State
- Scheduled tasks come from the existing `useTaskStore`
- No new store needed; calendar is a view of tasks where `scheduled_at` is set
- Local UI state for: drag preview position, resize in progress, active popover

---

## 11. Responsive Considerations

### Slot Height
- Define a reasonable `slotHeightPx` (e.g., 20px per 15-min slot = 80px per hour)
- This makes the full calendar 1920px tall (24 hours × 80px)
- May adjust based on viewport height, but keep consistent during a session

### Mobile (Future)
- Current implementation uses hello-pangea/dnd which has limited touch support
- Architecture allows future migration to @dnd-kit
- For now: desktop-first, functional on tablet, may be awkward on phone

---

## 12. What We're NOT Building (Out of Scope)

- Multi-day view (only single day)
- Recurring events (handled elsewhere via `is_daily` flag)
- Drag across days
- Keyboard navigation for drag/drop (future accessibility enhancement)
- Virtualization (96 slots is manageable without it)
- Undo/redo (rely on task remaining in home list as "undo")

---

## 13. Implementation Phases

### Phase 1: Basic Display
- Calendar grid with time labels
- Render scheduled tasks as positioned blocks
- Current time indicator
- Scroll to "now" on load

### Phase 2: Drop from Lists
- Single Droppable for calendar
- Coordinate → time calculation
- Visual slot highlighting during drag
- Schedule task on drop

### Phase 3: Drag Within Calendar
- Make task blocks Draggable
- Reposition on drop
- Update `scheduled_at`

### Phase 4: Overlap Handling
- Implement column layout algorithm
- Validate max 2 overlap on drop/move
- Reject with feedback if exceeded

### Phase 5: Resize
- Add resize handle to task blocks
- Implement resize interaction
- Enforce duration limits

### Phase 6: Click Interactions
- Task popover with Complete/Cancel
- Click vs drag disambiguation

### Phase 7: Polish
- Auto-scroll during drag/resize
- Completed task styling
- Edge case handling
- Performance tuning

---

## 14. Open Questions for Implementation

1. **Slot height**: 20px per 15-min slot (80px/hour) - reasonable default?
2. **Time label format**: 12-hour (9 AM) or 24-hour (09:00)?
3. **Overflow behavior**: attempt implementation or defer and clamp at midnight?
4. **Popover library**: use existing UI components or build simple custom?

These can be decided during implementation.

---

## Summary

This spec replaces FullCalendar with a focused, custom component that:
- Lives entirely within the hello-pangea/dnd ecosystem
- Uses simple coordinate math for drop targeting
- Has explicit rules for snapping, overlaps, and boundaries
- Is architected for testability and future migration

The goal is reliability over features. A calendar that works predictably beats one with bells and whistles that fights the user.
