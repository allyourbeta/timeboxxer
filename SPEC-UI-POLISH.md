# SPEC: UI Polish - Complete Icon, Column Toggle, Three Dots, Expiry

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**
4. **Read existing code before modifying.**

---

## Overview

| Section | Feature | Effort |
|---------|---------|--------|
| 1 | Make Complete icon more visible | Small |
| 2 | Add 1/2 column toggle for list panel | Small |
| 3 | Move three dots menu to header row | Small |
| 4 | Add 7-day expiry message to Scheduled list | Small |
| 5 | Implement 7-day auto-cleanup on app load | Small |

---

## SECTION 1: Make Complete Icon More Visible

### Problem
The complete (checkmark) icon on task cards is too small and only appears on hover, making it easy to miss.

### File: `src/components/Tasks/TaskCard.tsx`

### Current behavior
- Icon is `h-4 w-4` (16px)
- Only visible on hover (`opacity-0 group-hover:opacity-60`)
- Just an outline icon

### New behavior
- Icon is `h-5 w-5` (20px)
- Always visible at 40% opacity, full opacity on hover
- Green circle background on hover for better affordance

### Find the Complete button (should be near the Delete button)

**Current code (approximately):**
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
```

**New code:**
```tsx
{/* Complete - always visible, more prominent */}
<button
  onClick={(e) => {
    e.stopPropagation()
    onComplete()
  }}
  className="opacity-40 hover:opacity-100 transition-all hover:scale-110"
  title="Mark as complete"
>
  <CheckCircle className="h-5 w-5 text-white hover:text-green-400 hover:drop-shadow-[0_0_4px_rgba(74,222,128,0.8)]" />
</button>
```

**Explanation:**
- `h-5 w-5` — Larger icon (20px instead of 16px)
- `opacity-40 hover:opacity-100` — Always visible at 40%, full on hover
- `hover:scale-110` — Slight grow effect on hover
- `hover:drop-shadow-[...]` — Green glow on hover for extra emphasis

---

## SECTION 2: Add 1/2 Column Toggle for List Panel

### Problem
In split view (lists + calendar), some users may prefer a single column of lists instead of two columns.

### Files to modify:
- `src/state/useUIStore.ts` — Add state
- `src/components/Layout/Header.tsx` — Add toggle button
- `src/components/Lists/ListPanel.tsx` — Apply column count
- `src/app/page.tsx` — Wire up props

### 2.1 Add state to useUIStore.ts

**Add to interface (around line 36):**
```tsx
// List column layout
listColumnCount: 1 | 2
setListColumnCount: (count: 1 | 2) => void
```

**Add to store implementation (around line 71):**
```tsx
listColumnCount: 2,
setListColumnCount: (count) => set({ listColumnCount: count }),
```

### 2.2 Add toggle button to Header.tsx

**Add import:**
```tsx
import { Columns2, Columns3 } from 'lucide-react'
// Note: Columns2 = single column icon, Columns3 = two columns icon
// Or use LayoutList for 1-col, LayoutGrid for 2-col
```

Actually, let's use simpler icons:
```tsx
import { Rows3, Columns2 } from 'lucide-react'
```

**Add props to HeaderProps interface:**
```tsx
listColumnCount: 1 | 2
onListColumnCountChange: (count: 1 | 2) => void
```

**Add toggle button after the Collapse All button (around line 125), only show in main view:**
```tsx
{/* Column toggle - only show on main view when lists are visible */}
{currentView === 'main' && (panelMode === 'both' || panelMode === 'lists-only') && (
  <div className="flex h-9 items-center bg-muted rounded-lg p-1">
    <Button
      variant={listColumnCount === 1 ? 'default' : 'ghost'}
      size="sm"
      onClick={() => onListColumnCountChange(1)}
      className="h-7 px-2"
      title="Single column"
    >
      <Rows3 className="h-4 w-4" />
    </Button>
    <Button
      variant={listColumnCount === 2 ? 'default' : 'ghost'}
      size="sm"
      onClick={() => onListColumnCountChange(2)}
      className="h-7 px-2"
      title="Two columns"
    >
      <Columns2 className="h-4 w-4" />
    </Button>
  </div>
)}
```

### 2.3 Update ListPanel.tsx to use dynamic column count

**Add prop to interface:**
```tsx
columnCount: 1 | 2
```

**Update the container div (around line 161):**

**Current:**
```tsx
<div className="p-4" style={{ columnCount: 2, columnGap: '1rem' }}>
```

**New:**
```tsx
<div className="p-4" style={{ columnCount: columnCount, columnGap: '1rem' }}>
```

### 2.4 Wire up in page.tsx

**Get from store:**
```tsx
const {
  // ... existing
  listColumnCount, setListColumnCount,
} = useUIStore()
```

**Pass to Header (both instances):**
```tsx
<Header
  // ... existing props
  listColumnCount={listColumnCount}
  onListColumnCountChange={setListColumnCount}
/>
```

**Pass to ListPanel:**
```tsx
<ListPanel
  // ... existing props
  columnCount={listColumnCount}
/>
```

---

## SECTION 3: Move Three Dots Menu to Header Row

### Problem
The three dots menu is on its own row, wasting vertical space.

### File: `src/components/Lists/ListCard.tsx`

### Current structure (approximately):
```tsx
{/* Header - always visible */}
<button onClick={onToggleExpand} className="...">
  {/* List name, task count, chevron */}
</button>

{/* Action buttons - only when expanded */}
{!isEditing && isExpanded && (
  <div className="px-4 pb-2">
    <div className="flex justify-end gap-2">
      <ListCardMenu ... />
    </div>
  </div>
)}

{/* Expanded content */}
{isExpanded && (
  ...
)}
```

### New structure:
Move the ListCardMenu INTO the header button row.

**Find the header section and modify it:**

**Current header (approximately lines 173-209):**
```tsx
<button
  onClick={onToggleExpand}
  className="w-full p-4 flex items-center justify-between group hover:bg-muted/30 transition-colors border-b border-border"
>
  <div className="flex items-center gap-3">
    {/* Colored accent bar */}
    <div 
      className="w-1 h-8 rounded-full"
      style={{ backgroundColor: getFirstTaskColor() }}
    />
    <div className="text-left">
      <h3 className="font-semibold text-card-foreground" ...>
        {name}
      </h3>
      <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
    </div>
  </div>
  
  {/* Expand/collapse icon */}
  <div className={`w-8 h-8 rounded-full bg-muted/50 ...`}>
    <ChevronDown className="w-4 h-4 text-muted-foreground" />
  </div>
</button>
```

**New header:**
```tsx
<div className="p-4 flex items-center justify-between border-b border-border">
  {/* Left side - clickable to toggle expand */}
  <button
    onClick={onToggleExpand}
    className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
  >
    {/* Colored accent bar */}
    <div 
      className="w-1 h-8 rounded-full flex-shrink-0"
      style={{ backgroundColor: getFirstTaskColor() }}
    />
    <div>
      <h3 
        className="font-semibold text-card-foreground"
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (!isSystemList) {
            onStartEdit()
          }
        }}
      >
        {name}
      </h3>
      <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
    </div>
  </button>
  
  {/* Right side - menu and chevron */}
  <div className="flex items-center gap-2">
    {/* Three dots menu - only when expanded */}
    {isExpanded && !isEditing && (
      <ListCardMenu
        isSystemList={isSystemList}
        canDelete={canDeleteList()}
        onEdit={onStartEdit}
        onDuplicate={onStartDuplicate}
        onDelete={onDelete}
      />
    )}
    
    {/* Expand/collapse icon */}
    <button
      onClick={onToggleExpand}
      className={`w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
    >
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </button>
  </div>
</div>
```

**IMPORTANT:** Remove the old separate action buttons section:
```tsx
{/* DELETE THIS ENTIRE BLOCK */}
{!isEditing && isExpanded && (
  <div className="px-4 pb-2">
    <div className="flex justify-end gap-2">
      <ListCardMenu ... />
    </div>
  </div>
)}
```

**Also fix the grammar:** Change `{tasks.length} tasks` to `{tasks.length} task{tasks.length !== 1 ? 's' : ''}` for proper singular/plural.

---

## SECTION 4: Add 7-Day Expiry Message to Scheduled List

### Problem
Users don't know that tasks in the Scheduled list expire after 7 days.

### File: `src/components/Lists/ListCard.tsx`

### Add a note at the top of the expanded content for Scheduled list

**Find the expanded content section (after the header):**
```tsx
{isExpanded && (
  <div className="px-4 pb-4">
    <DragDropContext onDragEnd={handleDragEnd}>
```

**Add this right after the opening div, before DragDropContext:**
```tsx
{isExpanded && (
  <div className="px-4 pb-4">
    {/* Expiry notice for Scheduled list */}
    {isInbox && tasks.length > 0 && (
      <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          ⏳ Tasks here expire after 7 days if not moved to another list.
        </p>
      </div>
    )}
    
    <DragDropContext onDragEnd={handleDragEnd}>
```

**Note:** We're using `isInbox` prop which corresponds to `system_type === 'purgatory'` (the Scheduled list). This is a bit confusing naming but matches the existing code.

---

## SECTION 5: Implement 7-Day Auto-Cleanup on App Load

### Problem
Tasks in the Scheduled list should be automatically deleted after 7 days.

### File: `src/api/tasks.ts`

### Add cleanup function at the end of the file:

```tsx
export async function cleanupExpiredScheduledTasks(): Promise<number> {
  const supabase = getSupabase()
  
  // Calculate the date 7 days ago
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoffDate = sevenDaysAgo.toISOString()
  
  // First, get the Scheduled list ID (system_type = 'purgatory')
  const { data: scheduledList, error: listError } = await supabase
    .from('lists')
    .select('id')
    .eq('system_type', 'purgatory')
    .single()
  
  if (listError || !scheduledList) {
    console.log('No Scheduled list found, skipping cleanup')
    return 0
  }
  
  // Delete tasks that have been in the Scheduled list for more than 7 days
  // We use moved_to_purgatory_at to track when they entered
  const { data: deletedTasks, error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('list_id', scheduledList.id)
    .lt('moved_to_purgatory_at', cutoffDate)
    .select('id')
  
  if (deleteError) {
    console.error('Error cleaning up expired tasks:', deleteError)
    return 0
  }
  
  const count = deletedTasks?.length || 0
  if (count > 0) {
    console.log(`Cleaned up ${count} expired task(s) from Scheduled list`)
  }
  
  return count
}
```

### File: `src/api/index.ts`

**Add export:**
```tsx
export { cleanupExpiredScheduledTasks } from './tasks'
```

### File: `src/app/page.tsx`

**Add import:**
```tsx
import { cleanupExpiredScheduledTasks } from '@/api'
```

**Update the useEffect that loads data (around line 64-68):**

**Current:**
```tsx
useEffect(() => {
  loadLists()
  loadTasks()
  loadSchedule()
}, [loadLists, loadTasks, loadSchedule])
```

**New:**
```tsx
useEffect(() => {
  const init = async () => {
    // Clean up expired tasks first
    await cleanupExpiredScheduledTasks()
    
    // Then load fresh data
    loadLists()
    loadTasks()
    loadSchedule()
  }
  init()
}, [loadLists, loadTasks, loadSchedule])
```

---

## Verification Checklist

After all sections:

- [ ] Complete icon is larger (h-5 w-5) and always visible at 40% opacity
- [ ] Complete icon glows green on hover
- [ ] Column toggle appears in header (1 or 2 columns)
- [ ] Clicking 1-column shows lists in single column
- [ ] Clicking 2-columns shows lists in two columns (default)
- [ ] Three dots menu is in the header row, next to chevron
- [ ] No separate row for three dots menu
- [ ] Task count shows proper singular/plural ("1 task" vs "2 tasks")
- [ ] Scheduled list shows expiry warning when expanded and has tasks
- [ ] Expired tasks (>7 days in Scheduled) are deleted on app load
- [ ] `npm run build` passes

---

## Commit Messages

1. `feat: Make Complete icon larger and always visible with hover glow`
2. `feat: Add 1/2 column toggle for list panel`
3. `refactor: Move three dots menu to header row, fix task count plural`
4. `feat: Add 7-day expiry warning to Scheduled list`
5. `feat: Auto-cleanup tasks older than 7 days in Scheduled list`
