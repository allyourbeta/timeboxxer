# Timeboxxer Architecture Review

**Date:** January 17, 2026  
**Codebase Version:** Post-auth rewrite  
**Total Lines:** ~4,500

---

## Executive Summary

The codebase is generally well-structured with good separation of concerns. However, there are several areas needing improvement: **4 files exceed 300 lines**, there's **duplicated code** across API files, **magic numbers** are scattered throughout, and **date handling is inconsistent**. The auth rewrite fixed the architecture issues but introduced some technical debt that should be addressed.

---

## 🔴 CRITICAL: Files Over 300 Lines

Per your rules, no file should exceed 300 lines. These need splitting:

| File | Lines | Recommendation |
|------|-------|----------------|
| `src/api/tasks.ts` | 416 | Split into `tasks-crud.ts`, `tasks-scheduling.ts`, `tasks-daily.ts` |
| `src/app/page.tsx` | 349 | Extract auth logic to hook, computed values to utils |
| `src/components/Calendar/FullCalendarView.tsx` | 340 | Extract event handlers, calendar config |
| `src/components/Lists/ListCard.tsx` | 336 | Extract drag-drop logic, edit mode to sub-components |
| `src/hooks/useAppHandlers.ts` | 333 | Split by domain: `useTaskHandlers.ts`, `useListHandlers.ts`, `useScheduleHandlers.ts` |

---

## 🔴 CRITICAL: Duplicated Code

### `getCurrentUserId()` - Defined 3 times identically

**Location:** `tasks.ts:3-12`, `lists.ts:4-13`, `scheduled.ts:3-12`

**Fix:** Create `src/utils/supabase/auth.ts`:
```typescript
import { createClient } from './client'

export async function getCurrentUserId(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('Not authenticated')
  return session.user.id
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}
```

### `ensureTodayList()` and `ensureTomorrowList()` - Nearly identical

**Location:** `lists.ts:154-197` and `lists.ts:199-242`

**Fix:** Create generic function:
```typescript
async function ensureDateList(dateName: string): Promise<List> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('system_type', 'date')
    .eq('name', dateName)
    .eq('user_id', userId)  // BUG FIX: was missing!
    .maybeSingle()
  
  if (existing) return existing
  
  // ... rest of creation logic
}

export const ensureTodayList = () => ensureDateList(getTodayListName())
export const ensureTomorrowList = () => ensureDateList(getTomorrowListName())
```

---

## 🟡 MEDIUM: Magic Numbers

### Duration Values
Found in 4 places with inconsistent values:

| Location | Value | Should Use |
|----------|-------|------------|
| `tasks.ts:58` | `duration_minutes: 15` | `DEFAULT_DURATION` |
| `tasks.ts:266` | `duration_minutes: 15` | `DEFAULT_DURATION` |
| `tasks.ts:291` | `duration_minutes: 30` | `DEFAULT_DURATION` or new constant |
| `useAppHandlers.ts:70` | `[15, 30, 45, 60, 90, 120]` | `DURATION_OPTIONS` (exists in types!) |

**Note:** `DURATION_OPTIONS` already exists in `types/app.ts:75` but isn't being used!

### Color Index Values
```typescript
// tasks.ts:267
color_index: Math.floor(Math.random() * 8)

// tasks.ts:292  
color_index: Math.floor(Math.random() * 12)
```

**Fix:** Add to constants:
```typescript
export const COLOR_COUNT = 12
export const getRandomColorIndex = () => Math.floor(Math.random() * COLOR_COUNT)
```

### Timeout/Period Values
```typescript
// Hardcoded "7 days" in multiple places
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)  // tasks.ts:343
"Tasks expire after 7 days"  // ListCard.tsx:238

// Toast duration
duration={5000}  // page.tsx:332
```

**Fix:** Add to `lib/constants.ts`:
```typescript
export const PURGATORY_EXPIRY_DAYS = 7
export const TOAST_DURATION_MS = 5000
export const MAX_HIGHLIGHTS_PER_DAY = 5
```

---

## 🟡 MEDIUM: Inconsistent Date Handling

Date formatting is done inline in multiple places with slight variations:

```typescript
// page.tsx:130-134 - Direct formatting
const todayListName = new Date().toLocaleDateString('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

// useAppHandlers.ts:265-269 - Same pattern, duplicated
const tomorrowName = tomorrow.toLocaleDateString('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

// lib/dateList.ts - Proper utilities exist but not always used!
getTodayListName()
getTomorrowListName()
```

**Fix:** Always use `dateList.ts` utilities. Update `page.tsx:130` and `useAppHandlers.ts:265` to import and use `getTodayListName()`.

---

## 🟡 MEDIUM: Missing User Filter in Queries

### BUG: `ensureTodayList()` and `ensureTomorrowList()` don't filter by user_id

```typescript
// lists.ts:160-165 - MISSING user_id filter!
const { data: existing } = await supabase
  .from('lists')
  .select('*')
  .eq('system_type', 'date')
  .eq('name', todayName)
  .maybeSingle()  // Could return another user's list!
```

This is why you saw duplicate lists - RLS may protect at the database level, but without the filter, the query could return nothing (if RLS filters it) and then create a new one, causing race conditions.

**Fix:** Add `.eq('user_id', userId)` to all existence checks.

---

## 🟢 GOOD: Architecture Strengths

### Proper Layer Separation
```
src/
├── api/          ✅ Database calls only
├── state/        ✅ Zustand stores (data management)
├── hooks/        ✅ Business logic handlers
├── components/   ✅ UI only (mostly)
├── lib/          ✅ Pure utility functions
└── utils/        ✅ Supabase client setup
```

### Good Type Definitions
- `types/app.ts` has comprehensive type definitions
- `DURATION_OPTIONS` and `DEFAULT_DURATION` exist (just not used everywhere)
- Proper interfaces for all domain objects

### Clean Component Structure
- Components receive handlers as props (no business logic inside)
- Stores are properly separated by domain (tasks, lists, schedule, UI)

---

## 📋 Refactoring Priority List

### Priority 1: Bug Fixes (Do First)
1. Add `user_id` filter to `ensureTodayList()` and `ensureTomorrowList()`
2. Extract and centralize `getCurrentUserId()`

### Priority 2: Constants (Quick Wins)
1. Use `DEFAULT_DURATION` from types in all API functions
2. Use `DURATION_OPTIONS` in `useAppHandlers.ts`
3. Add and use `COLOR_COUNT`, `PURGATORY_EXPIRY_DAYS`, `TOAST_DURATION_MS`

### Priority 3: File Splitting (Larger Effort)
1. Split `tasks.ts` into 3 files
2. Split `useAppHandlers.ts` into 3 domain-specific hooks
3. Extract auth check logic from `page.tsx` to `useAuth` hook

### Priority 4: Date Consistency
1. Update all date formatting to use `dateList.ts` utilities
2. Consider adding timezone handling if needed

---

## 📁 Proposed File Structure After Refactoring

```
src/
├── api/
│   ├── index.ts
│   ├── tasks/
│   │   ├── crud.ts        (create, update, delete)
│   │   ├── scheduling.ts  (purgatory, calendar)
│   │   ├── daily.ts       (spawn daily tasks)
│   │   └── index.ts
│   ├── lists.ts
│   └── scheduled.ts
├── hooks/
│   ├── useAuth.ts         (NEW - auth state)
│   ├── useTaskHandlers.ts (split from useAppHandlers)
│   ├── useListHandlers.ts (split from useAppHandlers)
│   ├── useScheduleHandlers.ts
│   └── index.ts
├── lib/
│   ├── constants.ts       (all magic numbers)
│   ├── dateList.ts        (date utilities)
│   └── ...
├── utils/
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── auth.ts        (NEW - getCurrentUserId)
```

---

## 🔧 Immediate Actions for Claude Code

Give Claude Code this prompt to fix the critical bugs:

```
Read ARCHITECTURE-REVIEW.md. Make these fixes in order:

1. Create src/utils/supabase/auth.ts with getCurrentUserId() function

2. Update all API files (tasks.ts, lists.ts, scheduled.ts) to import 
   getCurrentUserId from '@/utils/supabase/auth' instead of defining it locally

3. In lists.ts, add .eq('user_id', userId) to the queries in:
   - ensureTodayList() line 163
   - ensureTomorrowList() line 209

4. In tasks.ts, replace hardcoded duration_minutes: 15 and duration_minutes: 30
   with DEFAULT_DURATION imported from '@/types/app'

5. In useAppHandlers.ts line 70, replace the hardcoded array with
   import { DURATION_OPTIONS } from '@/types/app'

6. npm run build to verify
```

---

## Summary

| Category | Issues Found | Severity |
|----------|-------------|----------|
| Files over 300 lines | 5 files | 🔴 High |
| Duplicated functions | 2 patterns | 🔴 High |
| Missing user filters | 2 queries | 🔴 High (bug) |
| Magic numbers | ~10 instances | 🟡 Medium |
| Inconsistent date handling | ~5 instances | 🟡 Medium |
| Unused existing constants | 2 cases | 🟢 Low |

The codebase is functional but has accumulated technical debt from rapid iteration. Addressing Priority 1 and 2 items will significantly improve reliability. The file splitting (Priority 3) can be done incrementally as you touch those files.
