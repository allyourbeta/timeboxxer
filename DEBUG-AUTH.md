# DEBUG: Authentication Flow Stuck on "Loading..."

## Problem Summary

After implementing Google OAuth with Supabase, users can successfully authenticate (we see `Auth state changed: SIGNED_IN true` in console), but the app gets stuck on "Loading..." and never shows the main interface.

## What's Working

1. ✅ Google OAuth redirect works
2. ✅ User authorizes with Google
3. ✅ Callback route exchanges code for session
4. ✅ `onAuthStateChange` fires with `SIGNED_IN` event
5. ✅ Console shows: `Auth state changed: SIGNED_IN true`

## What's NOT Working

1. ❌ After auth, app shows "Loading..." forever
2. ❌ No Supabase API calls appear in Network tab (no calls to `txkeecnalkfhloeyzzaw.supabase.co`)
3. ❌ No errors in Console
4. ❌ Data never loads (lists, tasks, scheduled_tasks)

## Recent Changes Made

1. Added `src/lib/auth.tsx` - AuthProvider with Google OAuth
2. Added `src/app/auth/callback/route.ts` - Server-side callback to exchange code
3. Added `src/components/Auth/LoginPage.tsx` - Login UI
4. Modified `src/app/layout.tsx` - Wrapped app in AuthProvider
5. Modified `src/app/page.tsx` - Added auth check, shows LoginPage if not authenticated
6. Modified all API files to use `getCurrentUserId()` instead of hardcoded `DEV_USER_ID`

## Architecture

### Auth Flow
```
1. User clicks "Continue with Google"
2. signInWithGoogle() calls supabase.auth.signInWithOAuth()
3. User redirects to Google, authorizes
4. Google redirects to /auth/callback?code=xxx
5. Callback route exchanges code for session via createServerClient
6. Callback redirects to /
7. AuthProvider's onAuthStateChange fires with SIGNED_IN
8. page.tsx should now load data...but doesn't
```

### File Structure
- `src/lib/auth.tsx` - AuthProvider, useAuth hook
- `src/lib/supabase.ts` - Supabase client (uses @supabase/ssr)
- `src/app/auth/callback/route.ts` - OAuth callback handler
- `src/app/page.tsx` - Main page with auth check
- `src/api/tasks.ts` - Task CRUD with getCurrentUserId()
- `src/api/lists.ts` - List CRUD with getCurrentUserId()
- `src/api/scheduled.ts` - Schedule CRUD with getCurrentUserId()

## Debugging Tasks

### 1. Verify Auth State is Propagating

Check `src/lib/auth.tsx`:
- Is `setLoading(false)` being called after auth?
- Is `user` state being set correctly?
- Add console.logs if needed to trace the flow

### 2. Verify Data Loading is Triggered

Check `src/app/page.tsx`:
- The useEffect that calls `loadLists()`, `loadTasks()`, `loadSchedule()` should run when `user` is set
- Add console.log at the start of this useEffect to confirm it runs
- Check if `user` dependency is causing issues

### 3. Verify API Calls Work

Check `src/api/tasks.ts`, `src/api/lists.ts`, `src/api/scheduled.ts`:
- Each file should have a `getCurrentUserId()` function
- This function should get the user from `supabase.auth.getUser()`
- Add console.log to verify this returns a valid user ID

### 4. Check for Silent Errors

The API calls might be failing silently. Add try/catch with console.error:
```typescript
try {
  const userId = await getCurrentUserId()
  console.log('Got user ID:', userId)
} catch (err) {
  console.error('Failed to get user ID:', err)
}
```

### 5. Verify RLS Policies

The Supabase RLS policies should allow authenticated users to read/write their own data.
Check that `auth.uid()` matches the user_id in queries.

### 6. Check Supabase Client Consistency

We have multiple ways to create Supabase clients:
- `createBrowserClient` from @supabase/ssr (for client components)
- `createServerClient` from @supabase/ssr (for server routes)
- `getSupabase()` singleton in src/lib/supabase.ts

Make sure:
- Auth callbacks use server client with cookies
- Client components use browser client
- The browser client can read the session set by the server client

### 7. Test the New User Flow

A new user should:
1. Sign in with Google
2. Have default lists created (Scheduled, TBD Grab Bag) via `ensureUserHasDefaultLists()`
3. See empty app with those two lists

Check if `ensureUserHasDefaultLists()` in `src/lib/auth.tsx` is:
- Being called on SIGNED_IN event
- Successfully creating lists
- Not throwing errors

## Specific Files to Examine

### src/lib/auth.tsx
- Check useEffect that calls getSession()
- Check onAuthStateChange handler
- Verify loading state is set to false

### src/lib/supabase.ts
- Check that createBrowserClient is used correctly
- Verify environment variables are being read

### src/app/page.tsx
- Check hook order (all hooks before any returns)
- Check useEffect dependencies
- Verify the loading states flow correctly

### src/api/lists.ts (and tasks.ts, scheduled.ts)
- Check getCurrentUserId() implementation
- Verify it's being called in each function
- Check for any remaining DEV_USER_ID references

### src/app/auth/callback/route.ts
- Verify createServerClient is configured with cookies
- Check that exchangeCodeForSession is called
- Verify redirect goes to correct URL

## Expected Console Output After Fix

```
Initial session check: { session: true, error: null }
Auth state changed: SIGNED_IN true
Loading lists for user: abc123-...
Loading tasks for user: abc123-...
Loading schedule for user: abc123-...
```

## Commands to Run

After making changes:
```bash
npm run build
vercel --prod
```

## Success Criteria

1. User signs in with Google
2. App shows main interface (not stuck on Loading)
3. Default lists appear for new users
4. Creating a task works
5. Refreshing the page maintains the session
6. Sign out returns to login page
