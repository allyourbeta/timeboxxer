import { getSupabase } from '@/lib/supabase'
import { DEV_USER_ID, PURGATORY_LIST_ID } from '@/lib/constants'

export async function getTasks() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position')
  if (error) throw error
  return data
}

export async function createTask(listId: string, title: string) {
  const supabase = getSupabase()
  
  // Get next position
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = existing?.[0]?.position ?? -1 + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: DEV_USER_ID,
      list_id: listId,
      title,
      duration_minutes: 15,
      color_index: 0,
      position: nextPosition,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateTask(taskId: string, updates: {
  title?: string
  duration_minutes?: number
  color_index?: number
  notes?: string
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeTask(taskId: string) {
  const supabase = getSupabase()
  
  // Mark complete
  const { error: taskError } = await supabase
    .from('tasks')
    .update({ 
      is_completed: true, 
      completed_at: new Date().toISOString() 
    })
    .eq('id', taskId)
  
  if (taskError) throw taskError
  
  // Remove from schedule
  await supabase
    .from('scheduled_tasks')
    .delete()
    .eq('task_id', taskId)
}

export async function uncompleteTask(taskId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('tasks')
    .update({ is_completed: false, completed_at: null })
    .eq('id', taskId)
  if (error) throw error
}

export async function deleteTask(taskId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  if (error) throw error
}

export async function moveToPurgatory(taskId: string, originalListId: string, originalListName: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      list_id: PURGATORY_LIST_ID,
      moved_to_purgatory_at: new Date().toISOString(),
      original_list_id: originalListId,
      original_list_name: originalListName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function moveFromPurgatory(taskId: string, newListId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      list_id: newListId,
      moved_to_purgatory_at: null,
      original_list_id: null,
      original_list_name: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function spawnDailyTasks(todayListId: string) {
  const supabase = getSupabase()
  
  // Get all daily tasks that haven't been spawned today
  const { data: dailyTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_daily', true)
    .is('daily_source_id', null) // Original daily tasks, not spawned instances
  
  if (!dailyTasks || dailyTasks.length === 0) return []
  
  // Check which ones already have today's instance
  const { data: existingToday } = await supabase
    .from('tasks')
    .select('daily_source_id')
    .eq('list_id', todayListId)
    .not('daily_source_id', 'is', null)
  
  const alreadySpawnedIds = new Set(existingToday?.map((t: any) => t.daily_source_id) || [])
  
  // Spawn new instances for tasks not yet spawned today
  const toSpawn = dailyTasks.filter((t: any) => !alreadySpawnedIds.has(t.id))
  
  if (toSpawn.length === 0) return []
  
  const newTasks = toSpawn.map((task: any) => ({
    user_id: DEV_USER_ID,
    list_id: todayListId,
    title: task.title,
    duration_minutes: task.duration_minutes,
    color_index: task.color_index,
    is_daily: false, // Spawned instance is not itself daily
    daily_source_id: task.id, // Reference to original daily task
    position: task.position,
  }))
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(newTasks)
    .select()
  
  if (error) throw error
  return data
}

export async function moveTaskToList(taskId: string, newListId: string | null) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({ list_id: newListId })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}