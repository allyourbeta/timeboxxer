# SPEC: Masonry Layout for List Cards

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**

---

## Overview

**Problem:** Currently, list cards are in a CSS grid where rows have equal height. When Jan 15 (with many tasks) is expanded and Jan 16 (empty) is collapsed, Jan 16's card has a huge empty white space below it because it stretches to match the row height.

**Solution:** Switch from CSS Grid to CSS `column-count` for a masonry-style layout where cards pack tightly and collapsed cards shrink to their natural height.

| Section | Change |
|---------|--------|
| 1 | Simplify expansion state (track expanded list IDs, not by column) |
| 2 | Change ListPanel from grid to column-count layout |
| 3 | Add `break-inside: avoid` to ListCard to prevent splitting |
| 4 | Update initialization logic for empty lists |

---

## SECTION 1: Simplify Expansion State

### Problem
The current `expandedListByColumn` approach assumes lists are assigned to specific columns. With masonry layout, CSS decides column placement, so we can't know which column a list is in. We need to simplify to just track which lists are expanded.

### File: `src/state/useUIStore.ts`

### Current Code (lines 29-32, 59-69)
```tsx
// Collapsible lists (multi-column layout)
expandedListByColumn: Record<number, string | null>
toggleListExpanded: (listId: string, column: number) => void
collapseAllLists: () => void

// ...

expandedListByColumn: { 0: null, 1: null, 2: null },
toggleListExpanded: (listId, column) => set((state) => ({
  expandedListByColumn: {
    ...state.expandedListByColumn,
    [column]: state.expandedListByColumn[column] === listId ? null : listId
  }
})),

collapseAllLists: () => set({
  expandedListByColumn: { 0: null, 1: null, 2: null }
}),
```

### New Code
Replace the above with:

```tsx
// Collapsible lists - track which lists are expanded
expandedListIds: Set<string>
toggleListExpanded: (listId: string) => void
collapseAllLists: () => void

// ...

expandedListIds: new Set<string>(),
toggleListExpanded: (listId) => set((state) => {
  const newSet = new Set(state.expandedListIds)
  if (newSet.has(listId)) {
    newSet.delete(listId)
  } else {
    newSet.add(listId)
  }
  return { expandedListIds: newSet }
}),

collapseAllLists: () => set({
  expandedListIds: new Set<string>()
}),
```

### Also update the interface (lines 29-32)
```tsx
// Collapsible lists
expandedListIds: Set<string>
toggleListExpanded: (listId: string) => void
collapseAllLists: () => void
```

### Note on Set serialization
Zustand handles Set fine in memory, but if you ever add persistence, you'd need to convert to/from array. For now, Set works.

---

## SECTION 2: Update ListPanel Layout

### File: `src/components/Lists/ListPanel.tsx`

### Change 1: Update the container div (around line 161-162)

**Current:**
```tsx
return (
  <div ref={containerRef} className="border-r border-theme overflow-y-auto">
    <div className="grid grid-cols-2 gap-4 p-4">
```

**New:**
```tsx
return (
  <div ref={containerRef} className="border-r border-theme overflow-y-auto">
    <div className="p-4" style={{ columnCount: 2, columnGap: '1rem' }}>
```

We use inline style for `columnCount` because Tailwind doesn't have great support for CSS columns. The `columnGap: '1rem'` replaces the grid's `gap-4`.

### Change 2: Update props interface

Find the props interface (around line 44):
```tsx
expandedListByColumn: Record<number, string | null>
```

Change to:
```tsx
expandedListIds: Set<string>
```

### Change 3: Update onToggleListExpanded prop type (around line 53)

**Current:**
```tsx
onToggleListExpanded: (listId: string, column: number) => void
```

**New:**
```tsx
onToggleListExpanded: (listId: string) => void
```

### Change 4: Update the list mapping (around lines 163-180)

**Current:**
```tsx
{lists.map((list, index) => {
  const column = index % 2
  const isExpanded = expandedListByColumn[column] === list.id
  return (
    <ListCard
      key={list.id}
      // ... other props
      isExpanded={isExpanded}
      onToggleExpand={() => onToggleListExpanded(list.id, column)}
```

**New:**
```tsx
{lists.map((list) => {
  const isExpanded = expandedListIds.has(list.id)
  return (
    <ListCard
      key={list.id}
      // ... other props
      isExpanded={isExpanded}
      onToggleExpand={() => onToggleListExpanded(list.id)}
```

Note: Remove `index` from the map since we no longer need it for column calculation.

### Change 5: Update the initialization useEffect (around lines 121-144)

**Current logic:** Expands first list with tasks in each column.

**New logic:** Expand the first list that has tasks (just one, to start clean).

```tsx
// Initialize expansion state - expand first list with tasks
useEffect(() => {
  // Only run once when lists are first loaded
  if (hasInitializedExpansion.current || lists.length === 0) return
  hasInitializedExpansion.current = true
  
  // Find first list with tasks and expand it
  const firstWithTasks = lists.find(list => {
    const taskCount = tasks.filter(t => t.list_id === list.id && !t.is_completed).length
    return taskCount > 0
  })
  
  if (firstWithTasks && expandedListIds.size === 0) {
    onToggleListExpanded(firstWithTasks.id)
  }
}, [lists, tasks, expandedListIds, onToggleListExpanded])
```

### Change 6: Remove the `column` variable from getTasksForList area

The `column` variable is no longer needed anywhere. Make sure it's fully removed.

---

## SECTION 3: Prevent Card Splitting with break-inside

### Problem
CSS columns can split an element across columns if it's tall. We need to prevent this.

### File: `src/components/Lists/ListCard.tsx`

### Find the outer container div (around line 150)

**Current:**
```tsx
return (
  <div className={`
    rounded-xl overflow-hidden border-2 border-border shadow-lg bg-card transition-all duration-200
    ${isExpanded 
      ? 'shadow-xl' 
      : 'hover:shadow-xl'
    }
  `}>
```

**New:**
```tsx
return (
  <div 
    className={`
      rounded-xl overflow-hidden border-2 border-border shadow-lg bg-card transition-all duration-200
      ${isExpanded 
        ? 'shadow-xl' 
        : 'hover:shadow-xl'
      }
    `}
    style={{ breakInside: 'avoid', marginBottom: '1rem' }}
  >
```

**Explanation:**
- `breakInside: 'avoid'` — Prevents the card from being split across columns
- `marginBottom: '1rem'` — Adds vertical spacing between cards (replaces the grid's gap for vertical direction)

---

## SECTION 4: Update page.tsx Props

### File: `src/app/page.tsx`

### Change 1: Update the destructuring from useUIStore

**Current (around line 26-27):**
```tsx
expandedListByColumn, toggleListExpanded,
```

**New:**
```tsx
expandedListIds, toggleListExpanded,
```

### Change 2: Update ListPanel props (appears twice - around lines 175-200 for main view)

**Current:**
```tsx
expandedListByColumn={expandedListByColumn}
onToggleListExpanded={toggleListExpanded}
```

**New:**
```tsx
expandedListIds={expandedListIds}
onToggleListExpanded={toggleListExpanded}
```

Find ALL instances of `expandedListByColumn` in the file and replace with `expandedListIds`.

---

## SECTION 5: Update "Add List" Button Styling

### File: `src/components/Lists/ListPanel.tsx`

The "Add List" button also needs `break-inside: avoid` and margin.

### Find the Add List section (around lines 207-241)

Wrap both the input and button in a container, or add the style to each:

**For the input div (around line 208):**
```tsx
<div className="bg-theme-secondary rounded-lg p-3" style={{ breakInside: 'avoid', marginBottom: '1rem' }}>
```

**For the button (around line 236):**
```tsx
<button
  onClick={() => onShowNewListInput(true)}
  className="w-full p-3 text-left text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary rounded-lg transition-colors border border-dashed border-theme"
  style={{ breakInside: 'avoid', marginBottom: '1rem' }}
>
```

---

## Verification Checklist

After all sections:

- [ ] Lists display in 2-column masonry layout
- [ ] Collapsed lists shrink to just their header height
- [ ] Expanded lists show full content
- [ ] No empty white space gaps between cards
- [ ] Cards don't split across columns
- [ ] Clicking a list header toggles expansion
- [ ] "Collapse All" button still works
- [ ] Empty lists stay collapsed by default on load
- [ ] First list with tasks auto-expands on load
- [ ] `npm run build` passes

---

## Commit Messages

1. `refactor: Simplify expansion state to track list IDs instead of columns`
2. `feat: Switch ListPanel from grid to CSS column-count masonry layout`
3. `fix: Add break-inside:avoid to prevent card splitting across columns`
4. `fix: Update page.tsx props for new expansion state`
5. `fix: Add break-inside:avoid to Add List button`

---

## Visual Result

**Before (grid):**
```
┌─────────────┐ ┌─────────────┐
│ Jan 15      │ │ Jan 16      │
│ (expanded)  │ │ (collapsed) │
│ task 1      │ │             │
│ task 2      │ │             │
│ task 3      │ │   (empty    │
│ task 4      │ │    space)   │
│ ...         │ │             │
│ Add task... │ │             │
└─────────────┘ └─────────────┘
```

**After (masonry):**
```
┌─────────────┐ ┌─────────────┐
│ Jan 15      │ │ Jan 16      │
│ (expanded)  │ │ (collapsed) │
│ task 1      │ └─────────────┘
│ task 2      │ ┌─────────────┐
│ task 3      │ │ + Add List  │
│ task 4      │ └─────────────┘
│ ...         │
│ Add task... │
└─────────────┘
```

Cards pack tightly, no wasted space!
