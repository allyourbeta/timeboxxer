# FIX: List Sorting and Position Conflicts

---

## ⚠️ MANDATORY RULES ⚠️

1. **Run `npm run build` after each fix.**
2. **Commit after each fix.**

---

## Problem

System lists use hardcoded `position` values (-1000, -900, -500) which conflict with the unique constraint `lists_user_id_position_key`. This causes 409 Conflict errors.

## Solution

1. System lists don't need unique positions — they sort by `system_type`
2. Frontend sorts lists: date → parked → purgatory → user lists (by position)
3. System lists all use `position: 0` (doesn't matter, not used for sorting)

---

## FIX 1: Update SQL for System Lists

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Update existing system lists to use position 0
UPDATE lists SET position = 0 WHERE is_system = true;
```

---

## FIX 2: Create List Sort Utility

Create `src/lib/listSort.ts`:

```typescript
interface List {
  id: string
  name: string
  position: number
  is_system: boolean
  system_type: 'purgatory' | 'parked' | 'date' | null
}

/**
 * Sort order for system lists
 * Lower number = appears first
 */
const SYSTEM_LIST_ORDER: Record<string, number> = {
  date: 1,      // Today's date list first (main workspace)
  parked: 2,    // Quick capture
  purgatory: 3, // Scheduled tasks holding area
}

/**
 * Sort lists for display:
 * 1. System lists first (date → parked → purgatory)
 * 2. User lists by position
 */
export function sortListsForDisplay<T extends List>(lists: T[]): T[] {
  return [...lists].sort((a, b) => {
    // System lists come first
    if (a.is_system && !b.is_system) return -1
    if (!a.is_system && b.is_system) return 1
    
    // Both system lists: sort by system_type order
    if (a.is_system && b.is_system) {
      const orderA = SYSTEM_LIST_ORDER[a.system_type || ''] ?? 99
      const orderB = SYSTEM_LIST_ORDER[b.system_type || ''] ?? 99
      return orderA - orderB
    }
    
    // Both user lists: sort by position
    return a.position - b.position
  })
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add list sorting utility"
```

---

## FIX 3: Update List Store to Use Sort Utility

Update `src/state/useListStore.ts`:

**Add import at top:**

```typescript
import { sortListsForDisplay } from '@/lib/listSort'
```

**Update loadLists to sort after fetching:**

Find the `loadLists` action and update it:

```typescript
loadLists: async () => {
  // Ensure today's date list exists
  await ensureTodayList()
  
  const data = await getLists()
  const sortedLists = sortListsForDisplay(data || [])
  set({ lists: sortedLists, loading: false })
},
```

**Commit:**
```bash
git add -A && git commit -m "fix: Sort lists using system_type order"
```

---

## FIX 4: Fix ensureTodayList to Avoid Conflicts

Update `src/api/lists.ts`:

Find the `ensureTodayList` function and replace it with:

```typescript
export async function ensureTodayList() {
  const supabase = getSupabase()
  const todayName = getTodayListName()
  
  // Check if today's list already exists
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('system_type', 'date')
    .eq('name', todayName)
    .maybeSingle()
  
  if (existing) return existing
  
  // Create today's list with position 0 (system lists don't use position for sorting)
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: DEV_USER_ID,
      name: todayName,
      position: 0,
      is_system: true,
      system_type: 'date',
    })
    .select()
    .single()
  
  if (error) {
    // If conflict, the list was created by another request - fetch it
    if (error.code === '23505') {
      const { data: refetched } = await supabase
        .from('lists')
        .select('*')
        .eq('system_type', 'date')
        .eq('name', todayName)
        .single()
      return refetched
    }
    throw error
  }
  
  return data
}
```

**Note:** Changed `.single()` to `.maybeSingle()` on the check query so it doesn't error when no row exists.

**Commit:**
```bash
git add -A && git commit -m "fix: ensureTodayList handles conflicts gracefully"
```

---

## FIX 5: Update Purgatory and Parked List Creation in Migration

For future reference, update `supabase/migrations/002_purgatory_and_daily.sql`:

Change the Purgatory insert to use `position: 0`:

```sql
INSERT INTO lists (id, user_id, name, position, is_system, system_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Purgatory',
  0,
  true,
  'purgatory'
) ON CONFLICT (id) DO NOTHING;
```

Update `supabase/migrations/003_energy_highlight_parked.sql`:

Change the Parked insert to use `position: 0`:

```sql
INSERT INTO lists (id, user_id, name, position, is_system, system_type)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'Parked',
  0,
  true,
  'parked'
) ON CONFLICT (id) DO NOTHING;
```

**Commit:**
```bash
git add -A && git commit -m "fix: Update migrations to use position 0 for system lists"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ No 409 Conflict errors in console
2. ✅ Lists display in order: Date list → Parked → Purgatory → User lists
3. ✅ Refreshing the page doesn't cause errors
4. ✅ System lists can be collapsed/expanded

---

## Summary

| File | Changes |
|------|---------|
| `src/lib/listSort.ts` | NEW - Sort utility with system_type order |
| `src/state/useListStore.ts` | Use sortListsForDisplay |
| `src/api/lists.ts` | Fix ensureTodayList conflict handling |
| `supabase/migrations/*.sql` | Update to use position: 0 |
