import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { DEFAULT_TASK_DURATION } from '@/lib/constants'

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

export async function createTask(homeListId: string, title: string, duration?: number) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Get next position in home list
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('home_list_id', homeListId)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      home_list_id: homeListId,
      title,
      duration_minutes: duration ?? DEFAULT_TASK_DURATION,
      color_index: 0,
      position: nextPosition,
      energy_level: 'medium',
      is_completed: false,
      is_daily: false,
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
  notes?: string | null
  home_list_id?: string
  committed_date?: string | null
  scheduled_at?: string | null
  highlight_date?: string | null
  is_completed?: boolean
  completed_at?: string | null
  is_daily?: boolean
  daily_source_id?: string | null
  energy_level?: 'high' | 'medium' | 'low'
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

export async function moveTaskToHomeList(taskId: string, newHomeListId: string) {
  const supabase = createClient()
  
  // Get new position in destination list
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('home_list_id', newHomeListId)
    .order('position', { ascending: false })
    .limit(1)
  
  const newPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      home_list_id: newHomeListId,
      position: newPosition,
      // Clear date commitment and schedule when moving to new home
      committed_date: null,
      scheduled_at: null,
      highlight_date: null
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