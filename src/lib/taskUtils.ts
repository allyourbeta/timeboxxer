import type { Task } from '@/types/app'

/**
 * Get incomplete tasks for a specific list
 */
export function getIncompleteTasksForList(tasks: Task[], listId: string): Task[] {
  return tasks.filter(t => t.list_id === listId && !t.completed_at)
}

/**
 * Get all scheduled (incomplete) tasks
 */
export function getScheduledTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.scheduled_at && !t.completed_at)
}

/**
 * Get completed tasks
 */
export function getCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.completed_at)
}

/**
 * Count incomplete tasks in a list
 */
export function countIncompleteTasks(tasks: Task[], listId: string): number {
  return getIncompleteTasksForList(tasks, listId).length
}