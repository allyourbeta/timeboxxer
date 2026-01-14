# CLEANUP: Remove Dead Code

---

## ⚠️ MANDATORY RULES ⚠️

1. **Run `npm run build` after cleanup.** Ensure nothing breaks.
2. **Commit at the end.**

---

## Overview

The old custom calendar implementation was replaced by FullCalendar but the files were never deleted. This cleanup removes ~537 lines of dead code.

| File | Lines | Status |
|------|-------|--------|
| `src/components/Calendar/DayView.tsx` | 282 | DELETE |
| `src/components/Calendar/TimeSlot.tsx` | 124 | DELETE |
| `src/components/Calendar/ScheduledTaskBlock.tsx` | 118 | DELETE |
| `src/components/Calendar/ResizeHandle.tsx` | 13 | DELETE |
| `src/components/Calendar/index.ts` | 5 | UPDATE |
| `src/types/app.ts` | 178 | UPDATE (remove dead types) |

---

## STEP 1: Delete Old Calendar Files

```bash
cd ~/Dropbox/programming/projects/timeboxxer

rm src/components/Calendar/DayView.tsx
rm src/components/Calendar/TimeSlot.tsx
rm src/components/Calendar/ScheduledTaskBlock.tsx
rm src/components/Calendar/ResizeHandle.tsx
```

---

## STEP 2: Update Calendar Index

Replace `src/components/Calendar/index.ts` with:

```typescript
export { FullCalendarView } from './FullCalendarView'
```

---

## STEP 3: Remove Dead Types from app.ts

In `src/types/app.ts`, find and DELETE these interfaces (they were for the old custom calendar):

### DELETE: TimeSlot interface (~lines 157-163)
```typescript
export interface TimeSlot {
  hour: number
  minute: number
  label: string
  isCurrentHour: boolean
}
```

### DELETE: DragState interface (if exists)
Look for any interfaces related to the old drag implementation and remove them.

### KEEP: Everything else
Keep all Task, List, ScheduledTask, and other interfaces that are still in use.

---

## STEP 4: Verify Build

```bash
npm run build
```

If there are import errors, they will tell you exactly what's still trying to use the deleted files. Fix any remaining references.

---

## STEP 5: Verify File Count

```bash
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n
```

Total should drop from ~3062 to ~2525 lines.

---

## STEP 6: Commit

```bash
git add -A && git commit -m "cleanup: Remove dead calendar code (DayView, TimeSlot, etc.)"
```

---

## Expected Result

After cleanup:
- `src/components/Calendar/` contains only:
  - `FullCalendarView.tsx`
  - `index.ts`
- No TypeScript errors
- ~537 fewer lines of code
