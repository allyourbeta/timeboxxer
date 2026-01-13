# Timeboxxer

A time-boxing web application for daily planning. Create tasks in themed lists, then drag them onto today's calendar to commit to specific time slots.

## Philosophy

**Engaged Simplicity** — The act of building today's calendar is itself valuable. This isn't a "set it and forget it" system; it's a daily practice that creates commitment.

## Features

- **Lists**: Organize tasks by theme ("Fitness", "Work") or by date ("Jan 12")
- **Tasks**: Title, duration (15/30/45/60 min), color from palette
- **Calendar**: Drag tasks to today's schedule
- **Copy vs Move**: Keep task in list (recurring) or move to calendar (one-off)
- **Completion tracking**: "What did I do this week?"
- **Color palettes**: Multiple themes to choose from

## Tech Stack

- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Supabase (database, auth)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/timeboxxer.git
cd timeboxxer
```

2. Install dependencies
```bash
npm install
```

3. Set up Supabase
   - Create a new Supabase project
   - Run the migration in `supabase/migrations/001_initial_schema.sql`
   - Enable Google OAuth in Authentication settings

4. Configure environment
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

5. Run development server
```bash
npm run dev
```

## Project Structure

```
src/
├── app/          # Next.js pages
├── api/          # Supabase queries (all DB calls here)
├── services/     # Pure business logic
├── state/        # Zustand stores
├── components/   # React components (UI only)
├── lib/          # Supabase client, palettes
├── types/        # TypeScript definitions
└── hooks/        # Custom React hooks
```

See `CLAUDE.md` for detailed architecture guidelines.

## Development

```bash
# Run dev server
npm run dev

# Type check
npm run type-check

# Build
npm run build

# Lint
npm run lint
```

## License

MIT
