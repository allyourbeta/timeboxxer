# SPEC: Fix Timezone Issues in Date Lists

## The Problem

`new Date()` on Vercel returns UTC time. When it's 11 PM on Jan 16 in California, Vercel thinks it's 7 AM on Jan 17. This causes wrong date lists to be created.

## The Principle

**The browser knows the user's local date. The server does not.**

Therefore: The browser must pass the local date to the server. The server should never call `new Date()` to determine "today" or "tomorrow".

## The Fix

### Step 1: Update dateList.ts to generate LOCAL dates

```typescript
// src/lib/dateList.ts

/**
 * Get today's LOCAL date in ISO format (YYYY-MM-DD)
 * Uses local timezone, not UTC
 */
export function getLocalTodayISO(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get tomorrow's LOCAL date in ISO format (YYYY-MM-DD)
 * Uses local timezone, not UTC
 */
export function getLocalTomorrowISO(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date ISO string as a display name
 * e.g., "2026-01-17" -> "Jan 17, 2026"
 */
export function formatDateForDisplay(dateISO: string): string {
  // Parse as local date (not UTC) by using date parts
  const [year, month, day] = dateISO.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  })
}

// Keep old functions for backward compatibility but mark deprecated
/** @deprecated Use getLocalTodayISO instead */
export function getTodayISO(): string {
  return getLocalTodayISO()
}

/** @deprecated Use getLocalTomorrowISO instead */
export function getTomorrowISO(): string {
  return getLocalTomorrowISO()
}

/** @deprecated Use formatDateForDisplay instead */
export function getTodayListName(): string {
  return formatDateForDisplay(getLocalTodayISO())
}

/** @deprecated Use formatDateForDisplay instead */
export function getTomorrowListName(): string {
  return formatDateForDisplay(getLocalTomorrowISO())
}
```

### Step 2: Update lists.ts to accept date as parameter

```typescript
// src/api/lists.ts

import { formatDateForDisplay } from '@/lib/dateList'

/**
 * Ensure a date list exists for the given date
 * @param dateISO - The date in YYYY-MM-DD format (from client's local timezone)
 */
export async function ensureDateList(dateISO: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  const displayName = formatDateForDisplay(dateISO)
  
  // Check if list exists for this date
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('system_type', 'date')
    .eq('list_date', dateISO)
    .eq('user_id', userId)
    .maybeSingle()
  
  if (existing) return existing
  
  // Create new date list
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: displayName,
      list_date: dateISO,
      position: 0,
      is_system: true,
      system_type: 'date',
    })
    .select()
    .single()
  
  if (error) {
    // Handle race condition - another request created it
    if (error.code === '23505') {
      const { data: refetched } = await supabase
        .from('lists')
        .select('*')
        .eq('system_type', 'date')
        .eq('list_date', dateISO)
        .eq('user_id', userId)
        .single()
      return refetched
    }
    throw error
  }
  
  return data
}

// Convenience wrappers that call ensureDateList
// These should ONLY be called from client-side code
export async function ensureTodayList() {
  const { getLocalTodayISO } = await import('@/lib/dateList')
  return ensureDateList(getLocalTodayISO())
}

export async function ensureTomorrowList() {
  const { getLocalTomorrowISO } = await import('@/lib/dateList')
  return ensureDateList(getLocalTomorrowISO())
}
```

### Step 3: Update the store to call these from client-side

In `useListStore.ts`, the `loadLists` function should ensure today/tomorrow lists exist. Since the store runs in the browser, it will use the browser's local date:

```typescript
// In loadLists or wherever lists are initialized
import { getLocalTodayISO, getLocalTomorrowISO } from '@/lib/dateList'
import { ensureDateList } from '@/api/lists'

// Ensure today and tomorrow lists exist (runs in browser)
await ensureDateList(getLocalTodayISO())
await ensureDateList(getLocalTomorrowISO())
```

### Step 4: Display names should come from list_date

In any component displaying a date list name, derive it from `list_date`:

```typescript
import { formatDateForDisplay } from '@/lib/dateList'

// When rendering a list name:
const displayName = list.system_type === 'date' && list.list_date
  ? formatDateForDisplay(list.list_date)
  : list.name
```

## Key Points

1. **Never use `toISOString()`** for local dates - it converts to UTC
2. **Never use `new Date()` on the server** to determine user's "today"
3. **Always pass dates from client to server** as YYYY-MM-DD strings
4. **Derive display names from `list_date`** at render time, client-side

## Verification

After implementing:
1. Check browser console - dates should match your local timezone
2. Create a task at 11 PM - it should go to TODAY's list, not tomorrow's
3. The list name should match the list_date

## Database Cleanup

Fix the existing bad data:
```sql
UPDATE lists 
SET name = TO_CHAR(list_date, 'Mon DD, YYYY')
WHERE system_type = 'date';
```
