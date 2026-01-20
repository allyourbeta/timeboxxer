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
    .order('position')
  
  if (error) throw error
  return data || []
}

/**
 * Get the TBD Grab Bag list (creates if doesn't exist)
 */
export async function getGrabBag(): Promise<List> {
  const supabase = createClient()
  const { data: grabBagId, error: rpcError } = await supabase.rpc('ensure_grab_bag')
  
  if (rpcError) throw rpcError
  if (!grabBagId) throw new Error('Failed to get or create Grab Bag')
  
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('id', grabBagId)
    .single()
  
  if (listError) throw listError
  if (!list) throw new Error('Grab Bag list not found after creation')
  
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
  
  // Get next position
  const { data: existing } = await supabase
    .from('lists')
    .select('position')
    .eq('user_id', userId)
    .eq('is_system', false)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name,
      position: nextPosition,
      is_system: false,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * Ensure a date list exists for the given date (uses RPC for race-condition safety)
 */
export async function ensureDateList(dateISO: string): Promise<List> {
  const supabase = createClient()
  const displayName = formatDateForDisplay(dateISO)
  
  const { data: listId, error: rpcError } = await supabase.rpc('ensure_date_list', {
    p_date: dateISO,
    p_display_name: displayName,
  })
  
  if (rpcError) throw rpcError
  if (!listId) throw new Error('Failed to get or create date list')
  
  const { data: list, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single()
  
  if (listError) throw listError
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
 * Delete a list (uses RPC to reassign tasks to Grab Bag first)
 */
export async function deleteList(listId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('delete_list_safe', { p_list_id: listId })
  if (error) throw error
}

/**
 * Duplicate a list and its tasks (uses RPC for atomicity)
 */
export async function duplicateList(listId: string, newName: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('duplicate_list', {
    p_list_id: listId,
    p_new_name: newName,
  })
  if (error) throw error
  return data as string
}