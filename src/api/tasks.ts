import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { DEFAULT_TASK_DURATION, DEFAULT_CALENDAR_TASK_DURATION, getRandomColorIndex, PURGATORY_EXPIRY_DAYS } from '@/lib/constants'

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

export async function completeTask(taskId: string) {
  const supabase = createClient()
  
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

export async function moveToPurgatory(taskId: string, originalListId: string, originalListName: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Get purgatory list ID dynamically
  const { data: purgatoryList, error: listError } = await supabase
    .from('lists')
    .select('id')
    .eq('system_type', 'purgatory')
    .eq('user_id', userId)
    .single()
  
  if (listError || !purgatoryList) {
    throw new Error('Purgatory list not found')
  }
  
  const { data, error } = await supabase
    .from('tasks')
    .update({
      list_id: purgatoryList.id,
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
  const supabase = createClient()
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
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
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
    user_id: userId,
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
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ list_id: newListId })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createParkedThought(title: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Fetch the parked list ID dynamically (system_type = 'parked')
  const { data: parkedList, error: listError } = await supabase
    .from('lists')
    .select('id')
    .eq('system_type', 'parked')
    .eq('user_id', userId)
    .single()
  
  if (listError || !parkedList) {
    console.error('Could not find TBD Grab Bag list:', listError)
    throw new Error('TBD Grab Bag list not found')
  }
  
  // Get max position in the parked list
  const { data: maxPosData } = await supabase
    .from('tasks')
    .select('position')
    .eq('list_id', parkedList.id)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (maxPosData?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      list_id: parkedList.id,
      title,
      duration_minutes: DEFAULT_TASK_DURATION,
      color_index: getRandomColorIndex(),
      position: nextPosition,
      is_completed: false,
      is_daily: false,
      is_daily_highlight: false,
      energy_level: 'medium',
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function createCalendarTask(title: string, startTime: string, date: string) {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      list_id: null,  // No list - created directly on calendar
      title,
      duration_minutes: DEFAULT_CALENDAR_TASK_DURATION,  // Default duration
      color_index: getRandomColorIndex(),  // Random color
      energy_level: 'medium',
      position: 0,
    })
    .select()
    .single()
  
  if (taskError) throw taskError
  
  // Also schedule it
  const { error: scheduleError } = await supabase
    .from('scheduled_tasks')
    .insert({
      user_id: userId,
      task_id: task.id,
      scheduled_date: date,
      start_time: startTime + ':00',
    })
  
  if (scheduleError) throw scheduleError
  
  return task
}

export async function reorderTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient()
  
  // Update each task's position based on array index
  const updates = taskIds.map((id, index) => 
    supabase
      .from('tasks')
      .update({ position: index })
      .eq('id', id)
  )
  
  await Promise.all(updates)
}

export async function cleanupExpiredScheduledTasks(): Promise<number> {
  console.log('🧹 [tasks.ts] cleanupExpiredScheduledTasks called')
  
  try {
    const supabase = createClient()
    
    console.log('🧹 [tasks.ts] Getting current user for cleanup...')
    const userId = await getCurrentUserId()
    console.log('✅ [tasks.ts] User ID for cleanup:', userId)
    
    // Calculate the date 7 days ago
    console.log('📅 [tasks.ts] Calculating cutoff date...')
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - PURGATORY_EXPIRY_DAYS)
    const cutoffDate = sevenDaysAgo.toISOString()
    console.log('📅 [tasks.ts] Cutoff date:', cutoffDate)
    
    // First, get the Scheduled list ID (system_type = 'purgatory')
    console.log('🔍 [tasks.ts] Looking for purgatory list...')
    const { data: scheduledList, error: listError } = await supabase
      .from('lists')
      .select('id')
      .eq('system_type', 'purgatory')
      .eq('user_id', userId)  // Add user filter for RLS
      .single()
    
    if (listError) {
      console.error('❌ [tasks.ts] Error finding purgatory list:', listError)
      return 0
    }
    
    if (!scheduledList) {
      console.log('⚠️ [tasks.ts] No Scheduled list found, skipping cleanup')
      return 0
    }
    
    console.log('✅ [tasks.ts] Found purgatory list:', scheduledList.id)
    
    // Delete tasks that have been in the Scheduled list for more than 7 days
    // We use moved_to_purgatory_at to track when they entered
    console.log('🗑️ [tasks.ts] Deleting expired tasks...')
    const { data: deletedTasks, error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('list_id', scheduledList.id)
      .eq('user_id', userId)  // Add user filter for RLS
      .lt('moved_to_purgatory_at', cutoffDate)
      .select('id')
    
    if (deleteError) {
      console.error('❌ [tasks.ts] Error cleaning up expired tasks:', deleteError)
      return 0
    }
    
    const count = deletedTasks?.length || 0
    console.log(`✅ [tasks.ts] Cleanup completed: ${count} expired task(s) removed`)
    
    return count
  } catch (err) {
    console.error('💥 [tasks.ts] cleanupExpiredScheduledTasks failed:', err)
    return 0
  }
}

export async function rollOverTasks(fromListId: string, toListId: string): Promise<number> {
  const supabase = createClient()
  
  // Get all incomplete tasks from the source list
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .eq('list_id', fromListId)
    .eq('is_completed', false)
  
  if (fetchError) throw fetchError
  if (!tasks || tasks.length === 0) return 0
  
  // Move them to the destination list
  const taskIds = tasks.map((t: { id: string }) => t.id)
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ list_id: toListId })
    .in('id', taskIds)
  
  if (updateError) throw updateError
  
  return taskIds.length
}