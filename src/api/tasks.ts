import { createClient } from '@/utils/supabase/client'
import { getCurrentUserId } from '@/utils/supabase/auth'
import { DEFAULT_TASK_DURATION } from '@/lib/constants'
import { getCompletedList, getParkedList } from './lists'
import type { Task } from '@/types/app'

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Fetch all tasks for the current user
 */
export async function getTasks(): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at')
  
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
    .not('completed_at', 'is', null)
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
  listId: string,
  title: string,
  options?: {
    duration?: number
    colorIndex?: number
    scheduledAt?: string | null
  }
): Promise<Task> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      list_id: listId,
      title,
      duration_minutes: options?.duration ?? DEFAULT_TASK_DURATION,
      color_index: options?.colorIndex ?? 0,
      scheduled_at: options?.scheduledAt ?? null,
      energy_level: 'medium',
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
    'energy_level' | 'list_id'
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
 * Move task to a different list
 */
export async function moveTask(taskId: string, newListId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ 
      list_id: newListId, 
      scheduled_at: null, // Clear schedule when moving
      updated_at: new Date().toISOString() 
    })
    .eq('id', taskId)
  
  if (error) throw error
}

/**
 * Complete a task - move to Completed list
 */
export async function completeTask(taskId: string): Promise<void> {
  const supabase = createClient()

  // Step 1: Get the task's current list_id
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('list_id')
    .eq('id', taskId)
    .single()

  if (taskError) throw taskError
  if (!task) throw new Error('Task not found')

  // Step 2: Get Completed list (creates if missing)
  const completedList = await getCompletedList()

  // Step 3: Update the task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      previous_list_id: task.list_id,
      list_id: completedList.id,
      completed_at: new Date().toISOString(),
      scheduled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (updateError) throw updateError
}

/**
 * Uncomplete a task - move back to previous list
 */
export async function uncompleteTask(taskId: string): Promise<void> {
  const supabase = createClient()

  // Step 1: Get the task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('list_id, previous_list_id')
    .eq('id', taskId)
    .single()

  if (taskError) throw taskError
  if (!task) throw new Error('Task not found')

  // Step 2: Determine target list
  let targetListId = task.previous_list_id

  // Step 3: Check if previous list still exists
  if (targetListId) {
    const { data: previousList } = await supabase
      .from('lists')
      .select('id')
      .eq('id', targetListId)
      .single()

    if (!previousList) {
      targetListId = null
    }
  }

  // Step 4: Fall back to Parked if no valid previous list
  if (!targetListId) {
    const parkedList = await getParkedList()
    targetListId = parkedList.id
  }

  // Step 5: Update the task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      list_id: targetListId,
      previous_list_id: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (updateError) throw updateError
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
    .eq('list_id', listId)
  
  // Delete all tasks in this list
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('list_id', listId)
  
  if (error) throw error
  return count || 0
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================


// =============================================================================
// SPECIAL OPERATIONS
// =============================================================================

/**
 * Create a task in the "Parked" list
 */
export async function createParkedThought(title: string): Promise<Task> {
  const supabase = createClient()
  const userId = await getCurrentUserId()
  
  // Find the Parked list
  const { data: parkedList } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', userId)
    .eq('list_type', 'parked')
    .single()
  
  if (!parkedList) throw new Error('Parked list not found')
  
  return createTask(parkedList.id, title)
}