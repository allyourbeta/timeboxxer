import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { formatDateForDisplay } from '@/lib/dateUtils'
import type { List } from '@/types/app'

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Fetch all lists for the current user
 */
export async function getLists(): Promise<List[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('created_at')
  
  if (error) throw error
  return data || []
}

/**
 * Get or create the Parked list
 */
export async function getParkedList(): Promise<List> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Try to find existing Parked list
  const { data: existing, error: findError } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .eq('list_type', 'parked')
    .single()
  
  if (!findError && existing) {
    return existing
  }
  
  // Create Parked list if it doesn't exist
  const { data: list, error: createError } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: 'Parked Items',
      list_type: 'parked',
    })
    .select()
    .single()
  
  if (createError) throw createError
  return list
}

/**
 * Get or create the Completed list
 */
export async function getCompletedList(): Promise<List> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Try to find existing Completed list
  const { data: existing, error: findError } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .eq('list_type', 'completed')
    .single()
  
  if (!findError && existing) {
    return existing
  }
  
  // Create Completed list if it doesn't exist
  const { data: list, error: createError } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: 'Completed',
      list_type: 'completed',
    })
    .select()
    .single()
  
  if (createError) throw createError
  return list
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new user list
 */
export async function createList(name: string): Promise<List> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name,
      list_type: 'user',
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * Ensure a date list exists for the given date
 */
export async function ensureDateList(dateISO: string): Promise<List> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  const displayName = formatDateForDisplay(dateISO)
  
  // Try to find existing date list
  const { data: existing, error: findError } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .eq('list_type', 'date')
    .eq('list_date', dateISO)
    .single()
  
  if (!findError && existing) {
    return existing
  }
  
  // Create date list if it doesn't exist
  const { data: list, error: createError } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: displayName,
      list_type: 'date',
      list_date: dateISO,
    })
    .select()
    .single()
  
  if (createError) throw createError
  return list
}

/**
 * Ensure today's date list exists
 */
export async function ensureTodayList(): Promise<List> {
  const { getLocalTodayISO } = await import('@/lib/dateUtils')
  return ensureDateList(getLocalTodayISO())
}

/**
 * Ensure tomorrow's date list exists
 */
export async function ensureTomorrowList(): Promise<List> {
  const { getLocalTomorrowISO } = await import('@/lib/dateUtils')
  return ensureDateList(getLocalTomorrowISO())
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Update list name
 */
export async function updateList(listId: string, name: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('lists')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', listId)
  
  if (error) throw error
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete a list (will fail if not empty or if system list)
 */
export async function deleteList(listId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId)
  
  if (error) throw error
}