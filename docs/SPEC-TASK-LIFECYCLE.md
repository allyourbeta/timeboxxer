# SPEC: Task Lifecycle - Complete, Discard, and Expiry

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**
4. **Read existing code before modifying** — check function signatures, component props, database schema.

---

## Overview

This spec implements a complete task lifecycle with clear actions and automatic cleanup.

### Naming Changes

| Current | New | Type |
|---------|-----|------|
| Limbo | Scheduled | System list |
| Parked Items | TBD Grab Bag | System list |
| Park button | Quick Save | Header button |

### New System List

| Name | Purpose | Sort Order | Special Behavior |
|------|---------|------------|------------------|
| Completed | Tasks user finished | Reverse chronological by completed_at | Grows forever |

### Task Actions Summary

| Action | From List | From Calendar | Result |
|--------|-----------|---------------|--------|
| Complete | ✓ (new) | ✓ (exists) | → Completed list |
| Discard | ✓ (rename) | ✓ (clarify) | → Permanently deleted (with confirmation) |
| Unschedule | n/a | ✓ (exists) | → TBD Grab Bag |
| Drag to calendar | ✓ (exists) | n/a | → Scheduled on calendar |

---

## SECTION 1: Database/API - Rename System Lists

### File: `supabase/migrations/005_rename_system_lists.sql`

Create a new migration file:

```sql
-- Rename system lists
UPDATE lists SET name = 'Scheduled' WHERE system_type = 'purgatory';
UPDATE lists SET name = 'TBD Grab Bag' WHERE system_type = 'parked';

-- Note: 'Completed' list will be created by the app if it doesn't exist
```

### File: `src/lib/constants.ts`

Check if there are hardcoded list names and update them:

```typescript
// Update any constants referencing old names
export const SYSTEM_LIST_NAMES = {
  SCHEDULED: 'Scheduled',           // formerly 'Limbo'
  TBD_GRAB_BAG: 'TBD Grab Bag',    // formerly 'Parked Items'
  COMPLETED: 'Completed',           // new
}
```

### File: `src/api/lists.ts`

Add function to ensure Completed list exists:

```typescript
export async function ensureCompletedList(): Promise<string> {
  const supabase = getSupabase()
  
  // Check if Completed list exists
  const { data: existing } = await supabase
    .from('lists')
    .select('id')
    .eq('system_type', 'completed')
    .single()
  
  if (existing) return existing.id
  
  // Create it
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: DEV_USER_ID,
      name: 'Completed',
      is_system: true,
      system_type: 'completed',
      position: 9999, // Always at end
    })
    .select('id')
    .single()
  
  if (error) throw error
  return data.id
}
```

**Note:** You may need to add 'completed' to the system_type enum in the database schema. Check `SCHEMA.md` for current allowed values.

---

## SECTION 2: Rename "Park" Button to "Quick Save"

### File: `src/components/Layout/Header.tsx`

Find the Park button (around line 97-106):

**Current:**
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowParkInput(true)}
  className="h-9"
>
  <Plus className="h-4 w-4 mr-1" />
  Park
</Button>
```

**New:**
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowParkInput(true)}
  className="h-9"
  title="Quickly save a thought to TBD Grab Bag"
>
  <Plus className="h-4 w-4 mr-1" />
  Quick Save
</Button>
```

Also update the placeholder text (around line 83):

**Current:**
```tsx
placeholder="Park a thought..."
```

**New:**
```tsx
placeholder="Quick save a thought..."
```

---

## SECTION 3: Add "Complete" Button to TaskCard (List Side)

### File: `src/components/Tasks/TaskCard.tsx`

#### 3.1 Add import for CheckCircle icon

```tsx
import { Trash2, CheckCircle } from 'lucide-react'
```

#### 3.2 Add onComplete prop to interface (around line 6-24)

```tsx
interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  isScheduled: boolean
  isDaily: boolean
  isInPurgatory: boolean
  isHighlight: boolean
  canHighlight: boolean
  energyLevel: 'high' | 'medium' | 'low'
  paletteId: string
  onDurationClick: (reverse: boolean) => void
  onEnergyChange: (level: 'high' | 'medium' | 'low') => void
  onDailyToggle: () => void
  onHighlightToggle: () => void
  onComplete: () => void    // NEW
  onDelete: () => void
}
```

#### 3.3 Add onComplete to destructured props

```tsx
export function TaskCard({
  // ... existing props
  onComplete,    // NEW
  onDelete,
}: TaskCardProps) {
```

#### 3.4 Add Complete button next to Delete button (around line 149-159)

Find the delete button and add complete button before it:

```tsx
{/* Complete - visible on hover */}
<button
  onClick={(e) => {
    e.stopPropagation()
    onComplete()
  }}
  className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-white/80 hover:text-white transition-opacity"
  title="Mark as complete"
>
  <CheckCircle className="h-4 w-4 text-white/60 hover:text-green-400" />
</button>

{/* Delete - visible on hover */}
<button
  onClick={(e) => {
    e.stopPropagation()
    onDelete()
  }}
  // ... existing code
```

---

## SECTION 4: Add Discard Confirmation Modal

### File: `src/components/ui/confirm-dialog.tsx`

Check if this file exists and has a reusable confirmation dialog. If not, create one:

```tsx
'use client'

import { Button } from './button'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <h2 className="text-lg font-semibold text-card-foreground mb-2">
          {title}
        </h2>
        <p className="text-muted-foreground mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button 
            variant={confirmVariant === 'destructive' ? 'destructive' : 'default'}
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

**Note:** Check if Button has a 'destructive' variant. If not, use this styling:
```tsx
className="bg-red-600 hover:bg-red-700 text-white"
```

### Export from index (if needed)

```tsx
// src/components/ui/index.ts
export { ConfirmDialog } from './confirm-dialog'
```

---

## SECTION 5: Wire Up Complete and Discard in ListCard

### File: `src/components/Lists/ListCard.tsx`

#### 5.1 Add new props to interface

```tsx
interface ListCardProps {
  // ... existing props
  onTaskComplete: (taskId: string) => void    // NEW
  onTaskDelete: (taskId: string) => void      // existing, but verify name
}
```

#### 5.2 Pass onComplete to TaskCard

Find where TaskCard is rendered (around line 252-270) and add the onComplete prop:

```tsx
<TaskCard
  // ... existing props
  onComplete={() => onTaskComplete(task.id)}
  onDelete={() => onTaskDelete(task.id)}
/>
```

---

## SECTION 6: Wire Up Complete Handler in useAppHandlers

### File: `src/hooks/useAppHandlers.ts`

#### 6.1 Check existing handleTaskComplete function

There should already be a `handleTaskComplete` function. Verify it:
- Marks task as completed (is_completed = true, completed_at = now)
- Removes from schedule if scheduled
- Moves task to Completed list (may need to add this)

#### 6.2 Update handleTaskComplete to move to Completed list

```typescript
const handleTaskComplete = async (taskId: string) => {
  // Get or create Completed list
  const completedListId = await ensureCompletedList()
  
  // Mark task as complete and move to Completed list
  await completeTask(taskId)
  await moveTaskToList(taskId, completedListId)
  
  // Remove from schedule if scheduled
  await unscheduleTask(taskId)
  
  // Refresh local state
  await loadTasks()
  await loadSchedule()
}
```

**Note:** Check what `completeTask` in `src/api/tasks.ts` currently does and adjust accordingly.

---

## SECTION 7: Discard Confirmation Flow

### File: `src/hooks/useAppHandlers.ts`

#### 7.1 Add state for discard confirmation

```typescript
const [discardConfirm, setDiscardConfirm] = useState<{
  taskId: string
  taskTitle: string
} | null>(null)

const handleTaskDiscardClick = (taskId: string, taskTitle: string) => {
  setDiscardConfirm({ taskId, taskTitle })
}

const handleTaskDiscardConfirm = async () => {
  if (!discardConfirm) return
  
  await deleteTask(discardConfirm.taskId)
  await loadTasks()
  await loadSchedule()
  
  setDiscardConfirm(null)
}

const handleTaskDiscardCancel = () => {
  setDiscardConfirm(null)
}
```

#### 7.2 Export these from the hook

```typescript
return {
  // ... existing exports
  discardConfirm,
  handleTaskDiscardClick,
  handleTaskDiscardConfirm,
  handleTaskDiscardCancel,
}
```

### File: `src/app/page.tsx`

#### 7.3 Add the ConfirmDialog component

Import and add at the bottom of the component, before the closing `</div>`:

```tsx
import { ConfirmDialog } from '@/components/ui'

// ... inside the component, get from useAppHandlers:
const {
  // ... existing
  discardConfirm,
  handleTaskDiscardClick,
  handleTaskDiscardConfirm,
  handleTaskDiscardCancel,
} = useAppHandlers()

// ... at the end of the JSX, before final </div>:
<ConfirmDialog
  isOpen={!!discardConfirm}
  title="Discard this task?"
  message={`"${discardConfirm?.taskTitle}" will be permanently deleted.`}
  confirmLabel="Discard"
  cancelLabel="Cancel"
  confirmVariant="destructive"
  onConfirm={handleTaskDiscardConfirm}
  onCancel={handleTaskDiscardCancel}
/>
```

---

## SECTION 8: Unschedule → TBD Grab Bag

### File: `src/hooks/useAppHandlers.ts`

Find `handleUnschedule` and update it to move the task to TBD Grab Bag:

```typescript
const handleUnschedule = async (taskId: string) => {
  // Get TBD Grab Bag list ID
  const { data: grabBagList } = await supabase
    .from('lists')
    .select('id')
    .eq('system_type', 'parked')
    .single()
  
  if (grabBagList) {
    await moveTaskToList(taskId, grabBagList.id)
  }
  
  await unscheduleTask(taskId)
  await loadTasks()
  await loadSchedule()
}
```

---

## SECTION 9: Scheduled List Header Note

### File: `src/components/Lists/ListCard.tsx`

Add a note at the top of the Scheduled list explaining expiry.

#### 9.1 Add prop to identify Scheduled list

The list already has `system_type` passed as `isInbox` for purgatory. We need to check for the Scheduled list specifically.

Add a new prop or check:

```tsx
// In the component, after the header and before tasks:
{list.system_type === 'purgatory' && tasks.length > 0 && (
  <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b border-border">
    Tasks here expire after 7 days if not moved.
  </div>
)}
```

**Note:** Since `system_type` is renamed from 'purgatory' to indicate Scheduled, keep using 'purgatory' as the database value but display "Scheduled" as the name. Or update the database enum — your choice for consistency.

---

## SECTION 10: Auto-Expire Tasks After 7 Days

This requires a background job or a cleanup on app load.

### Option A: Cleanup on App Load (Simpler)

### File: `src/api/tasks.ts`

Add a cleanup function:

```typescript
export async function cleanupExpiredScheduledTasks(): Promise<number> {
  const supabase = getSupabase()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  // Delete tasks in Scheduled list (system_type = 'purgatory') 
  // that were moved there more than 7 days ago
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('list_id', (
      await supabase
        .from('lists')
        .select('id')
        .eq('system_type', 'purgatory')
        .single()
    ).data?.id)
    .lt('moved_to_purgatory_at', sevenDaysAgo.toISOString())
    .select('id')
  
  if (error) {
    console.error('Error cleaning up expired tasks:', error)
    return 0
  }
  
  return data?.length || 0
}
```

### File: `src/app/page.tsx`

Call cleanup on mount:

```typescript
import { cleanupExpiredScheduledTasks } from '@/api'

// In useEffect for loading data:
useEffect(() => {
  const init = async () => {
    // Cleanup expired tasks first
    const expiredCount = await cleanupExpiredScheduledTasks()
    if (expiredCount > 0) {
      console.log(`Cleaned up ${expiredCount} expired tasks`)
    }
    
    // Then load data
    loadLists()
    loadTasks()
    loadSchedule()
  }
  init()
}, [loadLists, loadTasks, loadSchedule])
```

---

## SECTION 11: Update ListPanel Props for Complete Handler

### File: `src/components/Lists/ListPanel.tsx`

#### 11.1 Add onTaskComplete to props interface

```tsx
interface ListPanelProps {
  // ... existing props
  onTaskComplete: (taskId: string) => void    // NEW
}
```

#### 11.2 Pass through to ListCard

```tsx
<ListCard
  // ... existing props
  onTaskComplete={onTaskComplete}
/>
```

### File: `src/app/page.tsx`

Pass the handler to ListPanel:

```tsx
<ListPanel
  // ... existing props
  onTaskComplete={handleTaskComplete}
/>
```

---

## Verification Checklist

After all sections:

- [ ] "Park" button renamed to "Quick Save"
- [ ] Placeholder says "Quick save a thought..."
- [ ] System lists show new names (Scheduled, TBD Grab Bag)
- [ ] Completed list exists and receives completed tasks
- [ ] TaskCard has Complete button (checkmark icon) on hover
- [ ] Clicking Complete moves task to Completed list
- [ ] Clicking Delete/Discard shows confirmation modal
- [ ] Confirming discard permanently deletes task
- [ ] Unscheduling a task moves it to TBD Grab Bag
- [ ] Scheduled list shows "Tasks here expire after 7 days" note
- [ ] Tasks older than 7 days in Scheduled list are auto-deleted on app load
- [ ] `npm run build` passes

---

## Commit Messages

1. `chore: Add migration to rename system lists`
2. `feat: Rename Park button to Quick Save`
3. `feat: Add Complete button to TaskCard`
4. `feat: Add ConfirmDialog component for discard confirmation`
5. `feat: Wire up Complete handler in ListCard`
6. `feat: Add discard confirmation flow`
7. `feat: Unschedule moves task to TBD Grab Bag`
8. `feat: Add expiry note to Scheduled list header`
9. `feat: Auto-cleanup expired tasks on app load`
10. `feat: Wire up ListPanel props for complete handler`

---

## Database Schema Note

You may need to update the `system_type` enum to include 'completed':

```sql
-- If system_type is an enum, alter it:
ALTER TYPE system_type ADD VALUE 'completed';

-- Or if it's just a text field with CHECK constraint, update the constraint
```

Check `SCHEMA.md` for current schema details before implementing.
