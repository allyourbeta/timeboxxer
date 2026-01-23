# TACTICAL FIXES AND ENHANCEMENTS

---

## ⚠️ MANDATORY RULES - READ BEFORE EVERY CHANGE ⚠️

1. **NO FILE OVER 300 LINES.** Check with `wc -l` after every change.
2. **If a file approaches 250 lines, split it proactively.**
3. **Components have NO business logic, NO API calls.**
4. **All state changes go through Zustand stores.**
5. **All database calls go through `src/api/`.**
6. **Run `npm run build` after EVERY fix. Fix errors before moving on.**
7. **Do NOT ask for confirmation. Just execute.**
8. **Commit after EACH fix, not at the end.**

If you find yourself adding more than 50 lines to any file, STOP and consider:
- Should this be a new component?
- Should this be a new hook?
- Should this logic go in a service?

### File Size Check Command
Run this after EVERY change:
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0; exit 1}'
```

---

## Fix 1: Improve Time Display on Calendar

**Priority:** HIGH (quick win, improves usability immediately)

**Current:** Time labels are small and only show on the hour. Hard to tell what time a slot is.

**Desired:** Clearer time display with visual hierarchy.

**Implementation:**

### 1.1 Update `TimeSlot.tsx`:
- Hour marks (`:00`): Larger text (text-sm), white color, bold
- Half-hour marks (`:30`): Smaller text (text-xs), gray-400
- Quarter marks (`:15`, `:45`): No label, just subtle line
- Add stronger border/line at hour marks

### 1.2 Update `DayView.tsx`:
- Add current time indicator: red horizontal line with "Now" label
- Use `useEffect` with `setInterval` to update every 60 seconds
- On mount, scroll to current time (or 8am if before 8am)
- Add ref to container for scrolling

### 1.3 Visual spec:
```
08:00 ─────────────────────────  ← Bold white, strong line
      ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← Faint dotted line
08:30 ─────────────────────────  ← Gray, medium line
      ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  ← Faint dotted line
09:00 ─────────────────────────  ← Bold white, strong line
───── NOW ─────────────────────  ← Red line if current time
```

**Files to modify:** `TimeSlot.tsx`, `DayView.tsx`

**Commit message:** `fix: 1 - Improve calendar time display with better visual hierarchy`

---

## Fix 2: Drag to Reschedule Tasks on Calendar

**Priority:** HIGH (core functionality)

**Current:** Tasks can only be dragged FROM lists TO calendar.

**Desired:** Tasks already ON the calendar can be dragged to a different time slot.

**Implementation:**

### 2.1 Update `ScheduledTaskBlock.tsx`:
- Add `draggable` attribute
- Add `onDragStart` prop and handler
- Set `draggedTaskId` in store on drag start
- Add visual feedback: opacity-50 while dragging

### 2.2 Update `TimeSlot.tsx`:
- Already handles `onDrop` - no changes needed

### 2.3 Update `DayView.tsx`:
- Pass `onDragStart` handler to `ScheduledTaskBlock`
- On drop, check if it's a reschedule (task already scheduled) vs new schedule

### 2.4 Update `useUIStore.ts`:
- Already has `draggedTaskId` - no changes needed

**Props to add to ScheduledTaskBlock:**
```typescript
onDragStart: () => void
```

**Files to modify:** `ScheduledTaskBlock.tsx`, `DayView.tsx`

**Commit message:** `fix: 2 - Enable drag to reschedule tasks on calendar`

---

## Fix 3: Resize Tasks by Dragging Edge

**Priority:** HIGH (core functionality)

**Current:** Duration can only be changed by clicking the badge in the list view.

**Desired:** User can drag the bottom edge of a scheduled task to resize (15-min increments).

**Implementation:**

### 3.1 Create `src/components/Calendar/ResizeHandle.tsx` (NEW FILE):
```typescript
'use client'

interface ResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void
}

export function ResizeHandle({ onResizeStart }: ResizeHandleProps) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-white/20 hover:bg-white/40 rounded-b transition-colors"
      onMouseDown={onResizeStart}
    />
  )
}
```

### 3.2 Update `ScheduledTaskBlock.tsx`:
- Add `ResizeHandle` at bottom
- Track resize state: `isResizing`, `startY`, `startDuration`
- On mouse move (document level), calculate new duration
- Snap to 15-minute increments: `Math.round(newDuration / 15) * 15`
- Clamp between 15 and 120 minutes
- On mouse up, call `onDurationChange(newDuration)`

### 3.3 Add prop to `ScheduledTaskBlock`:
```typescript
onDurationChange: (newDuration: number) => void
```

### 3.4 Update `DayView.tsx`:
- Pass duration change handler that calls `taskStore.updateTask()`

**Files to modify:** Create `ResizeHandle.tsx`, modify `ScheduledTaskBlock.tsx`, `DayView.tsx`, `Calendar/index.ts`

**Commit message:** `fix: 3 - Enable resize tasks by dragging bottom edge`

---

## Fix 4: Collapsible Lists with Multi-Column Layout

**Priority:** HIGH (major UX improvement)

**Current:** Single column of lists, all always expanded.

**Desired:** 
- Lists can expand/collapse (accordion style)
- Up to 3 columns of lists
- Only one list expanded per column
- Expanding a list collapses others in same column

**Implementation:**

### 4.1 Update `useUIStore.ts`:
Add:
```typescript
// Track which list is expanded in each column (max 3 columns)
// Key = column index (0, 1, 2), Value = list ID or null
expandedListByColumn: Record<number, string | null>
toggleListExpanded: (listId: string, column: number) => void
```

Implementation:
```typescript
expandedListByColumn: { 0: null, 1: null, 2: null },
toggleListExpanded: (listId, column) => set((state) => ({
  expandedListByColumn: {
    ...state.expandedListByColumn,
    [column]: state.expandedListByColumn[column] === listId ? null : listId
  }
})),
```

### 4.2 Update `ListPanel.tsx`:
- Change layout from single column to 3-column grid
- Assign lists to columns: `column = listIndex % 3`
- Pass `isExpanded` and `onToggleExpand` to each ListCard
- Adjust width: remove `w-80`, use full available width with grid

```typescript
<div className="grid grid-cols-3 gap-4 p-4 overflow-y-auto">
  {lists.map((list, index) => {
    const column = index % 3
    const isExpanded = expandedListByColumn[column] === list.id
    return (
      <ListCard
        key={list.id}
        {...props}
        isExpanded={isExpanded}
        onToggleExpand={() => onToggleListExpanded(list.id, column)}
      />
    )
  })}
</div>
```

### 4.3 Update `ListCard.tsx`:
Add props:
```typescript
isExpanded: boolean
onToggleExpand: () => void
```

Collapsed state shows:
- List name + task count + chevron icon (▼)
- Single line, compact

Expanded state shows:
- List name + task count + chevron icon (▲)
- All tasks
- Add task input

### 4.4 Update `page.tsx`:
- Pass new props from store to ListPanel

**Files to modify:** `useUIStore.ts`, `ListPanel.tsx`, `ListCard.tsx`, `page.tsx`

**Commit message:** `fix: 4 - Add collapsible lists with 3-column layout`

---

## Fix 5: Hide/Show Panels (Focus Modes)

**Priority:** MEDIUM (quick win)

**Current:** Both list panel and calendar always visible.

**Desired:** User can focus on just lists, just calendar, or both.

**Implementation:**

### 5.1 Update `useUIStore.ts`:
Add:
```typescript
panelMode: 'both' | 'lists-only' | 'calendar-only'
setPanelMode: (mode: 'both' | 'lists-only' | 'calendar-only') => void
```

### 5.2 Update `Header.tsx`:
Add segmented control or 3 buttons:
```typescript
<div className="flex gap-1 bg-gray-800 rounded-lg p-1">
  <button
    onClick={() => onPanelModeChange('lists-only')}
    className={`px-3 py-1 rounded text-sm ${panelMode === 'lists-only' ? 'bg-gray-600' : ''}`}
  >
    Lists
  </button>
  <button
    onClick={() => onPanelModeChange('both')}
    className={`px-3 py-1 rounded text-sm ${panelMode === 'both' ? 'bg-gray-600' : ''}`}
  >
    Both
  </button>
  <button
    onClick={() => onPanelModeChange('calendar-only')}
    className={`px-3 py-1 rounded text-sm ${panelMode === 'calendar-only' ? 'bg-gray-600' : ''}`}
  >
    Calendar
  </button>
</div>
```

Add props:
```typescript
panelMode: 'both' | 'lists-only' | 'calendar-only'
onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
```

### 5.3 Update `page.tsx`:
Conditional rendering based on `panelMode`:
```typescript
{(panelMode === 'both' || panelMode === 'lists-only') && (
  <ListPanel ... className={panelMode === 'lists-only' ? 'flex-1' : 'w-1/2'} />
)}
{(panelMode === 'both' || panelMode === 'calendar-only') && (
  <DayView ... className={panelMode === 'calendar-only' ? 'flex-1' : 'flex-1'} />
)}
```

**Files to modify:** `useUIStore.ts`, `Header.tsx`, `page.tsx`

**Commit message:** `fix: 5 - Add panel focus modes (lists/both/calendar)`

---

## Fix 6: Light/Dark Theme Toggle

**Priority:** MEDIUM (polish)

**Current:** Dark theme only.

**Desired:** User can toggle between light and dark themes.

**Implementation:**

### 6.1 Update `useUIStore.ts`:
Add:
```typescript
theme: 'light' | 'dark'
setTheme: (theme: 'light' | 'dark') => void
```

Initialize from localStorage if available:
```typescript
theme: (typeof window !== 'undefined' && localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
setTheme: (theme) => {
  localStorage.setItem('theme', theme)
  set({ theme })
},
```

### 6.2 Update `globals.css`:
Add CSS variables:
```css
:root {
  --bg-primary: #111827;      /* gray-900 */
  --bg-secondary: #1f2937;    /* gray-800 */
  --bg-tertiary: #374151;     /* gray-700 */
  --text-primary: #ffffff;
  --text-secondary: #9ca3af;  /* gray-400 */
  --border-color: #374151;    /* gray-700 */
}

[data-theme='light'] {
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;    /* gray-100 */
  --bg-tertiary: #e5e7eb;     /* gray-200 */
  --text-primary: #111827;    /* gray-900 */
  --text-secondary: #6b7280;  /* gray-500 */
  --border-color: #e5e7eb;    /* gray-200 */
}
```

### 6.3 Update `page.tsx` (or create a ThemeProvider):
Apply theme attribute to root:
```typescript
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme)
}, [theme])
```

### 6.4 Update `Header.tsx`:
Add theme toggle button:
```typescript
<button
  onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
  className="p-2 rounded hover:bg-gray-700"
>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>
```

### 6.5 Update components to use CSS variables:
Replace hardcoded colors with variables. Example:
- `bg-gray-900` → `bg-[var(--bg-primary)]`
- `text-white` → `text-[var(--text-primary)]`
- etc.

**NOTE:** This is a larger change. Do it methodically, one component at a time.

**Files to modify:** `useUIStore.ts`, `globals.css`, `Header.tsx`, `page.tsx`, and all components

**Commit message:** `fix: 6 - Add light/dark theme toggle`

---

## Fix 7: Background Color Palette Selection

**Priority:** LOW (polish)

**Current:** Fixed dark background.

**Desired:** User can choose from a few background color themes.

**Implementation:**

### 7.1 Create `src/lib/backgroundThemes.ts` (NEW FILE):
```typescript
export const backgroundThemes = {
  midnight: {
    name: 'Midnight',
    bgPrimary: '#111827',
    bgSecondary: '#1f2937',
    bgTertiary: '#374151',
  },
  slate: {
    name: 'Slate',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
  },
  ocean: {
    name: 'Ocean',
    bgPrimary: '#0c1929',
    bgSecondary: '#152238',
    bgTertiary: '#1e3a5f',
  },
  paper: {
    name: 'Paper',
    bgPrimary: '#faf7f2',
    bgSecondary: '#f0ebe3',
    bgTertiary: '#e6e0d4',
  },
  snow: {
    name: 'Snow',
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgTertiary: '#f1f5f9',
  },
} as const

export type BackgroundTheme = keyof typeof backgroundThemes
```

### 7.2 Update `useUIStore.ts`:
Add:
```typescript
backgroundTheme: BackgroundTheme
setBackgroundTheme: (theme: BackgroundTheme) => void
```

### 7.3 Update `Header.tsx`:
Add dropdown for background selection:
```typescript
<select
  value={backgroundTheme}
  onChange={(e) => onBackgroundThemeChange(e.target.value)}
  className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
>
  {Object.entries(backgroundThemes).map(([key, { name }]) => (
    <option key={key} value={key}>{name}</option>
  ))}
</select>
```

### 7.4 Apply theme:
Update CSS variables based on selected background theme.

**Files to modify:** Create `backgroundThemes.ts`, modify `useUIStore.ts`, `Header.tsx`, `globals.css`

**Commit message:** `fix: 7 - Add background color palette selection`

---

## Execution Checklist

After EACH fix:
- [ ] `npm run build` passes
- [ ] No file over 300 lines
- [ ] Feature works in browser
- [ ] Git commit with proper message

```bash
# Run after each fix:
npm run build && find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0; exit 1}' && echo "✓ All checks pass"
```

## Final Verification

After ALL fixes:
```bash
# Full check
npm run build
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -20
git log --oneline -10
```

Expected commits:
```
fix: 7 - Add background color palette selection
fix: 6 - Add light/dark theme toggle  
fix: 5 - Add panel focus modes (lists/both/calendar)
fix: 4 - Add collapsible lists with 3-column layout
fix: 3 - Enable resize tasks by dragging bottom edge
fix: 2 - Enable drag to reschedule tasks on calendar
fix: 1 - Improve calendar time display with better visual hierarchy
```
EOF
