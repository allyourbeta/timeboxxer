# FIXES: Purgatory Badge + Unschedule Return

---

## ⚠️ MANDATORY RULES ⚠️

1. **Run `npm run build` after each fix.** 
2. **Commit after each fix.**

---

## Overview

Two small UX fixes:

| Fix | Description |
|-----|-------------|
| 1 | Hide "scheduled" badge for tasks in Purgatory (redundant) |
| 2 | Unschedule returns task to original list, not Purgatory |

---

## FIX 1: Hide "scheduled" Badge in Purgatory

Tasks in Purgatory are by definition scheduled, so the badge is redundant and wastes space.

### Update `src/components/Tasks/TaskCard.tsx`:

Find the scheduled badge (around line 69-73):

```tsx
{isScheduled && (
  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded text-white/80">
    scheduled
  </span>
)}
```

Replace with:

```tsx
{isScheduled && !isInPurgatory && (
  <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded text-white/80">
    scheduled
  </span>
)}
```

### Add `isInPurgatory` prop to TaskCard:

Update the interface (around line 7-20):

```tsx
interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  isScheduled: boolean
  isDaily: boolean
  isInPurgatory: boolean  // ADD THIS
  paletteId: string
  // ... rest of props
}
```

Add to destructuring:

```tsx
export function TaskCard({
  // ... existing props
  isInPurgatory,
  // ... rest
}: TaskCardProps) {
```

### Update `src/components/Lists/ListCard.tsx`:

Pass the new prop to TaskCard. Find where TaskCard is rendered and add:

```tsx
isInPurgatory={list.system_type === 'purgatory'}
```

### Update `src/components/Lists/ListPanel.tsx`:

The ListCard needs to know if it's the Purgatory list. It already receives `list` as a prop which has `system_type`, so no changes needed here — just ensure ListCard passes it through.

**Commit:**
```bash
git add -A && git commit -m "fix: Hide scheduled badge for tasks in Purgatory"
```

---

## FIX 2: Unschedule Returns Task to Original List

When a task is unscheduled, it should return to its original list instead of staying in Purgatory.

### Update `src/app/page.tsx`:

Find where `unscheduleTask` is called or passed. We need to also call `moveFromPurgatory` when unscheduling.

Add a new handler (around line 60-70, near other handlers):

```tsx
const handleUnschedule = async (taskId: string) => {
  // First unschedule from calendar
  await unscheduleTask(taskId)
  
  // Then move back to original list (or Inbox if original was deleted)
  const task = tasks.find(t => t.id === taskId)
  if (task && task.list_id === PURGATORY_LIST_ID) {
    // Check if original list still exists
    const originalListExists = task.original_list_id && lists.some(l => l.id === task.original_list_id)
    
    // Find Inbox as fallback
    const inboxList = lists.find(l => l.name === 'Inbox' && !l.is_system)
    const targetListId = originalListExists 
      ? task.original_list_id! 
      : inboxList?.id || lists.find(l => !l.is_system)?.id
    
    if (targetListId) {
      await moveFromPurgatory(taskId, targetListId)
    }
  }
}
```

### Update FullCalendarView props:

Find where `FullCalendarView` is rendered (around line 140-150) and change:

```tsx
onUnschedule={unscheduleTask}
```

To:

```tsx
onUnschedule={handleUnschedule}
```

### Add `moveFromPurgatory` to the store destructuring:

Find the useTaskStore destructuring (around line 12-15) and add `moveFromPurgatory`:

```tsx
const { 
  tasks, 
  loading: tasksLoading, 
  loadTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  completeTask, 
  uncompleteTask, 
  moveToPurgatory,
  moveFromPurgatory,  // ADD THIS
} = useTaskStore()
```

**Commit:**
```bash
git add -A && git commit -m "fix: Unschedule returns task to original list"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test:**
1. ✅ Tasks in Purgatory do NOT show "scheduled" badge
2. ✅ Tasks in other lists that are scheduled DO show "scheduled" badge
3. ✅ Click calendar event → Cancel → task returns to its original list
4. ✅ If original list was deleted, task goes to Inbox

---

## Summary

| File | Changes |
|------|---------|
| `src/components/Tasks/TaskCard.tsx` | Add `isInPurgatory` prop, conditional badge |
| `src/components/Lists/ListCard.tsx` | Pass `isInPurgatory` to TaskCard |
| `src/app/page.tsx` | Add `handleUnschedule`, use `moveFromPurgatory` |
