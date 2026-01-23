# FEATURES: Visual Polish + Fixes + Highlights

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**

---

## Overview

| Section | Feature |
|---------|---------|
| 1 | Fix Park button (400 error) |
| 2 | Rename "Parked" → "Parked Items" |
| 3 | Increase "Timeboxxer" title size by 4pt |
| 4 | Focus Mode: reddish-orange background |
| 5 | Visual polish: list card borders, shadows, depth |
| 6 | Add Tomorrow list automatically |
| 7 | Multiple highlights (up to 5) for date lists only |

---

## SECTION 1: Fix Park Button (400 Error)

The `createParkedThought()` function is missing required fields.

### 1.1 Update `src/api/tasks.ts`

Find the `createParkedThought` function and update it to include all required fields:

```typescript
export async function createParkedThought(title: string) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: DEV_USER_ID,
      list_id: PARKED_LIST_ID,
      title,
      duration_minutes: 15,
      color_index: Math.floor(Math.random() * 12),
      position: Date.now(),
      is_completed: false,
      is_daily: false,
      is_daily_highlight: false,
      energy_level: 'medium',
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

**Commit:**
```bash
git add -A && git commit -m "fix: Add all required fields to createParkedThought"
```

---

## SECTION 2: Rename "Parked" to "Parked Items"

### 2.1 Run SQL in Supabase Dashboard

```sql
UPDATE lists SET name = 'Parked Items' WHERE system_type = 'parked';
```

### 2.2 Update migration file for future reference

Update `supabase/migrations/003_energy_highlight_parked.sql`:

Change:
```sql
'Parked',
```

To:
```sql
'Parked Items',
```

**Commit:**
```bash
git add -A && git commit -m "fix: Rename Parked to Parked Items"
```

---

## SECTION 3: Increase "Timeboxxer" Title Size

### 3.1 Update `src/components/Layout/Header.tsx`

Find the Timeboxxer title (probably an h1 or div with the app name).

Change from something like:
```tsx
<h1 className="text-xl font-bold">Timeboxxer</h1>
```

To:
```tsx
<h1 className="text-2xl font-bold">Timeboxxer</h1>
```

Or if using explicit size, add 4pt (roughly 0.25rem):
```tsx
<h1 className="font-bold" style={{ fontSize: '1.5rem' }}>Timeboxxer</h1>
```

To:
```tsx
<h1 className="font-bold" style={{ fontSize: '1.75rem' }}>Timeboxxer</h1>
```

**Commit:**
```bash
git add -A && git commit -m "fix: Increase Timeboxxer title size"
```

---

## SECTION 4: Focus Mode Reddish-Orange Background

Make Focus Mode use a warm, high-contrast background instead of the task color.

### 4.1 Update `src/components/Focus/FocusMode.tsx`

Find the container div that sets the background color.

Change from:
```tsx
<div 
  className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
  style={{ backgroundColor: bgColor }}
>
```

To a fixed warm reddish-orange:
```tsx
<div 
  className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
  style={{ backgroundColor: '#E85D04' }}
>
```

Or use a gradient for more depth:
```tsx
<div 
  className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600"
>
```

**Remove the bgColor variable usage** since we're using a fixed color now.

Also update the text/button colors to ensure contrast:
- Timer text: white
- Buttons: white with dark text, or dark with white text

**Commit:**
```bash
git add -A && git commit -m "feat: Focus Mode uses warm reddish-orange background"
```

---

## SECTION 5: Visual Polish for List Cards

Add borders, shadows, and depth to list cards.

### 5.1 Update `src/components/Lists/ListCard.tsx`

Find the outer container div of the ListCard component.

**Update the className to add border, shadow, and background:**

From something like:
```tsx
<div className="rounded-lg overflow-hidden">
```

To:
```tsx
<div className="rounded-xl overflow-hidden border-2 border-border shadow-md bg-card">
```

Or for more visual impact:
```tsx
<div className="rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600 shadow-lg bg-white dark:bg-slate-800">
```

### 5.2 Add subtle hover effect (optional but nice)

```tsx
<div className="rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600 shadow-lg bg-white dark:bg-slate-800 transition-shadow hover:shadow-xl">
```

### 5.3 Update the header section for better contrast

If the list card has a header area, make it slightly different:

```tsx
<div className="p-3 border-b border-border bg-muted/30">
  {/* Header content */}
</div>
```

### 5.4 Ensure collapsed state still looks good

When collapsed, the card should still have the border and shadow:

```tsx
<div className={`rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600 shadow-lg bg-white dark:bg-slate-800 ${
  isCollapsed ? 'pb-0' : ''
}`}>
```

**Commit:**
```bash
git add -A && git commit -m "feat: Visual polish - list cards with borders, shadows, depth"
```

---

## SECTION 6: Add Tomorrow List Automatically

### 6.1 Create helper function in `src/lib/dateList.ts`

Add function to get tomorrow's list name:

```typescript
/**
 * Format tomorrow's date as a list name
 * e.g., "Jan 15, 2026"
 */
export function getTomorrowListName(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Get tomorrow's date in ISO format (YYYY-MM-DD)
 */
export function getTomorrowISO(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}
```

### 6.2 Update `src/api/lists.ts`

Add function to ensure tomorrow's list exists:

```typescript
import { getTodayListName, getTomorrowListName } from '@/lib/dateList'

export async function ensureTomorrowList() {
  const supabase = getSupabase()
  const tomorrowName = getTomorrowListName()
  
  // Check if tomorrow's list already exists
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('system_type', 'date')
    .eq('name', tomorrowName)
    .maybeSingle()
  
  if (existing) return existing
  
  // Create tomorrow's list
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: DEV_USER_ID,
      name: tomorrowName,
      position: 0,
      is_system: true,
      system_type: 'date',
    })
    .select()
    .single()
  
  if (error) {
    // If conflict, fetch it
    if (error.code === '23505') {
      const { data: refetched } = await supabase
        .from('lists')
        .select('*')
        .eq('system_type', 'date')
        .eq('name', tomorrowName)
        .single()
      return refetched
    }
    throw error
  }
  
  return data
}
```

### 6.3 Update `src/api/index.ts`

Add export:

```typescript
export { getLists, createList, updateList, deleteList, duplicateList, ensureTodayList, ensureTomorrowList } from './lists'
```

### 6.4 Update `src/state/useListStore.ts`

Update loadLists to also create tomorrow's list:

```typescript
import { getLists, createList as apiCreateList, updateList as apiUpdateList, deleteList as apiDeleteList, duplicateList as apiDuplicateList, ensureTodayList, ensureTomorrowList } from '@/api'

// In loadLists:
loadLists: async () => {
  // Ensure today's and tomorrow's date lists exist
  await ensureTodayList()
  await ensureTomorrowList()
  
  const data = await getLists()
  const sortedLists = sortListsForDisplay(data || [])
  set({ lists: sortedLists, loading: false })
},
```

### 6.5 Update sort order to show Today before Tomorrow

Update `src/lib/listSort.ts`:

The date lists should sort by their actual date, with today first, then tomorrow.

```typescript
/**
 * Sort lists for display:
 * 1. System lists first (date lists by date, then parked, then purgatory)
 * 2. User lists by position
 */
export function sortListsForDisplay<T extends List>(lists: T[]): T[] {
  return [...lists].sort((a, b) => {
    // System lists come first
    if (a.is_system && !b.is_system) return -1
    if (!a.is_system && b.is_system) return 1
    
    // Both system lists
    if (a.is_system && b.is_system) {
      // Date lists come first, sorted by name (which is the date)
      if (a.system_type === 'date' && b.system_type !== 'date') return -1
      if (a.system_type !== 'date' && b.system_type === 'date') return 1
      
      // Both date lists - sort by date (today before tomorrow)
      if (a.system_type === 'date' && b.system_type === 'date') {
        // Parse the date from the name and compare
        const dateA = new Date(a.name)
        const dateB = new Date(b.name)
        return dateA.getTime() - dateB.getTime()
      }
      
      // Other system lists: parked before purgatory
      const order: Record<string, number> = { parked: 1, purgatory: 2 }
      const orderA = order[a.system_type || ''] ?? 99
      const orderB = order[b.system_type || ''] ?? 99
      return orderA - orderB
    }
    
    // Both user lists: sort by position
    return a.position - b.position
  })
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Auto-create Tomorrow list alongside Today"
```

---

## SECTION 7: Multiple Highlights (Up to 5 per Date List)

Allow up to 5 highlighted tasks per date list (Today/Tomorrow).

### 7.1 Update highlight toggle logic in `src/app/page.tsx`

Find `handleHighlightToggle` and replace it:

```typescript
const handleHighlightToggle = async (taskId: string) => {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return
  
  // Check if this task is in a date list
  const taskList = lists.find(l => l.id === task.list_id)
  if (!taskList || taskList.system_type !== 'date') {
    // Only date lists can have highlights
    console.warn('Highlights only available for date lists (Today/Tomorrow)')
    return
  }
  
  if (task.is_daily_highlight) {
    // Just remove highlight
    await updateTask(taskId, { is_daily_highlight: false })
  } else {
    // Check how many highlights already exist in this list
    const highlightsInList = tasks.filter(t => 
      t.list_id === task.list_id && t.is_daily_highlight
    ).length
    
    if (highlightsInList >= 5) {
      // Show alert or toast - max 5 highlights
      alert('Maximum 5 highlights per day. Remove one first.')
      return
    }
    
    // Add highlight
    await updateTask(taskId, { is_daily_highlight: true })
  }
}
```

### 7.2 Update TaskCard to only show highlight option for date lists

Update `src/components/Tasks/TaskCard.tsx`:

**Add prop to indicate if highlighting is allowed:**

```typescript
interface TaskCardProps {
  // ... existing props
  canHighlight: boolean  // ADD THIS
}
```

**Update destructuring:**

```typescript
export function TaskCard({
  // ... existing props
  canHighlight,
}: TaskCardProps) {
```

**Conditionally show the highlight button:**

```tsx
{/* Highlight toggle - only for date lists */}
{canHighlight && (
  <button
    onClick={(e) => { e.stopPropagation(); onHighlightToggle(); }}
    className={`h-6 w-6 flex items-center justify-center rounded transition-opacity ${
      isHighlight ? 'opacity-100' : 'opacity-0 group-hover:opacity-50 hover:!opacity-100'
    }`}
    title={isHighlight ? 'Remove highlight' : 'Set as highlight (max 5)'}
  >
    {isHighlight ? '⭐' : '☆'}
  </button>
)}
```

### 7.3 Update ListCard to pass canHighlight

Update `src/components/Lists/ListCard.tsx`:

**Add to props interface:**

```typescript
interface ListCardProps {
  // ... existing props
  isDateList: boolean  // ADD THIS
}
```

**Pass to TaskCard:**

```tsx
<TaskCard
  // ... existing props
  canHighlight={isDateList}
/>
```

### 7.4 Update ListPanel to pass isDateList

Update `src/components/Lists/ListPanel.tsx`:

When rendering ListCard, pass:

```tsx
<ListCard
  // ... existing props
  isDateList={list.system_type === 'date'}
/>
```

**Commit:**
```bash
git add -A && git commit -m "feat: Multiple highlights (up to 5) for date lists only"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ Park button works — thought saves to "Parked Items" list
2. ✅ List is named "Parked Items" not "Parked"
3. ✅ "Timeboxxer" title is larger
4. ✅ Focus Mode has warm reddish-orange background
5. ✅ Focus Mode is clearly visible in both light and dark mode
6. ✅ List cards have thick borders and shadows
7. ✅ List cards look polished, not like floating text
8. ✅ Tomorrow's date list auto-creates on app load
9. ✅ Today's list shows before Tomorrow's list
10. ✅ Can highlight up to 5 tasks in Today's list
11. ✅ Can highlight up to 5 tasks in Tomorrow's list
12. ✅ Trying to add 6th highlight shows warning
13. ✅ Regular lists (Intabyu, Timeboxer) don't show highlight star

---

## SQL to Run Manually

Before running Claude Code, run this in Supabase:

```sql
UPDATE lists SET name = 'Parked Items' WHERE system_type = 'parked';
```

---

## Summary

| File | Changes |
|------|---------|
| `src/api/tasks.ts` | Fix createParkedThought fields |
| `src/lib/dateList.ts` | Add getTomorrowListName, getTomorrowISO |
| `src/api/lists.ts` | Add ensureTomorrowList |
| `src/api/index.ts` | Export ensureTomorrowList |
| `src/state/useListStore.ts` | Call ensureTomorrowList on load |
| `src/lib/listSort.ts` | Sort date lists by date |
| `src/components/Layout/Header.tsx` | Larger title |
| `src/components/Focus/FocusMode.tsx` | Reddish-orange background |
| `src/components/Lists/ListCard.tsx` | Borders, shadows, depth + isDateList prop |
| `src/components/Lists/ListPanel.tsx` | Pass isDateList |
| `src/components/Tasks/TaskCard.tsx` | canHighlight prop |
| `src/app/page.tsx` | Multi-highlight logic (max 5 per date list) |
