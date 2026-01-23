# FIXES ROUND 4 - Final Polish

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

## Fix 1: Simplify to Light/Dark Themes Only

**Problem:** 5 color themes (Midnight, Forest, Ocean, Ember, Snow) are overengineered and buggy.

**Solution:** Remove all 5 themes. Replace with simple Light and Dark toggle.

### 1.1 Replace `src/lib/backgroundThemes.ts` entirely:

```typescript
export const themes = {
  dark: {
    name: 'Dark',
    bgPrimary: '#111827',      // gray-900
    bgSecondary: '#1f2937',    // gray-800
    bgTertiary: '#374151',     // gray-700
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af',  // gray-400
    borderColor: '#374151',    // gray-700
  },
  light: {
    name: 'Light',
    bgPrimary: '#ffffff',
    bgSecondary: '#f3f4f6',    // gray-100
    bgTertiary: '#e5e7eb',     // gray-200
    textPrimary: '#111827',    // gray-900
    textSecondary: '#6b7280',  // gray-500
    borderColor: '#d1d5db',    // gray-300
  },
} as const

export type Theme = keyof typeof themes
```

### 1.2 Update `src/state/useUIStore.ts`:

Remove `backgroundTheme` entirely. Simplify to just `theme`:

```typescript
import { create } from 'zustand'
import { Theme, themes } from '@/lib/backgroundThemes'

// Helper to validate stored theme
const getValidTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('theme')
  if (stored && stored in themes) {
    return stored as Theme
  }
  return 'dark'
}

interface UIStore {
  // View state
  currentView: 'main' | 'completed'
  setCurrentView: (view: 'main' | 'completed') => void
  
  // Drag state
  draggedTaskId: string | null
  setDraggedTaskId: (taskId: string | null) => void
  
  // Color picker
  colorPickerTaskId: string | null
  openColorPicker: (taskId: string) => void
  closeColorPicker: () => void
  
  // List editing
  editingListId: string | null
  setEditingListId: (listId: string | null) => void
  
  // New list input
  showNewListInput: boolean
  setShowNewListInput: (show: boolean) => void
  
  // Duplicate list
  duplicatingListId: string | null
  setDuplicatingListId: (listId: string | null) => void
  
  // Collapsible lists (multi-column layout)
  expandedListByColumn: Record<number, string | null>
  toggleListExpanded: (listId: string, column: number) => void
  
  // Panel focus modes
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  setPanelMode: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  
  // Theme (just light/dark now)
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: 'main',
  setCurrentView: (view) => set({ currentView: view }),
  
  draggedTaskId: null,
  setDraggedTaskId: (taskId) => set({ draggedTaskId: taskId }),
  
  colorPickerTaskId: null,
  openColorPicker: (taskId) => set({ colorPickerTaskId: taskId }),
  closeColorPicker: () => set({ colorPickerTaskId: null }),
  
  editingListId: null,
  setEditingListId: (listId) => set({ editingListId: listId }),
  
  showNewListInput: false,
  setShowNewListInput: (show) => set({ showNewListInput: show }),
  
  duplicatingListId: null,
  setDuplicatingListId: (listId) => set({ duplicatingListId: listId }),
  
  expandedListByColumn: { 0: null, 1: null, 2: null },
  toggleListExpanded: (listId, column) => set((state) => ({
    expandedListByColumn: {
      ...state.expandedListByColumn,
      [column]: state.expandedListByColumn[column] === listId ? null : listId
    }
  })),
  
  panelMode: 'both',
  setPanelMode: (mode) => set({ panelMode: mode }),
  
  theme: getValidTheme(),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
    }
    set({ theme })
  },
}))
```

### 1.3 Update `src/app/page.tsx`:

Remove backgroundTheme references. Simplify the useEffect:

```typescript
import { themes } from '@/lib/backgroundThemes'

// In component, get theme from store:
const { theme, setTheme, /* ... other state ... */ } = useUIStore()

// Single useEffect for theme:
useEffect(() => {
  const colors = themes[theme]
  document.documentElement.style.setProperty('--bg-primary', colors.bgPrimary)
  document.documentElement.style.setProperty('--bg-secondary', colors.bgSecondary)
  document.documentElement.style.setProperty('--bg-tertiary', colors.bgTertiary)
  document.documentElement.style.setProperty('--text-primary', colors.textPrimary)
  document.documentElement.style.setProperty('--text-secondary', colors.textSecondary)
  document.documentElement.style.setProperty('--border-color', colors.borderColor)
}, [theme])
```

Remove `backgroundTheme` and `setBackgroundTheme` from all props passed to Header.

### 1.4 Update `src/components/Layout/Header.tsx`:

Remove the background theme dropdown. Keep only the sun/moon toggle:

```typescript
'use client'

import { Theme } from '@/lib/backgroundThemes'

interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  theme: Theme
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  onThemeChange: (theme: Theme) => void
}

export function Header({ 
  currentView, 
  panelMode, 
  theme, 
  onViewChange, 
  onPanelModeChange, 
  onThemeChange 
}: HeaderProps) {
  return (
    <header className="h-14 px-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)]">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Timeboxxer</h1>
      
      <div className="flex items-center gap-3">
        {/* Panel Mode Controls - only show on main view */}
        {currentView === 'main' && (
          <div className="flex h-9 items-center bg-[var(--bg-secondary)] rounded-lg p-1">
            <button
              onClick={() => onPanelModeChange('lists-only')}
              className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
                panelMode === 'lists-only' 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Lists
            </button>
            <button
              onClick={() => onPanelModeChange('both')}
              className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
                panelMode === 'both' 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Both
            </button>
            <button
              onClick={() => onPanelModeChange('calendar-only')}
              className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
                panelMode === 'calendar-only' 
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Calendar
            </button>
          </div>
        )}
        
        {/* Theme Toggle - same height as other controls */}
        <button
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        
        {/* View Controls - same height */}
        <div className="flex h-9 items-center bg-[var(--bg-secondary)] rounded-lg p-1">
          <button
            onClick={() => onViewChange('main')}
            className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
              currentView === 'main'
                ? 'bg-blue-500 text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onViewChange('completed')}
            className={`h-7 px-3 rounded text-sm font-medium transition-colors ${
              currentView === 'completed'
                ? 'bg-blue-500 text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Completed
          </button>
        </div>
      </div>
    </header>
  )
}
```

**Files to modify:** `backgroundThemes.ts`, `useUIStore.ts`, `page.tsx`, `Header.tsx`

**Commit message:** `fix: 1 - Simplify to Light/Dark themes only, remove 5-theme system`

---

## Fix 2: Show All Time Labels Permanently

**Problem:** Only hour labels are visible. :15, :30, :45 only appear on hover. Too subtle.

**Solution:** Show ALL time labels ALL the time. No hover behavior.

### 2.1 Update `src/components/Calendar/TimeSlot.tsx`:

```typescript
'use client'

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
  isDropTarget: boolean
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
  isDropTarget,
  onDrop,
  onUnschedule,
  onComplete,
  onDragStart,
  onDurationChange,
}: TimeSlotProps) {
  // Format time: "7:00 AM", "7:15", "7:30", "7:45"
  const formatTime = (t: string) => {
    const [hour, minute] = t.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    
    if (isHour) {
      // Full format for hours: "7:00 AM"
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
    } else {
      // Short format for 15/30/45: just ":15", ":30", ":45"
      return `:${minute.toString().padStart(2, '0')}`
    }
  }

  // Border style based on time
  const getBorderStyle = () => {
    if (isHour) {
      return 'border-t-2 border-[var(--border-color)]'
    } else if (isHalfHour) {
      return 'border-t border-[var(--border-color)]'
    } else {
      return 'border-t border-[var(--border-color)] border-dashed'
    }
  }

  return (
    <div
      className={`h-12 flex items-stretch ${getBorderStyle()} ${
        isDropTarget ? 'bg-blue-500/30 ring-2 ring-blue-500 ring-inset' : ''
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Time label column - ALWAYS visible */}
      <div className="w-20 flex-shrink-0 flex items-start justify-end pr-3 pt-1">
        <span className={`
          ${isHour 
            ? 'text-sm font-bold text-[var(--text-primary)]' 
            : 'text-xs text-[var(--text-secondary)]'
          }
        `}>
          {formatTime(time)}
        </span>
      </div>
      
      {/* Slot area */}
      <div className="flex-1 relative">
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
          <div className="h-full w-full hover:bg-[var(--bg-tertiary)]/30 transition-colors" />
        )}
      </div>
    </div>
  )
}
```

### 2.2 Visual Result:

```
 7:00 AM  ══════════════════════════════  ← Bold, full time
    :15   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← Smaller, always visible
    :30   ──────────────────────────────  ← Smaller, always visible
    :45   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← Smaller, always visible
 8:00 AM  ══════════════════════════════  ← Bold, full time
    :15   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← Smaller, always visible
```

**Files to modify:** `TimeSlot.tsx`

**Commit message:** `fix: 2 - Show all time labels permanently, remove hover behavior`

---

## Fix 3: Drag Snap Based on Task Top Edge

**Problem:** When dragging tasks, the drop position is calculated based on mouse position or task center. Tasks don't land where expected.

**Solution:** Snap based on the task's TOP EDGE position, not mouse position.

### 3.1 Update `src/components/Calendar/DayView.tsx`:

The key insight: when dropping, find which slot the TOP EDGE of the dragged element is closest to.

```typescript
// Constants
const SLOT_HEIGHT = 48 // h-12 = 48px
const START_HOUR = 6

// In the drop handler, calculate based on element position, not mouse:
const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  
  if (!slotsContainerRef.current) return
  
  const rect = slotsContainerRef.current.getBoundingClientRect()
  const scrollTop = slotsContainerRef.current.scrollTop
  
  // Get the dragged element's bounding rect
  // The drop event gives us the mouse position, but we need to calculate
  // where the TOP of the task should snap to
  
  // Method: Use the mouse Y, but snap to the nearest slot boundary
  const mouseY = e.clientY - rect.top + scrollTop
  
  // Calculate which slot index this corresponds to
  // Round to nearest slot (not floor) for better snapping
  const slotIndex = Math.round(mouseY / SLOT_HEIGHT)
  
  // Clamp to valid range
  const clampedIndex = Math.max(0, Math.min(TIME_SLOTS.length - 1, slotIndex))
  
  const targetTime = TIME_SLOTS[clampedIndex]
  if (targetTime) {
    onDrop(targetTime)
  }
  
  setDragOverSlot(null)
}, [onDrop])

// Update drag over to show which slot will receive the drop
const handleDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault()
  
  if (!slotsContainerRef.current) return
  
  const rect = slotsContainerRef.current.getBoundingClientRect()
  const scrollTop = slotsContainerRef.current.scrollTop
  const mouseY = e.clientY - rect.top + scrollTop
  
  // Same calculation as drop - round to nearest slot
  const slotIndex = Math.round(mouseY / SLOT_HEIGHT)
  const clampedIndex = Math.max(0, Math.min(TIME_SLOTS.length - 1, slotIndex))
  
  setDragOverSlot(TIME_SLOTS[clampedIndex])
}, [])
```

### 3.2 Key change explanation:

**Before:** `Math.floor(mouseY / SLOT_HEIGHT)` — always snaps DOWN
**After:** `Math.round(mouseY / SLOT_HEIGHT)` — snaps to NEAREST slot boundary

This means:
- If you drag near the TOP of a slot → snaps to that slot
- If you drag near the BOTTOM of a slot → snaps to next slot

The visual feedback (blue highlight) shows exactly where it will land.

**Files to modify:** `DayView.tsx`

**Commit message:** `fix: 3 - Snap drag-drop to nearest slot boundary based on position`

---

## Fix 4: Header Controls Alignment

**Problem:** Header controls (segmented buttons, theme toggle, view buttons) have inconsistent heights and vertical alignment. Looks sloppy.

**Solution:** All controls should be exactly the same height (h-9 = 36px) and vertically centered.

### 4.1 Already addressed in Fix 1's Header.tsx update:

Key CSS patterns applied:
- All container elements: `h-9` (36px height)
- All inner buttons: `h-7` (28px height) 
- Containers use: `flex items-center`
- Consistent padding: `p-1` on containers, `px-3` on buttons
- Theme toggle: `h-9 w-9` (square, same height as other controls)

**Visual result:**

```
┌────────────────────────────────────────────────────────────────┐
│ Timeboxxer    [Lists][Both][Calendar]  [☀️]  [Today][Completed]│
│                      ↑                  ↑          ↑           │
│                   h-9 container      h-9 sq    h-9 container   │
│                   h-7 buttons                  h-7 buttons     │
└────────────────────────────────────────────────────────────────┘
```

All controls are 36px tall, inner buttons are 28px, everything aligns perfectly.

**Files to modify:** Already covered in Header.tsx from Fix 1

**Commit message:** (included in Fix 1 commit)

---

## Execution Order

1. **Fix 1** - Simplify themes + fix header alignment (combined)
2. **Fix 2** - Show all time labels
3. **Fix 3** - Fix drag snapping

---

## Verification After Each Fix

```bash
npm run build && find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0; exit 1}' && echo "✓ All checks pass"
```

## Test Each Fix

### Test Fix 1:
- Click sun/moon toggle
- Theme switches between light and dark
- All UI elements update colors correctly
- No dropdown, no 5 themes, just the toggle
- All header controls are same height and aligned

### Test Fix 2:
- Look at calendar time labels
- Every row shows a time: "7:00 AM", ":15", ":30", ":45", "8:00 AM", etc.
- No hovering required to see times
- Hours are bold, quarter-hours are smaller

### Test Fix 3:
- Drag a task from list to calendar
- Blue highlight shows target slot
- Drop lands exactly where highlighted
- Drag existing calendar task to new time
- Snaps cleanly to nearest 15-minute boundary
- Top edge of task aligns with slot line

---

## Final Commits Expected

```
fix: 3 - Snap drag-drop to nearest slot boundary based on position
fix: 2 - Show all time labels permanently, remove hover behavior
fix: 1 - Simplify to Light/Dark themes only, fix header alignment
```
