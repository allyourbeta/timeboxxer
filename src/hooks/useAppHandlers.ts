'use client'

import { useState } from 'react'
import { useTaskStore, useListStore, useUIStore } from '@/state'
import { DURATION_OPTIONS } from '@/lib/constants'
import { getLocalTodayISO, getLocalTomorrowISO, createLocalTimestamp } from '@/lib/dateUtils'
import { parseSlotId, slotIdToTimestamp } from '@/lib/calendarUtils'
import { processDragEnd } from '@/services'
import type { Task, List } from '@/types/app'
import type { DropResult } from '@hello-pangea/dnd'




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
    clearTasksInList,
    completeTask,
    uncompleteTask,
    commitTaskToDate,
    scheduleTask,
    unscheduleTask,
    setTaskHighlight,
    createParkedThought,
    reorderTasks,
    rollOverTasks
  } = useTaskStore()
  
  const { lists, createList, deleteList, duplicateList, updateList } = useListStore()
  const { setEditingListId, setShowNewListInput } = useUIStore()

  // Local state for deletion flow
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [discardConfirm, setDiscardConfirm] = useState<{
    taskId: string
    taskTitle: string
  } | null>(null)

  const [clearListConfirm, setClearListConfirm] = useState<{
    listId: string
    listName: string
    taskCount: number
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

  const handleCommitTaskToDate = async (taskId: string, date: string) => {
    await commitTaskToDate(taskId, date)
  }

  const handleDragEnd = async (result: DropResult) => {
    const operation = await processDragEnd(result, tasks, lists)
    
    switch (operation.type) {
      case 'reorder':
        if (operation.data?.taskIds) {
          await reorderTasks(operation.data.taskIds)
        }
        break
        
      case 'schedule':
        if (operation.data?.taskId && operation.data?.scheduledAt) {
          await scheduleTask(operation.data.taskId, operation.data.scheduledAt)
        }
        break
        
      case 'reschedule':
        if (operation.data?.taskId && operation.data?.scheduledAt) {
          await scheduleTask(operation.data.taskId, operation.data.scheduledAt)
        }
        break
        
      case 'commit':
        if (operation.data?.taskId && operation.data?.date) {
          await commitTaskToDate(operation.data.taskId, operation.data.date)
          console.log('✅ Task committed to date successfully')
        }
        break
        
      case 'move':
        if (operation.data?.taskId && operation.data?.homeListId) {
          await updateTask(operation.data.taskId, { home_list_id: operation.data.homeListId })
        }
        break
        
      case 'none':
      default:
        // No action needed
        break
    }
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


  const handleClearListClick = (listId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    
    // Count tasks in this list
    const taskCount = tasks.filter(t => t.home_list_id === listId && !t.is_completed).length
    
    if (taskCount === 0) {
      // No tasks to clear, do nothing (or show a toast "List is already empty")
      return
    }
    
    // Show confirmation dialog
    setClearListConfirm({
      listId,
      listName: list.name,
      taskCount,
    })
  }

  const handleClearListConfirm = async () => {
    if (!clearListConfirm) return
    
    await clearTasksInList(clearListConfirm.listId)
    
    setClearListConfirm(null)
  }

  const handleClearListCancel = () => {
    setClearListConfirm(null)
  }

  const handleDeleteListClick = async (listId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    
    // Block system lists (Parked Items)
    if (list.system_type === 'parked') return
    
    // Block today and future date lists
    if (list.system_type === 'date') {
      const listDate = new Date(list.list_date!)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      listDate.setHours(0, 0, 0, 0)
      if (listDate >= today) return
    }
    
    // Check if list has tasks
    const taskCount = tasks.filter(t => t.home_list_id === listId && !t.is_completed).length
    if (taskCount > 0) {
      // List is not empty - don't delete
      // The UI should prevent this, but this is a safety check
      console.warn('Cannot delete non-empty list. Clear it first.')
      return
    }
    
    // List is empty, safe to delete
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
    console.log('🔄 handleRollOverTasks called with:', fromListId)
    console.log('📋 Available lists:', lists.map(l => ({ id: l.id, name: l.name, list_date: l.list_date, system_type: l.system_type })))
    
    // Find the list to get its date
    const fromList = lists.find(l => l.id === fromListId)
    console.log('🎯 fromList found:', fromList)
    
    if (!fromList?.list_date) {
      console.log('❌ No list_date found, fromList.list_date:', fromList?.list_date)
      return
    }
    
    const fromDate = fromList.list_date
    const toDate = getLocalTomorrowISO()
    console.log('📅 Rolling over from:', fromDate, 'to:', toDate)
    
    try {
      const count = await rollOverTasks(fromDate, toDate)
      console.log('✅ Roll over completed, count:', count)
      
      if (count > 0) {
        // Reload tasks to reflect the move
        const { loadTasks } = useTaskStore.getState()
        await loadTasks()
        console.log('🔄 Tasks reloaded after roll over')
      }
    } catch (error) {
      console.error('💥 Roll over failed:', error)
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
    handleCommitTaskToDate,
    handleDragEnd,
    
    // Schedule handlers
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    
    // List handlers
    handleListCreate,
    handleListEdit,
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
    
    // Clear list
    clearListConfirm,
    handleClearListClick,
    handleClearListConfirm,
    handleClearListCancel,
    
    // Park handler
    handleParkThought,
    
    // Roll over handler
    handleRollOverTasks,
  }
}