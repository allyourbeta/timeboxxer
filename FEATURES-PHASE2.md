# FEATURES: Phase 2 - Focus Mode + Delete List

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**

---

## Overview

| Section | Feature |
|---------|---------|
| 1 | Delete List button (obvious, on each list card) |
| 2 | Soft delete with undo toast (5 second window) |
| 3 | Move orphaned tasks to Inbox on list delete |
| 4 | Focus Mode component (full-screen single task + timer) |
| 5 | Randomizer ("Pick for me" button) |
| 6 | Focus Mode integration in page.tsx |

---

## SECTION 1: Delete List Button

Add an obvious delete button to each list card header (not for system lists).

### 1.1 Update `src/components/Lists/ListCard.tsx`

Find the list header area (near the collapse/expand chevron and list name).

**Add a delete button next to the list actions (around where edit/duplicate buttons are):**

Look for the header section and add a Trash2 icon button:

```tsx
import { Trash2 } from 'lucide-react'
```

In the header actions area, add (only for non-system lists):

```tsx
{!list.is_system && (
  <Button
    variant="ghost"
    size="icon"
    onClick={(e) => {
      e.stopPropagation()
      onDeleteList(list.id)
    }}
    className="h-8 w-8 text-muted-foreground hover:text-destructive"
    title="Delete list"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
)}
```

**Make sure `onDeleteList` is in the props interface:**

```tsx
interface ListCardProps {
  // ... existing props
  onDeleteList: (listId: string) => void
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add delete button to list cards"
```

---

## SECTION 2: Toast Component for Undo

Create a simple toast component for the undo functionality.

### 2.1 Create `src/components/ui/toast.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

interface ToastProps {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  onClose: () => void
}

export function Toast({ message, action, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100)
  
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      
      if (remaining === 0) {
        clearInterval(interval)
        onClose()
      }
    }, 50)
    
    return () => clearInterval(interval)
  }, [duration, onClose])
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2">
      <div className="bg-foreground text-background rounded-lg shadow-lg overflow-hidden min-w-[300px]">
        <div className="p-4 flex items-center gap-3">
          <span className="flex-1">{message}</span>
          {action && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                action.onClick()
                onClose()
              }}
              className="font-semibold"
            >
              {action.label}
            </Button>
          )}
          <button
            onClick={onClose}
            className="text-background/60 hover:text-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-background/20">
          <div 
            className="h-full bg-primary transition-all duration-50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
```

### 2.2 Update `src/components/ui/index.ts`

Add the export:

```tsx
export { Toast } from './toast'
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add Toast component with progress bar"
```

---

## SECTION 3: Soft Delete with Undo

Implement soft delete that moves tasks to Inbox, shows toast, and allows undo.

### 3.1 Update `src/app/page.tsx`

**Add state for pending deletion:**

```tsx
const [pendingDelete, setPendingDelete] = useState<{
  listId: string
  listName: string
  taskIds: string[]
  timeoutId: NodeJS.Timeout
} | null>(null)
```

**Add import for Toast:**

```tsx
import { Toast } from '@/components/ui'
```

**Add the soft delete handler:**

```tsx
const handleDeleteList = async (listId: string) => {
  const list = lists.find(l => l.id === listId)
  if (!list || list.is_system) return
  
  // Get tasks in this list
  const tasksInList = tasks.filter(t => t.list_id === listId)
  const taskIds = tasksInList.map(t => t.id)
  
  // Find Inbox for moving tasks
  const inboxList = lists.find(l => l.name === 'Inbox' && !l.is_system)
  
  // Move tasks to Inbox immediately (visually)
  if (inboxList && taskIds.length > 0) {
    for (const taskId of taskIds) {
      await updateTask(taskId, { list_id: inboxList.id })
    }
  }
  
  // Hide the list immediately (soft delete)
  // We'll actually delete it after the timeout
  const timeoutId = setTimeout(async () => {
    // Actually delete the list
    await deleteList(listId)
    setPendingDelete(null)
  }, 5000)
  
  setPendingDelete({
    listId,
    listName: list.name,
    taskIds,
    timeoutId,
  })
  
  // Temporarily hide the list by deleting it
  // If user undoes, we'll recreate it
  await deleteList(listId)
}

const handleUndoDelete = async () => {
  if (!pendingDelete) return
  
  // Clear the timeout
  clearTimeout(pendingDelete.timeoutId)
  
  // Recreate the list
  await createList(pendingDelete.listName)
  
  // Get the newly created list
  await loadLists()
  
  // Note: Tasks stay in Inbox after undo - this is a limitation
  // A more complex implementation would track original list_id
  
  setPendingDelete(null)
}
```

**Wait, this approach has issues.** Let me simplify — we'll use a truly soft delete pattern:

**Better approach - hide visually, delete on timeout:**

```tsx
const [pendingDelete, setPendingDelete] = useState<{
  listId: string
  listName: string
  originalTasks: Array<{ id: string; list_id: string }>
  timeoutId: NodeJS.Timeout
} | null>(null)

const handleDeleteList = (listId: string) => {
  const list = lists.find(l => l.id === listId)
  if (!list || list.is_system) return
  
  // Find Inbox
  const inboxList = lists.find(l => l.name === 'Inbox' && !l.is_system)
  const inboxId = inboxList?.id
  
  // Get tasks in this list (save original state for undo)
  const tasksInList = tasks.filter(t => t.list_id === listId)
  const originalTasks = tasksInList.map(t => ({ id: t.id, list_id: t.list_id! }))
  
  // Move tasks to Inbox immediately
  if (inboxId) {
    tasksInList.forEach(t => {
      updateTask(t.id, { list_id: inboxId })
    })
  }
  
  // Set timeout to actually delete
  const timeoutId = setTimeout(async () => {
    await deleteList(listId)
    setPendingDelete(null)
  }, 5000)
  
  setPendingDelete({
    listId,
    listName: list.name,
    originalTasks,
    timeoutId,
  })
}

const handleUndoDelete = async () => {
  if (!pendingDelete) return
  
  // Clear the timeout so list isn't deleted
  clearTimeout(pendingDelete.timeoutId)
  
  // Move tasks back to original list
  for (const task of pendingDelete.originalTasks) {
    await updateTask(task.id, { list_id: pendingDelete.listId })
  }
  
  setPendingDelete(null)
}
```

**Add filtering to hide the pending-delete list:**

Update how lists are passed to ListPanel - filter out the pending delete list:

```tsx
const visibleLists = lists.filter(l => l.id !== pendingDelete?.listId)
```

Then use `visibleLists` instead of `lists` when passing to ListPanel.

**Add Toast at the end of the component (before final closing tag):**

```tsx
{pendingDelete && (
  <Toast
    message={`"${pendingDelete.listName}" deleted`}
    action={{
      label: 'Undo',
      onClick: handleUndoDelete,
    }}
    duration={5000}
    onClose={() => {
      // If toast closes naturally, the timeout will handle actual deletion
      setPendingDelete(null)
    }}
  />
)}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Soft delete list with undo toast"
```

---

## SECTION 4: Focus Mode Component

Create a full-screen focus view showing only one task with a timer.

### 4.1 Create `src/components/Focus/FocusMode.tsx`

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Play, Pause, RotateCcw, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getColor } from '@/lib/palettes'

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
  energy_level: 'high' | 'medium' | 'low'
}

interface FocusModeProps {
  task: Task
  paletteId: string
  onComplete: () => void
  onClose: () => void
  onPickRandom: () => void
  hasOtherTasks: boolean
}

export function FocusMode({
  task,
  paletteId,
  onComplete,
  onClose,
  onPickRandom,
  hasOtherTasks,
}: FocusModeProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(task.duration_minutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isOvertime, setIsOvertime] = useState(false)
  
  const bgColor = getColor(paletteId, task.color_index)
  
  // Timer logic
  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          setIsOvertime(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isRunning])
  
  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60)
    const secs = Math.abs(seconds) % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Reset timer
  const handleReset = () => {
    setSecondsRemaining(task.duration_minutes * 60)
    setIsOvertime(false)
    setIsRunning(false)
  }
  
  // Energy emoji
  const energyEmoji = {
    high: '🔥',
    medium: '⚡',
    low: '🌙',
  }[task.energy_level]
  
  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: bgColor }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
      >
        <X className="h-8 w-8" />
      </button>
      
      {/* Energy indicator */}
      <div className="text-4xl mb-4">
        {energyEmoji}
      </div>
      
      {/* Task title */}
      <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-8 max-w-3xl">
        {task.title}
      </h1>
      
      {/* Timer */}
      <div className={`text-8xl md:text-9xl font-mono font-bold mb-8 ${
        isOvertime ? 'text-red-300 animate-pulse' : 'text-white'
      }`}>
        {isOvertime && '+'}{formatTime(secondsRemaining)}
      </div>
      
      {/* Timer controls */}
      <div className="flex items-center gap-4 mb-12">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setIsRunning(!isRunning)}
          className="h-14 w-14 rounded-full"
        >
          {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        
        <Button
          variant="secondary"
          size="lg"
          onClick={handleReset}
          className="h-14 w-14 rounded-full"
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="lg"
          onClick={onComplete}
          className="text-lg px-8 py-6"
        >
          ✓ Done
        </Button>
        
        {hasOtherTasks && (
          <Button
            variant="outline"
            size="lg"
            onClick={onPickRandom}
            className="text-lg px-8 py-6 bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Shuffle className="h-5 w-5 mr-2" />
            Pick Another
          </Button>
        )}
      </div>
      
      {/* Overtime message */}
      {isOvertime && (
        <p className="mt-8 text-white/80 text-lg">
          Time's up! Keep going or mark as done.
        </p>
      )}
    </div>
  )
}
```

### 4.2 Create `src/components/Focus/index.ts`

```tsx
export { FocusMode } from './FocusMode'
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add FocusMode component"
```

---

## SECTION 5: Focus Mode Integration

Add Focus Mode trigger and state to the main page.

### 5.1 Update `src/app/page.tsx`

**Add import:**

```tsx
import { FocusMode } from '@/components/Focus'
```

**Add state for focus mode:**

```tsx
const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
```

**Add handlers:**

```tsx
// Get scheduled tasks for randomizer
const scheduledTasks = tasks.filter(t => 
  scheduled.some(s => s.task_id === t.id) && !t.is_completed
)

// Focus mode handlers
const handleStartFocus = (taskId: string) => {
  setFocusTaskId(taskId)
}

const handlePickRandom = () => {
  if (scheduledTasks.length === 0) return
  
  // Filter out current task if in focus mode
  const available = focusTaskId 
    ? scheduledTasks.filter(t => t.id !== focusTaskId)
    : scheduledTasks
  
  if (available.length === 0) return
  
  const randomIndex = Math.floor(Math.random() * available.length)
  setFocusTaskId(available[randomIndex].id)
}

const handleFocusComplete = async () => {
  if (!focusTaskId) return
  await completeTask(focusTaskId)
  
  // Auto-pick next task if available
  const remaining = scheduledTasks.filter(t => t.id !== focusTaskId)
  if (remaining.length > 0) {
    const randomIndex = Math.floor(Math.random() * remaining.length)
    setFocusTaskId(remaining[randomIndex].id)
  } else {
    setFocusTaskId(null)
  }
}

const handleCloseFocus = () => {
  setFocusTaskId(null)
}
```

**Add Focus Mode render (at the end, before Toast):**

```tsx
{focusTaskId && (() => {
  const task = tasks.find(t => t.id === focusTaskId)
  if (!task) return null
  
  return (
    <FocusMode
      task={task}
      paletteId={PALETTE_ID}
      onComplete={handleFocusComplete}
      onClose={handleCloseFocus}
      onPickRandom={handlePickRandom}
      hasOtherTasks={scheduledTasks.filter(t => t.id !== focusTaskId).length > 0}
    />
  )
})()}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Integrate FocusMode into main page"
```

---

## SECTION 6: Add "Just Start" Button to Header

Add a button in the header to launch focus mode with a random task.

### 6.1 Update `src/components/Layout/Header.tsx`

**Add to props interface:**

```tsx
interface HeaderProps {
  // ... existing props
  onStartFocus: () => void
  hasScheduledTasks: boolean
}
```

**Add to destructuring:**

```tsx
export function Header({ 
  // ... existing props
  onStartFocus,
  hasScheduledTasks,
}: HeaderProps) {
```

**Add the "Just Start" button (near the Park button):**

```tsx
{hasScheduledTasks && (
  <Button
    variant="default"
    size="sm"
    onClick={onStartFocus}
    className="h-9 bg-primary"
  >
    <Play className="h-4 w-4 mr-1" />
    Just Start
  </Button>
)}
```

**Add Play import:**

```tsx
import { Plus, X, Play, Sun, Moon } from 'lucide-react'
```

### 6.2 Update `src/app/page.tsx`

**Pass new props to Header:**

```tsx
<Header 
  currentView={currentView} 
  panelMode={panelMode}
  onViewChange={setCurrentView} 
  onPanelModeChange={setPanelMode}
  onParkThought={handleParkThought}
  onStartFocus={handlePickRandom}
  hasScheduledTasks={scheduledTasks.length > 0}
/>
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add Just Start button to header"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ Each user list has a visible trash icon
2. ✅ System lists (Purgatory, Parked, Date) do NOT have trash icon
3. ✅ Clicking trash hides list immediately
4. ✅ Toast appears with "Undo" button
5. ✅ Clicking "Undo" brings list back
6. ✅ Tasks from deleted list appear in Inbox
7. ✅ After undo, tasks return to original list
8. ✅ "Just Start" button appears when tasks are scheduled
9. ✅ Clicking "Just Start" opens Focus Mode with random task
10. ✅ Focus Mode shows task title, timer, energy emoji
11. ✅ Play/Pause works on timer
12. ✅ Reset button resets timer
13. ✅ "Done" marks task complete
14. ✅ "Pick Another" selects different random task
15. ✅ X button closes Focus Mode

---

## Summary

| File | Changes |
|------|---------|
| `src/components/Lists/ListCard.tsx` | Add delete button |
| `src/components/ui/toast.tsx` | NEW - Toast with progress bar |
| `src/components/ui/index.ts` | Export Toast |
| `src/components/Focus/FocusMode.tsx` | NEW - Full-screen focus view |
| `src/components/Focus/index.ts` | NEW - Export |
| `src/components/Layout/Header.tsx` | Add "Just Start" button |
| `src/app/page.tsx` | Soft delete logic, focus mode state, handlers |
