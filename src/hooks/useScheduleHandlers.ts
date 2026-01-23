'use client'

import { useTaskStore, useListStore } from '@/state'
import { getLocalTodayISO, createLocalTimestamp } from '@/lib/dateUtils'
import { canScheduleTask } from '@/lib/calendarUtils'



export function useScheduleHandlers() {
  const { tasks, scheduleTask, unscheduleTask } = useTaskStore()
  const { lists } = useListStore()

  const handleExternalDrop = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const today = new Date().toISOString().split('T')[0]
    const scheduledAt = createLocalTimestamp(today, time)
    
    // Check if scheduling is allowed (max 2 overlapping tasks)
    const validation = canScheduleTask(tasks, taskId, scheduledAt, task.duration_minutes)
    if (!validation.allowed) {
      alert(validation.message)
      return
    }
    
    // Schedule the task for this time slot
    await scheduleTask(taskId, scheduledAt)
  }

  const handleEventMove = async (taskId: string, newTime: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task?.scheduled_at) {
      const date = task.scheduled_at.split('T')[0]
      const newScheduledAt = createLocalTimestamp(date, newTime)
      
      // Check if move is allowed (max 2 overlapping tasks)
      const validation = canScheduleTask(tasks, taskId, newScheduledAt, task.duration_minutes)
      if (!validation.allowed) {
        alert(validation.message)
        return
      }
      
      await scheduleTask(taskId, newScheduledAt)
    }
  }

  const handleUnschedule = async (taskId: string) => {
    await unscheduleTask(taskId)
  }

  const handleCreateCalendarTask = async (title: string, time: string) => {
    if (!title.trim()) return
    
    try {
      // Get today's date in ISO format
      const today = getLocalTodayISO()
      
      // Ensure today's date list exists
      const { ensureDateList } = useListStore.getState()
      const dateList = await ensureDateList(today)
      
      // Create the task in today's date list
      const { createTask, scheduleTask } = useTaskStore.getState()
      await createTask(dateList.id, title.trim())
      
      // Get the newly created task (it will be the last one)
      const updatedTasks = useTaskStore.getState().tasks
      const newTask = updatedTasks[updatedTasks.length - 1]
      
      // Schedule it for the specified time
      const scheduledAt = createLocalTimestamp(today, time)
      
      // Check if scheduling is allowed (max 2 overlapping tasks)
      const validation = canScheduleTask(updatedTasks, newTask.id, scheduledAt, newTask.duration_minutes)
      if (!validation.allowed) {
        alert(validation.message)
        // If we can't schedule it, leave it in the date list unscheduled
        return
      }
      
      await scheduleTask(newTask.id, scheduledAt)
    } catch (error) {
      console.error('Failed to create calendar task:', error)
      alert('Failed to create task')
    }
  }

  const handleReorderTasks = async (taskIds: string[]) => {
    // Reordering removed in new schema
  }

  return {
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    handleReorderTasks,
  }
}