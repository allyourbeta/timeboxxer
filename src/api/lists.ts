import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { formatDateForDisplay, getTodayListName, getTodayISO, getTomorrowListName, getTomorrowISO } from '@/lib/dateList'

export async function getLists() {
  console.log('📋 [lists.ts] getLists called')
  try {
    const supabase = createClient()
    console.log('📋 [lists.ts] Querying lists from database...')
    
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .order('position')
      
    if (error) {
      console.error('❌ [lists.ts] Database query error:', error)
      throw error
    }
    
    console.log('✅ [lists.ts] Lists loaded successfully:', { count: data?.length || 0 })
    return data
  } catch (err) {
    console.error('💥 [lists.ts] getLists exception:', err)
    throw err
  }
}

export async function createList(name: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  const { data: existing } = await supabase
    .from('lists')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name,
      position: nextPosition,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateList(listId: string, name: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lists')
    .update({ name })
    .eq('id', listId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteList(listId: string) {
  const supabase = createClient()
  // Tasks will have list_id set to NULL due to ON DELETE SET NULL
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId)
  if (error) throw error
}

export async function duplicateList(listId: string, newName: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // 1. Get the original list
  const { data: originalList, error: listError } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single()
  
  if (listError) throw listError
  
  // 2. Get max position for new list
  const { data: existing } = await supabase
    .from('lists')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  // 3. Create the new list
  const { data: newList, error: createError } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: newName,
      position: nextPosition,
      is_inbox: false, // Duplicated lists are never inbox
    })
    .select()
    .single()
  
  if (createError) throw createError
  
  // 4. Get all tasks from original list
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('list_id', listId)
  
  if (tasksError) throw tasksError
  
  // 5. Duplicate tasks to new list (if any exist)
  if (tasks && tasks.length > 0) {
    const newTasks = tasks.map((task: any, index: number) => ({
      user_id: userId,
      list_id: newList.id,
      title: task.title,
      duration_minutes: task.duration_minutes,
      color_index: task.color_index,
      notes: task.notes,
      position: index,
      is_completed: false, // Reset completion status
    }))
    
    const { error: insertError } = await supabase
      .from('tasks')
      .insert(newTasks)
    
    if (insertError) throw insertError
  }
  
  return newList.id
}

/**
 * Ensure a date list exists for the given date
 * @param dateISO - The date in YYYY-MM-DD format (from client's local timezone)
 */
export async function ensureDateList(dateISO: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  const displayName = formatDateForDisplay(dateISO)
  
  // Check if list exists for this date
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('system_type', 'date')
    .eq('list_date', dateISO)
    .eq('user_id', userId)
    .maybeSingle()
  
  if (existing) return existing
  
  // Create new date list
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: displayName,
      list_date: dateISO,
      position: 0,
      is_system: true,
      system_type: 'date',
    })
    .select()
    .single()
  
  if (error) {
    // Handle race condition - another request created it
    if (error.code === '23505') {
      const { data: refetched } = await supabase
        .from('lists')
        .select('*')
        .eq('system_type', 'date')
        .eq('list_date', dateISO)
        .eq('user_id', userId)
        .single()
      return refetched
    }
    throw error
  }
  
  return data
}

// Convenience wrappers that call ensureDateList
// These should ONLY be called from client-side code
export async function ensureTodayList() {
  const { getLocalTodayISO } = await import('@/lib/dateList')
  return ensureDateList(getLocalTodayISO())
}

export async function ensureTomorrowList() {
  const { getLocalTomorrowISO } = await import('@/lib/dateList')
  return ensureDateList(getLocalTomorrowISO())
}