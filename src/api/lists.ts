import { getSupabase } from '@/lib/supabase'
import { getTodayListName, getTodayISO, getTomorrowListName } from '@/lib/dateList'

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function getLists() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .order('position')
  if (error) throw error
  return data
}

export async function createList(name: string) {
  const supabase = getSupabase()
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
  const supabase = getSupabase()
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
  const supabase = getSupabase()
  // Tasks will have list_id set to NULL due to ON DELETE SET NULL
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId)
  if (error) throw error
}

export async function duplicateList(listId: string, newName: string) {
  const supabase = getSupabase()
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

export async function ensureTodayList() {
  const supabase = getSupabase()
  const userId = await getCurrentUserId()
  const todayName = getTodayListName()
  
  // Check if today's list already exists
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('system_type', 'date')
    .eq('name', todayName)
    .maybeSingle()
  
  if (existing) return existing
  
  // Create today's list with position 0 (system lists don't use position for sorting)
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: todayName,
      position: 0,
      is_system: true,
      system_type: 'date',
    })
    .select()
    .single()
  
  if (error) {
    // If conflict, the list was created by another request - fetch it
    if (error.code === '23505') {
      const { data: refetched } = await supabase
        .from('lists')
        .select('*')
        .eq('system_type', 'date')
        .eq('name', todayName)
        .single()
      return refetched
    }
    throw error
  }
  
  return data
}

export async function ensureTomorrowList() {
  const supabase = getSupabase()
  const userId = await getCurrentUserId()
  const tomorrowName = getTomorrowListName()
  
  // Check if tomorrow's list already exists
  const { data: existing } = await supabase
    .from('lists')
    .select('*')
    .eq('system_type', 'date')
    .eq('name', tomorrowName)
    .maybeSingle()
  
  if (existing) return existing
  
  // Create tomorrow's list
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: tomorrowName,
      position: 0,
      is_system: true,
      system_type: 'date',
    })
    .select()
    .single()
  
  if (error) {
    // If conflict, fetch it
    if (error.code === '23505') {
      const { data: refetched } = await supabase
        .from('lists')
        .select('*')
        .eq('system_type', 'date')
        .eq('name', tomorrowName)
        .single()
      return refetched
    }
    throw error
  }
  
  return data
}