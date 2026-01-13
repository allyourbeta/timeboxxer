# CLAUDE.md - Project Guidelines for Timeboxxer

> This file is read by Claude Code at the start of every session.
> Last updated: 2026-01-12

## Project Overview

**Timeboxxer** is a time-boxing web application for daily planning. Users create tasks in themed lists, then drag them onto today's calendar to commit to specific time slots.

### Core Philosophy: "Engaged Simplicity"

- **Daily engagement over automation.** Building today's calendar is the practice, not a chore to automate away.
- **Resist feature creep ruthlessly.** Every option adds cognitive load. ADHD-friendly means fewer decisions, not more powerful ones.
- **The tool should feel light, almost playful.** If it feels heavy, we've failed.

### Key Workflows

1. User creates lists (themed by function: "Fitness", "Work", or by date: "Jan 12")
2. User creates tasks within lists (title, duration, color)
3. User drags tasks to today's calendar:
   - **Copy**: Task stays in list AND appears on calendar (for recurring-ish tasks)
   - **Move**: Task removed from list, only exists on calendar (one-off tasks)
4. User completes tasks on calendar (marked done, archived for "what did I do?" queries)
5. User can duplicate lists (for creating tomorrow's dated list from today's)

---

## Tech Stack

- **Frontend**: React 18+, Next.js 14+ (App Router), TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand (separate stores per domain)
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Auth**: Google OAuth via Supabase

---

## Architecture Rules (Non-Negotiable)

### The Four Layers

```
COMPONENTS (UI Only)
    │  - Renders props, emits events
    │  - No business logic, no direct API calls
    │  - No Supabase imports, no store internals
    ▼
STATE (Zustand Stores)
    │  - Holds UI state and cached server state
    │  - Orchestrates: validates via services, persists via API
    │  - Located in src/state/
    ▼
SERVICES (Pure Functions)
    │  - Business logic, validation, transformations
    │  - NO React imports, NO database imports
    │  - Easily unit testable
    │  - Located in src/services/
    ▼
API (All Database Calls)
       - Supabase queries only
       - No business logic, just CRUD
       - Located in src/api/
```

### Hard Rules

1. **No file over 300 lines.** Split immediately if exceeded.
2. **Components contain no business logic.** They receive props, render UI, emit events.
3. **Services are pure functions.** No React hooks, no Supabase client, no side effects.
4. **All Supabase calls in `src/api/`.** Nowhere else. Ever.
5. **Build must pass before finishing any task.**

### The Test

Can I swap the UI entirely (web to CLI) and keep the bottom three layers unchanged? Can I swap Supabase for another backend and only change `src/api/`? If yes, the separation is correct.

---

## File Structure

```
timeboxxer/
├── CLAUDE.md                 # This file
├── SCHEMA.md                 # Database schema documentation
├── README.md                 # User-facing readme
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── .env.local                # Local env vars (not committed)
├── .env.example              # Template for env vars
│
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Main app page
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── globals.css
│   │
│   ├── api/                  # ALL Supabase calls
│   │   ├── index.ts          # Re-exports all API modules
│   │   ├── tasks.ts          # Task CRUD
│   │   ├── lists.ts          # List CRUD
│   │   ├── scheduled.ts      # Scheduled task CRUD
│   │   ├── profiles.ts       # Profile CRUD
│   │   └── README.md
│   │
│   ├── services/             # Pure business logic
│   │   ├── index.ts          # Re-exports all services
│   │   ├── timeboxing.ts     # Duration calc, slot fitting, time utils
│   │   ├── validation.ts     # Input validation
│   │   ├── colors.ts         # Palette logic
│   │   └── README.md
│   │
│   ├── state/                # Zustand stores
│   │   ├── index.ts          # Re-exports all stores
│   │   ├── useTaskStore.ts   # Tasks state
│   │   ├── useListStore.ts   # Lists state
│   │   ├── useScheduleStore.ts # Today's calendar state
│   │   ├── useUIStore.ts     # Panel visibility, drag state
│   │   └── README.md
│   │
│   ├── components/           # UI components (no logic)
│   │   ├── Layout/
│   │   │   ├── AppShell.tsx
│   │   │   └── index.ts
│   │   ├── Lists/
│   │   │   ├── ListPanel.tsx
│   │   │   ├── ListCard.tsx
│   │   │   └── index.ts
│   │   ├── Tasks/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── index.ts
│   │   ├── Calendar/
│   │   │   ├── DayView.tsx
│   │   │   ├── TimeSlot.tsx
│   │   │   ├── ScheduledTask.tsx
│   │   │   └── index.ts
│   │   └── README.md
│   │
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client init (ONLY place client is created)
│   │   └── palettes.ts       # Palette definitions
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── database.ts       # Supabase-generated types
│   │   └── app.ts            # App-specific types
│   │
│   └── hooks/
│       ├── useAuth.ts        # Auth state hook
│       └── useDragDrop.ts    # Drag-drop hook
│
├── supabase/
│   ├── migrations/           # SQL migrations
│   └── seed.sql              # Seed data for dev
│
└── scripts/
    └── verify.sh             # Pre-commit checks
```

---

## Patterns for Adding Features

### Adding a new API endpoint

1. Create or edit file in `src/api/`
2. Function signature: `async function doThing(params): Promise<Result>`
3. Use Supabase client from `@/lib/supabase`
4. Handle errors, return typed results
5. Export from `src/api/index.ts`

### Adding business logic

1. Add pure function to `src/services/`
2. NO React imports, NO Supabase imports
3. Takes data in, returns data out
4. Write unit test
5. Export from `src/services/index.ts`

### Adding state

1. Create or edit store in `src/state/`
2. Store calls services for validation/transformation
3. Store calls API for persistence
4. Keep store focused (tasks, lists, schedule, UI)
5. Export from `src/state/index.ts`

### Adding a component

1. Create in appropriate `src/components/` subfolder
2. Props interface at top of file
3. No direct API calls, no business logic
4. Get data from stores via hooks
5. Emit events via callbacks
6. Export from subfolder's `index.ts`

---

## Before Every Commit

Run these checks:

```bash
# Build must pass
npm run build

# No files over 300 lines
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 && !/total/ {print "FAIL: " $0}'

# Supabase calls centralized (should only show src/api/ and src/lib/supabase.ts)
grep -r "from.*supabase" src/ --include="*.ts" --include="*.tsx" | grep -v "src/api/" | grep -v "src/lib/supabase"

# Services are pure (should return nothing)
grep -r "from 'react'" src/services/
grep -r "from '@/lib/supabase'" src/services/

# Types check
npm run type-check
```

---

## Warning Signs (Fix Immediately)

- File approaching 250 lines → Plan to split
- Component importing from `@/lib/supabase` → Move to API layer
- Component importing from `@/api/` directly → Use store instead
- Business logic in component → Extract to service
- `useEffect` doing complex logic → Extract to service, call from store
- Duplicated code → Extract to service or utility
- "Just for now" or "TODO: fix later" → Fix now

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Simple, performant, matches Intabyu |
| Styling | Tailwind | Utility-first, fast iteration |
| Auth | Supabase + Google | Proven pattern from Intabyu |
| Color storage | Index into palette | Palette switch updates all tasks |
| Duration | Fixed increments (15/30/45/60) | Simplicity, visual consistency |
| Timezone | Local | User's device timezone |

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## Deploy

```bash
vercel --prod
```

---

## Getting Help

If unsure about architecture decisions, read:
1. This file (CLAUDE.md) - Core principles
2. `SCHEMA.md` - Database structure
3. Existing code in the relevant layer for patterns
