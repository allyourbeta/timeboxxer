# Spec: Visual Design Makeover

## Overview

Give Timeboxxer a cohesive, polished visual design inspired by **Morgen** (morgen.so) and **Akiflow** (akiflow.com). The goal is not perfection - just a first pass that makes the app look intentional rather than ad-hoc.

## Reference Apps

**Morgen** (morgen.so):
- Clean, minimal interface
- Soft colors, not harsh
- Clear visual hierarchy
- Calendar and tasks side by side
- Subtle shadows and borders
- Professional but warm

**Akiflow** (akiflow.com):
- Task list + calendar layout (very similar to Timeboxxer)
- Muted color palette
- Clear separation between panels
- Compact but readable task cards
- Logical header organization

## Design Principles to Follow

1. **Consistency over creativity** - Same spacing, same colors, same patterns everywhere
2. **Subtle over bold** - Soft shadows, muted colors, gentle borders
3. **Hierarchy through spacing** - Not through loud colors or sizes
4. **Calm palette** - No harsh primary colors, prefer muted/desaturated tones
5. **Whitespace is good** - Don't cram things together

---

## Part 1: Color Palette

### Current Problem
Colors are scattered throughout components with no system. Task cards use a bright "rainbow" palette. UI elements use random Tailwind colors.

### New Palette (Claude to refine based on Morgen/Akiflow)

**Backgrounds:**
- `--bg-primary`: Main app background (light gray or off-white)
- `--bg-secondary`: Cards, panels (white or slightly elevated)
- `--bg-tertiary`: Hover states, subtle highlights

**Text:**
- `--text-primary`: Main text (dark gray, not pure black)
- `--text-secondary`: Muted text, labels (medium gray)
- `--text-tertiary`: Placeholders, disabled (light gray)

**Accents:**
- `--accent-primary`: Primary actions, selected states (muted blue or teal)
- `--accent-success`: Complete actions (soft green)
- `--accent-danger`: Delete, destructive (soft red)

**Borders:**
- `--border-subtle`: Panel separators (very light)
- `--border-default`: Card borders (light gray)

**Task Colors:**
- Keep a palette for task cards but make it more muted/pastel
- Less saturated than current "rainbow-bright"

### Implementation
Define all colors as CSS variables in `globals.css`, then use them consistently across all components.

---

## Part 2: Spacing System

### Current Problem
Padding and margins are arbitrary - p-2 here, p-4 there, gap-3 somewhere else.

### New System

Use a consistent scale based on 4px:
- `xs`: 4px (0.25rem) - tight spacing
- `sm`: 8px (0.5rem) - compact elements
- `md`: 12px (0.75rem) - default internal padding
- `lg`: 16px (1rem) - card padding, gaps
- `xl`: 24px (1.5rem) - section spacing
- `2xl`: 32px (2rem) - major sections

### Rules
- Card internal padding: `lg` (16px)
- Gap between cards: `md` (12px)
- Section gaps: `xl` (24px)
- Button internal padding: `sm` horizontal, `xs` vertical
- Icon spacing from text: `sm` (8px)

---

## Part 3: Component Styling

### Cards (List cards, Task cards)

**Current:** Inconsistent shadows, borders, radiuses

**New Standard:**
- Border radius: 8px (rounded-lg)
- Border: 1px solid var(--border-default)
- Shadow: Very subtle or none (shadow-sm at most)
- Background: var(--bg-secondary)
- Hover: Slightly darker background or subtle shadow

### Buttons

**Current:** Mix of styles, inconsistent sizing

**New Standard:**
- Primary: Solid accent color, white text
- Secondary: Ghost/outline style, subtle border
- Icon buttons: No background, hover shows subtle bg
- Consistent height: 32px for standard, 28px for compact
- Border radius: 6px
- Padding: 8px 12px (with text) or square for icon-only

### Inputs

**Current:** Default browser-ish styling

**New Standard:**
- Border: 1px solid var(--border-default)
- Border radius: 6px
- Focus: Accent color ring (not harsh blue)
- Background: var(--bg-secondary)
- Padding: 8px 12px

### Task Cards (in lists)

**Current:** Bright colored backgrounds, lots of inline controls

**New:**
- Keep colored left border or dot (not full background)
- White/neutral card background
- Color dot/bar on left edge to indicate category
- Controls appear on hover (not always visible)
- More compact vertical spacing

---

## Part 4: Header Reorganization

### Current Problem
Buttons are placed arbitrarily with no grouping logic:
- Quick Save, some icons, view toggles, Just Start, Today/Completed all in one row

### New Organization

**Left Group - Logo & Quick Actions:**
- Logo/App name
- Quick Save (if it's a frequent action)

**Center Group - View Controls:**
- Panel mode toggles (Lists / Both / Calendar)
- These control WHAT you're looking at

**Right Group - Navigation & User:**
- Today / Completed toggle (WHERE you're navigating)
- Collapse all (occasional utility)
- Column count (settings-like)
- User menu / settings (if applicable)

### Visual Grouping
- Add subtle separators between groups (thin vertical line or spacing)
- Related buttons should be visually grouped (adjacent, maybe shared background)
- Reduce visual noise - not everything needs to be a visible button

### Specific Recommendations

**"Just Start" button:**
- This is a primary action - make it prominent
- Could be accent colored
- Maybe moves to a more central/obvious position

**View toggles (Lists/Both/Calendar):**
- Should look like a segmented control (connected buttons)
- Only one active at a time - clear active state

**Today/Completed:**
- Navigation tabs - could be styled as tabs not buttons

---

## Part 5: Panel Layout

### Current Problem
Panels feel arbitrary - no clear visual separation or hierarchy.

### Improvements

**Left Panel (Lists):**
- Subtle background differentiation from calendar
- Clear visual boundary (subtle shadow or border)
- Consistent internal padding
- List cards should have consistent spacing

**Right Panel (Calendar):**
- Clean time grid
- Current time indicator more visible
- Task blocks should match the new muted palette
- Time labels clearly readable but not dominant

**Panel Divider:**
- Subtle vertical border or shadow
- Could be draggable (future feature) but visually present

---

## Part 6: Typography

### Current Problem
Default Tailwind text sizing, inconsistent weights.

### New Standard

**Font:** Keep system font stack (already good)

**Sizes:**
- App title: text-lg, font-semibold
- Section headers: text-base, font-semibold
- Card titles: text-sm, font-medium
- Body text: text-sm, font-normal
- Labels/meta: text-xs, text-secondary color

**Rules:**
- No text-xl or larger except app title
- Avoid font-bold (use font-semibold max)
- Use color for hierarchy, not just size

---

## Part 7: Task Color Palette

### Current Problem
"rainbow-bright" is too saturated and childish-looking.

### New Palette Direction
Create or select a muted/pastel palette:
- Same hues but lower saturation
- Colors that look professional, not like a children's app
- Should work well as left-border accent, not full background

### Implementation
Either:
1. Update the colors in `palettes.ts` to be more muted
2. Or create a new palette "professional" or "muted" and set as default

---

## Files to Modify

**Core styling:**
- `src/app/globals.css` - CSS variables, base styles

**Components:**
- `src/components/Layout/Header.tsx` - Reorganize buttons, consistent styling
- `src/components/Lists/ListCard.tsx` - Card styling
- `src/components/Lists/ListPanel.tsx` - Panel styling
- `src/components/Tasks/TaskCard.tsx` - Task styling
- `src/components/Calendar/CalendarView.tsx` - Calendar styling
- `src/components/ui/button.tsx` - If exists, standardize
- `src/components/ui/input.tsx` - If exists, standardize

**Colors:**
- `src/lib/palettes.ts` - Muted task color palette

---

## Success Criteria

After this makeover:
- [ ] All colors come from CSS variables
- [ ] Spacing follows the 4px-based system
- [ ] Header buttons are logically grouped
- [ ] Cards have consistent styling (radius, border, shadow)
- [ ] Task colors are muted/professional
- [ ] No harsh or jarring colors
- [ ] Clear visual hierarchy
- [ ] App looks "designed" not "coded"
