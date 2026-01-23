# OVERNIGHT SPEC: Color System Fix + Polish + Features

---

## ⚠️ MANDATORY RULES ⚠️

1. **Follow this spec EXACTLY. Do not improvise.**
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**
4. **If a build fails, STOP and fix before continuing.**

---

## Overview

This spec fixes the broken color system and adds polish. It uses the official shadcn/ui slate dark theme.

| Section | What |
|---------|------|
| 1 | Replace globals.css with official shadcn slate theme |
| 2 | Fix ListCard to use semantic tokens |
| 3 | Fix TaskCard text colors |
| 4 | Fix AddTaskInput visibility |
| 5 | Fix dropdown menu styling |
| 6 | Fix Park button (400 error) |
| 7 | Rename "Parked" to "Parked Items" |
| 8 | Increase Timeboxxer title size |
| 9 | Focus Mode warm background |
| 10 | Add Tomorrow list auto-creation |

---

## SECTION 1: Replace CSS Variables with Official shadcn Slate Theme

This is the most important section. Replace the ENTIRE `.dark` block in `src/app/globals.css`.

### 1.1 Update `src/app/globals.css`

Find the `.dark { ... }` block and replace it COMPLETELY with:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
  
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}
```

This is the official shadcn slate dark palette. It guarantees:
- `--foreground` is light (readable on dark backgrounds)
- `--card-foreground` matches `--card` for contrast
- `--muted-foreground` is a visible gray, not invisible

**Commit:**
```bash
git add -A && git commit -m "fix: Use official shadcn slate dark theme"
```

---

## SECTION 2: Fix ListCard to Use Semantic Tokens

Replace all ad-hoc color classes with semantic tokens.

### 2.1 Update `src/components/Lists/ListCard.tsx`

**Find and replace these patterns throughout the ENTIRE file:**

| Find (regex-style) | Replace With |
|--------------------|--------------|
| `bg-slate-900` | `bg-card` |
| `bg-slate-800` | `bg-card` |
| `bg-slate-700` | `bg-secondary` |
| `bg-slate-600` | `bg-muted` |
| `text-slate-100` | `text-card-foreground` |
| `text-slate-200` | `text-card-foreground` |
| `text-slate-300` | `text-muted-foreground` |
| `text-slate-400` | `text-muted-foreground` |
| `text-slate-500` | `text-muted-foreground` |
| `text-gray-100` | `text-card-foreground` |
| `text-gray-200` | `text-card-foreground` |
| `text-gray-300` | `text-muted-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `text-white` | `text-card-foreground` |
| `text-white/70` | `text-muted-foreground` |
| `text-white/60` | `text-muted-foreground` |
| `border-slate-600` | `border-border` |
| `border-slate-700` | `border-border` |

**The main card container should look like:**
```tsx
<div className="rounded-xl overflow-hidden border-2 border-border shadow-lg bg-card">
```

**The header section should use:**
```tsx
<span className="font-semibold text-card-foreground">{list.name}</span>
<span className="text-sm text-muted-foreground">{taskCount} tasks</span>
```

**Icons should use:**
```tsx
<ChevronDown className="h-5 w-5 text-muted-foreground" />
```

**Commit:**
```bash
git add -A && git commit -m "fix: ListCard uses semantic color tokens"
```

---

## SECTION 3: Fix TaskCard Text Colors

TaskCards have colored backgrounds from the palette. Text MUST be white for contrast.

### 3.1 Update `src/components/Tasks/TaskCard.tsx`

**All text inside TaskCard should be white or white with opacity:**

Find all text-related classes and ensure they use white:

```tsx
// Title
<span className="text-white font-medium truncate">{title}</span>

// Duration button
<button className="text-white/80 hover:text-white text-sm font-medium">

// Energy icon container (the emoji itself is fine, just the container)
<button className="text-white/80 hover:text-white">

// Delete icon
<Trash2 className="h-4 w-4 text-white/60 hover:text-white" />
```

**For the checkbox (daily toggle), ensure visibility on colored backgrounds:**
```tsx
<input
  type="checkbox"
  className="w-3.5 h-3.5 rounded border-white/50 accent-white"
/>
```

**Commit:**
```bash
git add -A && git commit -m "fix: TaskCard uses white text on colored backgrounds"
```

---

## SECTION 4: Fix AddTaskInput Visibility

### 4.1 Update `src/components/Tasks/AddTaskInput.tsx`

The input needs visible placeholder text and proper background.

**Find the input element and update its className:**

```tsx
<input
  type="text"
  placeholder="Add task..."
  className="w-full px-3 py-2 rounded-md bg-secondary text-card-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring"
  // ... other props
/>
```

**Key classes:**
- `bg-secondary` — slightly lighter than card background
- `text-card-foreground` — readable text
- `placeholder:text-muted-foreground` — visible but subtle placeholder
- `border-border` — consistent border color

**Commit:**
```bash
git add -A && git commit -m "fix: AddTaskInput has visible placeholder"
```

---

## SECTION 5: Fix Dropdown Menu Styling

### 5.1 Update `src/components/Lists/ListCard.tsx`

Find the dropdown menu (shows when clicking ⋮) and update its styling:

```tsx
{showMenu && menuPosition && (
  <div 
    className="fixed w-44 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 py-1"
    style={{
      top: menuPosition.top,
      left: menuPosition.left,
    }}
  >
    {!list.is_system && (
      <>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(false)
            // ... duplicate logic
          }}
          className="w-full px-3 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(false)
            // ... delete logic
          }}
          className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Delete List
        </button>
      </>
    )}
    {list.is_system && (
      <div className="px-3 py-2 text-sm text-muted-foreground italic">
        System list
      </div>
    )}
  </div>
)}
```

**Key classes:**
- `bg-popover text-popover-foreground` — guaranteed contrast
- `border-border` — consistent border
- `hover:bg-accent` — visible hover state

**Commit:**
```bash
git add -A && git commit -m "fix: Dropdown menu uses semantic color tokens"
```

---

## SECTION 6: Fix Park Button (400 Error)

The Park button fails because `createParkedThought` is missing required fields.

### 6.1 Update `src/api/tasks.ts`

Find the `createParkedThought` function and replace it with:

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

**Make sure PARKED_LIST_ID is imported from constants:**
```typescript
import { DEV_USER_ID, PARKED_LIST_ID } from '@/lib/constants'
```

**Commit:**
```bash
git add -A && git commit -m "fix: createParkedThought includes all required fields"
```

---

## SECTION 7: Rename "Parked" to "Parked Items"

### 7.1 This requires a SQL update

**Note for Claude Code:** You cannot run SQL directly. Tell the user to run this in Supabase:

```sql
UPDATE lists SET name = 'Parked Items' WHERE system_type = 'parked';
```

### 7.2 Update migration file for reference

Update `supabase/migrations/003_energy_highlight_parked.sql` to change 'Parked' to 'Parked Items' for future deployments.

**Commit:**
```bash
git add -A && git commit -m "fix: Rename Parked to Parked Items in migration"
```

---

## SECTION 8: Increase Timeboxxer Title Size

### 8.1 Update `src/components/Layout/Header.tsx`

Find the Timeboxxer title and increase its size:

**From:**
```tsx
<h1 className="text-xl font-bold">Timeboxxer</h1>
```

**To:**
```tsx
<h1 className="text-2xl font-bold text-foreground">Timeboxxer</h1>
```

(text-2xl is 1.5rem = 24px, up from text-xl which is 1.25rem = 20px)

**Commit:**
```bash
git add -A && git commit -m "fix: Increase Timeboxxer title size"
```

---

## SECTION 9: Focus Mode Warm Background

### 9.1 Update `src/components/Focus/FocusMode.tsx`

Find the container div and change the background from the task color to a warm orange-red:

**From:**
```tsx
<div 
  className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
  style={{ backgroundColor: bgColor }}
>
```

**To:**
```tsx
<div 
  className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-orange-600 via-red-600 to-orange-700"
>
```

**Remove any reference to `bgColor` for the container since we're using a fixed warm gradient.**

This creates a warm, high-contrast focus mode that stands out clearly regardless of light/dark mode.

**Commit:**
```bash
git add -A && git commit -m "feat: Focus Mode uses warm orange-red gradient"
```

---

## SECTION 10: Add Tomorrow List Auto-Creation

### 10.1 Add helper functions to `src/lib/dateList.ts`

Add these functions if they don't exist:

```typescript
/**
 * Format tomorrow's date as a list name
 * e.g., "Jan 16, 2026"
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
```

### 10.2 Add `ensureTomorrowList` to `src/api/lists.ts`

```typescript
import { getTodayListName, getTomorrowListName } from '@/lib/dateList'
import { DEV_USER_ID } from '@/lib/constants'

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

### 10.3 Export from `src/api/index.ts`

Add `ensureTomorrowList` to exports:

```typescript
export { 
  getLists, 
  createList, 
  // ... other exports
  ensureTodayList,
  ensureTomorrowList 
} from './lists'
```

### 10.4 Update `src/state/useListStore.ts`

Update `loadLists` to also ensure tomorrow's list:

```typescript
import { getLists, ensureTodayList, ensureTomorrowList } from '@/api'

// In the loadLists action:
loadLists: async () => {
  await ensureTodayList()
  await ensureTomorrowList()
  
  const data = await getLists()
  const sortedLists = sortListsForDisplay(data || [])
  set({ lists: sortedLists, loading: false })
},
```

**Commit:**
```bash
git add -A && git commit -m "feat: Auto-create Tomorrow list on app load"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ List cards have readable text (light on dark)
2. ✅ "X tasks" subtitle is visible (gray, not invisible)
3. ✅ "Add task..." placeholder is visible
4. ✅ Task cards have white text on colored backgrounds
5. ✅ Dropdown menu has solid background, readable text
6. ✅ Park button works (creates task in Parked Items)
7. ✅ Focus Mode has warm orange-red background
8. ✅ Timeboxxer title is larger
9. ✅ Tomorrow's date list appears alongside Today

---

## SQL for User to Run

Tell the user they need to run this SQL in Supabase Dashboard:

```sql
UPDATE lists SET name = 'Parked Items' WHERE system_type = 'parked';
```

---

## Summary

| File | Changes |
|------|---------|
| `src/app/globals.css` | Official shadcn slate dark theme |
| `src/components/Lists/ListCard.tsx` | Semantic tokens everywhere |
| `src/components/Tasks/TaskCard.tsx` | White text on colors |
| `src/components/Tasks/AddTaskInput.tsx` | Visible placeholder |
| `src/api/tasks.ts` | Fix createParkedThought |
| `src/components/Layout/Header.tsx` | Larger title |
| `src/components/Focus/FocusMode.tsx` | Warm gradient |
| `src/lib/dateList.ts` | getTomorrowListName |
| `src/api/lists.ts` | ensureTomorrowList |
| `src/api/index.ts` | Export new function |
| `src/state/useListStore.ts` | Call ensureTomorrowList |
