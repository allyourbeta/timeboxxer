# FIXES: Delete UX + Layout Improvements

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**

---

## Overview

| Section | Fix |
|---------|-----|
| 1 | Move list delete to overflow menu (less accidental) |
| 2 | Add confirmation dialog before deleting list |
| 3 | Make toast more prominent (top-center, brighter) |
| 4 | Fix undo button in toast (ensure it works) |
| 5 | Change list layout from 3 columns to 2 columns |

---

## SECTION 1: Move List Delete to Overflow Menu

Instead of a visible trash icon, put delete in a dropdown menu (⋮).

### 1.1 Update `src/components/Lists/ListCard.tsx`

**Add imports:**

```tsx
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Trash2, Copy, Edit2 } from 'lucide-react'
```

**Add state for dropdown menu:**

Inside the component, add:

```tsx
const [showMenu, setShowMenu] = useState(false)
const menuRef = useRef<HTMLDivElement>(null)

// Close menu when clicking outside
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowMenu(false)
    }
  }
  
  if (showMenu) {
    document.addEventListener('mousedown', handleClickOutside)
  }
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [showMenu])
```

**Replace the delete button with an overflow menu:**

Remove the standalone trash button. Instead, add a menu button and dropdown:

```tsx
{/* Overflow menu */}
<div className="relative" ref={menuRef}>
  <Button
    variant="ghost"
    size="icon"
    onClick={(e) => {
      e.stopPropagation()
      setShowMenu(!showMenu)
    }}
    className="h-8 w-8 text-muted-foreground"
  >
    <MoreVertical className="h-4 w-4" />
  </Button>
  
  {showMenu && (
    <div className="absolute right-0 top-full mt-1 w-40 bg-popover border rounded-lg shadow-lg z-20 py-1">
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
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent text-destructive flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete List
          </button>
        </>
      )}
      {list.is_system && (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          System list
        </div>
      )}
    </div>
  )}
</div>
```

**Commit:**
```bash
git add -A && git commit -m "fix: Move list delete to overflow menu"
```

---

## SECTION 2: Add Confirmation Dialog

Create a confirmation dialog component and use it before deleting.

### 2.1 Create `src/components/ui/confirm-dialog.tsx`

```tsx
'use client'

import { Button } from './button'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-popover border rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 2.2 Add destructive variant to Button if not present

Check `src/components/ui/button.tsx` - if there's no `destructive` variant, add it to the variants:

```tsx
const buttonVariants = cva(
  // ... base classes
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // ... rest
    },
  }
)
```

### 2.3 Update `src/components/ui/index.ts`

Add export:

```tsx
export { ConfirmDialog } from './confirm-dialog'
```

### 2.4 Update `src/app/page.tsx` to use confirmation

**Add state for confirmation dialog:**

```tsx
const [deleteConfirm, setDeleteConfirm] = useState<{
  listId: string
  listName: string
  taskCount: number
} | null>(null)
```

**Add import:**

```tsx
import { ConfirmDialog } from '@/components/ui'
```

**Update handleDeleteList to show confirmation first:**

```tsx
const handleDeleteListClick = (listId: string) => {
  const list = lists.find(l => l.id === listId)
  if (!list || list.is_system) return
  
  const taskCount = tasks.filter(t => t.list_id === listId).length
  
  setDeleteConfirm({
    listId,
    listName: list.name,
    taskCount,
  })
}

const handleDeleteListConfirm = () => {
  if (!deleteConfirm) return
  handleDeleteList(deleteConfirm.listId)
  setDeleteConfirm(null)
}
```

**Update what's passed to ListPanel:**

Change `onDeleteList={handleDeleteList}` to `onDeleteList={handleDeleteListClick}`

**Add dialog render (before Toast):**

```tsx
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
```

**Commit:**
```bash
git add -A && git commit -m "fix: Add confirmation dialog before deleting list"
```

---

## SECTION 3: Make Toast More Prominent

Update toast to be top-center, larger, and brighter.

### 3.1 Update `src/components/ui/toast.tsx`

Replace the entire file:

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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
      <div className="bg-yellow-500 text-black rounded-lg shadow-2xl overflow-hidden min-w-[350px] border-2 border-yellow-400">
        <div className="p-4 flex items-center gap-4">
          <span className="flex-1 font-medium text-base">{message}</span>
          {action && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                action.onClick()
                onClose()
              }}
              className="font-bold bg-black text-yellow-500 hover:bg-gray-900 px-4"
            >
              {action.label}
            </Button>
          )}
          <button
            onClick={onClose}
            className="text-black/60 hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-yellow-600">
          <div 
            className="h-full bg-black transition-all duration-50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
```

**Commit:**
```bash
git add -A && git commit -m "fix: Make toast more prominent (top-center, yellow)"
```

---

## SECTION 4: Fix Undo Button Logic

Ensure the undo actually works - the toast must have the action prop.

### 4.1 Update `src/app/page.tsx`

Find where the Toast is rendered and make sure action is passed correctly:

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
      // Toast closed without undo - deletion already happened
      setPendingDelete(null)
    }}
  />
)}
```

**Also verify handleUndoDelete exists and is correct:**

```tsx
const handleUndoDelete = async () => {
  if (!pendingDelete) return
  
  // Clear the timeout so we don't double-delete
  clearTimeout(pendingDelete.timeoutId)
  
  // Recreate the list with the same name
  await createList(pendingDelete.listName)
  
  // Reload lists to get the new list
  await loadLists()
  
  // Find the newly created list
  const newList = lists.find(l => l.name === pendingDelete.listName && !l.is_system)
  
  // Move tasks back to the recreated list
  if (newList) {
    for (const task of pendingDelete.originalTasks) {
      await updateTask(task.id, { list_id: newList.id })
    }
  }
  
  setPendingDelete(null)
}
```

**Wait - there's a bug in the original logic.** The list gets deleted immediately, then undo tries to recreate it. But tasks were already moved to Inbox. Let me fix the whole flow:

**Replace the entire delete logic in page.tsx:**

```tsx
// State for pending deletion
const [pendingDelete, setPendingDelete] = useState<{
  listId: string
  listName: string
  originalTasks: Array<{ id: string; originalListId: string }>
  timeoutId: NodeJS.Timeout
} | null>(null)

// Soft delete - hides list, moves tasks, shows toast with undo
const handleDeleteList = (listId: string) => {
  const list = lists.find(l => l.id === listId)
  if (!list || list.is_system) return
  
  // Find Inbox
  const inboxList = lists.find(l => l.name === 'Inbox' && !l.is_system)
  
  // Get tasks in this list
  const tasksInList = tasks.filter(t => t.list_id === listId)
  const originalTasks = tasksInList.map(t => ({ 
    id: t.id, 
    originalListId: listId 
  }))
  
  // Move tasks to Inbox immediately (but we can undo this)
  if (inboxList) {
    tasksInList.forEach(task => {
      updateTask(task.id, { list_id: inboxList.id })
    })
  }
  
  // Set timeout to actually delete the list
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

// Undo delete - move tasks back, cancel deletion
const handleUndoDelete = async () => {
  if (!pendingDelete) return
  
  // Cancel the pending deletion
  clearTimeout(pendingDelete.timeoutId)
  
  // Move tasks back to original list
  for (const task of pendingDelete.originalTasks) {
    await updateTask(task.id, { list_id: task.originalListId })
  }
  
  // Reload to refresh UI
  await loadTasks()
  
  setPendingDelete(null)
}

// Filter out the pending-delete list from display
const visibleLists = lists.filter(l => l.id !== pendingDelete?.listId)
```

**Make sure to use `visibleLists` when rendering ListPanel:**

```tsx
<ListPanel
  lists={visibleLists}  // NOT lists
  // ... other props
/>
```

**Commit:**
```bash
git add -A && git commit -m "fix: Proper undo logic for list deletion"
```

---

## SECTION 5: Change to 2 Columns

Update ListPanel layout from 3 columns to 2 columns.

### 5.1 Update `src/components/Lists/ListPanel.tsx`

Find the grid container class. It probably looks something like:

```tsx
<div className="grid grid-cols-3 gap-4">
```

Or:

```tsx
<div className="flex flex-wrap gap-4">
```

**Change to 2 columns:**

```tsx
<div className="grid grid-cols-2 gap-4">
```

Or if using flex, ensure items take 50% width:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

**Commit:**
```bash
git add -A && git commit -m "fix: Change list layout from 3 to 2 columns"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ No visible trash icon on list cards - only ⋮ menu
2. ✅ Clicking ⋮ shows dropdown with "Delete List" option
3. ✅ Clicking "Delete List" shows confirmation dialog
4. ✅ Dialog shows task count that will be moved
5. ✅ Confirming shows bright yellow toast at TOP CENTER
6. ✅ Toast has visible "Undo" button
7. ✅ Clicking "Undo" brings list back with tasks
8. ✅ Not clicking undo → list is deleted after 5 seconds
9. ✅ Lists display in 2 columns, not 3
10. ✅ System lists don't show delete option in menu

---

## Summary

| File | Changes |
|------|---------|
| `src/components/Lists/ListCard.tsx` | Replace trash with overflow menu |
| `src/components/ui/confirm-dialog.tsx` | NEW - Confirmation dialog |
| `src/components/ui/button.tsx` | Add destructive variant (if missing) |
| `src/components/ui/toast.tsx` | Top-center, yellow, more prominent |
| `src/components/ui/index.ts` | Export ConfirmDialog |
| `src/app/page.tsx` | Confirmation state, fixed undo logic, visibleLists |
| `src/components/Lists/ListPanel.tsx` | 2 columns instead of 3 |
