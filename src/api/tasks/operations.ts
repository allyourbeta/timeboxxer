import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { DEFAULT_TASK_DURATION } from '@/lib/constants'

// Task commitment operations
export async function commitTaskToDate(taskId: string, date: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ 
      committed_date: date,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
  if (error) throw error
}

export async function uncommitTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ 
      committed_date: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
  if (error) throw error
}

// Task scheduling operations
export async function scheduleTask(taskId: string, scheduledAt: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ 
      scheduled_at: scheduledAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
  if (error) throw error
}

export async function unscheduleTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ 
      scheduled_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
  if (error) throw error
}

// Task completion moved to crud.ts to avoid circular imports

// Daily task spawning (uses RPC)
export async function spawnDailyTasks(todayListId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('spawn_daily_tasks', {
    p_today_list_id: todayListId
  })
  if (error) throw error
  return data as number
}

// List duplication (uses RPC)
export async function duplicateList(listId: string, newName: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('duplicate_list', {
    source_list_id: listId,
    new_list_name: newName
  })
  if (error) throw error
  return data as string
}

// Task rollover between lists (uses RPC)
export async function rollOverTasks(fromListId: string, toListId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('roll_over_tasks', {
    from_list_id: fromListId,
    to_list_id: toListId
  })
  if (error) throw error
  return data as number
}

// Parked thought creation
export async function createParkedThought(title: string): Promise<any> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Find the "Parked" system list
  const { data: parkedList } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .eq('is_system', true)
    .eq('system_type', 'parked')
    .single()
    
  if (!parkedList) throw new Error('Parked list not found')
  
  // Get next position
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('home_list_id', parkedList.id)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      home_list_id: parkedList.id,
      title,
      duration_minutes: DEFAULT_TASK_DURATION,
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