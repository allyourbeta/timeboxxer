'use client'

import { useState } from 'react'
import { useTaskStore, useListStore, useUIStore } from '@/state'
import { DURATION_OPTIONS } from '@/lib/constants'
import { getLocalTodayISO, getLocalTomorrowISO, createLocalTimestamp } from '@/lib/dateUtils'
import type { Task, List } from '@/types/app'




interface PendingDelete {
  listId: string
  listName: string
  originalTasks: Array<{ id: string; originalListId: string }>
  timeoutId: NodeJS.Timeout
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
    scheduleTask,
    unscheduleTask,
    setTaskHighlight,
    createParkedThought,
    reorderTasks,
    rollOverTasks
  } = useTaskStore()
  
  const { lists, createList, deleteList, duplicateList, updateList } = useListStore()
  const { setEditingListId, setDuplicatingListId, setShowNewListInput } = useUIStore()

  // Local state for deletion flow
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [discardConfirm, setDiscardConfirm] = useState<{
    taskId: string
    taskTitle: string
  } | null>(null)

  // === TASK HANDLERS ===
  
  const handleTaskAdd = async (homeListId: string, title: string) => {
    await createTask(homeListId, title)
  }

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask(taskId)
  }

  const handleTaskDiscardClick = (taskId: string, taskTitle: string) => {
    setDiscardConfirm({ taskId, taskTitle })
  }

  const handleTaskDiscardConfirm = async () => {
    if (!discardConfirm) return
    
    await deleteTask(discardConfirm.taskId)
    setDiscardConfirm(null)
  }

  const handleTaskDiscardCancel = () => {
    setDiscardConfirm(null)
  }

  const handleTaskDurationClick = async (taskId: string, currentDuration: number, reverse: boolean) => {
    const durations = [...DURATION_OPTIONS] as number[]
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

  const handleTaskHighlightToggle = async (taskId: string, date: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    
    // Check if task is already highlighted for this date
    if (task.highlight_date === date) {
      await setTaskHighlight(taskId, null)
    } else {
      // Check highlight count for this date
      const highlightsForDate = tasks.filter(t => t.highlight_date === date).length
      
      if (highlightsForDate >= 5) {
        alert('Maximum 5 highlights per day. Remove one first.')
        return
      }
      
      await setTaskHighlight(taskId, date)
    }
  }

  const handleReorderTasks = async (taskIds: string[]) => {
    await reorderTasks(taskIds)
  }

  // === SCHEDULE HANDLERS ===
const handleExternalDrop = async (taskId: string, time: string): Promise<void> => {
  const today: string = getLocalTodayISO()
  const scheduledAt: string = createLocalTimestamp(today, time)

  await scheduleTask(taskId, scheduledAt)
}

const handleEventMove = async (taskId: string, newTime: string): Promise<void> => {
  const task: Task | undefined = tasks.find((t: Task) => t.id === taskId)

  if (task?.scheduled_at) {
    const date: string = task.scheduled_at.split('T')[0]
    const newScheduledAt: string = createLocalTimestamp(date, newTime)
    await scheduleTask(taskId, newScheduledAt)
  }
}

  const handleUnschedule = async (taskId: string) => {
    await unscheduleTask(taskId)
  }

const handleCreateCalendarTask = async (title: string, time: string): Promise<void> => {
  const parkedList: List | undefined = lists.find((l: List) => l.system_type === 'parked')
  if (!parkedList) throw new Error('Parked list not found')

  await createTask(parkedList.id, title)

  const updatedTasks = useTaskStore.getState().tasks
  const newTask = updatedTasks[updatedTasks.length - 1]

  const today: string = getLocalTodayISO()
  const scheduledAt: string = createLocalTimestamp(today, time)
  await scheduleTask(newTask.id, scheduledAt)
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

  const handleDeleteListClick = async (listId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    
    // Only block Parked Items  
    if (list.system_type === 'parked') return
    
    // Block today and future date lists
    if (list.system_type === 'date') {
      const listDate = new Date(list.list_date!)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      listDate.setHours(0, 0, 0, 0)
      if (listDate >= today) return
    }
    
    await deleteList(listId)
  }

  const handleUndoDelete = async () => {
    if (!pendingDelete) return
    
    clearTimeout(pendingDelete.timeoutId)
    
    // Move tasks back
    for (const task of pendingDelete.originalTasks) {
      await updateTask(task.id, { home_list_id: task.originalListId })
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

  // === ROLL OVER HANDLER ===

  const handleRollOverTasks = async (fromListId: string) => {
    // Find the list to get its date
    const fromList = lists.find(l => l.id === fromListId)
    if (!fromList?.list_date) return
    
    const fromDate = fromList.list_date
    const toDate = getLocalTomorrowISO()
    
    const count = await rollOverTasks(fromDate, toDate)
    
    if (count > 0) {
      // Reload tasks to reflect the move
      const { loadTasks } = useTaskStore.getState()
      await loadTasks()
    }
  }

  return {
    // State
    pendingDelete,
    setPendingDelete,
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
    handleUndoDelete,
    
    // Focus handlers
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
    
    // Discard confirmation
    discardConfirm,
    handleTaskDiscardClick,
    handleTaskDiscardConfirm,
    handleTaskDiscardCancel,
    
    // Park handler
    handleParkThought,
    
    // Roll over handler
    handleRollOverTasks,
  }
}