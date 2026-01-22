'use client'

import { useTaskStore, useListStore } from '@/state'
import { getLocalTodayISO, createLocalTimestamp } from '@/lib/dateUtils'



export function useScheduleHandlers() {
  const { tasks, scheduleTask, unscheduleTask } = useTaskStore()
  const { lists } = useListStore()

  const handleExternalDrop = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const today = new Date().toISOString().split('T')[0]
    const scheduledAt = createLocalTimestamp(today, time)
    
    // Schedule the task for this time slot
    await scheduleTask(taskId, scheduledAt)
  }

  const handleEventMove = async (taskId: string, newTime: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task?.scheduled_at) {
      const date = task.scheduled_at.split('T')[0]
      const newScheduledAt = createLocalTimestamp(date, newTime)
      await scheduleTask(taskId, newScheduledAt)
    }
  }

  const handleUnschedule = async (taskId: string) => {
    await unscheduleTask(taskId)
  }

  const handleCreateCalendarTask = async (title: string, time: string) => {
    // Find the "Parked" list for new calendar tasks
    const parkedList = lists.find(l => l.list_type === 'parked')
    if (!parkedList) throw new Error('Parked list not found')
    
    const { createTask, scheduleTask } = useTaskStore.getState()
    
    // Create the task in the parked list
    await createTask(parkedList.id, title)
    
    // Get the newly created task (it will be the last one)
    const updatedTasks = useTaskStore.getState().tasks
    const newTask = updatedTasks[updatedTasks.length - 1]
    
    // Schedule it for the specified time
    const today = new Date().toISOString().split('T')[0]
    const scheduledAt = createLocalTimestamp(today, time)
    await scheduleTask(newTask.id, scheduledAt)
  }

  const handleReorderTasks = async (taskIds: string[]) => {
    // Reordering removed in new schema
    console.log('Reordering not supported in new schema')
  }

  return {
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    handleReorderTasks,
  }
}