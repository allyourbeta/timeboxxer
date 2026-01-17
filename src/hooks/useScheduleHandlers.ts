'use client'

import { useTaskStore, useListStore, useScheduleStore } from '@/state'

export function useScheduleHandlers() {
  const { tasks, moveToPurgatory, moveFromPurgatory, createCalendarTask, reorderTasks } = useTaskStore()
  const { lists } = useListStore()
  const { scheduled, scheduleTask, unscheduleTask } = useScheduleStore()

  const handleExternalDrop = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const today = new Date().toISOString().split('T')[0]
    
    const purgatoryList = lists.find(l => l.system_type === 'purgatory')
    if (task.list_id !== purgatoryList?.id) {
      const originalList = lists.find(l => l.id === task.list_id)
      const originalListName = originalList ? originalList.name : 'Unknown'
      const originalListId = task.list_id || ''
      await moveToPurgatory(taskId, originalListId, originalListName)
    }
    
    await scheduleTask(taskId, today, time)
  }

  const handleEventMove = async (taskId: string, newTime: string) => {
    const existingSchedule = scheduled.find(s => s.task_id === taskId)
    if (existingSchedule) {
      await unscheduleTask(taskId)
      await scheduleTask(taskId, existingSchedule.scheduled_date, newTime)
    }
  }

  const handleUnschedule = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task && task.original_list_id) {
      const originalList = lists.find(l => l.id === task.original_list_id)
      if (originalList) {
        await moveFromPurgatory(taskId, task.original_list_id)
      } else {
        const parkedList = lists.find(l => l.system_type === 'parked')
        if (parkedList) {
          await moveFromPurgatory(taskId, parkedList.id)
        }
      }
    }
    await unscheduleTask(taskId)
  }

  const handleCreateCalendarTask = async (title: string, time: string) => {
    const today = new Date().toISOString().split('T')[0]
    await createCalendarTask(title, time, today)
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