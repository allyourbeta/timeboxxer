# Spec: Clear List and Delete List

## Overview

Replace the current list menu options with a simpler, safer pattern:

**Current menu:** Rename, Duplicate, Delete List
**New menu:** Rename, Clear List, Delete List

- **Clear List**: Deletes all tasks in the list (with confirmation). List remains.
- **Delete List**: Removes the list itself. Only works if the list is empty. No confirmation needed.

This eliminates the bug where deleting a list with tasks causes a database constraint violation.

---

## Files to Modify

1. `src/components/Lists/ListCardMenu.tsx` - Update menu options
2. `src/components/Lists/ListCard.tsx` - Update props and pass handlers
3. `src/components/Lists/ListPanel.tsx` - Update props passed to ListCard
4. `src/hooks/useAppHandlers.ts` - Add `handleClearList` handler, modify `handleDeleteListClick`
5. `src/api/tasks.ts` - Add `clearTasksInList` function
6. `src/state/useTaskStore.ts` - Add `clearTasksInList` action
7. `src/app/page.tsx` - Add state for clear list confirmation dialog

---

## Detailed Changes

### 1. src/api/tasks.ts

Add a new function to delete all tasks in a list:

```typescript
/**
 * Delete all tasks in a list
 * @param listId - The list to clear
 * @returns Number of tasks deleted
 */
export async function clearTasksInList(listId: string): Promise<number> {
  const supabase = createClient()
  
  // First count how many will be deleted (for return value)
  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('home_list_id', listId)
  
  // Delete all tasks in this list
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('home_list_id', listId)
  
  if (error) throw error
  return count || 0
}
```

Add to the exports in `src/api/index.ts`:
```typescript
export { clearTasksInList } from './tasks'
```

---

### 2. src/state/useTaskStore.ts

Add a new action to clear tasks and update local state:

```typescript
// Add to the interface
clearTasksInList: (listId: string) => Promise<number>

// Add to the store implementation
clearTasksInList: async (listId) => {
  const count = await apiClearTasksInList(listId)
  
  // Remove these tasks from local state
  set({
    tasks: get().tasks.filter(t => t.home_list_id !== listId)
  })
  
  return count
}
```

Import the API function:
```typescript
import { clearTasksInList as apiClearTasksInList } from '@/api'
```

---

### 3. src/hooks/useAppHandlers.ts

Add handler for clearing a list. Modify the delete handler.

```typescript
// Add state for clear list confirmation (near other state declarations around line 42-47)
const [clearListConfirm, setClearListConfirm] = useState<{
  listId: string
  listName: string
  taskCount: number
} | null>(null)

// Add the clear list handler
const handleClearListClick = (listId: string) => {
  const list = lists.find(l => l.id === listId)
  if (!list) return
  
  // Count tasks in this list
  const taskCount = tasks.filter(t => t.home_list_id === listId).length
  
  if (taskCount === 0) {
    // No tasks to clear, do nothing (or show a toast "List is already empty")
    return
  }
  
  // Show confirmation dialog
  setClearListConfirm({
    listId,
    listName: list.name,
    taskCount,
  })
}

const handleClearListConfirm = async () => {
  if (!clearListConfirm) return
  
  const { clearTasksInList } = useTaskStore.getState()
  await clearTasksInList(clearListConfirm.listId)
  
  setClearListConfirm(null)
}

const handleClearListCancel = () => {
  setClearListConfirm(null)
}

// Modify handleDeleteListClick to only allow deletion of empty lists
const handleDeleteListClick = async (listId: string) => {
  const list = lists.find(l => l.id === listId)
  if (!list) return
  
  // Block system lists (Parked Items)
  if (list.system_type === 'parked') return
  
  // Block today and future date lists
  if (list.system_type === 'date') {
    const listDate = new Date(list.list_date!)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    listDate.setHours(0, 0, 0, 0)
    if (listDate >= today) return
  }
  
  // Check if list has tasks
  const taskCount = tasks.filter(t => t.home_list_id === listId).length
  if (taskCount > 0) {
    // List is not empty - don't delete
    // The UI should prevent this, but this is a safety check
    console.warn('Cannot delete non-empty list. Clear it first.')
    return
  }
  
  // List is empty, safe to delete
  await deleteList(listId)
}

// Add to the return statement
return {
  // ... existing returns ...
  
  // Clear list
  clearListConfirm,
  handleClearListClick,
  handleClearListConfirm,
  handleClearListCancel,
}
```

---

### 4. src/components/Lists/ListCardMenu.tsx

Replace Duplicate with Clear List. Update props and rendering.

**Changes to props interface:**
```typescript
interface ListCardMenuProps {
  isSystemList: boolean
  canDelete: boolean
  taskCount: number  // NEW: needed to determine if list can be deleted
  onEdit: () => void
  onClearList: () => void  // NEW: replaces onDuplicate
  onDelete: () => void
}
```

**Changes to component:**
```typescript
import { MoreVertical, Trash2, Eraser, Edit2 } from 'lucide-react'  // Replace Copy with Eraser

export function ListCardMenu({
  isSystemList,
  canDelete,
  taskCount,  // NEW
  onEdit,
  onClearList,  // NEW: replaces onDuplicate
  onDelete,
}: ListCardMenuProps) {
  // ... existing state and useEffect ...

  // Determine if delete should be disabled
  const canDeleteNow = canDelete && taskCount === 0

  return (
    <div ref={menuRef}>
      {/* ... existing button ... */}

      {showMenu && menuPosition && (
        <div
          className="fixed w-44 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 py-1"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
          }}
        >
          {!isSystemList && (
            <>
              {/* Rename - unchanged */}
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
              
              {/* Clear List - NEW (replaces Duplicate) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onClearList()
                }}
                disabled={taskCount === 0}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                  taskCount === 0 
                    ? 'text-muted-foreground cursor-not-allowed' 
                    : 'text-popover-foreground hover:bg-accent'
                }`}
              >
                <Eraser className="h-4 w-4" />
                Clear List
                {taskCount > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {taskCount}
                  </span>
                )}
              </button>
            </>
          )}
          
          {/* Delete List - modified */}
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                if (!canDeleteNow) return  // Safety check
                setShowMenu(false)
                onDelete()
              }}
              disabled={!canDeleteNow}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                canDeleteNow
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-muted-foreground cursor-not-allowed'
              }`}
              title={!canDeleteNow ? 'Clear list first' : undefined}
            >
              <Trash2 className="h-4 w-4" />
              Delete List
              {!canDeleteNow && taskCount > 0 && (
                <span className="text-xs ml-auto">Clear first</span>
              )}
            </button>
          )}
          
          {isSystemList && !canDelete && (
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

---

### 5. src/components/Lists/ListCard.tsx

Update props interface and pass new props to ListCardMenu.

**Changes to props interface (around line 12-41):**

Remove:
```typescript
onStartDuplicate: () => void
onFinishDuplicate: (newName: string) => void
onCancelDuplicate: () => void
```

Add:
```typescript
onClearList: () => void
```

Remove from component parameters:
```typescript
onStartDuplicate,
onFinishDuplicate,
onCancelDuplicate,
```

Add to component parameters:
```typescript
onClearList,
```

**Remove `isDuplicating` prop** - it's no longer needed.

Remove from props interface:
```typescript
isDuplicating: boolean
```

Remove from component parameters:
```typescript
isDuplicating,
```

**Update ListCardMenu usage (around line 162-170):**

Change from:
```tsx
<ListCardMenu
  isSystemList={isSystemList}
  canDelete={canDeleteList()}
  onEdit={onStartEdit}
  onDuplicate={onStartDuplicate}
  onDelete={onDelete}
/>
```

To:
```tsx
<ListCardMenu
  isSystemList={isSystemList}
  canDelete={canDeleteList()}
  taskCount={tasks.length}
  onEdit={onStartEdit}
  onClearList={onClearList}
  onDelete={onDelete}
/>
```

**Remove the duplicate input section** (around line 253-275):
Delete this entire block:
```tsx
{/* Duplicate input */}
{isDuplicating && (
  <div className="px-4 pb-4">
    <Input
      type="text"
      placeholder="New list name..."
      value={duplicateName}
      // ... etc
    />
  </div>
)}
```

**Remove the `duplicateName` state** (around line 74):
Delete:
```typescript
const [duplicateName, setDuplicateName] = useState(`${name} Copy`)
```

---

### 6. src/components/Lists/ListPanel.tsx

Update props passed to ListCard.

**Remove these props from ListPanelProps interface:**
```typescript
duplicatingListId: string | null
onSetDuplicatingListId: (listId: string | null) => void
onDuplicateList: (listId: string, newName: string) => void
```

**Add this prop:**
```typescript
onClearList: (listId: string) => void
```

**Update ListCard usage (around line 155-197):**

Remove:
```tsx
isDuplicating={duplicatingListId === list.id}
onStartDuplicate={() => onSetDuplicatingListId(list.id)}
onFinishDuplicate={(name) => {
  onDuplicateList(list.id, name)
  onSetDuplicatingListId(null)
}}
onCancelDuplicate={() => onSetDuplicatingListId(null)}
```

Add:
```tsx
onClearList={() => onClearList(list.id)}
```

---

### 7. src/app/page.tsx

Update to use new handlers and remove duplicate-related state.

**Remove from useUIStore destructuring (around line 26-27):**
```typescript
duplicatingListId, setDuplicatingListId,
```

**Remove from useAppHandlers destructuring (around line 54):**
```typescript
handleListDuplicate,
```

**Add to useAppHandlers destructuring:**
```typescript
clearListConfirm,
handleClearListClick,
handleClearListConfirm,
handleClearListCancel,
```

**Update ListPanel props (around line 223-257):**

Remove:
```tsx
duplicatingListId={duplicatingListId}
onSetDuplicatingListId={setDuplicatingListId}
onDuplicateList={handleListDuplicate}
```

Add:
```tsx
onClearList={handleClearListClick}
```

**Add the Clear List confirmation dialog** (near the other dialogs, around line 305-315):

```tsx
{/* Clear List Confirmation Dialog */}
<ConfirmDialog
  isOpen={!!clearListConfirm}
  title="Clear this list?"
  message={`Delete all ${clearListConfirm?.taskCount} task${clearListConfirm?.taskCount === 1 ? '' : 's'} in "${clearListConfirm?.listName}"? This cannot be undone.`}
  confirmLabel="Clear List"
  cancelLabel="Cancel"
  confirmVariant="destructive"
  onConfirm={handleClearListConfirm}
  onCancel={handleClearListCancel}
/>
```

---

### 8. src/state/useUIStore.ts

Remove duplicate-related state if it exists there. Check and remove:
```typescript
duplicatingListId: string | null
setDuplicatingListId: (id: string | null) => void
```

---

## Testing Checklist

After implementation, verify ALL of these work:

### Clear List

- [ ] Click menu on a list with tasks → "Clear List" is enabled and shows task count
- [ ] Click "Clear List" → Confirmation dialog appears with correct task count and list name
- [ ] Click "Cancel" → Dialog closes, no tasks deleted
- [ ] Click "Clear List" (confirm) → All tasks in that list are deleted, list remains
- [ ] List now shows 0 tasks
- [ ] Clicking menu again → "Clear List" is disabled (greyed out)

### Delete List

- [ ] On a list with tasks: "Delete List" shows "Clear first" hint and is disabled
- [ ] On an empty list: "Delete List" is enabled
- [ ] Click "Delete List" on empty list → List is deleted immediately (no confirmation)
- [ ] List disappears from the UI

### System Lists

- [ ] Parked Items list → Menu shows "System list", no Clear or Delete options
- [ ] Date lists (today/tomorrow) → Cannot delete (existing behavior preserved)
- [ ] Past date lists → Can clear and delete

### Edge Cases

- [ ] Clear a list, then delete it → Works correctly
- [ ] Create new list, delete immediately (empty) → Works
- [ ] Clear list with scheduled tasks → Tasks removed from calendar too
- [ ] Console shows no errors for any operation

---

## What NOT to Change

- Do not modify the Rename functionality
- Do not modify how tasks are displayed in lists
- Do not modify drag-drop functionality
- Do not add any new features beyond Clear List and Delete List
- Do not change the API's `deleteList` function (it will now only be called on empty lists)

---

## Summary of Removed Code

The following should be completely removed:

1. All "Duplicate" functionality:
   - `onDuplicate` prop and handler
   - `isDuplicating` state
   - `duplicatingListId` state
   - `setDuplicatingListId` action
   - `handleListDuplicate` handler
   - `onStartDuplicate`, `onFinishDuplicate`, `onCancelDuplicate` props
   - The duplicate input UI in ListCard
   - The `duplicateList` API call (can remain in api/lists.ts but won't be used)

2. The `Copy` icon import in ListCardMenu (replace with `Eraser`)

---

## Definition of Done

This task is complete when:

1. Menu shows: Rename, Clear List, Delete List (not Duplicate)
2. Clear List shows confirmation, deletes all tasks, keeps list
3. Delete List only works on empty lists, no confirmation
4. All items in Testing Checklist pass
5. No console errors
6. Build passes
