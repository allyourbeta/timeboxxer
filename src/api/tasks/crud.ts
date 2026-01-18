import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { DEFAULT_TASK_DURATION } from '@/lib/constants'
import { getNextPositionInList } from './utils'

export async function getTasks() {
  console.log('📋 [tasks.ts] getTasks called')
  try {
    const supabase = createClient()
    console.log('📋 [tasks.ts] Querying tasks from database...')
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('position')
      
    if (error) {
      console.error('❌ [tasks.ts] Database query error:', error)
      throw error
    }
    
    console.log('✅ [tasks.ts] Tasks loaded successfully:', { count: data?.length || 0 })
    return data
  } catch (err) {
    console.error('💥 [tasks.ts] getTasks exception:', err)
    throw err
  }
}

export async function createTask(listId: string, title: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Get next position
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      list_id: listId,
      title,
      duration_minutes: DEFAULT_TASK_DURATION,
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
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('complete_task', { p_task_id: taskId })
  if (error) throw error
}

export async function uncompleteTask(taskId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ is_completed: false, completed_at: null })
    .eq('id', taskId)
  if (error) throw error
}

export async function deleteTask(taskId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  if (error) throw error
}

export async function moveTaskToList(taskId: string, newListId: string | null) {
  const supabase = createClient()
  
  let newPosition = 0
  
  if (newListId) {
    // Get new position in destination list
    newPosition = await getNextPositionInList(newListId)
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      list_id: newListId,
      position: newPosition 
    })
    .eq('id', taskId)
    .select()
    .single()
    
  if (error) throw error
  return data
}

export async function reorderTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reorder_tasks', { task_ids: taskIds })
  if (error) throw error
}