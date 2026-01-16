'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
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
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
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