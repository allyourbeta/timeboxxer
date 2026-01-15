'use client'

import { useState } from 'react'
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
import { PURGATORY_LIST_ID } from '@/lib/constants'

interface PendingDelete {
  listId: string
  listName: string
  originalTasks: Array<{ id: string; originalListId: string }>
  timeoutId: NodeJS.Timeout
}

interface DeleteConfirm {
  listId: string
  listName: string
  taskCount: number
}

export function useAppHandlers() {
  // Get store actions
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    moveToPurgatory,
    moveFromPurgatory,
    createParkedThought,
    createCalendarTask,
    reorderTasks
  } = useTaskStore()
  
  const { lists, createList, deleteList, duplicateList, updateList } = useListStore()
  const { scheduled, scheduleTask, unscheduleTask } = useScheduleStore()
  const { setEditingListId, setDuplicatingListId, setShowNewListInput } = useUIStore()

  // Local state for deletion flow
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)

  // === TASK HANDLERS ===
  
  const handleTaskAdd = async (listId: string, title: string) => {
    await createTask(listId, title)
  }

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask(taskId)
  }

  const handleTaskDurationClick = async (taskId: string, currentDuration: number, reverse: boolean) => {
    const durations = [15, 30, 45, 60, 90, 120]
    const currentIndex = durations.indexOf(currentDuration)
    let newIndex: number
    
    if (reverse) {
      newIndex = currentIndex <= 0 ? durations.length - 1 : currentIndex - 1
    } else {
      newIndex = currentIndex >= durations.length - 1 ? 0 : currentIndex + 1
    }
    
    await updateTask(taskId, { duration_minutes: durations[newIndex] })
  }

  const handleTaskComplete = async (taskId: string) => {
    await completeTask(taskId)
  }

  const handleTaskUncomplete = async (taskId: string) => {
    await uncompleteTask(taskId)
  }

  const handleTaskDailyToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      await updateTask(taskId, { is_daily: !task.is_daily })
    }
  }

  const handleTaskEnergyChange = async (taskId: string, level: 'high' | 'medium' | 'low') => {
    await updateTask(taskId, { energy_level: level })
  }

  const handleTaskHighlightToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Check if this task is in a date list
    const taskList = lists.find(l => l.id === task.list_id)
    if (!taskList || taskList.system_type !== 'date') {
      console.warn('Highlights only available for date lists')
      return
    }
    
    if (task.is_daily_highlight) {
      await updateTask(taskId, { is_daily_highlight: false })
    } else {
      // Check highlight count in this list
      const highlightsInList = tasks.filter(t => 
        t.list_id === task.list_id && t.is_daily_highlight
      ).length
      
      if (highlightsInList >= 5) {
        alert('Maximum 5 highlights per day. Remove one first.')
        return
      }
      
      await updateTask(taskId, { is_daily_highlight: true })
    }
  }

  const handleReorderTasks = async (taskIds: string[]) => {
    await reorderTasks(taskIds)
  }

  // === SCHEDULE HANDLERS ===

  const handleExternalDrop = async (taskId: string, time: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const today = new Date().toISOString().split('T')[0]
    
    // Move to purgatory if not already there
    if (task.list_id !== PURGATORY_LIST_ID) {
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
      // Check if original list still exists
      const originalList = lists.find(l => l.id === task.original_list_id)
      if (originalList) {
        await moveFromPurgatory(taskId, task.original_list_id)
      } else {
        // Move to inbox if original list is gone
        const inbox = lists.find(l => l.name === 'Inbox')
        if (inbox) {
          await moveFromPurgatory(taskId, inbox.id)
        }
      }
    }
    await unscheduleTask(taskId)
  }

  const handleCreateCalendarTask = async (title: string, time: string) => {
    const today = new Date().toISOString().split('T')[0]
    await createCalendarTask(title, time, today)
  }

  // === LIST HANDLERS ===

  const handleListCreate = async (name: string) => {
    await createList(name)
    setShowNewListInput(false)
  }

  const handleListEdit = async (listId: string, newName: string) => {
    await updateList(listId, newName)
    setEditingListId(null)
  }

  const handleListDuplicate = async (listId: string, newName: string) => {
    await duplicateList(listId, newName)
    setDuplicatingListId(null)
  }

  const handleDeleteListClick = (listId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list || list.is_system) return
    
    const taskCount = tasks.filter(t => t.list_id === listId).length
    setDeleteConfirm({ listId, listName: list.name, taskCount })
  }

  const handleDeleteListConfirm = () => {
    if (!deleteConfirm) return
    
    const list = lists.find(l => l.id === deleteConfirm.listId)
    if (!list || list.is_system) return
    
    const inbox = lists.find(l => l.name === 'Inbox' && !l.is_system)
    const tasksInList = tasks.filter(t => t.list_id === deleteConfirm.listId)
    const originalTasks = tasksInList.map(t => ({ id: t.id, originalListId: deleteConfirm.listId }))
    
    // Move tasks to inbox
    if (inbox) {
      tasksInList.forEach(task => {
        updateTask(task.id, { list_id: inbox.id })
      })
    }
    
    // Set timeout for actual deletion
    const timeoutId = setTimeout(async () => {
      await deleteList(deleteConfirm.listId)
      setPendingDelete(null)
    }, 5000)
    
    setPendingDelete({
      listId: deleteConfirm.listId,
      listName: deleteConfirm.listName,
      originalTasks,
      timeoutId,
    })
    
    setDeleteConfirm(null)
  }

  const handleUndoDelete = async () => {
    if (!pendingDelete) return
    
    clearTimeout(pendingDelete.timeoutId)
    
    // Move tasks back
    for (const task of pendingDelete.originalTasks) {
      await updateTask(task.id, { list_id: task.originalListId })
    }
    
    setPendingDelete(null)
  }

  // === FOCUS MODE HANDLERS ===

  const handleStartFocus = (taskId: string) => {
    setFocusTaskId(taskId)
  }

  const handleExitFocus = () => {
    setFocusTaskId(null)
  }

  const handleFocusComplete = async (taskId: string) => {
    await completeTask(taskId)
    setFocusTaskId(null)
  }

  // === PARK HANDLER ===

  const handleParkThought = async (title: string) => {
    await createParkedThought(title)
  }

  return {
    // State
    pendingDelete,
    setPendingDelete,
    deleteConfirm,
    setDeleteConfirm,
    focusTaskId,
    
    // Task handlers
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDurationClick,
    handleTaskComplete,
    handleTaskUncomplete,
    handleTaskDailyToggle,
    handleTaskEnergyChange,
    handleTaskHighlightToggle,
    handleReorderTasks,
    
    // Schedule handlers
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    
    // List handlers
    handleListCreate,
    handleListEdit,
    handleListDuplicate,
    handleDeleteListClick,
    handleDeleteListConfirm,
    handleUndoDelete,
    
    // Focus handlers
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
    
    // Park handler
    handleParkThought,
  }
}