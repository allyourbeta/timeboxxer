# REFACTOR: Split Oversized Files

---

## ⚠️ MANDATORY RULES ⚠️

1. **Follow this spec EXACTLY. Do not improvise.**
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**
4. **No file should exceed 300 lines after refactoring.**

---

## Overview

Two files exceed the 300-line limit:
- `page.tsx` — 451 lines (must split)
- `ListCard.tsx` — 376 lines (must split)

| Section | What |
|---------|------|
| 1 | Extract page.tsx handlers into a custom hook |
| 2 | Extract ListCard menu into separate component |
| 3 | Verify all files under 300 lines |

---

## SECTION 1: Extract Page Handlers into Custom Hook

Create a custom hook that contains all the handler functions from page.tsx.

### 1.1 Create `src/hooks/useAppHandlers.ts`

```typescript
'use client'

import { useState } from 'react'
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
import { PURGATORY_LIST_ID } from '@/lib/constants'

interface PendingDelete {
  listId: string
  listName: string
  originalTasks: Array<{ id: string; originalListId: string }>
  timeoutId: NodeJS.Timeout
}

interface DeleteConfirm {
  listId: string
  listName: string
  taskCount: number
}

export function useAppHandlers() {
  // Get store actions
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    moveToPurgatory,
    moveFromPurgatory,
    createParkedThought,
    createCalendarTask,
    reorderTasks
  } = useTaskStore()
  
  const { lists, createList, deleteList, duplicateList, updateList } = useListStore()
  const { scheduled, scheduleTask, unscheduleTask } = useScheduleStore()
  const { setEditingListId, setDuplicatingListId, setShowNewListInput } = useUIStore()

  // Local state for deletion flow
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)

  // === TASK HANDLERS ===
  
  const handleTaskAdd = async (listId: string, title: string) => {
    await createTask(listId, title)
  }

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask(taskId)
  }

  const handleTaskDurationClick = async (taskId: string, currentDuration: number, reverse: boolean) => {
    const durations = [15, 30, 45, 60, 90, 120]
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
    
    // Check if this task is in a date list
    const taskList = lists.find(l => l.id === task.list_id)
    if (!taskList || taskList.system_type !== 'date') {
      console.warn('Highlights only available for date lists')
      return
    }
    
    if (task.is_daily_highlight) {
      await updateTask(taskId, { is_daily_highlight: false })
    } else {
      // Check highlight count in this list
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

  const handleReorderTasks = async (taskIds: string[]) => {
    await reorderTasks(taskIds)
  }

  // === SCHEDULE HANDLERS ===

  const handleExternalDrop = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const today = new Date().toISOString().split('T')[0]
    
    // Move to purgatory if not already there
    if (task.list_id !== PURGATORY_LIST_ID) {
      await moveToPurgatory(taskId)
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
      // Check if original list still exists
      const originalList = lists.find(l => l.id === task.original_list_id)
      if (originalList) {
        await moveFromPurgatory(taskId, task.original_list_id)
      } else {
        // Move to inbox if original list is gone
        const inbox = lists.find(l => l.name === 'Inbox')
        if (inbox) {
          await moveFromPurgatory(taskId, inbox.id)
        }
      }
    }
    await unscheduleTask(taskId)
  }

  const handleCreateCalendarTask = async (title: string, time: string) => {
    const today = new Date().toISOString().split('T')[0]
    await createCalendarTask(title, time, today)
  }

  // === LIST HANDLERS ===

  const handleListCreate = async (name: string) => {
    await createList(name)
    setShowNewListInput(false)
  }

  const handleListEdit = async (listId: string, newName: string) => {
    await updateList(listId, { name: newName })
    setEditingListId(null)
  }

  const handleListDuplicate = async (listId: string, newName: string) => {
    await duplicateList(listId, newName)
    setDuplicatingListId(null)
  }

  const handleDeleteListClick = (listId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list || list.is_system) return
    
    const taskCount = tasks.filter(t => t.list_id === listId).length
    setDeleteConfirm({ listId, listName: list.name, taskCount })
  }

  const handleDeleteListConfirm = () => {
    if (!deleteConfirm) return
    
    const list = lists.find(l => l.id === deleteConfirm.listId)
    if (!list || list.is_system) return
    
    const inbox = lists.find(l => l.name === 'Inbox' && !l.is_system)
    const tasksInList = tasks.filter(t => t.list_id === deleteConfirm.listId)
    const originalTasks = tasksInList.map(t => ({ id: t.id, originalListId: deleteConfirm.listId }))
    
    // Move tasks to inbox
    if (inbox) {
      tasksInList.forEach(task => {
        updateTask(task.id, { list_id: inbox.id })
      })
    }
    
    // Set timeout for actual deletion
    const timeoutId = setTimeout(async () => {
      await deleteList(deleteConfirm.listId)
      setPendingDelete(null)
    }, 5000)
    
    setPendingDelete({
      listId: deleteConfirm.listId,
      listName: deleteConfirm.listName,
      originalTasks,
      timeoutId,
    })
    
    setDeleteConfirm(null)
  }

  const handleUndoDelete = async () => {
    if (!pendingDelete) return
    
    clearTimeout(pendingDelete.timeoutId)
    
    // Move tasks back
    for (const task of pendingDelete.originalTasks) {
      await updateTask(task.id, { list_id: task.originalListId })
    }
    
    setPendingDelete(null)
  }

  // === FOCUS MODE HANDLERS ===

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

  // === PARK HANDLER ===

  const handleParkThought = async (title: string) => {
    await createParkedThought(title)
  }

  return {
    // State
    pendingDelete,
    setPendingDelete,
    deleteConfirm,
    setDeleteConfirm,
    focusTaskId,
    
    // Task handlers
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDurationClick,
    handleTaskComplete,
    handleTaskUncomplete,
    handleTaskDailyToggle,
    handleTaskEnergyChange,
    handleTaskHighlightToggle,
    handleReorderTasks,
    
    // Schedule handlers
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    
    // List handlers
    handleListCreate,
    handleListEdit,
    handleListDuplicate,
    handleDeleteListClick,
    handleDeleteListConfirm,
    handleUndoDelete,
    
    // Focus handlers
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
    
    // Park handler
    handleParkThought,
  }
}
```

### 1.2 Create `src/hooks/index.ts`

```typescript
export { useAppHandlers } from './useAppHandlers'
```

### 1.3 Update `src/app/page.tsx`

Replace the entire file with this slimmed down version:

```typescript
'use client'

import { useEffect } from 'react'
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
import { useAppHandlers } from '@/hooks'
import { Header, CompletedView } from '@/components/Layout'
import { ListPanel } from '@/components/Lists'
import { FullCalendarView } from '@/components/Calendar'
import { Toast, ConfirmDialog } from '@/components/ui'
import { FocusMode } from '@/components/Focus'
import { PURGATORY_LIST_ID } from '@/lib/constants'

const PALETTE_ID = 'ocean-bold'

export default function Home() {
  // Stores (data only)
  const { tasks, loading: tasksLoading, loadTasks, spawnDailyTasksForToday } = useTaskStore()
  const { lists, loading: listsLoading, loadLists } = useListStore()
  const { scheduled, loading: scheduleLoading, loadSchedule } = useScheduleStore()
  const {
    currentView, setCurrentView,
    panelMode, setPanelMode,
    editingListId, setEditingListId,
    duplicatingListId, setDuplicatingListId,
    showNewListInput, setShowNewListInput,
    expandedListByColumn, toggleListExpanded,
  } = useUIStore()

  // All handlers from custom hook
  const {
    pendingDelete,
    setPendingDelete,
    deleteConfirm,
    setDeleteConfirm,
    focusTaskId,
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDurationClick,
    handleTaskComplete,
    handleTaskUncomplete,
    handleTaskDailyToggle,
    handleTaskEnergyChange,
    handleTaskHighlightToggle,
    handleReorderTasks,
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    handleListCreate,
    handleListEdit,
    handleListDuplicate,
    handleDeleteListClick,
    handleDeleteListConfirm,
    handleUndoDelete,
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
    handleParkThought,
  } = useAppHandlers()

  // Load data on mount
  useEffect(() => {
    loadLists()
    loadTasks()
    loadSchedule()
  }, [loadLists, loadTasks, loadSchedule])

  // Spawn daily tasks after data loads
  useEffect(() => {
    if (!tasksLoading && !listsLoading && tasks.length > 0) {
      spawnDailyTasksForToday()
    }
  }, [tasksLoading, listsLoading, tasks.length, spawnDailyTasksForToday])

  // Computed values
  const loading = tasksLoading || listsLoading || scheduleLoading
  const scheduledTaskIds = scheduled.map(s => s.task_id)
  const visibleLists = lists.filter(l => l.id !== pendingDelete?.listId)
  
  const completedToday = tasks.filter(t => {
    if (!t.is_completed || !t.completed_at) return false
    const completedDate = new Date(t.completed_at).toDateString()
    const today = new Date().toDateString()
    return completedDate === today
  }).length

  const getWeekData = (): number[] => {
    const result: number[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toDateString()
      const count = tasks.filter(t => {
        if (!t.is_completed || !t.completed_at) return false
        return new Date(t.completed_at).toDateString() === dateStr
      }).length
      result.push(count)
    }
    return result
  }

  const scheduledTasks = tasks.filter(t => 
    scheduled.some(s => s.task_id === t.id) && !t.is_completed
  )
  
  const focusTask = focusTaskId ? tasks.find(t => t.id === focusTaskId) : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (currentView === 'completed') {
    return (
      <div className="min-h-screen bg-background">
        <Header
          currentView={currentView}
          panelMode={panelMode}
          onViewChange={setCurrentView}
          onPanelModeChange={setPanelMode}
          onParkThought={handleParkThought}
          onStartFocus={() => {
            if (scheduledTasks.length > 0) {
              const randomIndex = Math.floor(Math.random() * scheduledTasks.length)
              handleStartFocus(scheduledTasks[randomIndex].id)
            }
          }}
          hasScheduledTasks={scheduledTasks.length > 0}
          completedToday={completedToday}
          weekData={getWeekData()}
        />
        <CompletedView
          tasks={tasks.filter(t => t.is_completed)}
          lists={lists}
          onUncomplete={handleTaskUncomplete}
          onDelete={handleTaskDelete}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentView={currentView}
        panelMode={panelMode}
        onViewChange={setCurrentView}
        onPanelModeChange={setPanelMode}
        onParkThought={handleParkThought}
        onStartFocus={() => {
          if (scheduledTasks.length > 0) {
            const randomIndex = Math.floor(Math.random() * scheduledTasks.length)
            handleStartFocus(scheduledTasks[randomIndex].id)
          }
        }}
        hasScheduledTasks={scheduledTasks.length > 0}
        completedToday={completedToday}
        weekData={getWeekData()}
      />

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Lists Panel */}
        {(panelMode === 'both' || panelMode === 'lists-only') && (
          <div className={`${panelMode === 'both' ? 'w-1/2' : 'w-full'} overflow-auto p-4`}>
            <ListPanel
              lists={visibleLists}
              tasks={tasks}
              scheduledTaskIds={scheduledTaskIds}
              paletteId={PALETTE_ID}
              editingListId={editingListId}
              duplicatingListId={duplicatingListId}
              showNewListInput={showNewListInput}
              expandedListByColumn={expandedListByColumn}
              onToggleExpanded={toggleListExpanded}
              onStartEdit={setEditingListId}
              onFinishEdit={handleListEdit}
              onCancelEdit={() => setEditingListId(null)}
              onStartDuplicate={setDuplicatingListId}
              onFinishDuplicate={handleListDuplicate}
              onCancelDuplicate={() => setDuplicatingListId(null)}
              onDelete={handleDeleteListClick}
              onTaskDurationClick={handleTaskDurationClick}
              onTaskDelete={handleTaskDelete}
              onTaskAdd={handleTaskAdd}
              onTaskDailyToggle={handleTaskDailyToggle}
              onTaskEnergyChange={handleTaskEnergyChange}
              onTaskHighlightToggle={handleTaskHighlightToggle}
              onReorderTasks={handleReorderTasks}
              onShowNewListInput={() => setShowNewListInput(true)}
              onCreateList={handleListCreate}
              onCancelNewList={() => setShowNewListInput(false)}
            />
          </div>
        )}

        {/* Calendar Panel */}
        {(panelMode === 'both' || panelMode === 'calendar-only') && (
          <div className={`${panelMode === 'both' ? 'w-1/2' : 'w-full'} border-l border-border overflow-hidden`}>
            <FullCalendarView
              tasks={tasks}
              scheduled={scheduled}
              paletteId={PALETTE_ID}
              onExternalDrop={handleExternalDrop}
              onEventMove={handleEventMove}
              onUnschedule={handleUnschedule}
              onComplete={handleTaskComplete}
              onDurationChange={(taskId, newDuration) => 
                handleTaskDurationClick(taskId, newDuration, false)
              }
              onCreateTask={handleCreateCalendarTask}
            />
          </div>
        )}
      </div>

      {/* Focus Mode */}
      {focusTask && (
        <FocusMode
          task={focusTask}
          paletteId={PALETTE_ID}
          onExit={handleExitFocus}
          onComplete={handleFocusComplete}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete List"
          message={`Delete "${deleteConfirm.listName}"${deleteConfirm.taskCount > 0 ? ` and move ${deleteConfirm.taskCount} task${deleteConfirm.taskCount > 1 ? 's' : ''} to Inbox` : ''}?`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteListConfirm}
          onCancel={() => setDeleteConfirm(null)}
          isDestructive
        />
      )}

      {/* Undo Toast */}
      {pendingDelete && (
        <Toast
          message={`"${pendingDelete.listName}" deleted`}
          action={{
            label: 'Undo',
            onClick: handleUndoDelete,
          }}
          duration={5000}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
```

**Commit:**
```bash
git add -A && git commit -m "refactor: Extract handlers to useAppHandlers hook"
```

---

## SECTION 2: Extract ListCard Menu Component

Extract the dropdown menu from ListCard into its own component.

### 2.1 Create `src/components/Lists/ListCardMenu.tsx`

```typescript
'use client'

import { useRef, useEffect, useState } from 'react'
import { MoreVertical, Trash2, Copy, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ListCardMenuProps {
  isSystemList: boolean
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function ListCardMenu({
  isSystemList,
  onEdit,
  onDuplicate,
  onDelete,
}: ListCardMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
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

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showMenu) {
      setShowMenu(false)
      setMenuPosition(null)
    } else {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right - 176,
        })
      }
      setShowMenu(true)
    }
  }

  return (
    <div ref={menuRef}>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={handleMenuToggle}
        className="h-8 w-8 text-muted-foreground"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {showMenu && menuPosition && (
        <div
          className="fixed w-44 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 py-1"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          {!isSystemList ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onEdit()
                }}
                className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onDuplicate()
                }}
                className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onDelete()
                }}
                className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete List
              </button>
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground italic">
              System list
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

### 2.2 Update `src/components/Lists/index.ts`

```typescript
export { ListPanel } from './ListPanel'
export { ListCard } from './ListCard'
export { ListCardMenu } from './ListCardMenu'
```

### 2.3 Update `src/components/Lists/ListCard.tsx`

**At the top, add the import:**

```typescript
import { ListCardMenu } from './ListCardMenu'
```

**Remove these imports (no longer needed in ListCard):**

```typescript
// REMOVE these:
import { MoreVertical, Trash2, Copy, Edit2 } from 'lucide-react'
```

Keep only:
```typescript
import { ChevronDown, ChevronUp } from 'lucide-react'
```

**Remove the entire menu state and handlers:**

Delete these lines (approximately lines 80-145):
- `const [showMenu, setShowMenu] = useState(false)`
- `const [menuPosition, setMenuPosition] = useState...`
- `const menuRef = useRef...`
- `const buttonRef = useRef...`
- The `useEffect` for click outside
- The `handleMenuToggle` function

**Replace the menu rendering in JSX:**

Find where the menu button and dropdown are rendered (in the header area) and replace with:

```tsx
<ListCardMenu
  isSystemList={isSystemList}
  onEdit={onStartEdit}
  onDuplicate={onStartDuplicate}
  onDelete={onDelete}
/>
```

**Commit:**
```bash
git add -A && git commit -m "refactor: Extract ListCardMenu component"
```

---

## SECTION 3: Verify Line Counts

### 3.1 Run verification

```bash
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -n | tail -15
```

### 3.2 Expected results

All files should be under 300 lines:
- `page.tsx` — should be ~200 lines
- `ListCard.tsx` — should be ~280 lines
- `useAppHandlers.ts` — should be ~250 lines
- `ListCardMenu.tsx` — should be ~100 lines

### 3.3 If any file still exceeds 300 lines

Report which file and by how many lines. Do NOT attempt further splitting without instructions.

**Commit:**
```bash
git add -A && git commit -m "refactor: Verify all files under 300 lines"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ App loads without errors
2. ✅ All list operations work (create, edit, delete, duplicate)
3. ✅ Task operations work (add, delete, complete, reorder)
4. ✅ Calendar drag-and-drop works
5. ✅ Focus Mode works
6. ✅ No files exceed 300 lines

---

## Summary

| File | Action |
|------|--------|
| `src/hooks/useAppHandlers.ts` | NEW — All handler functions |
| `src/hooks/index.ts` | NEW — Export hook |
| `src/app/page.tsx` | SIMPLIFIED — Uses hook, ~200 lines |
| `src/components/Lists/ListCardMenu.tsx` | NEW — Menu component |
| `src/components/Lists/ListCard.tsx` | SIMPLIFIED — Uses menu component |
| `src/components/Lists/index.ts` | Updated exports |
