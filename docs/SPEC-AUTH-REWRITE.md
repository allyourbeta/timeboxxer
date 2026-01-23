# SPEC: Rewrite Auth from Scratch

## Overview

Delete all existing auth code and rewrite it using the **exact official Supabase Next.js pattern** from:
https://supabase.com/docs/guides/auth/server-side/nextjs

Do NOT improvise. Copy the official examples exactly.

---

## STEP 1: Delete All Existing Auth Code

Delete these files completely:
```
rm src/lib/auth.tsx
rm src/lib/supabase.ts (if it exists)
rm -rf src/lib/supabase/
rm src/middleware.ts
rm -rf src/app/auth/
rm -rf src/components/Auth/
```

---

## STEP 2: Create Supabase Clients (Official Pattern)

### File: src/utils/supabase/client.ts

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### File: src/utils/supabase/server.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

---

## STEP 3: Create Middleware (Official Pattern)

### File: src/middleware.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login page
  // But allow access to the root page (which shows login)
  // and the auth callback
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## STEP 4: Create Auth Callback Route (Official Pattern)

### File: src/app/auth/callback/route.ts

```typescript
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
```

---

## STEP 5: Create Simple Login Page

### File: src/app/login/page.tsx

```typescript
'use client'

import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
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

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors text-slate-700 font-medium"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-xs text-slate-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
```

---

## STEP 6: Create Error Page

### File: src/app/auth/auth-code-error/page.tsx

```typescript
export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-4">There was a problem signing you in.</p>
        <a href="/login" className="text-blue-600 hover:underline">
          Try again
        </a>
      </div>
    </div>
  )
}
```

---

## STEP 7: Update Main Page to Check Auth

### File: src/app/page.tsx

At the top of the component, add auth check:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

// ... other imports

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  useEffect(() => {
    const supabase = createClient()
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setAuthLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  // REST OF YOUR EXISTING COMPONENT CODE GOES HERE
  // All the hooks, handlers, and JSX you already have
```

---

## STEP 8: Update API Files to Get User from Session

### For all API files (tasks.ts, lists.ts, scheduled.ts):

Replace the `getCurrentUserId` function with:

```typescript
import { createClient } from '@/utils/supabase/client'

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    throw new Error('Not authenticated')
  }
  
  return session.user.id
}
```

Update the import at the top of each file from whatever it was to:
```typescript
import { createClient } from '@/utils/supabase/client'
```

---

## STEP 9: Add Sign Out Button to Header

### File: src/components/Layout/Header.tsx

Add a sign out button:

```typescript
import { createClient } from '@/utils/supabase/client'
import { LogOut } from 'lucide-react'

// Inside the component:
const handleSignOut = async () => {
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/login'
}

// Add button in JSX:
<Button
  variant="ghost"
  size="icon"
  onClick={handleSignOut}
  className="h-9 w-9"
  title="Sign out"
>
  <LogOut className="h-4 w-4" />
</Button>
```

---

## STEP 10: Clean Up - Remove Old AuthProvider

### File: src/app/layout.tsx

Remove any `AuthProvider` wrapper. The layout should just have ThemeProvider:

```typescript
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

---

## Verification

After implementing:

1. `npm run build` - should pass
2. `vercel --prod` - deploy
3. Go to https://timeboxer.vercel.app
4. Should redirect to /login
5. Click "Continue with Google"
6. Should redirect to Google, then back to the app
7. Should see the main app with empty lists
8. Refresh - should stay logged in
9. Click sign out - should go back to login

---

## Key Differences from Before

1. **No AuthProvider/Context** - Just use `createClient()` directly where needed
2. **No useAuth hook** - Check session directly with `getSession()`
3. **Middleware does NOT redirect** - Just refreshes tokens
4. **Login is a separate page** at `/login`
5. **Official file structure** - `utils/supabase/client.ts` and `server.ts`
6. **Simpler is better** - Fewer layers, fewer bugs

---

## Files to Create

- `src/utils/supabase/client.ts` (NEW)
- `src/utils/supabase/server.ts` (NEW)
- `src/middleware.ts` (REPLACE)
- `src/app/auth/callback/route.ts` (REPLACE)
- `src/app/login/page.tsx` (NEW)
- `src/app/auth/auth-code-error/page.tsx` (NEW)

## Files to Delete

- `src/lib/auth.tsx`
- `src/lib/supabase.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/components/Auth/LoginPage.tsx`
- `src/components/Auth/index.ts`

## Files to Modify

- `src/app/page.tsx` (add auth check at top)
- `src/app/layout.tsx` (remove AuthProvider)
- `src/api/tasks.ts` (update import and getCurrentUserId)
- `src/api/lists.ts` (update import and getCurrentUserId)
- `src/api/scheduled.ts` (update import and getCurrentUserId)
- `src/components/Layout/Header.tsx` (add sign out button)
