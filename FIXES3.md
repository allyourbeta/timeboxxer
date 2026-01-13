# FIXES ROUND 3 - Critical UX Improvements

---

## ⚠️ MANDATORY RULES - READ BEFORE EVERY CHANGE ⚠️

1. **NO FILE OVER 300 LINES.** Check with `wc -l` after every change.
2. **If a file approaches 250 lines, split it proactively.**
3. **Components have NO business logic, NO API calls.**
4. **All state changes go through Zustand stores.**
5. **All database calls go through `src/api/`.**
6. **Run `npm run build` after EVERY fix. Fix errors before moving on.**
7. **Do NOT ask for confirmation. Just execute.**
8. **Commit after EACH fix, not at the end.**

### File Size Check Command
Run this after EVERY change:
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0; exit 1}'
```

---

## Fix 1: Calendar Grid Lines - Explicit 15-Minute Segments

**Problem:** Looking at the calendar, it's unclear where 9:00 AM begins. The visual boundaries between time slots are not distinct enough.

**Current state:** Faint lines, hard to distinguish slots.

**Desired state:** Every 15-minute slot should be explicitly marked with visible grid lines, similar to Google Calendar or Outlook.

### Implementation:

### 1.1 Update `src/components/Calendar/TimeSlot.tsx`:

Replace the current border styling with explicit, always-visible grid lines:

```typescript
'use client'

import { useState } from 'react'
import { ScheduledTaskBlock } from './ScheduledTaskBlock'

interface ScheduledTaskInfo {
  taskId: string
  title: string
  durationMinutes: number
  colorIndex: number
}

interface TimeSlotProps {
  time: string
  isHour: boolean
  isHalfHour: boolean
  scheduledTask: ScheduledTaskInfo | null
  taskHeight: number
  paletteId: string
  onDrop: () => void
  onUnschedule: () => void
  onComplete: () => void
  onDragStart: () => void
  onDurationChange: (newDuration: number) => void
}

export function TimeSlot({
  time,
  isHour,
  isHalfHour,
  scheduledTask,
  taskHeight,
  paletteId,
  onDrop,
  onUnschedule,
  onComplete,
  onDragStart,
  onDurationChange,
}: TimeSlotProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Format time for display: "9:00 AM" format
  const formatTime = (t: string) => {
    const [hour, minute] = t.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }

  // Determine border style based on time
  // Hour marks: thick solid line
  // Half-hour marks: medium dashed line  
  // Quarter marks (:15, :45): thin dotted line
  const getBorderStyle = () => {
    if (isHour) {
      return 'border-t-2 border-gray-500' // Prominent line at hour
    } else if (isHalfHour) {
      return 'border-t border-gray-600 border-dashed' // Dashed at :30
    } else {
      return 'border-t border-gray-700 border-dotted' // Dotted at :15, :45
    }
  }

  return (
    <div
      className={`h-12 flex items-stretch ${getBorderStyle()}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Time label column - fixed width */}
      <div className="w-24 flex-shrink-0 flex items-start justify-end pr-3 pt-0.5 relative">
        {/* Always show time for hour and half-hour */}
        {isHour && (
          <span className="text-sm font-bold text-white">
            {formatTime(time)}
          </span>
        )}
        {isHalfHour && !isHour && (
          <span className="text-xs font-medium text-gray-400">
            {formatTime(time)}
          </span>
        )}
        {/* Quarter hours: show on hover */}
        {!isHour && !isHalfHour && (
          <span className={`text-xs text-gray-500 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {formatTime(time)}
          </span>
        )}
      </div>
      
      {/* Grid line visual indicator in the slot area */}
      <div className="flex-1 relative">
        {/* Background grid line that spans the full width */}
        <div className={`absolute top-0 left-0 right-0 ${
          isHour ? 'h-0.5 bg-gray-500' : 
          isHalfHour ? 'h-px bg-gray-600' : 
          'h-px bg-gray-700/50'
        }`} />
        
        {scheduledTask ? (
          <ScheduledTaskBlock
            title={scheduledTask.title}
            durationMinutes={scheduledTask.durationMinutes}
            colorIndex={scheduledTask.colorIndex}
            paletteId={paletteId}
            height={taskHeight}
            onUnschedule={onUnschedule}
            onComplete={onComplete}
            onDragStart={onDragStart}
            onDurationChange={onDurationChange}
          />
        ) : (
          <div 
            className={`h-full w-full transition-colors ${
              isHovered ? 'bg-blue-500/20' : ''
            }`}
          />
        )}
      </div>
    </div>
  )
}
```

### 1.2 Visual Result:

```
┌────────────────────────────────────────────────────┐
│ 8:00 AM    ════════════════════════════════════════│  ← THICK solid line, bold time
│            ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│  ← Dotted line (:15)
│ 8:30 AM    ────────────────────────────────────────│  ← Dashed line, smaller time  
│            ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│  ← Dotted line (:45)
│ 9:00 AM    ════════════════════════════════════════│  ← THICK solid line, bold time
└────────────────────────────────────────────────────┘
```

**Files to modify:** `TimeSlot.tsx`

**Commit message:** `fix: 1 - Add explicit grid lines for every 15-minute segment`

---

## Fix 2: Distinct Background Color Themes

**Problem:** The current themes (Midnight, Slate, Ocean, Paper, Snow) are too similar - dark themes all look nearly identical.

**Solution:** Create 5 truly distinct themes with different color personalities.

### 2.1 Replace `src/lib/backgroundThemes.ts` entirely:

```typescript
export const backgroundThemes = {
  midnight: {
    name: 'Midnight',
    description: 'Deep purple-black',
    bgPrimary: '#0f0a1e',      // Very dark purple
    bgSecondary: '#1a1333',    // Dark purple
    bgTertiary: '#2d2250',     // Medium purple
    textPrimary: '#f0e6ff',    // Light lavender
    textSecondary: '#a78bda',  // Muted purple
    borderColor: '#3d3366',    // Purple border
    accentColor: '#8b5cf6',    // Violet accent
  },
  forest: {
    name: 'Forest',
    description: 'Deep green',
    bgPrimary: '#0a1410',      // Very dark green
    bgSecondary: '#132a1f',    // Dark forest
    bgTertiary: '#1e4033',     // Medium green
    textPrimary: '#e6fff2',    // Light mint
    textSecondary: '#6bcf9a',  // Soft green
    borderColor: '#2d5c47',    // Green border
    accentColor: '#10b981',    // Emerald accent
  },
  ocean: {
    name: 'Ocean',
    description: 'Deep blue',
    bgPrimary: '#0a1628',      // Very dark navy
    bgSecondary: '#0f2847',    // Dark blue
    bgTertiary: '#1a3d66',     // Medium blue
    textPrimary: '#e6f4ff',    // Light sky
    textSecondary: '#60a5fa',  // Soft blue
    borderColor: '#2563eb',    // Blue border
    accentColor: '#3b82f6',    // Blue accent
  },
  ember: {
    name: 'Ember',
    description: 'Warm dark',
    bgPrimary: '#1a0f0a',      // Very dark brown
    bgSecondary: '#2d1810',    // Dark ember
    bgTertiary: '#4a2820',     // Medium warm
    textPrimary: '#fff5eb',    // Cream white
    textSecondary: '#f59e0b',  // Amber
    borderColor: '#7c3d20',    // Warm border
    accentColor: '#f97316',    // Orange accent
  },
  snow: {
    name: 'Snow',
    description: 'Clean light',
    bgPrimary: '#ffffff',      // Pure white
    bgSecondary: '#f1f5f9',    // Light gray
    bgTertiary: '#e2e8f0',     // Soft gray
    textPrimary: '#0f172a',    // Dark slate text
    textSecondary: '#64748b',  // Medium slate
    borderColor: '#cbd5e1',    // Light border
    accentColor: '#6366f1',    // Indigo accent
  },
} as const

export type BackgroundTheme = keyof typeof backgroundThemes
```

### 2.2 Update `src/app/page.tsx` to apply all theme colors:

In the useEffect that applies the theme, set ALL CSS variables:

```typescript
useEffect(() => {
  const colors = backgroundThemes[backgroundTheme]
  document.documentElement.style.setProperty('--bg-primary', colors.bgPrimary)
  document.documentElement.style.setProperty('--bg-secondary', colors.bgSecondary)
  document.documentElement.style.setProperty('--bg-tertiary', colors.bgTertiary)
  document.documentElement.style.setProperty('--text-primary', colors.textPrimary)
  document.documentElement.style.setProperty('--text-secondary', colors.textSecondary)
  document.documentElement.style.setProperty('--border-color', colors.borderColor)
  document.documentElement.style.setProperty('--accent-color', colors.accentColor)
}, [backgroundTheme])
```

### 2.3 Update `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --bg-primary: #0f0a1e;
  --bg-secondary: #1a1333;
  --bg-tertiary: #2d2250;
  --text-primary: #f0e6ff;
  --text-secondary: #a78bda;
  --border-color: #3d3366;
  --accent-color: #8b5cf6;
}
```

### 2.4 Ensure all components use CSS variable classes consistently:

Search and replace across ALL components:
- `bg-gray-900` → `bg-[var(--bg-primary)]`
- `bg-gray-800` → `bg-[var(--bg-secondary)]`
- `bg-gray-700` → `bg-[var(--bg-tertiary)]`
- `text-white` → `text-[var(--text-primary)]`
- `text-gray-400` → `text-[var(--text-secondary)]`
- `border-gray-700` → `border-[var(--border-color)]`
- `border-gray-600` → `border-[var(--border-color)]`

Components to update:
- `page.tsx`
- `Header.tsx`
- `ListPanel.tsx`
- `ListCard.tsx`
- `TaskCard.tsx`
- `AddTaskInput.tsx`
- `DayView.tsx`
- `TimeSlot.tsx`
- `ScheduledTaskBlock.tsx`
- `CompletedView.tsx`

**Files to modify:** `backgroundThemes.ts`, `page.tsx`, `globals.css`, and all component files listed above

**Commit message:** `fix: 2 - Create 5 truly distinct color themes (Midnight, Forest, Ocean, Ember, Snow)`

---

## Fix 3: Drag-and-Drop Snapping to Nearest Time Slot

**Problem:** When dragging tasks on the calendar, the drop detection is unreliable. Tasks don't snap to the nearest slot properly.

**Root Cause:** The current implementation only registers drops when you drop directly ON a TimeSlot div. If your mouse is between slots or slightly off, it fails.

**Solution:** Implement proper drag-and-drop with position-based snapping.

### 3.1 Update `src/components/Calendar/DayView.tsx`:

Replace the per-slot drop handling with a single container that calculates the drop position:

```typescript
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { TimeSlot } from './TimeSlot'

// ... existing interfaces ...

// Time slot constants
const SLOT_HEIGHT = 48 // h-12 = 3rem = 48px
const START_HOUR = 6
const END_HOUR = 22
const MINUTES_PER_SLOT = 15

function generateTimeSlots() {
  const slots = []
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += MINUTES_PER_SLOT) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function DayView({
  tasks,
  scheduled,
  paletteId,
  onDrop,
  onUnschedule,
  onComplete,
  onDragStart,
  onDurationChange,
}: DayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const slotsContainerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

  // ... existing useEffects for time updates and scrolling ...

  // Calculate which time slot based on Y position
  const getTimeSlotFromY = useCallback((clientY: number): string | null => {
    if (!slotsContainerRef.current) return null
    
    const rect = slotsContainerRef.current.getBoundingClientRect()
    const relativeY = clientY - rect.top + slotsContainerRef.current.scrollTop
    
    // Calculate slot index
    const slotIndex = Math.floor(relativeY / SLOT_HEIGHT)
    
    // Clamp to valid range
    if (slotIndex < 0 || slotIndex >= TIME_SLOTS.length) return null
    
    return TIME_SLOTS[slotIndex]
  }, [])

  // Handle drag over the entire calendar area
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const slot = getTimeSlotFromY(e.clientY)
    setDragOverSlot(slot)
  }, [getTimeSlotFromY])

  // Handle drop on the entire calendar area
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const slot = getTimeSlotFromY(e.clientY)
    if (slot) {
      onDrop(slot)
    }
    setDragOverSlot(null)
  }, [getTimeSlotFromY, onDrop])

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null)
  }, [])

  // ... existing helper functions ...

  return (
    <div className="flex-1 overflow-hidden flex flex-col" ref={containerRef}>
      <div className="flex gap-2 p-4 border-b border-[var(--border-color)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Today</h2>
      </div>
      
      {/* Scrollable slots container with unified drag handling */}
      <div 
        ref={slotsContainerRef}
        className="flex-1 overflow-y-auto"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        <div className="relative">
          {TIME_SLOTS.map((time) => {
            const scheduledTask = getScheduledTaskAtTime(time)
            const isDropTarget = dragOverSlot === time
            
            return (
              <TimeSlot
                key={time}
                time={time}
                isHour={time.endsWith(':00')}
                isHalfHour={time.endsWith(':30')}
                scheduledTask={scheduledTask}
                taskHeight={scheduledTask ? getTaskHeight(scheduledTask.durationMinutes) : 0}
                paletteId={paletteId}
                isDropTarget={isDropTarget}
                onUnschedule={() => scheduledTask && onUnschedule(scheduledTask.taskId)}
                onComplete={() => scheduledTask && onComplete(scheduledTask.taskId)}
                onDragStart={() => scheduledTask && onDragStart(scheduledTask.taskId)}
                onDurationChange={(newDuration) => scheduledTask && onDurationChange(scheduledTask.taskId, newDuration)}
              />
            )
          })}
          
          {/* Current time indicator */}
          {getCurrentTimePosition() !== null && (
            <div 
              className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
              style={{ top: `${getCurrentTimePosition()}px` }}
            >
              <div className="w-24 flex justify-end pr-2">
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  NOW
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 3.2 Update `src/components/Calendar/TimeSlot.tsx`:

Add visual feedback for drop target:

```typescript
interface TimeSlotProps {
  // ... existing props ...
  isDropTarget: boolean  // NEW: highlight when this is the drop target
}

export function TimeSlot({
  // ... existing props ...
  isDropTarget,
}: TimeSlotProps) {
  // ... existing code ...

  return (
    <div
      className={`h-12 flex items-stretch ${getBorderStyle()} ${
        isDropTarget ? 'bg-blue-500/30 ring-2 ring-blue-500 ring-inset' : ''
      }`}
      // Remove individual onDragOver and onDrop - handled by parent now
    >
      {/* ... rest of component ... */}
    </div>
  )
}
```

### 3.3 Key improvements:

1. **Unified drop zone:** The entire calendar scrollable area handles drag events, not individual slots
2. **Position-based calculation:** Uses mouse Y position to calculate which slot, with proper scroll offset
3. **Visual feedback:** The target slot highlights with blue background and ring when dragging over
4. **Snapping:** Always snaps to exact 15-minute boundaries based on calculated position
5. **Scroll support:** Accounts for scroll position when calculating drop target

**Files to modify:** `DayView.tsx`, `TimeSlot.tsx`

**Commit message:** `fix: 3 - Implement reliable drag-drop with position-based snapping`

---

## Execution Order

1. **Fix 1** - Grid lines (visual clarity)
2. **Fix 2** - Distinct color themes
3. **Fix 3** - Drag-drop snapping (critical UX)

---

## Verification After Each Fix

```bash
npm run build && find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0; exit 1}' && echo "✓ All checks pass"
```

## Test Each Fix

### Test Fix 1:
- Look at calendar - can you clearly see where each 15-minute slot begins?
- Are hour marks (9:00 AM) prominently displayed with thick lines?
- Are half-hour marks (9:30 AM) visible with dashed lines?
- Do quarter marks (:15, :45) have subtle dotted lines?

### Test Fix 2:
- Select each theme from dropdown
- Midnight: Purple/violet tones
- Forest: Green tones
- Ocean: Blue tones
- Ember: Warm orange/brown tones
- Snow: Clean white/light gray
- Each should look OBVIOUSLY different

### Test Fix 3:
- Drag a task from the list to the calendar
- The target slot should highlight blue as you drag over
- Drop should place task at the highlighted slot
- Drag an existing calendar task to a new time
- Should smoothly snap to nearest 15-minute slot
- Works even when scrolling

---

## Final Commits Expected

```
fix: 3 - Implement reliable drag-drop with position-based snapping
fix: 2 - Create 5 truly distinct color themes (Midnight, Forest, Ocean, Ember, Snow)
fix: 1 - Add explicit grid lines for every 15-minute segment
```
