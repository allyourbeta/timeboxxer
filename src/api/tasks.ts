import { getSupabase } from '@/lib/supabase'

const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'

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