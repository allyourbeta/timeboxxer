# FEATURES: Foundation - Font, Energy, Highlight, Parked

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**

---

## Overview

| Section | Feature |
|---------|---------|
| 1 | Fix Nunito font + increase base font size |
| 2 | Database: Add energy_level, is_daily_highlight fields + Parked list |
| 3 | Update TypeScript types |
| 4 | Update constants with PARKED_LIST_ID |
| 5 | TaskCard: Energy level picker (🔥⚡🌙) |
| 6 | TaskCard: Daily highlight toggle (⭐) |
| 7 | Header: "Park a Thought" quick capture button |

---

## SECTION 1: Fix Nunito Font + Bigger Text

The Nunito font was configured but isn't displaying properly.

### 1.1 Update `src/app/layout.tsx`

Apply font class to html element:

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 1.2 Update `src/app/globals.css`

Replace the `@theme` block at the top:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-nunito), ui-sans-serif, system-ui, sans-serif;
}
```

Add explicit font to body in the `@layer base` section:

```css
@layer base {
  * {
    border-color: hsl(var(--border));
  }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: var(--font-nunito), ui-sans-serif, system-ui, sans-serif;
    font-size: 16px;
  }
}
```

**Commit:**
```bash
git add -A && git commit -m "fix: Apply Nunito font correctly"
```

---

## SECTION 2: Database Schema Updates

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Add energy level to tasks (high, medium, low)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS energy_level TEXT DEFAULT 'medium';

-- Add daily highlight flag
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_daily_highlight BOOLEAN DEFAULT FALSE;

-- Create "Parked" system list for quick capture
INSERT INTO lists (id, user_id, name, position, is_system, system_type)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'Parked',
  -900,
  true,
  'parked'
) ON CONFLICT (id) DO NOTHING;
```

Also create the migration file `supabase/migrations/003_energy_highlight_parked.sql` with the same content for version control.

**Commit:**
```bash
git add -A && git commit -m "feat: Add energy_level, is_daily_highlight, Parked list schema"
```

---

## SECTION 3: Update TypeScript Types

### 3.1 Update `src/types/app.ts`

Add new fields to Task interface:

```typescript
export interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  completed_at: string | null
  position: number
  notes: string | null
  // Purgatory fields
  moved_to_purgatory_at: string | null
  original_list_id: string | null
  original_list_name: string | null
  // Daily task fields
  is_daily: boolean
  daily_source_id: string | null
  // Energy and highlight (NEW)
  energy_level: 'high' | 'medium' | 'low'
  is_daily_highlight: boolean
}
```

### 3.2 Update `src/state/useTaskStore.ts`

Update the Task interface to match:

```typescript
interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  completed_at: string | null
  // Purgatory fields
  moved_to_purgatory_at: string | null
  original_list_id: string | null
  original_list_name: string | null
  // Daily task fields
  is_daily: boolean
  daily_source_id: string | null
  // Energy and highlight (NEW)
  energy_level: 'high' | 'medium' | 'low'
  is_daily_highlight: boolean
}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add energy_level and is_daily_highlight to types"
```

---

## SECTION 4: Update Constants

### 4.1 Update `src/lib/constants.ts`

Add the Parked list ID:

```typescript
// System list IDs
export const PURGATORY_LIST_ID = '00000000-0000-0000-0000-000000000001'
export const PARKED_LIST_ID = '00000000-0000-0000-0000-000000000002'

// Dev user ID
export const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add PARKED_LIST_ID constant"
```

---

## SECTION 5: TaskCard Energy Level Picker

Add a 3-icon energy picker to TaskCard.

### 5.1 Update `src/components/Tasks/TaskCard.tsx`

**Add to interface:**

```typescript
interface TaskCardProps {
  // ... existing props
  energyLevel: 'high' | 'medium' | 'low'
  onEnergyChange: (level: 'high' | 'medium' | 'low') => void
}
```

**Add to destructuring:**

```typescript
export function TaskCard({
  // ... existing props
  energyLevel,
  onEnergyChange,
}: TaskCardProps) {
```

**Add energy picker UI after the duration button (inside the flex-1 div):**

```tsx
{/* Energy level picker */}
<div className="flex gap-1 mt-1">
  <button
    onClick={(e) => { e.stopPropagation(); onEnergyChange('high'); }}
    className={`text-xs px-1 rounded transition-opacity ${energyLevel === 'high' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
    title="High energy"
  >
    🔥
  </button>
  <button
    onClick={(e) => { e.stopPropagation(); onEnergyChange('medium'); }}
    className={`text-xs px-1 rounded transition-opacity ${energyLevel === 'medium' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
    title="Medium energy"
  >
    ⚡
  </button>
  <button
    onClick={(e) => { e.stopPropagation(); onEnergyChange('low'); }}
    className={`text-xs px-1 rounded transition-opacity ${energyLevel === 'low' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
    title="Low energy"
  >
    🌙
  </button>
</div>
```

### 5.2 Update `src/components/Lists/ListCard.tsx`

**Add to interface:**

```typescript
onTaskEnergyChange: (taskId: string, level: 'high' | 'medium' | 'low') => void
```

**Pass to TaskCard:**

```tsx
energyLevel={task.energy_level || 'medium'}
onEnergyChange={(level) => onTaskEnergyChange(task.id, level)}
```

### 5.3 Update `src/components/Lists/ListPanel.tsx`

**Add to interface:**

```typescript
onTaskEnergyChange: (taskId: string, level: 'high' | 'medium' | 'low') => void
```

**Pass to ListCard:**

```tsx
onTaskEnergyChange={onTaskEnergyChange}
```

### 5.4 Update `src/app/page.tsx`

**Add handler:**

```typescript
const handleEnergyChange = async (taskId: string, level: 'high' | 'medium' | 'low') => {
  await updateTask(taskId, { energy_level: level })
}
```

**Pass to ListPanel:**

```tsx
onTaskEnergyChange={handleEnergyChange}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add energy level picker to TaskCard"
```

---

## SECTION 6: TaskCard Daily Highlight Toggle

Add a star button to mark a task as the daily highlight.

### 6.1 Update `src/components/Tasks/TaskCard.tsx`

**Add to interface:**

```typescript
interface TaskCardProps {
  // ... existing props
  isHighlight: boolean
  onHighlightToggle: () => void
}
```

**Add to destructuring:**

```typescript
export function TaskCard({
  // ... existing props
  isHighlight,
  onHighlightToggle,
}: TaskCardProps) {
```

**Add highlight button near the delete button (in the top-right area):**

```tsx
{/* Highlight toggle */}
<button
  onClick={(e) => { e.stopPropagation(); onHighlightToggle(); }}
  className={`h-6 w-6 flex items-center justify-center rounded transition-opacity ${
    isHighlight ? 'opacity-100' : 'opacity-0 group-hover:opacity-50 hover:!opacity-100'
  }`}
  title={isHighlight ? 'Remove highlight' : 'Set as daily highlight'}
>
  {isHighlight ? '⭐' : '☆'}
</button>
```

**Add visual treatment for highlighted tasks - update the container div:**

If `isHighlight` is true, add a gold/yellow ring:

```tsx
<div
  className={`fc-event p-3 rounded-lg transition-transform group relative ${
    isHighlight ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent' : ''
  } ${
    isCompleted ? 'opacity-50 pointer-events-none' : 
    isScheduled && !isInPurgatory ? 'opacity-60 cursor-default' : 
    'cursor-grab active:cursor-grabbing hover:scale-[1.02]'
  }`}
  // ... rest of props
>
```

### 6.2 Update `src/components/Lists/ListCard.tsx`

**Add to interface:**

```typescript
onTaskHighlightToggle: (taskId: string) => void
```

**Pass to TaskCard:**

```tsx
isHighlight={task.is_daily_highlight || false}
onHighlightToggle={() => onTaskHighlightToggle(task.id)}
```

### 6.3 Update `src/components/Lists/ListPanel.tsx`

**Add to interface:**

```typescript
onTaskHighlightToggle: (taskId: string) => void
```

**Pass to ListCard:**

```tsx
onTaskHighlightToggle={onTaskHighlightToggle}
```

### 6.4 Update `src/app/page.tsx`

**Add handler that clears other highlights first:**

```typescript
const handleHighlightToggle = async (taskId: string) => {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return
  
  if (task.is_daily_highlight) {
    // Just remove highlight
    await updateTask(taskId, { is_daily_highlight: false })
  } else {
    // Clear any existing highlight first
    const currentHighlight = tasks.find(t => t.is_daily_highlight)
    if (currentHighlight) {
      await updateTask(currentHighlight.id, { is_daily_highlight: false })
    }
    // Set new highlight
    await updateTask(taskId, { is_daily_highlight: true })
  }
}
```

**Pass to ListPanel:**

```tsx
onTaskHighlightToggle={handleHighlightToggle}
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add daily highlight toggle to TaskCard"
```

---

## SECTION 7: Quick Capture "Park a Thought" Button

Add a quick capture button in the header.

### 7.1 Update `src/components/Layout/Header.tsx`

**Add imports:**

```typescript
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
```

**Add props for quick capture:**

```typescript
interface HeaderProps {
  currentView: 'main' | 'completed'
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  onViewChange: (view: 'main' | 'completed') => void
  onPanelModeChange: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  onParkThought: (title: string) => void  // ADD THIS
}
```

**Add to destructuring:**

```typescript
export function Header({ 
  currentView, 
  panelMode, 
  onViewChange, 
  onPanelModeChange,
  onParkThought,  // ADD THIS
}: HeaderProps) {
```

**Add state for quick capture input:**

```typescript
const [showParkInput, setShowParkInput] = useState(false)
const [parkText, setParkText] = useState('')

const handleParkSubmit = () => {
  if (parkText.trim()) {
    onParkThought(parkText.trim())
    setParkText('')
    setShowParkInput(false)
  }
}

const handleParkKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleParkSubmit()
  } else if (e.key === 'Escape') {
    setShowParkInput(false)
    setParkText('')
  }
}
```

**Add UI before the panel mode controls:**

```tsx
{/* Park a Thought quick capture */}
<div className="flex items-center gap-2">
  {showParkInput ? (
    <div className="flex items-center gap-2">
      <Input
        value={parkText}
        onChange={(e) => setParkText(e.target.value)}
        onKeyDown={handleParkKeyDown}
        placeholder="Park a thought..."
        className="w-48 h-9"
        autoFocus
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => { setShowParkInput(false); setParkText(''); }}
        className="h-9 w-9"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  ) : (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowParkInput(true)}
      className="h-9"
    >
      <Plus className="h-4 w-4 mr-1" />
      Park
    </Button>
  )}
</div>
```

### 7.2 Update `src/api/tasks.ts`

**Add function to create parked thought:**

```typescript
import { DEV_USER_ID, PARKED_LIST_ID } from '@/lib/constants'

export async function createParkedThought(title: string) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: DEV_USER_ID,
      list_id: PARKED_LIST_ID,
      title,
      duration_minutes: 15,
      color_index: 0,
      energy_level: 'medium',
      position: Date.now(), // Simple ordering by creation time
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### 7.3 Update `src/api/index.ts`

Add the export:

```typescript
export { getTasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask, moveToPurgatory, moveFromPurgatory, spawnDailyTasks, createParkedThought } from './tasks'
```

### 7.4 Update `src/state/useTaskStore.ts`

**Add import:**

```typescript
import { createParkedThought as apiCreateParkedThought } from '@/api'
```

**Add to interface:**

```typescript
createParkedThought: (title: string) => Promise<void>
```

**Add action:**

```typescript
createParkedThought: async (title) => {
  const newTask = await apiCreateParkedThought(title)
  set({ tasks: [...get().tasks, newTask] })
},
```

### 7.5 Update `src/app/page.tsx`

**Add to store destructuring:**

```typescript
const { 
  // ... existing
  createParkedThought,
} = useTaskStore()
```

**Add handler:**

```typescript
const handleParkThought = async (title: string) => {
  await createParkedThought(title)
}
```

**Pass to Header:**

```tsx
<Header 
  currentView={currentView} 
  panelMode={panelMode}
  onViewChange={setCurrentView} 
  onPanelModeChange={setPanelMode}
  onParkThought={handleParkThought}  // ADD THIS
/>
```

**Commit:**
```bash
git add -A && git commit -m "feat: Add Park a Thought quick capture in header"
```

---

## Verification

```bash
npm run build
npm run dev
```

**Test checklist:**
1. ✅ Font is Nunito throughout the app
2. ✅ Tasks show energy picker (🔥⚡🌙)
3. ✅ Clicking energy icon updates the task
4. ✅ Tasks show highlight star (☆/⭐)
5. ✅ Only one task can be highlighted at a time
6. ✅ Highlighted task has gold ring
7. ✅ "Park" button appears in header
8. ✅ Clicking "Park" shows input field
9. ✅ Entering text and pressing Enter creates task in Parked list
10. ✅ Escape closes the park input

---

## Summary

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Font class on html |
| `src/app/globals.css` | Font family, base size |
| `src/types/app.ts` | energy_level, is_daily_highlight |
| `src/state/useTaskStore.ts` | Types + createParkedThought action |
| `src/lib/constants.ts` | PARKED_LIST_ID |
| `src/api/tasks.ts` | createParkedThought function |
| `src/api/index.ts` | Export new function |
| `src/components/Tasks/TaskCard.tsx` | Energy picker, highlight toggle |
| `src/components/Lists/ListCard.tsx` | Pass new props |
| `src/components/Lists/ListPanel.tsx` | Pass new props |
| `src/components/Layout/Header.tsx` | Park a Thought UI |
| `src/app/page.tsx` | Handlers for energy, highlight, park |
