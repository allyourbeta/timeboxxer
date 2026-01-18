'use client'

import { useTaskStore, useListStore } from '@/state'

export function useScheduleHandlers() {
  const { tasks, commitTaskToDate, scheduleTask, unscheduleTask, reorderTasks } = useTaskStore()
  const { lists } = useListStore()

  const handleExternalDrop = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const today = new Date().toISOString().split('T')[0]
    const scheduledAt = `${today}T${time}:00.000Z`
    
    // Schedule the task for this time slot
    await scheduleTask(taskId, scheduledAt)
  }

  const handleEventMove = async (taskId: string, newTime: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task?.scheduled_at) {
      const date = task.scheduled_at.split('T')[0]
      const newScheduledAt = `${date}T${newTime}:00.000Z`
      await scheduleTask(taskId, newScheduledAt)
    }
  }

  const handleUnschedule = async (taskId: string) => {
    await unscheduleTask(taskId)
  }

  const handleCreateCalendarTask = async (title: string, time: string) => {
    // Find the "Parked" list for new calendar tasks
    const parkedList = lists.find(l => l.system_type === 'parked')
    if (!parkedList) throw new Error('Parked list not found')
    
    const { createTask, scheduleTask } = useTaskStore.getState()
    
    // Create the task in the parked list
    await createTask(parkedList.id, title)
    
    // Get the newly created task (it will be the last one)
    const updatedTasks = useTaskStore.getState().tasks
    const newTask = updatedTasks[updatedTasks.length - 1]
    
    // Schedule it for the specified time
    const today = new Date().toISOString().split('T')[0]
    const scheduledAt = `${today}T${time}:00.000Z`
    await scheduleTask(newTask.id, scheduledAt)
  }

  const handleReorderTasks = async (taskIds: string[]) => {
    await reorderTasks(taskIds)
  }

  return {
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    handleReorderTasks,
  }
}