# Spec: Roll Over UI - Two Date Pills

## Overview

Replace the single "Roll Over to Tomorrow" button with two pill buttons showing actual day names.

## Current Behavior
- Single button: "Roll Over to Tomorrow"
- Confusing when used after midnight

## New Behavior

**Display:**
```
Roll Over:  [Fri] [Sat]
```

- "Roll Over:" = static label (not clickable)
- First pill = today's day name
- Second pill = tomorrow's day name
- Clicking a pill moves all incomplete tasks from current list to that date

**Rules:**
- Only show on lists dated **today or earlier**
- If viewing today's list, only show the tomorrow pill (no point moving to today)
- Use short day names: Mon, Tue, Wed, Thu, Fri, Sat, Sun

## Implementation

**File: `src/components/Lists/ListCard.tsx`** (or wherever Roll Over button lives)

Replace the single rollover button with:

```tsx
{/* Roll Over - only for today or past date lists */}
{isDateList && canRollOver && (
  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-theme">
    <span className="text-xs text-theme-secondary">Roll Over:</span>
    
    {/* Today pill - hide if viewing today's list */}
    {!isToday && (
      <button
        onClick={() => onRollOver('today')}
        className="px-2 py-1 text-xs rounded-full bg-theme-tertiary hover:bg-accent-primary hover:text-white transition-colors"
      >
        {todayDayName}
      </button>
    )}
    
    {/* Tomorrow pill - always show */}
    <button
      onClick={() => onRollOver('tomorrow')}
      className="px-2 py-1 text-xs rounded-full bg-theme-tertiary hover:bg-accent-primary hover:text-white transition-colors"
    >
      {tomorrowDayName}
    </button>
  </div>
)}
```

**Helper for day names:**
```tsx
const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'short' }) // "Fri"
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
const tomorrowDayName = tomorrow.toLocaleDateString('en-US', { weekday: 'short' }) // "Sat"
```

**Update the handler** to accept a destination:
```tsx
onRollOver: (destination: 'today' | 'tomorrow') => void
```

**In the handler logic** (`useAppHandlers.ts` or similar):
```tsx
const handleRollOverTasks = async (fromListId: string, destination: 'today' | 'tomorrow') => {
  const targetDate = destination === 'today' 
    ? getLocalTodayISO() 
    : getLocalTomorrowISO()
  
  // ... rest of existing logic using targetDate
}
```

## That's It

No other changes needed. Simple UI, clear behavior.
