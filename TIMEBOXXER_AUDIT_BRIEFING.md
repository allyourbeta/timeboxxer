# Timeboxxer Codebase Audit Briefing

## Your Mission

You are auditing the Timeboxxer codebase - a task management app with calendar scheduling. Your job is to:

1. **Find and fix bugs** - Logic errors, data inconsistencies, edge cases
2. **Find and fix security issues** - Auth checks, data leakage between users
3. **Find and fix code quality issues** - Performance, maintainability, duplication
4. **Report unfixable issues** - Database schema problems, architectural concerns

## Output Expected

1. **Fix what you can** - Make the code changes, ensure build passes
2. **Produce a report** with:
   - List of issues found and fixed (with file locations)
   - List of issues found but NOT fixed (with explanation why)
   - Any architectural recommendations

---

## Architecture Overview

### Tech Stack
- Next.js 14 (App Router)
- React with TypeScript
- Zustand for state management
- Supabase (Postgres + Auth)
- @hello-pangea/dnd for drag-and-drop
- Tailwind CSS

### Key Directories
```
src/
  api/          # Supabase database calls (THE source of truth)
  state/        # Zustand stores (optimistic updates + API calls)
  hooks/        # Business logic handlers
  components/   # React components
  lib/          # Utilities (dates, constants, etc.)
  types/        # TypeScript types
```

---

## Core Data Model

### The "Soft-Link" Architecture

This is the most important concept to understand. Tasks have TWO ways of being associated with lists:

```typescript
interface Task {
  id: string;
  list_id: string;           // PERMANENT home - where task "lives" (usually Inbox)
  planned_list_date: string; // TEMPORARY soft-link - which date list to display in
  calendar_slot_time: string; // When scheduled on calendar (ISO timestamp)
  // ... other fields
}
```

**Critical Rules:**
1. `list_id` = The task's permanent home (Inbox or a project list)
2. `planned_list_date` = Soft-link to a date list (e.g., "2026-01-26")
3. A task with `planned_list_date` shows in the date list, NOT in its home list
4. When `planned_list_date` is cleared, task returns to its home list

### List Types

```typescript
interface List {
  id: string;
  list_type: "inbox" | "user" | "date" | "completed";
  list_date?: string;  // Only for date lists (ISO date: "2026-01-26")
  panel_column: 0 | 1; // Which column in 2-column layout
  position: number;    // Order within column
}
```

- **inbox** - System list, one per user, default home for tasks
- **user** - User-created project lists (e.g., "Timeboxxer", "Home")
- **date** - Auto-created for specific dates (e.g., "Jan 26, 2026")
- **completed** - System list for completed tasks

---

## Critical Filtering Logic

### How tasks are displayed in lists (ListPanel.tsx)

```typescript
const getTasksForList = (list: List) => {
  if (list.list_type === "date" && list.list_date) {
    // Date lists: filter by planned_list_date
    return tasks.filter(
      (t) => t.planned_list_date === list.list_date && !t.completed_at
    );
  }

  // Non-date lists: filter by list_id, HIDE if scheduled for today/future
  const today = getLocalTodayISO();
  return tasks.filter(
    (t) =>
      t.list_id === list.id &&
      !t.completed_at &&
      (!t.planned_list_date || t.planned_list_date < today)
  );
};
```

**Audit Point:** Every place that filters tasks must be consistent with this logic.

### How tasks are displayed on calendar (CalendarView.tsx)

```typescript
const scheduledTasks = useMemo(
  () => tasks.filter((t) => {
    if (!t.calendar_slot_time) return false;
    const taskDate = t.calendar_slot_time.split("T")[0];
    return taskDate === today; // Only show TODAY's scheduled tasks
  }),
  [tasks, today]
);
```

**Audit Point:** Calendar must only show today's tasks, not all tasks with calendar_slot_time.

---

## Task Creation Paths

There are THREE ways to create a task. Each must set fields correctly:

### 1. Create in project list (Inbox, user lists)
- `list_id` = that list's ID
- `planned_list_date` = null
- `calendar_slot_time` = null

### 2. Create in date list
- `list_id` = Inbox ID (home)
- `planned_list_date` = that date (soft-link)
- `calendar_slot_time` = null

### 3. Create on calendar
- `list_id` = Inbox ID (home)
- `planned_list_date` = today (soft-link)
- `calendar_slot_time` = scheduled time

**Audit Point:** Check all three paths in:
- `src/api/tasks.ts` - createTask, createTaskOnDate, createInboxTask
- `src/hooks/useScheduleHandlers.ts` - handleCreateCalendarTask
- `src/hooks/useTaskHandlers.ts` - handleTaskAdd

---

## Known Bug Patterns (What to look for)

### 1. list_id vs planned_list_date confusion
We've had multiple bugs where code filtered by `list_id` when it should use `planned_list_date` for date lists, or vice versa.

**Check:** Every filter, every update, every delete involving tasks and lists.

### 2. Date boundary issues
The app needs to handle midnight correctly:
- Calendar should show only TODAY's tasks
- Today's date list should be auto-created on load
- Tasks from yesterday should not appear on today's calendar

**Check:** All uses of `getLocalTodayISO()`, date comparisons, timestamp parsing.

### 3. Optimistic updates not matching API
Zustand stores do optimistic updates, then call API. If the logic differs, UI and database diverge.

**Check:** Compare every store action's optimistic update with the corresponding API function.

### 4. Missing null checks
Tasks may have null values for optional fields. Code that assumes they exist will crash.

**Check:** `calendar_slot_time`, `planned_list_date`, `list_date`, `position`, `panel_column`

### 5. Orphaned data
Tasks whose `list_id` points to a deleted list, or a date list (wrong).

**Check:** Any task where `list_id` points to a list with `list_type = 'date'` is WRONG.

---

## Security Audit Points

### Row Level Security (RLS)
Supabase should enforce that users can only see/modify their own data.

**Check:** 
- All tables have RLS enabled
- Policies use `auth.uid() = user_id`

### Client-side auth checks
The app should redirect unauthenticated users.

**Check:** `src/app/page.tsx` and any protected routes.

### API functions
All API functions should validate the user owns the data.

**Check:** Functions in `src/api/` that modify data.

---

## Code Quality Audit Points

### 1. Duplicate logic
The same filtering/calculation done in multiple places should be extracted.

### 2. Inconsistent error handling
Some functions use try/catch, some don't. Some show user feedback, some fail silently.

### 3. useEffect dependencies
Missing or extra dependencies cause bugs. Check all useEffect hooks.

### 4. File size
Any file over 300 lines should be split (per project conventions in CLAUDE.md).

### 5. Unused code
Dead code, unused imports, commented-out code.

---

## Key User Workflows to Trace

### Workflow 1: Create task on date list, drag to calendar
1. User clicks "Add task" in date list (e.g., Jan 26)
2. Task created with: list_id=Inbox, planned_list_date="2026-01-26"
3. Task appears in date list
4. User drags task to calendar slot
5. Task gets calendar_slot_time set
6. Task appears on calendar AND in date list

### Workflow 2: Create task directly on calendar
1. User clicks on calendar time slot
2. User types task name
3. Task created with: list_id=Inbox, planned_list_date=today, calendar_slot_time=slot
4. Task appears on calendar
5. Task appears in Inbox? NO - because planned_list_date=today hides it
6. Task appears in today's date list? YES

### Workflow 3: Drag task from project list to date list
1. Task exists in project list (list_id=project, planned_list_date=null)
2. User drags to date list
3. planned_list_date set to that date
4. Task disappears from project list (correct - it's scheduled)
5. Task appears in date list

### Workflow 4: Complete and uncomplete task
1. User completes task
2. Task gets completed_at timestamp, previous_list_id saved
3. Task moves to Completed list
4. User uncompletes task
5. Task returns to previous_list_id, completed_at cleared

---

## Files to Pay Special Attention To

| File | Why |
|------|-----|
| `src/api/tasks.ts` | All database operations for tasks |
| `src/api/lists.ts` | All database operations for lists |
| `src/state/useTaskStore.ts` | Task state + optimistic updates |
| `src/state/useListStore.ts` | List state + optimistic updates |
| `src/hooks/useDragHandlers.ts` | All drag-drop logic |
| `src/hooks/useScheduleHandlers.ts` | Calendar scheduling logic |
| `src/hooks/useTaskHandlers.ts` | Task CRUD handlers |
| `src/hooks/useListHandlers.ts` | List CRUD handlers |
| `src/components/Lists/ListPanel.tsx` | List display + filtering |
| `src/components/Calendar/CalendarView.tsx` | Calendar display + filtering |
| `src/services/dragService.ts` | Drag operation classification |
| `src/lib/dateUtils.ts` | Date handling utilities |

---

## How to Run

```bash
# Install dependencies
npm install

# Type check
npx tsc --noEmit

# Build
npm run build

# Dev server (if you need to test)
npm run dev
```

---

## Database Schema Reference

See `docs/SCHEMA.md` for full schema.

Key tables:
- `tasks` - All tasks
- `lists` - All lists (inbox, user, date, completed)

Key relationships:
- `tasks.list_id` → `lists.id` (home list)
- `tasks.user_id` → `auth.users.id`
- `lists.user_id` → `auth.users.id`

---

## Final Notes

- The codebase has had rapid development with several regressions
- We recently implemented: task reordering, list reordering, two-column layout
- Date handling at midnight has been a recurring issue
- The soft-link architecture (list_id vs planned_list_date) is subtle and error-prone

Good luck! Be thorough, be systematic, and fix what you can.
