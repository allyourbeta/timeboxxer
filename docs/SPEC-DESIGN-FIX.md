# Spec: Fix Dark Mode + Actually Apply Design System

## Overview

The previous "visual makeover" created a design system but failed to apply it. Dark mode is now broken (missing text), task cards still have full-color backgrounds, there's no visual separation between panels, and header buttons are still randomly ordered.

This spec fixes the regressions and actually implements the visual changes.

---

## CRITICAL: Fix Dark Mode First

### Current Problem
- Dark mode and light mode look the same
- Dark mode is missing ALL text (text is invisible)
- This is a regression - it was working before

### Root Cause
The new CSS variables in globals.css only define light mode values. The dark mode section still uses the old HSL-based variables, creating a mismatch.

### Fix Required

In `src/app/globals.css`, the `.dark` section must define ALL the new custom properties:

```css
.dark {
  /* Existing shadcn variables... */
  
  /* Timeboxxer Design System - Dark Mode */
  --bg-primary: #171717;
  --bg-secondary: #262626;
  --bg-tertiary: #404040;
  --bg-elevated: #303030;
  
  --text-primary: #fafafa;
  --text-secondary: #a3a3a3;
  --text-tertiary: #737373;
  --text-inverse: #171717;
  
  --accent-primary: #3b82f6;
  --accent-primary-hover: #2563eb;
  --accent-success: #22c55e;
  --accent-success-hover: #16a34a;
  --accent-danger: #ef4444;
  --accent-danger-hover: #dc2626;
  --accent-warning: #f59e0b;
  
  --border-subtle: #303030;
  --border-default: #404040;
  --border-emphasis: #525252;
  
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.3);
  
  --interactive-hover: var(--bg-tertiary);
  --interactive-active: #525252;
}
```

### Verification
- Toggle between light and dark mode
- ALL text must be visible in both modes
- Backgrounds should be appropriately light/dark
- No elements should "disappear"

---

## Part 1: Task Cards - White Background with Colored Border

### Current Problem
Task cards use full-color backgrounds (`style={{ backgroundColor: bgColor }}`). This looks childish and cluttered.

### Desired Result
- White/neutral card background
- Thin colored left border (3-4px) shows the task's color
- Clean, professional look like Todoist, Linear, Asana

### Implementation

**File: `src/components/Tasks/TaskCard.tsx`**

Change the card container from:
```tsx
<div
  className="..."
  style={{ backgroundColor: bgColor }}
>
```

To:
```tsx
<div
  className="bg-theme-secondary border border-theme rounded-lg relative overflow-hidden"
  style={{ borderLeftWidth: '4px', borderLeftColor: bgColor }}
>
```

Remove the color dot inside the card (it's redundant now - the left border IS the color indicator).

Change text colors from `text-white` to `text-theme-primary` and `text-theme-secondary`.

The card should look like:
```
┌────────────────────────────────┐
│▌ Task title            30m ⚡ ✓│
└────────────────────────────────┘
 ^ colored border (4px)
```

### Text Color Updates in TaskCard
- Title: `text-theme-primary` (was `text-white`)
- Duration: `text-theme-secondary` (was `text-white/80`)
- Icons: `text-theme-secondary hover:text-theme-primary` (was `text-white`)

---

## Part 2: Panel Separation

### Current Problem
The list panel and calendar panel blend together with no visual separation. It's hard to see where one ends and the other begins.

### Desired Result
- Clear visual boundary between panels
- Subtle but visible - not harsh
- Works in both light and dark modes

### Implementation

**Option A: Border on Calendar Panel**

In `src/components/Calendar/CalendarView.tsx`, add a left border:
```tsx
<div className="... border-l border-theme">
```

**Option B: Shadow on List Panel**

In `src/components/Lists/ListPanel.tsx`, add a subtle shadow:
```tsx
<div className="... shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]">
```

**Option C: Both panels with rounded corners and gaps**

In `src/app/page.tsx` where panels are laid out, add gap and styling:
```tsx
<div className="flex gap-4 p-4 bg-theme-primary">
  <div className="bg-theme-secondary rounded-xl border border-theme overflow-hidden">
    <ListPanel ... />
  </div>
  <div className="bg-theme-secondary rounded-xl border border-theme overflow-hidden">
    <CalendarView ... />
  </div>
</div>
```

**Recommendation:** Option C (rounded corners with gap) looks most modern and matches Morgen/Akiflow aesthetic. Choose this unless it causes layout issues.

---

## Part 3: Header Button Organization

### Current Problem
Buttons are scattered randomly: Quick Save, Collapse, Columns, Lists/Both/Calendar, Just Start, Theme, Logout, Today/Completed. No logical grouping.

### Desired Organization

**Left Group - Branding & Stats:**
- App name/logo
- Week streak
- Completed today count

**Center Group - View Controls:**
- Panel mode (Lists / Both / Calendar) - segmented control
- Column count (1 / 2) - segmented control
- These control HOW you view content

**Right Group - Actions & Navigation:**
- Quick Save button (primary action)
- Just Start button (primary action)
- Collapse All (utility)
- Today / Completed toggle (navigation)
- Theme toggle (settings)
- Sign out (settings)

### Visual Grouping

Add subtle dividers between groups:
```tsx
{/* Divider */}
<div className="h-6 w-px bg-border-default mx-2" />
```

Or use spacing:
```tsx
<div className="flex items-center gap-2">  {/* tight group */}
<div className="flex items-center gap-6">  {/* between groups */}
```

### Implementation

**File: `src/components/Layout/Header.tsx`**

Restructure the JSX to group related buttons:

```tsx
<header className="h-14 px-4 bg-theme-secondary border-b border-theme flex items-center justify-between">
  {/* LEFT: Branding & Stats */}
  <div className="flex items-center gap-4">
    <h1 className="text-lg font-semibold text-theme-primary">Timeboxxer</h1>
    <WeekStreak ... />
    {completedToday > 0 && <CompletedBadge count={completedToday} />}
  </div>
  
  {/* CENTER: View Controls */}
  <div className="flex items-center gap-3">
    {/* Panel mode segmented control */}
    <SegmentedControl ... />
    
    {/* Column count segmented control */}
    <SegmentedControl ... />
  </div>
  
  {/* RIGHT: Actions & Settings */}
  <div className="flex items-center gap-2">
    {/* Primary actions */}
    <QuickSaveButton ... />
    <JustStartButton ... />
    
    {/* Divider */}
    <div className="h-5 w-px bg-border-default mx-1" />
    
    {/* Navigation */}
    <TodayCompletedToggle ... />
    
    {/* Divider */}
    <div className="h-5 w-px bg-border-default mx-1" />
    
    {/* Utilities */}
    <CollapseAllButton ... />
    <ThemeToggle ... />
    <SignOutButton ... />
  </div>
</header>
```

### Button Hierarchy

- **Just Start**: This is THE primary action. Make it accent-colored and prominent.
- **Quick Save**: Secondary action, but still important. Could be accent-colored or secondary style.
- **View toggles**: Segmented controls, neutral styling.
- **Utilities** (collapse, theme, logout): Icon-only buttons, subtle.

---

## Part 4: List Cards

### Current State
List cards may also need updates to match the new system.

### Desired Result
- Clean white/neutral background
- Subtle border
- Consistent with task card styling
- Proper spacing

### Check and Update

**File: `src/components/Lists/ListCard.tsx`**

Ensure it uses:
- `bg-theme-secondary` for background
- `border border-theme` for borders
- `rounded-lg` for consistent radius
- `text-theme-primary` and `text-theme-secondary` for text

---

## Part 5: Calendar Styling

### Current Problem
Calendar may still have harsh colors or inconsistent styling.

### Updates Needed

**File: `src/components/Calendar/CalendarView.tsx`**

- Time labels: `text-theme-secondary`
- Hour grid lines: `border-theme-subtle`
- Current time indicator: `bg-accent-primary` (keep visible but not harsh)
- Scheduled task blocks: Should match the new task card style (white bg, colored left border)

### Scheduled Tasks in Calendar

The task blocks in the calendar should also use the "white background + colored border" style, not full-color backgrounds.

---

## Files to Modify

1. `src/app/globals.css` - Add dark mode variables (CRITICAL)
2. `src/components/Tasks/TaskCard.tsx` - White bg + colored border
3. `src/components/Layout/Header.tsx` - Reorganize buttons
4. `src/components/Lists/ListPanel.tsx` - Panel styling
5. `src/components/Calendar/CalendarView.tsx` - Panel styling, task blocks
6. `src/app/page.tsx` - Panel container styling (gaps, borders)
7. `src/components/Lists/ListCard.tsx` - Consistent card styling

---

## Testing Checklist

### Dark Mode
- [ ] Toggle to dark mode - all text visible
- [ ] Toggle to light mode - all text visible
- [ ] No elements disappear in either mode
- [ ] Colors are appropriate for each mode

### Task Cards
- [ ] Cards have white/neutral background
- [ ] Colored left border shows task color
- [ ] Text is readable (not white-on-white)
- [ ] Hover states work

### Panel Separation
- [ ] Clear visual boundary between list and calendar
- [ ] Looks good in both light and dark mode
- [ ] Panels have rounded corners (if using Option C)

### Header
- [ ] Buttons are logically grouped
- [ ] Visual dividers between groups
- [ ] Just Start is prominent
- [ ] No random button placement

### Overall
- [ ] App looks cohesive and intentional
- [ ] No broken styling
- [ ] Both light and dark modes work

---

## Commit

```bash
git add -A && git commit -m "fix: repair dark mode, apply design system properly

- Add dark mode values for all CSS variables (fixes missing text)
- Task cards: white background with colored left border
- Add visual separation between list and calendar panels
- Reorganize header buttons into logical groups
- Consistent styling across all components"
```
