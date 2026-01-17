# SPEC: Medium Priority Refactoring

**Prerequisites:** Complete Priority 1 fixes from ARCHITECTURE-REVIEW.md first.

---

## Overview

This spec addresses technical debt that won't cause bugs but makes the code harder to maintain. Each section is independent - you can do them in any order or across multiple sessions.

---

## SECTION 1: Consolidate Constants

### Goal
Move all magic numbers to a central constants file.

### Changes

#### File: `src/lib/constants.ts`

Replace the entire file with:

```typescript
// =============================================================================
// Application Constants
// =============================================================================

// Task Defaults
export const DEFAULT_TASK_DURATION = 15  // minutes
export const DEFAULT_CALENDAR_TASK_DURATION = 30  // minutes

// Color System
export const COLOR_COUNT = 12
export const getRandomColorIndex = () => Math.floor(Math.random() * COLOR_COUNT)

// Time Periods
export const PURGATORY_EXPIRY_DAYS = 7
export const WEEK_DAYS = 7

// UI Timing
export const TOAST_DURATION_MS = 5000
export const UNDO_TIMEOUT_MS = 5000

// Limits
export const MAX_HIGHLIGHTS_PER_DAY = 5

// Duration Options (also exported from types/app.ts for type safety)
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const
```

#### File: `src/api/tasks.ts`

Update imports:
```typescript
import { DEFAULT_TASK_DURATION, DEFAULT_CALENDAR_TASK_DURATION, getRandomColorIndex, PURGATORY_EXPIRY_DAYS } from '@/lib/constants'
```

Replace:
- Line 58: `duration_minutes: 15` → `duration_minutes: DEFAULT_TASK_DURATION`
- Line 266: `duration_minutes: 15` → `duration_minutes: DEFAULT_TASK_DURATION`
- Line 267: `Math.floor(Math.random() * 8)` → `getRandomColorIndex()`
- Line 291: `duration_minutes: 30` → `duration_minutes: DEFAULT_CALENDAR_TASK_DURATION`
- Line 292: `Math.floor(Math.random() * 12)` → `getRandomColorIndex()`
- Line 343: `- 7` → `- PURGATORY_EXPIRY_DAYS`

#### File: `src/hooks/useAppHandlers.ts`

Update imports:
```typescript
import { DURATION_OPTIONS } from '@/lib/constants'
```

Replace line 70:
```typescript
// Before
const durations = [15, 30, 45, 60, 90, 120]

// After
const durations = [...DURATION_OPTIONS]
```

#### File: `src/app/page.tsx`

Update imports:
```typescript
import { TOAST_DURATION_MS } from '@/lib/constants'
```

Replace line 332:
```typescript
// Before
duration={5000}

// After
duration={TOAST_DURATION_MS}
```

#### File: `src/components/Lists/ListCard.tsx`

Update the expiry notice text (line 238):
```typescript
import { PURGATORY_EXPIRY_DAYS } from '@/lib/constants'

// In the JSX:
<p className="text-xs text-slate-600 dark:text-slate-300">
  ⏳ Tasks expire after {PURGATORY_EXPIRY_DAYS} days.
</p>
```

### Verification
```bash
npm run build
```

---

## SECTION 2: Use Date Utilities Consistently

### Goal
All date formatting should use `src/lib/dateList.ts` utilities instead of inline formatting.

### Changes

#### File: `src/app/page.tsx`

Update imports:
```typescript
import { getTodayListName } from '@/lib/dateList'
```

Replace lines 130-134:
```typescript
// Before
const todayListName = new Date().toLocaleDateString('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

// After
const todayListName = getTodayListName()
```

#### File: `src/hooks/useAppHandlers.ts`

Update imports:
```typescript
import { getTomorrowListName } from '@/lib/dateList'
```

Replace lines 263-270:
```typescript
// Before
const tomorrowList = lists.find(l => {
  if (l.system_type !== 'date') return false
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowName = tomorrow.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return l.name === tomorrowName
})

// After
const tomorrowList = lists.find(l => 
  l.system_type === 'date' && l.name === getTomorrowListName()
)
```

### Verification
```bash
npm run build
```

---

## SECTION 3: Extract Auth Hook from page.tsx

### Goal
Move auth state management out of page.tsx into a reusable hook.

### New File: `src/hooks/useAuth.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

interface UseAuthReturn {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createClient()
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])
  
  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { user, loading, signOut }
}
```

### Update: `src/hooks/index.ts`

```typescript
export { useAppHandlers } from './useAppHandlers'
export { useAuth } from './useAuth'
```

### Update: `src/app/page.tsx`

Replace lines 1-40:
```typescript
'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks'  // Add this
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
// ... rest of imports

export default function Home() {
  // Replace the useState + useEffect auth logic with:
  const { user, loading: authLoading } = useAuth()
  
  // ... rest of component (remove the auth useState and useEffect)
```

Remove lines 19-40 (the old auth state and effect).

### Verification
```bash
npm run build
```

---

## SECTION 4: Split useAppHandlers (Optional - Larger Effort)

### Goal
Break the 333-line handler hook into domain-specific hooks.

### New Files

#### `src/hooks/useTaskHandlers.ts`
```typescript
'use client'

import { useState } from 'react'
import { useTaskStore, useListStore } from '@/state'
import { DURATION_OPTIONS } from '@/lib/constants'

export function useTaskHandlers() {
  const { tasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask } = useTaskStore()
  const { lists } = useListStore()
  
  const [discardConfirm, setDiscardConfirm] = useState<{
    taskId: string
    taskTitle: string
  } | null>(null)

  const handleTaskAdd = async (listId: string, title: string) => {
    await createTask(listId, title)
  }

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask(taskId)
  }

  const handleTaskDiscardClick = (taskId: string, taskTitle: string) => {
    setDiscardConfirm({ taskId, taskTitle })
  }

  const handleTaskDiscardConfirm = async () => {
    if (!discardConfirm) return
    await deleteTask(discardConfirm.taskId)
    setDiscardConfirm(null)
  }

  const handleTaskDiscardCancel = () => {
    setDiscardConfirm(null)
  }

  const handleTaskDurationClick = async (taskId: string, currentDuration: number, reverse: boolean) => {
    const durations = [...DURATION_OPTIONS]
    const currentIndex = durations.indexOf(currentDuration)
    let newIndex: number
    
    if (reverse) {
      newIndex = currentIndex <= 0 ? durations.length - 1 : currentIndex - 1
    } else {
      newIndex = currentIndex >= durations.length - 1 ? 0 : currentIndex + 1
    }
    
    await updateTask(taskId, { duration_minutes: durations[newIndex] })
  }

  const handleTaskComplete = async (taskId: string) => {
    await completeTask(taskId)
  }

  const handleTaskUncomplete = async (taskId: string) => {
    await uncompleteTask(taskId)
  }

  const handleTaskDailyToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      await updateTask(taskId, { is_daily: !task.is_daily })
    }
  }

  const handleTaskEnergyChange = async (taskId: string, level: 'high' | 'medium' | 'low') => {
    await updateTask(taskId, { energy_level: level })
  }

  const handleTaskHighlightToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    const taskList = lists.find(l => l.id === task.list_id)
    if (!taskList || taskList.system_type !== 'date') {
      console.warn('Highlights only available for date lists')
      return
    }
    
    if (task.is_daily_highlight) {
      await updateTask(taskId, { is_daily_highlight: false })
    } else {
      const highlightsInList = tasks.filter(t => 
        t.list_id === task.list_id && t.is_daily_highlight
      ).length
      
      if (highlightsInList >= 5) {
        alert('Maximum 5 highlights per day. Remove one first.')
        return
      }
      
      await updateTask(taskId, { is_daily_highlight: true })
    }
  }

  return {
    discardConfirm,
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDurationClick,
    handleTaskComplete,
    handleTaskUncomplete,
    handleTaskDailyToggle,
    handleTaskEnergyChange,
    handleTaskHighlightToggle,
    handleTaskDiscardClick,
    handleTaskDiscardConfirm,
    handleTaskDiscardCancel,
  }
}
```

#### `src/hooks/useListHandlers.ts`
```typescript
'use client'

import { useState } from 'react'
import { useTaskStore, useListStore, useUIStore } from '@/state'
import { rollOverTasks } from '@/api'
import { getTomorrowListName } from '@/lib/dateList'

interface PendingDelete {
  listId: string
  listName: string
  originalTasks: Array<{ id: string; originalListId: string }>
  timeoutId: NodeJS.Timeout
}

export function useListHandlers() {
  const { updateTask } = useTaskStore()
  const { lists, createList, deleteList, duplicateList, updateList } = useListStore()
  const { setEditingListId, setDuplicatingListId, setShowNewListInput } = useUIStore()
  
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  const handleListCreate = async (name: string) => {
    await createList(name)
    setShowNewListInput(false)
  }

  const handleListEdit = async (listId: string, newName: string) => {
    await updateList(listId, newName)
    setEditingListId(null)
  }

  const handleListDuplicate = async (listId: string, newName: string) => {
    await duplicateList(listId, newName)
    setDuplicatingListId(null)
  }

  const handleDeleteListClick = async (listId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    
    if (list.system_type === 'purgatory' || list.system_type === 'parked') return
    
    if (list.system_type === 'date') {
      const listDate = new Date(list.name)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      listDate.setHours(0, 0, 0, 0)
      if (listDate >= today) return
    }
    
    await deleteList(listId)
  }

  const handleUndoDelete = async () => {
    if (!pendingDelete) return
    
    clearTimeout(pendingDelete.timeoutId)
    
    for (const task of pendingDelete.originalTasks) {
      await updateTask(task.id, { list_id: task.originalListId })
    }
    
    setPendingDelete(null)
  }

  const handleRollOverTasks = async (fromListId: string) => {
    const tomorrowList = lists.find(l => 
      l.system_type === 'date' && l.name === getTomorrowListName()
    )
    
    if (!tomorrowList) {
      console.error('Tomorrow list not found')
      return
    }
    
    const count = await rollOverTasks(fromListId, tomorrowList.id)
    
    if (count > 0) {
      const { loadTasks } = useTaskStore.getState()
      await loadTasks()
    }
  }

  return {
    pendingDelete,
    setPendingDelete,
    handleListCreate,
    handleListEdit,
    handleListDuplicate,
    handleDeleteListClick,
    handleUndoDelete,
    handleRollOverTasks,
  }
}
```

#### `src/hooks/useScheduleHandlers.ts`
```typescript
'use client'

import { useTaskStore, useListStore, useScheduleStore } from '@/state'

export function useScheduleHandlers() {
  const { tasks, moveToPurgatory, moveFromPurgatory, createCalendarTask, reorderTasks } = useTaskStore()
  const { lists } = useListStore()
  const { scheduled, scheduleTask, unscheduleTask } = useScheduleStore()

  const handleExternalDrop = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const today = new Date().toISOString().split('T')[0]
    
    const purgatoryList = lists.find(l => l.system_type === 'purgatory')
    if (task.list_id !== purgatoryList?.id) {
      const originalList = lists.find(l => l.id === task.list_id)
      const originalListName = originalList ? originalList.name : 'Unknown'
      const originalListId = task.list_id || ''
      await moveToPurgatory(taskId, originalListId, originalListName)
    }
    
    await scheduleTask(taskId, today, time)
  }

  const handleEventMove = async (taskId: string, newTime: string) => {
    const existingSchedule = scheduled.find(s => s.task_id === taskId)
    if (existingSchedule) {
      await unscheduleTask(taskId)
      await scheduleTask(taskId, existingSchedule.scheduled_date, newTime)
    }
  }

  const handleUnschedule = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task && task.original_list_id) {
      const originalList = lists.find(l => l.id === task.original_list_id)
      if (originalList) {
        await moveFromPurgatory(taskId, task.original_list_id)
      } else {
        const parkedList = lists.find(l => l.system_type === 'parked')
        if (parkedList) {
          await moveFromPurgatory(taskId, parkedList.id)
        }
      }
    }
    await unscheduleTask(taskId)
  }

  const handleCreateCalendarTask = async (title: string, time: string) => {
    const today = new Date().toISOString().split('T')[0]
    await createCalendarTask(title, time, today)
  }

  const handleReorderTasks = async (taskIds: string[]) => {
    await reorderTasks(taskIds)
  }

  return {
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    handleReorderTasks,
  }
}
```

#### `src/hooks/useFocusHandlers.ts`
```typescript
'use client'

import { useState } from 'react'
import { useTaskStore } from '@/state'

export function useFocusHandlers() {
  const { completeTask, createParkedThought } = useTaskStore()
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)

  const handleStartFocus = (taskId: string) => {
    setFocusTaskId(taskId)
  }

  const handleExitFocus = () => {
    setFocusTaskId(null)
  }

  const handleFocusComplete = async (taskId: string) => {
    await completeTask(taskId)
    setFocusTaskId(null)
  }

  const handleParkThought = async (title: string) => {
    await createParkedThought(title)
  }

  return {
    focusTaskId,
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
    handleParkThought,
  }
}
```

### Update: `src/hooks/index.ts`
```typescript
export { useAppHandlers } from './useAppHandlers'  // Keep for backward compatibility
export { useAuth } from './useAuth'
export { useTaskHandlers } from './useTaskHandlers'
export { useListHandlers } from './useListHandlers'
export { useScheduleHandlers } from './useScheduleHandlers'
export { useFocusHandlers } from './useFocusHandlers'
```

### Update page.tsx to use new hooks (optional)
This is a larger change - you can either:
1. Keep using `useAppHandlers` (it still works)
2. Gradually migrate to the new hooks

### Verification
```bash
npm run build
```

---

## Execution Order

1. **Section 1** (Constants) - 15 minutes
2. **Section 2** (Date Utilities) - 10 minutes  
3. **Section 3** (Auth Hook) - 20 minutes
4. **Section 4** (Split Handlers) - 45 minutes (optional)

Total: ~45-90 minutes depending on whether you do Section 4.

---

## Prompt for Claude Code

### For Sections 1-3:
```
Read SPEC-MEDIUM-REFACTORING.md and implement Sections 1, 2, and 3 in order.

After each section, run npm run build to verify.

Do not proceed to the next section if build fails.
```

### For Section 4 (if desired):
```
Read SPEC-MEDIUM-REFACTORING.md Section 4 and implement the handler splitting.

Create the 4 new hook files, update the index, and verify with npm run build.

Do NOT update page.tsx to use the new hooks yet - just create them for future use.
```
