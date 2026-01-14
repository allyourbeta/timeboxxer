# FEATURES: Menu Fix + Calendar Create + Streaks

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**

---

## Overview

| Section | Feature |
|---------|---------|
| 1 | Fix overflow menu (not clipped, solid background) |
| 2 | Click-to-create tasks on calendar |
| 3 | Streaks counter in header |
| 4 | Weekly mini-visualization |

---

## SECTION 1: Fix Overflow Menu

The current menu gets clipped by the parent container and has a transparent background.

### 1.1 Update `src/components/Lists/ListCard.tsx`

**The fix:** Use a portal to render the menu outside the clipping container, or use `position: fixed` with calculated coordinates.

**Simpler approach:** Just fix the z-index and overflow issues, and add solid background.

Find the menu dropdown code and update it:

```tsx
{showMenu && (
  <div 
    className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-lg shadow-xl z-50 py-1"
    style={{
      // Prevent clipping - render above other content
      position: 'fixed',
      // We'll calculate position in the next step
    }}
  >
```

**Better approach with position calculation:**

Add a ref and state for menu position:

```tsx
const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
const buttonRef = useRef<HTMLButtonElement>(null)

const handleMenuToggle = (e: React.MouseEvent) => {
  e.stopPropagation()
  if (showMenu) {
    setShowMenu(false)
    setMenuPosition(null)
  } else {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // Position menu below button, aligned to right edge
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 176, // 176px = w-44 = 11rem
      })
    }
    setShowMenu(true)
  }
}
```

Update the button:

```tsx
<Button
  ref={buttonRef}
  variant="ghost"
  size="icon"
  onClick={handleMenuToggle}
  className="h-8 w-8 text-muted-foreground"
>
  <MoreVertical className="h-4 w-4" />
</Button>
```

Update the menu render:

```tsx
{showMenu && menuPosition && (
  <div 
    className="fixed w-44 bg-popover border border-border rounded-lg shadow-xl z-50 py-1"
    style={{
      top: menuPosition.top,
      left: menuPosition.left,
    }}
  >
    {!list.is_system && (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(false)
            onDuplicateList(list.id)
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(false)
            onDeleteList(list.id)
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-destructive hover:text-destructive-foreground text-destructive flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete List
        </button>
      </>
    )}
    {list.is_system && (
      <div className="px-3 py-2 text-sm text-muted-foreground italic">
        System list (cannot delete)
      </div>
    )}
  </div>
)}
```

**Also add click-outside handler if not present:**

```tsx
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowMenu(false)
      setMenuPosition(null)
    }
  }
  
  if (showMenu) {
    document.addEventListener('mousedown', handleClickOutside)
  }
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [showMenu])
```

Wrap the menu button and dropdown in a div with the ref:

```tsx
<div ref={menuRef}>
  <Button ref={buttonRef} ...>
  {showMenu && menuPosition && (
    ...
  )}
</div>
```

**Commit:**
```bash
git add -A && git commit -m "fix: Overflow menu uses fixed positioning, solid background"
```

---

## SECTION 2: Click-to-Create on Calendar

Allow clicking on empty time slots to create a task directly.

### 2.1 Update `src/components/Calendar/FullCalendarView.tsx`

**Add state for inline creation:**

```tsx
const [newTaskSlot, setNewTaskSlot] = useState<{
  time: string
  date: Date
} | null>(null)
const [newTaskTitle, setNewTaskTitle] = useState('')
```

**Add props for task creation:**

Update the interface:

```tsx
interface FullCalendarViewProps {
  tasks: Task[]
  scheduled: ScheduledTask[]
  paletteId: string
  onExternalDrop: (taskId: string, time: string) => void
  onEventMove: (taskId: string, time: string) => void
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
  onDurationChange: (taskId: string, newDuration: number) => void
  onCreateTask: (title: string, time: string) => void  // ADD THIS
}
```

Add to destructuring:

```tsx
export function FullCalendarView({
  // ... existing props
  onCreateTask,
}: FullCalendarViewProps) {
```

**Add dateClick handler:**

```tsx
const handleDateClick = useCallback((info: any) => {
  const clickedDate = info.date
  const hours = clickedDate.getHours().toString().padStart(2, '0')
  const minutes = clickedDate.getMinutes().toString().padStart(2, '0')
  const time = `${hours}:${minutes}`
  
  setNewTaskSlot({
    time,
    date: clickedDate,
  })
  setNewTaskTitle('')
}, [])

const handleCreateSubmit = () => {
  if (newTaskTitle.trim() && newTaskSlot) {
    onCreateTask(newTaskTitle.trim(), newTaskSlot.time)
    setNewTaskSlot(null)
    setNewTaskTitle('')
  }
}

const handleCreateKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleCreateSubmit()
  } else if (e.key === 'Escape') {
    setNewTaskSlot(null)
    setNewTaskTitle('')
  }
}
```

**Add dateClick to FullCalendar props:**

```tsx
<FullCalendar
  // ... existing props
  dateClick={handleDateClick}
  selectable={false}  // Disable drag-select, we just want click
/>
```

**Add inline input UI (render after FullCalendar):**

```tsx
{newTaskSlot && (
  <div 
    className="fixed z-50 bg-popover border rounded-lg shadow-xl p-3"
    style={{
      // Position near the click - we'll refine this
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }}
  >
    <div className="text-sm text-muted-foreground mb-2">
      New task at {newTaskSlot.time}
    </div>
    <input
      type="text"
      value={newTaskTitle}
      onChange={(e) => setNewTaskTitle(e.target.value)}
      onKeyDown={handleCreateKeyDown}
      placeholder="Task name..."
      className="w-64 px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      autoFocus
    />
    <div className="flex justify-end gap-2 mt-3">
      <button
        onClick={() => setNewTaskSlot(null)}
        className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
      <button
        onClick={handleCreateSubmit}
        className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Create
      </button>
    </div>
  </div>
)}
```

### 2.2 Add API function for creating task without list

Update `src/api/tasks.ts`:

```tsx
export async function createCalendarTask(title: string, startTime: string, date: string) {
  const supabase = getSupabase()
  
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      user_id: DEV_USER_ID,
      list_id: null,  // No list - created directly on calendar
      title,
      duration_minutes: 30,  // Default duration
      color_index: Math.floor(Math.random() * 12),  // Random color
      energy_level: 'medium',
      position: 0,
    })
    .select()
    .single()
  
  if (taskError) throw taskError
  
  // Also schedule it
  const { error: scheduleError } = await supabase
    .from('scheduled_tasks')
    .insert({
      user_id: DEV_USER_ID,
      task_id: task.id,
      scheduled_date: date,
      start_time: startTime + ':00',
    })
  
  if (scheduleError) throw scheduleError
  
  return task
}
```

### 2.3 Update `src/api/index.ts`

Add export:

```tsx
export { ..., createCalendarTask } from './tasks'
```

### 2.4 Update `src/state/useTaskStore.ts`

Add import and action:

```tsx
import { ..., createCalendarTask as apiCreateCalendarTask } from '@/api'

// In interface:
createCalendarTask: (title: string, time: string, date: string) => Promise<void>

// In store:
createCalendarTask: async (title, time, date) => {
  const newTask = await apiCreateCalendarTask(title, time, date)
  set({ tasks: [...get().tasks, newTask] })
},
```

### 2.5 Update `src/app/page.tsx`

Add handler:

```tsx
const { ..., createCalendarTask } = useTaskStore()

const handleCreateCalendarTask = async (title: string, time: string) => {
  const today = new Date().toISOString().split('T')[0]
  await createCalendarTask(title, time, today)
  // Reload schedule to show the new event
  await loadSchedule()
}
```

Pass to FullCalendarView:

```tsx
<FullCalendarView
  // ... existing props
  onCreateTask={handleCreateCalendarTask}
/>
```

**Commit:**
```bash
git add -A && git commit -m "feat: Click-to-create tasks directly on calendar"
```

---

## SECTION 3: Streaks Counter in Header

Show "✓ X today" in the header.

### 3.1 Update `src/components/Layout/Header.tsx`

**Add prop for completed count:**

```tsx
interface HeaderProps {
  // ... existing props
  completedToday: number
}
```

Add to destructuring:

```tsx
export function Header({ 
  // ... existing props
  completedToday,
}: HeaderProps) {
```

**Add counter display (near the left side, after the title):**

```tsx
{/* Streak counter */}
{completedToday > 0 && (
  <div className="flex items-center gap-1 text-sm text-emerald-500 font-medium">
    <span>✓</span>
    <span>{completedToday} today</span>
  </div>
)}
```

### 3.2 Update `src/app/page.tsx`

Calculate completed today:

```tsx
const completedToday = tasks.filter(t => {
  if (!t.is_completed || !t.completed_at) return false
  const completedDate = new Date(t.completed_at).toDateString()
  const today = new Date().toDateString()
  return completedDate === today
}).length
```

Pass to Header:

```tsx
<Header 
  // ... existing props
  completedToday={completedToday}
/>
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add completed today counter to header"
```

---

## SECTION 4: Weekly Mini-Visualization

Show last 7 days as small bars/dots.

### 4.1 Create `src/components/Layout/WeekStreak.tsx`

```tsx
'use client'

interface WeekStreakProps {
  // Array of completion counts for last 7 days, oldest first
  // e.g., [2, 5, 0, 3, 8, 4, 6]
  weekData: number[]
}

export function WeekStreak({ weekData }: WeekStreakProps) {
  const maxCount = Math.max(...weekData, 1) // Avoid divide by zero
  
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const today = new Date().getDay()
  // Reorder days to end with today
  const dayLabels = [...days.slice(today), ...days.slice(0, today)]
  
  return (
    <div className="flex items-end gap-1 h-6">
      {weekData.map((count, i) => {
        const height = count === 0 ? 4 : Math.max(8, (count / maxCount) * 24)
        const isToday = i === 6
        
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className={`w-2 rounded-sm transition-all ${
                isToday 
                  ? 'bg-emerald-500' 
                  : count > 0 
                    ? 'bg-emerald-500/50' 
                    : 'bg-muted'
              }`}
              style={{ height: `${height}px` }}
              title={`${count} tasks`}
            />
          </div>
        )
      })}
    </div>
  )
}
```

### 4.2 Update `src/components/Layout/index.ts`

Add export:

```tsx
export { Header } from './Header'
export { CompletedView } from './CompletedView'
export { WeekStreak } from './WeekStreak'
```

### 4.3 Update `src/components/Layout/Header.tsx`

**Add import:**

```tsx
import { WeekStreak } from './WeekStreak'
```

**Add prop:**

```tsx
interface HeaderProps {
  // ... existing props
  completedToday: number
  weekData: number[]  // ADD THIS
}
```

Add to destructuring:

```tsx
export function Header({ 
  // ... existing props
  completedToday,
  weekData,
}: HeaderProps) {
```

**Add WeekStreak next to the counter:**

```tsx
{/* Streak section */}
<div className="flex items-center gap-3">
  <WeekStreak weekData={weekData} />
  {completedToday > 0 && (
    <div className="flex items-center gap-1 text-sm text-emerald-500 font-medium">
      <span>✓</span>
      <span>{completedToday}</span>
    </div>
  )}
</div>
```

### 4.4 Update `src/app/page.tsx`

Calculate week data:

```tsx
// Calculate completions for last 7 days
const getWeekData = (): number[] => {
  const result: number[] = []
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toDateString()
    
    const count = tasks.filter(t => {
      if (!t.is_completed || !t.completed_at) return false
      const completedDate = new Date(t.completed_at).toDateString()
      return completedDate === dateStr
    }).length
    
    result.push(count)
  }
  
  return result
}

const weekData = getWeekData()
```

Pass to Header:

```tsx
<Header 
  // ... existing props
  completedToday={completedToday}
  weekData={weekData}
/>
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add weekly streak visualization to header"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ Overflow menu (⋮) appears fully visible, not clipped
2. ✅ Menu has solid background, easy to read
3. ✅ Delete option works from menu
4. ✅ System lists show "System list" message in menu
5. ✅ Clicking empty calendar slot opens inline input
6. ✅ Typing and pressing Enter creates task at that time
7. ✅ Created task appears on calendar immediately
8. ✅ "✓ X today" counter shows in header
9. ✅ Counter updates when completing tasks
10. ✅ Weekly bars show last 7 days
11. ✅ Today's bar is brighter/highlighted

---

## Summary

| File | Changes |
|------|---------|
| `src/components/Lists/ListCard.tsx` | Fixed menu positioning |
| `src/components/Calendar/FullCalendarView.tsx` | Click-to-create UI |
| `src/api/tasks.ts` | createCalendarTask function |
| `src/api/index.ts` | Export new function |
| `src/state/useTaskStore.ts` | createCalendarTask action |
| `src/components/Layout/WeekStreak.tsx` | NEW - Weekly visualization |
| `src/components/Layout/Header.tsx` | Counter + WeekStreak |
| `src/components/Layout/index.ts` | Export WeekStreak |
| `src/app/page.tsx` | Calculate stats, pass to components |
