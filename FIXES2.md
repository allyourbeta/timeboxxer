# FIXES ROUND 2 - Bugs and UX Improvements

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

## Bug 1: duplicate_list RPC Function Missing (CRITICAL)

**Error:** `Failed to load resource: the server responded with a status of 400` when duplicating a list.

**Root Cause:** The API calls `supabase.rpc('duplicate_list', ...)` but this PostgreSQL function was never created in the database.

**Fix Option A (Recommended):** Remove RPC, implement in JavaScript

### 1.1 Update `src/api/lists.ts` - Replace `duplicateList` function:

```typescript
export async function duplicateList(listId: string, newName: string) {
  const supabase = getSupabase()
  
  // 1. Get the original list
  const { data: originalList, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single()
  
  if (listError) throw listError
  
  // 2. Get max position for new list
  const { data: existing } = await supabase
    .from('lists')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  // 3. Create the new list
  const { data: newList, error: createError } = await supabase
    .from('lists')
    .insert({
      user_id: DEV_USER_ID,
      name: newName,
      position: nextPosition,
      is_inbox: false, // Duplicated lists are never inbox
    })
    .select()
    .single()
  
  if (createError) throw createError
  
  // 4. Get all tasks from original list
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('list_id', listId)
  
  if (tasksError) throw tasksError
  
  // 5. Duplicate tasks to new list (if any exist)
  if (tasks && tasks.length > 0) {
    const newTasks = tasks.map((task, index) => ({
      user_id: DEV_USER_ID,
      list_id: newList.id,
      title: task.title,
      duration_minutes: task.duration_minutes,
      color_index: task.color_index,
      notes: task.notes,
      position: index,
      is_completed: false, // Reset completion status
    }))
    
    const { error: insertError } = await supabase
      .from('tasks')
      .insert(newTasks)
    
    if (insertError) throw insertError
  }
  
  return newList.id
}
```

**Files to modify:** `src/api/lists.ts`

**Commit message:** `fix: Bug 1 - Implement duplicateList without RPC function`

---

## Bug 2: Background Themes Not Applied

**Current:** Selecting a theme in the dropdown does nothing visually.

**Root Cause:** The theme CSS variables are defined in globals.css but the components still use hardcoded Tailwind classes like `bg-gray-900`, `bg-gray-800`, etc. instead of the CSS variables.

**Fix:** Apply background theme dynamically via inline styles or CSS variables.

### 2.1 Update `src/app/page.tsx`:

Add effect to apply background theme:

```typescript
import { backgroundThemes } from '@/lib/backgroundThemes'

// Inside the component, after getting backgroundTheme from store:
useEffect(() => {
  const theme = backgroundThemes[backgroundTheme]
  document.documentElement.style.setProperty('--bg-primary', theme.bgPrimary)
  document.documentElement.style.setProperty('--bg-secondary', theme.bgSecondary)
  document.documentElement.style.setProperty('--bg-tertiary', theme.bgTertiary)
}, [backgroundTheme])
```

### 2.2 Update `src/lib/backgroundThemes.ts`:

Add text colors for light vs dark backgrounds:

```typescript
export const backgroundThemes = {
  midnight: {
    name: 'Midnight',
    bgPrimary: '#111827',
    bgSecondary: '#1f2937',
    bgTertiary: '#374151',
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af',
    borderColor: '#374151',
    isLight: false,
  },
  slate: {
    name: 'Slate',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    borderColor: '#334155',
    isLight: false,
  },
  ocean: {
    name: 'Ocean',
    bgPrimary: '#0c1929',
    bgSecondary: '#152238',
    bgTertiary: '#1e3a5f',
    textPrimary: '#ffffff',
    textSecondary: '#7dd3fc',
    borderColor: '#1e3a5f',
    isLight: false,
  },
  paper: {
    name: 'Paper',
    bgPrimary: '#faf7f2',
    bgSecondary: '#f0ebe3',
    bgTertiary: '#e6e0d4',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    borderColor: '#d1d5db',
    isLight: true,
  },
  snow: {
    name: 'Snow',
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgTertiary: '#f1f5f9',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    borderColor: '#e5e7eb',
    isLight: true,
  },
} as const

export type BackgroundTheme = keyof typeof backgroundThemes
```

### 2.3 Update `src/app/globals.css`:

Replace hardcoded component colors with CSS variables:

```css
@import "tailwindcss";

:root {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;
  --border-color: #374151;
}

/* Utility classes that use CSS variables */
.bg-theme-primary { background-color: var(--bg-primary); }
.bg-theme-secondary { background-color: var(--bg-secondary); }
.bg-theme-tertiary { background-color: var(--bg-tertiary); }
.text-theme-primary { color: var(--text-primary); }
.text-theme-secondary { color: var(--text-secondary); }
.border-theme { border-color: var(--border-color); }
```

### 2.4 Update all components to use theme classes:

Replace throughout:
- `bg-gray-900` → `bg-theme-primary`
- `bg-gray-800` → `bg-theme-secondary`
- `bg-gray-700` → `bg-theme-tertiary`
- `text-white` → `text-theme-primary`
- `text-gray-400` → `text-theme-secondary`
- `border-gray-700` → `border-theme`

**Files to modify:** `page.tsx`, `globals.css`, `backgroundThemes.ts`, `Header.tsx`, `ListCard.tsx`, `ListPanel.tsx`, `TaskCard.tsx`, `DayView.tsx`, `TimeSlot.tsx`, `CompletedView.tsx`

**Commit message:** `fix: Bug 2 - Connect background themes to actual UI colors`

---

## Bug 3: Calendar Time Clarity

**Current:** Hard to tell what time a slot represents when clicking/hovering.

**Fix:** Add hover state that shows the exact time, and make time labels more prominent.

### 3.1 Update `src/components/Calendar/TimeSlot.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { ScheduledTaskBlock } from './ScheduledTaskBlock'

interface TimeSlotProps {
  time: string
  isHour: boolean
  isHalfHour: boolean
  scheduledTask: /* ... existing ... */ | null
  taskHeight: number
  paletteId: string
  onDrop: () => void
  onUnschedule: () => void
  onComplete: () => void
  onDragStart: () => void
  onDurationChange: (newDuration: number) => void
}

export function TimeSlot({ time, isHour, isHalfHour, /* ... */ }: TimeSlotProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Format time for display: "9:00 AM" format
  const formatTime = (t: string) => {
    const [hour, minute] = t.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }
  
  return (
    <div
      className={`h-12 flex items-stretch ${
        isHour ? 'border-t-2 border-theme' : isHalfHour ? 'border-t border-theme/50' : 'border-t border-theme/20'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Time label column */}
      <div className="w-20 flex items-start justify-end pr-3 pt-1 relative">
        {isHour && (
          <span className="text-sm font-semibold text-theme-primary">
            {formatTime(time)}
          </span>
        )}
        {isHalfHour && !isHour && (
          <span className="text-xs text-theme-secondary">
            {formatTime(time)}
          </span>
        )}
        
        {/* Hover tooltip showing exact time */}
        {isHovered && !isHour && !isHalfHour && (
          <span className="absolute right-3 top-1 text-xs bg-blue-500 text-white px-2 py-0.5 rounded shadow-lg z-20">
            {formatTime(time)}
          </span>
        )}
      </div>
      
      {/* Slot area */}
      <div className="flex-1 relative">
        {scheduledTask ? (
          <ScheduledTaskBlock /* ... existing props ... */ />
        ) : (
          <div 
            className={`h-full w-full transition-colors ${
              isHovered ? 'bg-blue-500/20' : 'hover:bg-theme-tertiary/30'
            }`}
          />
        )}
      </div>
    </div>
  )
}
```

**Key changes:**
- Wider time label column (w-20)
- 12-hour format with AM/PM
- Hour marks: bold, larger
- Half-hour marks: smaller, lighter
- Hover on any slot: shows blue tooltip with exact time
- Hover highlight on empty slots

**Files to modify:** `TimeSlot.tsx`

**Commit message:** `fix: Bug 3 - Improve calendar time clarity with better labels and hover tooltips`

---

## Feature 1: Allow Overlapping Tasks (Up to 3)

**Current:** Only one task can occupy a time slot.

**Desired:** Up to 3 tasks can overlap at the same time (e.g., laundry running while doing errands).

### Implementation:

### 1.1 Update `src/components/Calendar/DayView.tsx`:

Change from finding one task to finding multiple:

```typescript
const getScheduledTasksAtTime = (time: string): ScheduledTaskInfo[] => {
  const matches = scheduled.filter(s => {
    const taskStartTime = s.start_time.substring(0, 5) // "HH:MM"
    const task = tasks.find(t => t.id === s.task_id)
    if (!task) return false
    
    // Check if this time slot falls within the task's duration
    const [taskHour, taskMin] = taskStartTime.split(':').map(Number)
    const [slotHour, slotMin] = time.split(':').map(Number)
    
    const taskStartMinutes = taskHour * 60 + taskMin
    const taskEndMinutes = taskStartMinutes + task.duration_minutes
    const slotMinutes = slotHour * 60 + slotMin
    
    return slotMinutes >= taskStartMinutes && slotMinutes < taskEndMinutes
  })
  
  return matches.slice(0, 3).map(schedule => {
    const task = tasks.find(t => t.id === schedule.task_id)!
    const isStart = schedule.start_time.startsWith(time)
    return {
      taskId: task.id,
      title: task.title,
      durationMinutes: task.duration_minutes,
      colorIndex: task.color_index,
      isStart, // Only render full block if this is the start time
    }
  })
}
```

### 1.2 Update `TimeSlot.tsx` to render multiple tasks:

```typescript
interface ScheduledTaskInfo {
  taskId: string
  title: string
  durationMinutes: number
  colorIndex: number
  isStart: boolean
}

interface TimeSlotProps {
  // ... existing ...
  scheduledTasks: ScheduledTaskInfo[] // Changed from scheduledTask
}

// In render:
<div className="flex-1 relative flex gap-1">
  {scheduledTasks.map((task, index) => (
    task.isStart && (
      <div 
        key={task.taskId} 
        className="flex-1"
        style={{ maxWidth: `${100 / Math.min(scheduledTasks.length, 3)}%` }}
      >
        <ScheduledTaskBlock
          title={task.title}
          durationMinutes={task.durationMinutes}
          colorIndex={task.colorIndex}
          /* ... other props ... */
        />
      </div>
    )
  ))}
  {scheduledTasks.length === 0 && (
    <div className="h-full w-full hover:bg-theme-tertiary/30" />
  )}
</div>
```

### 1.3 Visual layout for overlapping:
- 1 task: full width
- 2 tasks: 50% each, side by side
- 3 tasks: 33% each, side by side

**Files to modify:** `DayView.tsx`, `TimeSlot.tsx`

**Commit message:** `feat: Allow up to 3 overlapping tasks on calendar`

---

## Feature 2: Modern List Card Design

**Current:** Flat boxes with small arrows, very plain.

**Desired:** More modern, polished look with subtle depth and better visual hierarchy.

### Implementation:

### 2.1 Update `src/components/Lists/ListCard.tsx` styling:

**Collapsed state:**
```tsx
<div className={`
  rounded-xl overflow-hidden transition-all duration-200
  ${isExpanded 
    ? 'bg-theme-secondary shadow-lg ring-1 ring-white/10' 
    : 'bg-theme-secondary/50 hover:bg-theme-secondary hover:shadow-md'
  }
`}>
  {/* Header - always visible */}
  <button
    onClick={onToggleExpand}
    className="w-full p-4 flex items-center justify-between group"
  >
    <div className="flex items-center gap-3">
      {/* Colored accent bar */}
      <div 
        className="w-1 h-8 rounded-full"
        style={{ backgroundColor: getFirstTaskColor() || '#6366f1' }}
      />
      <div className="text-left">
        <h3 className="font-semibold text-theme-primary">{name}</h3>
        <p className="text-sm text-theme-secondary">{tasks.length} tasks</p>
      </div>
    </div>
    
    {/* Expand/collapse icon - animated */}
    <div className={`
      w-8 h-8 rounded-full bg-theme-tertiary/50 
      flex items-center justify-center
      transition-transform duration-200
      ${isExpanded ? 'rotate-180' : ''}
    `}>
      <svg className="w-4 h-4 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </button>
  
  {/* Expanded content with animation */}
  {isExpanded && (
    <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2 duration-200">
      {tasks.map(task => (
        <TaskCard key={task.id} /* ... */ />
      ))}
      <AddTaskInput onAdd={onTaskAdd} />
    </div>
  )}
</div>
```

### 2.2 Add subtle animations in `globals.css`:

```css
@keyframes slide-in-from-top {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: slide-in-from-top 0.2s ease-out;
}
```

### 2.3 Design improvements:
- Rounded corners (`rounded-xl`)
- Subtle shadow on expanded (`shadow-lg`)
- Ring/border effect (`ring-1 ring-white/10`)
- Colored accent bar on left (uses first task's color or default indigo)
- Animated chevron rotation
- Slide-in animation for content
- Hover states with subtle lift effect

**Files to modify:** `ListCard.tsx`, `globals.css`

**Commit message:** `feat: Modern list card design with animations and visual polish`

---

## Execution Order

1. **Bug 1** - duplicateList fix (CRITICAL - app is broken)
2. **Bug 2** - Background themes not working
3. **Bug 3** - Calendar time clarity
4. **Feature 1** - Overlapping tasks
5. **Feature 2** - Modern list design

---

## Verification After Each Fix

```bash
npm run build && find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0; exit 1}' && echo "✓ All checks pass"
```

## Final Commits Expected

```
feat: Modern list card design with animations and visual polish
feat: Allow up to 3 overlapping tasks on calendar
fix: Bug 3 - Improve calendar time clarity with better labels and hover tooltips
fix: Bug 2 - Connect background themes to actual UI colors
fix: Bug 1 - Implement duplicateList without RPC function
```
