# FIXES: Core Functionality + Visual Polish

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Check with `wc -l` after every change.
2. **Run `npm run build` after EACH fix.** Fix errors before moving on.
3. **Test in browser after each fix** to verify behavior visually.
4. **Commit after EACH fix**, not at the end.

---

## Overview

| Fix | Category | Issue |
|-----|----------|-------|
| 1 | Core | Calendar shows 9am-6pm, should be midnight-midnight |
| 2 | Core | Scroll to current time on load (with padding above) |
| 3 | Core | Tasks stay visible in list after scheduling - need visual indicator |
| 4 | Core | Duration click/shift-click to change task duration |
| 5 | Visual | Color mismatch between list and calendar |
| 6 | Visual | Add Nunito font (Duolingo-style) |

---

## FIX 1: Calendar Hours - Midnight to Midnight

### Update `src/components/Calendar/FullCalendarView.tsx`:

Find the FullCalendar component props (around line 158-195). Change:

```typescript
slotMinTime="06:00:00"
slotMaxTime="22:00:00"
```

To:

```typescript
slotMinTime="00:00:00"
slotMaxTime="24:00:00"
```

**Commit:**
```bash
git add -A && git commit -m "fix: Calendar shows full 24 hours (midnight to midnight)"
```

---

## FIX 2: Scroll to Current Time on Load

### Update `src/components/Calendar/FullCalendarView.tsx`:

Find the `useEffect` that handles scrolling (around line 131-149). Replace it with:

```typescript
// Auto-scroll to current time on mount
useEffect(() => {
  const scrollToCurrentTime = () => {
    if (!calendarRef.current) return
    
    const calendarApi = calendarRef.current.getApi()
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Calculate scroll time with ~2 hour padding above current time
    // so current time isn't at the very top
    const paddingHours = 2
    const scrollHour = Math.max(0, currentHour - paddingHours)
    const scrollTime = `${scrollHour.toString().padStart(2, '0')}:00:00`
    
    calendarApi.scrollToTime(scrollTime)
  }
  
  // Delay to ensure calendar is rendered
  const timer = setTimeout(scrollToCurrentTime, 100)
  return () => clearTimeout(timer)
}, [])
```

**Commit:**
```bash
git add -A && git commit -m "fix: Scroll to current time with padding on load"
```

---

## FIX 3: Visual Indicator for Scheduled Tasks

Tasks that are scheduled should appear visually distinct in the list (grayed out with a badge).

### Step 3.1: Update TaskCard to show scheduled state

Update `src/components/Tasks/TaskCard.tsx`:

**Add a new prop to the interface (around line 8):**

```typescript
interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  isScheduled: boolean  // ADD THIS
  paletteId: string
  // ... rest of props
}
```

**Add to destructuring (around line 22):**

```typescript
export function TaskCard({
  id,
  title,
  durationMinutes,
  colorIndex,
  isCompleted,
  isScheduled,  // ADD THIS
  paletteId,
  // ... rest
}: TaskCardProps) {
```

**Update the container div classes (around line 38-46):**

Find:
```typescript
<div
  className={`fc-event p-3 rounded-lg cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] group relative ${
    isCompleted ? 'opacity-50 pointer-events-none' : ''
  }`}
```

Replace with:
```typescript
<div
  className={`fc-event p-3 rounded-lg transition-transform group relative ${
    isCompleted ? 'opacity-50 pointer-events-none' : 
    isScheduled ? 'opacity-60 cursor-default' : 
    'cursor-grab active:cursor-grabbing hover:scale-[1.02]'
  }`}
```

**Add a scheduled badge after the title (around line 61):**

Find:
```typescript
<div className={`font-medium text-white ${isCompleted ? 'line-through' : ''}`}>
  {title}
</div>
```

Replace with:
```typescript
<div className="flex items-center gap-2">
  <span className={`font-medium text-white ${isCompleted ? 'line-through' : ''}`}>
    {title}
  </span>
  {isScheduled && (
    <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded text-white/80">
      scheduled
    </span>
  )}
</div>
```

### Step 3.2: Pass isScheduled prop from ListCard

Update `src/components/Lists/ListCard.tsx`:

**Add scheduled prop to the TaskCard usage (around line 167-181):**

First, the component needs to know which tasks are scheduled. Add a new prop to ListCardProps interface:

```typescript
interface ListCardProps {
  // ... existing props
  scheduledTaskIds: string[]  // ADD THIS
}
```

Add to destructuring:
```typescript
export function ListCard({
  // ... existing props
  scheduledTaskIds,  // ADD THIS
}: ListCardProps) {
```

Update the TaskCard rendering:
```typescript
<TaskCard
  key={task.id}
  id={task.id}
  title={task.title}
  durationMinutes={task.duration_minutes}
  colorIndex={task.color_index}
  isCompleted={task.is_completed}
  isScheduled={scheduledTaskIds.includes(task.id)}  // ADD THIS
  paletteId={paletteId}
  // ... rest of props
/>
```

### Step 3.3: Pass scheduledTaskIds from ListPanel

Update `src/components/Lists/ListPanel.tsx`:

**Add to interface:**
```typescript
interface ListPanelProps {
  // ... existing props
  scheduledTaskIds: string[]  // ADD THIS
}
```

**Add to destructuring:**
```typescript
export function ListPanel({
  // ... existing props
  scheduledTaskIds,  // ADD THIS
}: ListPanelProps) {
```

**Pass to ListCard:**
```typescript
<ListCard
  // ... existing props
  scheduledTaskIds={scheduledTaskIds}  // ADD THIS
/>
```

### Step 3.4: Pass scheduledTaskIds from page.tsx

Update `src/app/page.tsx`:

**Create the scheduledTaskIds array and pass it:**

After the loading check (around line 52), add:
```typescript
// Get list of scheduled task IDs
const scheduledTaskIds = scheduled.map(s => s.task_id)
```

**Pass to ListPanel (around line 83-106):**
```typescript
<ListPanel
  // ... existing props
  scheduledTaskIds={scheduledTaskIds}  // ADD THIS
/>
```

**Commit:**
```bash
git add -A && git commit -m "fix: Show visual indicator for scheduled tasks in lists"
```

---

## FIX 4: Duration Click/Shift-Click

The duration should cycle through 15/30/45/60 on click, and reverse on shift-click.

### Update `src/components/Tasks/TaskCard.tsx`:

**Update the onDurationClick handler to pass the event:**

Find the duration button (around line 64-70):
```typescript
<button
  onClick={(e) => {
    e.stopPropagation()
    onDurationClick()
  }}
```

Change to:
```typescript
<button
  onClick={(e) => {
    e.stopPropagation()
    onDurationClick(e.shiftKey)
  }}
```

**Update the prop type in the interface:**

Find:
```typescript
onDurationClick: () => void
```

Change to:
```typescript
onDurationClick: (reverse: boolean) => void
```

### Update `src/components/Lists/ListCard.tsx`:

**Update the onTaskDurationClick handler:**

Find the TaskCard usage and update the duration click handler:
```typescript
onDurationClick={(reverse) => onTaskDurationClick(task.id, task.duration_minutes, reverse)}
```

**Update the prop type in interface:**

Find:
```typescript
onTaskDurationClick: (taskId: string, currentDuration: number) => void
```

Change to:
```typescript
onTaskDurationClick: (taskId: string, currentDuration: number, reverse: boolean) => void
```

### Update `src/components/Lists/ListPanel.tsx`:

**Update the cycleDuration function (around line 76-80):**

Find:
```typescript
const cycleDuration = (current: number) => {
  const durations = [15, 30, 45, 60]
  const idx = durations.indexOf(current)
  return durations[(idx + 1) % durations.length]
}
```

Replace with:
```typescript
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

**Update the ListCard call:**

Find:
```typescript
onTaskDurationClick={(taskId, duration) => 
  onTaskDurationChange(taskId, cycleDuration(duration))
}
```

Change to:
```typescript
onTaskDurationClick={(taskId, duration, reverse) => 
  onTaskDurationChange(taskId, cycleDuration(duration, reverse))
}
```

**Commit:**
```bash
git add -A && git commit -m "fix: Duration click cycles forward, shift-click cycles backward"
```

---

## FIX 5: Color Consistency

The calendar and list should use the same color palette. The issue is that FullCalendarView has its own COLOR_PALETTES while TaskCard uses the palette from `@/lib/palettes`.

### Update `src/components/Calendar/FullCalendarView.tsx`:

**Remove the local COLOR_PALETTES constant (around line 33-39):**

Delete this entire block:
```typescript
// Color palettes - same as original
const COLOR_PALETTES = {
  sunset: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'],
  forest: ['#27ae60', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c', '#34495e'],
  ocean: ['#3742fa', '#2f3542', '#ff3838', '#ff6348', '#ffdd59', '#c44569', '#f8b500', '#40739e'],
  pastel: ['#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe', '#ffeaa7', '#fab1a0', '#00b894', '#0984e3']
} as const
```

**Add import at top of file:**
```typescript
import { getColor } from '@/lib/palettes'
```

**Update the event mapping (around line 54-83):**

Find the line that gets the color:
```typescript
const colors = COLOR_PALETTES[paletteId as keyof typeof COLOR_PALETTES] || COLOR_PALETTES.sunset
const backgroundColor = colors[task.color_index] || colors[0]
```

Replace with:
```typescript
const backgroundColor = getColor(paletteId, task.color_index)
```

**Commit:**
```bash
git add -A && git commit -m "fix: Use consistent color palette for calendar and lists"
```

---

## FIX 6: Add Nunito Font

### Step 6.1: Update `src/app/layout.tsx`:

**Change the font imports:**

Find:
```typescript
import { Geist, Geist_Mono } from "next/font/google";
```

Replace with:
```typescript
import { Nunito } from "next/font/google";
```

**Update the font configuration:**

Find:
```typescript
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

Replace with:
```typescript
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
```

**Update the body className:**

Find:
```typescript
<body
  className={`${geistSans.variable} ${geistMono.variable} antialiased`}
>
```

Replace with:
```typescript
<body
  className={`${nunito.variable} font-sans antialiased`}
>
```

### Step 6.2: Update Tailwind to use Nunito

Create or update `tailwind.config.ts` (if it doesn't exist, check for `tailwind.config.js`):

If using Tailwind v4 with CSS-based config, add to `src/app/globals.css` at the top:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-nunito), system-ui, sans-serif;
}
```

If there's already a `@theme` block, just add the `--font-sans` line inside it.

**Commit:**
```bash
git add -A && git commit -m "fix: Use Nunito font throughout app"
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
npm run dev
```

**Test checklist:**
1. ✅ Calendar shows midnight to midnight (scroll to see full range)
2. ✅ On load, calendar scrolls to ~2 hours before current time
3. ✅ Scheduled tasks show "scheduled" badge and are slightly dimmed in lists
4. ✅ Click duration to cycle forward (15→30→45→60→15)
5. ✅ Shift-click duration to cycle backward (15→60→45→30→15)
6. ✅ Colors match between list tasks and calendar events
7. ✅ Font is Nunito throughout

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/components/Calendar/FullCalendarView.tsx` | 24h range, scroll behavior, use shared palette |
| `src/components/Tasks/TaskCard.tsx` | isScheduled prop, badge, shift-click support |
| `src/components/Lists/ListCard.tsx` | Pass scheduledTaskIds, reverse duration |
| `src/components/Lists/ListPanel.tsx` | scheduledTaskIds prop, bidirectional cycle |
| `src/app/page.tsx` | Pass scheduledTaskIds to ListPanel |
| `src/app/layout.tsx` | Nunito font |
| `src/app/globals.css` | Font family config |
