# Spec: Allow Clear and Delete for Past Date Lists

## Overview

Currently, date lists (like "Jan 19, 2026") have restricted menu options because they're treated as system lists. We want past date lists (dates before today in local/browser time) to have the full menu: Rename, Clear List, Delete List.

**The rule:**
- Past date lists (before today) → Full menu (Rename, Clear List, Delete List)
- Today's date list → Restricted (no delete)
- Future date lists → Restricted (no delete)
- Parked Items → Restricted (system list, no delete)
- User-created lists → Full menu (already works)

---

## Current Behavior

The `isSystemList` prop is `true` for date lists, which hides the Rename and Clear List options. The `canDelete` logic already checks if a date list is in the past, but the menu options are still hidden because of `isSystemList`.

---

## Solution

Instead of using `isSystemList` to control menu visibility, we need a new prop that specifically means "hide all menu options". We'll call it `isProtectedList`.

**Logic:**
- `isProtectedList = true` → Hide Rename, Clear List, Delete List (show "System list" message)
- `isProtectedList = false` → Show Rename, Clear List, Delete List (with normal enable/disable logic)

**What is a protected list?**
- Parked Items (system_type === 'parked') → Always protected
- Today's date list → Protected
- Future date lists → Protected
- Past date lists → NOT protected (user can manage them)
- User-created lists → NOT protected

---

## Files to Modify

1. `src/components/Lists/ListCard.tsx` - Add `isProtectedList` calculation, pass to menu
2. `src/components/Lists/ListCardMenu.tsx` - Replace `isSystemList` with `isProtectedList`

That's it. Only 2 files.

---

## Detailed Changes

### 1. src/components/Lists/ListCard.tsx

Add a helper function to determine if the list is protected:

```typescript
// Add this function inside the ListCard component, near canDeleteList()

const isProtectedList = (): boolean => {
  // Parked Items - always protected
  if (isSystemList && !isDateList) return true
  
  // Date lists - protected if today or future
  if (isDateList) {
    const listDate = new Date(name)  // name is the display name like "Jan 19, 2026"
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    listDate.setHours(0, 0, 0, 0)
    // Protected if today or future (not past)
    return listDate >= today
  }
  
  // User-created lists - not protected
  return false
}
```

Update the ListCardMenu usage to pass `isProtectedList` instead of `isSystemList`:

```tsx
<ListCardMenu
  isProtectedList={isProtectedList()}  // Changed from isSystemList
  canDelete={canDeleteList()}
  taskCount={tasks.length}
  onEdit={onStartEdit}
  onClearList={onClearList}
  onDelete={onDelete}
/>
```

Note: Keep the `canDeleteList()` function as-is. It already returns `true` for past date lists, which is correct.

---

### 2. src/components/Lists/ListCardMenu.tsx

Update the props interface:

```typescript
interface ListCardMenuProps {
  isProtectedList: boolean  // Changed from isSystemList
  canDelete: boolean
  taskCount: number
  onEdit: () => void
  onClearList: () => void
  onDelete: () => void
}
```

Update the component parameters:

```typescript
export function ListCardMenu({
  isProtectedList,  // Changed from isSystemList
  canDelete,
  taskCount,
  onEdit,
  onClearList,
  onDelete,
}: ListCardMenuProps) {
```

Update the JSX - replace `isSystemList` with `isProtectedList`:

**Line ~79 (the condition for showing Rename and Clear List):**
```tsx
{!isProtectedList && (
  <>
    {/* Rename button */}
    {/* Clear List button */}
  </>
)}
```

**Line ~122 (the "System list" message):**
```tsx
{isProtectedList && !canDelete && (
  <div className="px-3 py-2 text-sm text-muted-foreground italic">
    System list
  </div>
)}
```

That's all the changes needed in this file - just rename the prop.

---

## Logic Summary

| List Type | isProtectedList | canDelete | Menu Shows |
|-----------|-----------------|-----------|------------|
| Parked Items | true | false | "System list" |
| Today's date | true | false | "System list" |
| Future date | true | false | "System list" |
| Past date (with tasks) | false | false* | Rename, Clear List, Delete (disabled) |
| Past date (empty) | false | true | Rename, Clear List, Delete (enabled) |
| User list (with tasks) | false | false* | Rename, Clear List, Delete (disabled) |
| User list (empty) | false | true | Rename, Clear List, Delete (enabled) |

*canDelete is false when taskCount > 0 (must clear first)

---

## Testing Checklist

### Past Date Lists
- [ ] Open a date list from yesterday or earlier
- [ ] Click the 3-dot menu
- [ ] Verify: Rename option is visible
- [ ] Verify: Clear List option is visible (enabled if has tasks, disabled if empty)
- [ ] Verify: Delete List option is visible (disabled if has tasks, enabled if empty)
- [ ] Clear the list → Verify tasks are deleted
- [ ] Delete the list → Verify list is removed

### Today's Date List
- [ ] Open today's date list
- [ ] Click the 3-dot menu
- [ ] Verify: Shows "System list" message
- [ ] Verify: No Rename, Clear, or Delete options

### Future Date Lists (if any exist)
- [ ] Same as today - should show "System list"

### Parked Items
- [ ] Click the 3-dot menu on Parked Items
- [ ] Verify: Shows "System list" message
- [ ] Verify: No Rename, Clear, or Delete options

### User-Created Lists
- [ ] Verify: Still works as before (full menu, clear then delete)

---

## What NOT to Change

- Do not change the `canDeleteList()` logic - it already works correctly
- Do not change how Clear List or Delete List work - just the visibility
- Do not change any other files
- Do not add new features

---

## Definition of Done

1. Past date lists show full menu (Rename, Clear List, Delete List)
2. Today/future date lists show "System list" (no options)
3. Parked Items shows "System list" (no options)
4. User lists work as before
5. All testing checklist items pass
6. Build passes
7. No console errors
