import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { DEFAULT_TASK_DURATION } from '@/lib/constants'
import type { Task } from '@/types/app'

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Fetch incomplete tasks for the current user
 * Completed tasks are fetched separately with pagination
 */
export async function getTasks(): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_completed', false)
    .order('position')
  
  if (error) throw error
  return data || []
}

/**
 * Fetch completed tasks with pagination
 */
export async function getCompletedTasks(limit = 50, offset = 0): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) throw error
  return data || []
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new task in a list
 */
export async function createTask(
  homeListId: string,
  title: string,
  options?: {
    duration?: number
    colorIndex?: number
    committedDate?: string | null
    scheduledAt?: string | null
  }
): Promise<Task> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Get next position in home list
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('home_list_id', homeListId)
    .eq('is_completed', false)
    .order('position', { ascending: false })
    .limit(1)
  
  const nextPosition = (existing?.[0]?.position ?? -1) + 1
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      home_list_id: homeListId,
      title,
      duration_minutes: options?.duration ?? DEFAULT_TASK_DURATION,
      color_index: options?.colorIndex ?? 0,
      position: nextPosition,
      committed_date: options?.committedDate ?? null,
      scheduled_at: options?.scheduledAt ?? null,
      energy_level: 'medium',
      is_completed: false,
      is_daily: false,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Update task fields
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 
    'title' | 'notes' | 'duration_minutes' | 'color_index' | 
    'energy_level' | 'is_daily' | 'highlight_date'
  >>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  
  if (error) throw error
}

/**
 * Schedule a task on the calendar
 * @param scheduledAt - Timestamp WITHOUT timezone (e.g., '2026-01-19T14:30:00')
 */
export async function scheduleTask(taskId: string, scheduledAt: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  
  if (error) throw error
}

/**
 * Remove task from calendar
 */
export async function unscheduleTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ scheduled_at: null, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  
  if (error) throw error
}

/**
 * Commit task to a date (appears in that day's date list)
 */
export async function commitTaskToDate(taskId: string, date: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ committed_date: date, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  
  if (error) throw error
}

/**
 * Remove task from date list
 */
export async function uncommitTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ committed_date: null, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  
  if (error) throw error
}

/**
 * Complete a task (uses RPC for atomicity)
 */
export async function completeTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('complete_task', { p_task_id: taskId })
  if (error) throw error
}

/**
 * Uncomplete a task
 */
export async function uncompleteTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ 
      is_completed: false, 
      completed_at: null, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', taskId)
  
  if (error) throw error
}

/**
 * Set task highlight for a specific date (uses RPC for limit enforcement)
 */
export async function setTaskHighlight(taskId: string, date: string | null): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('set_task_highlight', {
    p_task_id: taskId,
    p_date: date,
  })
  if (error) throw error
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete a task permanently
 */
export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  
  if (error) throw error
}

/**
 * Delete all tasks in a list
 * @param listId - The list to clear
 * @returns Number of tasks deleted
 */
export async function clearTasksInList(listId: string): Promise<number> {
  const supabase = createClient()
  
  // First count how many will be deleted (for return value)
  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('home_list_id', listId)
  
  // Delete all tasks in this list
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('home_list_id', listId)
  
  if (error) throw error
  return count || 0
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Reorder tasks within a list (uses RPC for atomicity)
 */
export async function reorderTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reorder_tasks', { p_task_ids: taskIds })
  if (error) throw error
}

/**
 * Roll over uncommitted tasks from one date to another
 */
export async function rollOverTasks(fromDate: string, toDate: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('roll_over_tasks', {
    p_from_date: fromDate,
    p_to_date: toDate,
  })
  if (error) throw error
  return data as number
}

/**
 * Spawn daily tasks for a given date
 */
export async function spawnDailyTasks(targetDate: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('spawn_daily_tasks', {
    p_target_date: targetDate
  })
  if (error) throw error
  return data as number
}

// =============================================================================
// SPECIAL OPERATIONS
// =============================================================================

/**
 * Create a task in the "Parked" (TBD Grab Bag) list
 */
export async function createParkedThought(title: string): Promise<Task> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Find the Parked list
  const { data: parkedList } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .eq('system_type', 'parked')
    .single()
  
  if (!parkedList) throw new Error('Parked list not found')
  
  return createTask(parkedList.id, title)
}