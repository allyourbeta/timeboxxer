# SPEC: Authentication with Google OAuth via Supabase

---

## ⚠️ MANDATORY RULES ⚠️

1. **NO FILE OVER 300 LINES.** Split if needed.
2. **Run `npm run build` after EACH section.**
3. **Commit after EACH section.**
4. **Read existing code before modifying.**

---

## Overview

This spec adds user authentication using Google OAuth through Supabase Auth. After implementation:
- Users sign in with their Google account
- Each user sees only their own data
- The hardcoded `DEV_USER_ID` is replaced with the real authenticated user ID
- Row Level Security (RLS) ensures data isolation

### Prerequisites (Manual Steps - Do These First)

Before Claude Code runs, you must do these steps manually in the Supabase dashboard:

#### Step 1: Enable Google Auth Provider

1. Go to Supabase Dashboard → Authentication → Providers
2. Find Google and enable it
3. You'll need Google OAuth credentials:
   - Go to https://console.cloud.google.com/
   - Create a new project (or use existing)
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://txkeecnalkfhloeyzzaw.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret
4. Paste Client ID and Client Secret into Supabase Google provider settings
5. Save

#### Step 2: Add Redirect URLs in Supabase

1. Go to Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `http://localhost:3000` (for local dev)
   - `https://timeboxer.vercel.app` (your production URL)

#### Step 3: Run SQL to Enable RLS

Run this in Supabase SQL Editor:

```sql
-- Enable RLS on all tables
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to start fresh)
DROP POLICY IF EXISTS "Users can view own lists" ON lists;
DROP POLICY IF EXISTS "Users can insert own lists" ON lists;
DROP POLICY IF EXISTS "Users can update own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON lists;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view own scheduled_tasks" ON scheduled_tasks;
DROP POLICY IF EXISTS "Users can insert own scheduled_tasks" ON scheduled_tasks;
DROP POLICY IF EXISTS "Users can update own scheduled_tasks" ON scheduled_tasks;
DROP POLICY IF EXISTS "Users can delete own scheduled_tasks" ON scheduled_tasks;

-- Create policies for lists
CREATE POLICY "Users can view own lists" ON lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists" ON lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists" ON lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists" ON lists
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for scheduled_tasks
CREATE POLICY "Users can view own scheduled_tasks" ON scheduled_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled_tasks" ON scheduled_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled_tasks" ON scheduled_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled_tasks" ON scheduled_tasks
  FOR DELETE USING (auth.uid() = user_id);
```

---

## SECTION 1: Create Auth Context and Hook

### File: `src/lib/auth.tsx` (NEW FILE)

Create a new file for auth context:

```tsx
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { getSupabase } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // If user just signed in, ensure they have default lists
        if (event === 'SIGNED_IN' && session?.user) {
          await ensureUserHasDefaultLists(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      console.error('Error signing in:', error)
      throw error
    }
  }

  const signOut = async () => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function to create default lists for new users
async function ensureUserHasDefaultLists(userId: string) {
  const supabase = getSupabase()

  // Check if user already has lists
  const { data: existingLists } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (existingLists && existingLists.length > 0) {
    // User already has lists, skip
    return
  }

  // Create default system lists for new user
  const defaultLists = [
    {
      user_id: userId,
      name: 'Scheduled',
      is_system: true,
      system_type: 'purgatory',
      position: 0,
    },
    {
      user_id: userId,
      name: 'TBD Grab Bag',
      is_system: true,
      system_type: 'parked',
      position: 1,
    },
  ]

  const { error } = await supabase.from('lists').insert(defaultLists)

  if (error) {
    console.error('Error creating default lists:', error)
  }
}
```

---

## SECTION 2: Create Login Page Component

### File: `src/components/Auth/LoginPage.tsx` (NEW FILE)

```tsx
'use client'

import { useAuth } from '@/lib/auth'

export function LoginPage() {
  const { signInWithGoogle, loading } = useAuth()

  const handleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Timeboxxer
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Time-boxing for the ADHD brain
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors text-slate-700 font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
```

### File: `src/components/Auth/index.ts` (NEW FILE)

```tsx
export { LoginPage } from './LoginPage'
```

---

## SECTION 3: Remove DEV_USER_ID and Use Real User ID

### File: `src/lib/constants.ts`

**Remove or comment out DEV_USER_ID:**

```tsx
// System list IDs - these are no longer hardcoded
// Each user gets their own system lists created on first sign-in

// REMOVED: export const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'
// REMOVED: export const LIMBO_LIST_ID = '00000000-0000-0000-0000-000000000001'
// REMOVED: export const PARKED_LIST_ID = '00000000-0000-0000-0000-000000000002'
```

Actually, let's keep the file but just remove the exports we don't need:

**New content:**
```tsx
// Constants file
// Note: DEV_USER_ID has been removed - we now use authenticated user IDs
// Note: LIMBO_LIST_ID and PARKED_LIST_ID removed - lists are fetched dynamically
```

### File: `src/lib/supabase.ts`

Check current content and ensure it exports a function to get the Supabase client:

```tsx
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabase: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabase
}
```

---

## SECTION 4: Update API Functions to Use Authenticated User

All API functions need to get the current user ID from the session instead of using `DEV_USER_ID`.

### File: `src/api/tasks.ts`

**Add helper to get current user ID:**

At the top of the file, add:

```tsx
import { getSupabase } from '@/lib/supabase'

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}
```

**Update all functions that use DEV_USER_ID:**

For example, `createTask`:

**Before:**
```tsx
export async function createTask(listId: string, title: string) {
  const supabase = getSupabase()
  // ...
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: DEV_USER_ID,  // OLD
      // ...
    })
```

**After:**
```tsx
export async function createTask(listId: string, title: string) {
  const supabase = getSupabase()
  const userId = await getCurrentUserId()
  // ...
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,  // NEW
      // ...
    })
```

**Functions to update in tasks.ts:**
- `createTask` — replace `DEV_USER_ID` with `await getCurrentUserId()`
- `createParkedThought` — replace `DEV_USER_ID` with `await getCurrentUserId()`
- `createCalendarTask` — replace `DEV_USER_ID` with `await getCurrentUserId()`
- `spawnDailyTasks` — replace `DEV_USER_ID` with `await getCurrentUserId()`

**Remove the import:**
```tsx
// REMOVE THIS LINE:
import { DEV_USER_ID, LIMBO_LIST_ID, PARKED_LIST_ID } from '@/lib/constants'
```

### File: `src/api/lists.ts`

Same pattern — add `getCurrentUserId` helper and replace all `DEV_USER_ID` references.

### File: `src/api/scheduled.ts`

Same pattern — add `getCurrentUserId` helper and replace all `DEV_USER_ID` references.

---

## SECTION 5: Update App Layout with Auth Provider

### File: `src/app/layout.tsx`

**Add AuthProvider wrapper:**

```tsx
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Timeboxxer",
  description: "Time-boxing for the ADHD brain",
};

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
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## SECTION 6: Update Main Page to Require Auth

### File: `src/app/page.tsx`

**Add auth check at the top of the component:**

```tsx
'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { LoginPage } from '@/components/Auth'
// ... other imports

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  
  // ... existing store hooks
  
  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }
  
  if (!user) {
    return <LoginPage />
  }
  
  // ... rest of the component (existing code)
}
```

---

## SECTION 7: Add Sign Out Button to Header

### File: `src/components/Layout/Header.tsx`

**Add import:**
```tsx
import { useAuth } from '@/lib/auth'
import { LogOut } from 'lucide-react'
```

**Inside the component, get signOut:**
```tsx
const { signOut } = useAuth()
```

**Add sign out button at the end of the header, after the Today/Completed toggle:**

```tsx
{/* Sign Out */}
<Button
  variant="ghost"
  size="icon"
  onClick={signOut}
  className="h-9 w-9"
  title="Sign out"
>
  <LogOut className="h-4 w-4" />
</Button>
```

---

## SECTION 8: Handle List IDs Dynamically

Since we removed hardcoded list IDs, we need to fetch system lists by `system_type` instead.

### File: `src/hooks/useAppHandlers.ts`

**Update `handleExternalDrop` to fetch Scheduled list dynamically:**

Find where it references `LIMBO_LIST_ID` and replace:

```tsx
const handleExternalDrop = async (taskId: string, time: string) => {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return

  const today = new Date().toISOString().split('T')[0]
  
  // Find the Scheduled list (system_type = 'purgatory')
  const scheduledList = lists.find(l => l.system_type === 'purgatory')
  if (!scheduledList) {
    console.error('Scheduled list not found')
    return
  }
  
  // Move to Scheduled list if not already there
  if (task.list_id !== scheduledList.id) {
    const originalList = lists.find(l => l.id === task.list_id)
    const originalListName = originalList ? originalList.name : 'Unknown'
    const originalListId = task.list_id || ''
    await moveToPurgatory(taskId, originalListId, originalListName)
  }
  
  await scheduleTask(taskId, today, time)
}
```

**Similarly update `handleUnschedule`** to find TBD Grab Bag by `system_type === 'parked'` instead of hardcoded ID.

---

## Verification Checklist

After all sections:

- [ ] Manual: Google OAuth configured in Supabase dashboard
- [ ] Manual: Redirect URLs added
- [ ] Manual: RLS policies created via SQL
- [ ] App shows login page when not authenticated
- [ ] Clicking "Continue with Google" redirects to Google
- [ ] After Google auth, redirects back to app
- [ ] User sees their own data (new users see empty lists)
- [ ] New users get default Scheduled and TBD Grab Bag lists
- [ ] Sign out button works
- [ ] `npm run build` passes

---

## Commit Messages

1. `feat: Add auth context and hook with Google OAuth`
2. `feat: Add login page component`
3. `refactor: Remove DEV_USER_ID constant`
4. `refactor: Update API functions to use authenticated user ID`
5. `feat: Add AuthProvider to app layout`
6. `feat: Require auth on main page, show login when not authenticated`
7. `feat: Add sign out button to header`
8. `refactor: Fetch system lists dynamically instead of hardcoded IDs`

---

## Testing New User Flow

1. Sign out (or use incognito)
2. Go to app — should see login page
3. Click "Continue with Google"
4. Authorize with Google
5. Should redirect back to app
6. Should see empty Scheduled and TBD Grab Bag lists (auto-created)
7. Create a task — should work
8. Refresh — data should persist
9. Sign out — should return to login page
10. Sign in again — should see your data

---

## Migrating Your Existing Dev Data (Optional)

If you want to keep your existing test data, run this SQL after you sign in for the first time (replace YOUR_NEW_USER_ID with your actual Google user ID from Supabase Auth → Users):

```sql
-- Update all your dev data to your real user ID
UPDATE lists SET user_id = 'YOUR_NEW_USER_ID' WHERE user_id = '11111111-1111-1111-1111-111111111111';
UPDATE tasks SET user_id = 'YOUR_NEW_USER_ID' WHERE user_id = '11111111-1111-1111-1111-111111111111';
UPDATE scheduled_tasks SET user_id = 'YOUR_NEW_USER_ID' WHERE user_id = '11111111-1111-1111-1111-111111111111';
```

Or just start fresh with a new account — your test data is just test data anyway.
