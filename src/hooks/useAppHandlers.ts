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
    moveTask,
    scheduleTask,
    unscheduleTask,
    createParkedThought,
  } = useTaskStore()
  
  const { lists, createList, deleteList, updateList, ensureDateList } = useListStore()
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
  
  const handleTaskAdd = async (listId: string, title: string) => {
    try {
      await createTask(listId, title)
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleTaskDiscardClick = (taskId: string, taskTitle: string) => {
    setDiscardConfirm({ taskId, taskTitle })
  }

  const handleTaskDiscardConfirm = async () => {
    if (!discardConfirm) return
    
    try {
      await deleteTask(discardConfirm.taskId)
      setDiscardConfirm(null)
    } catch (error) {
      console.error('Failed to discard task:', error)
    }
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
    
    try {
      await updateTask(taskId, { duration_minutes: durations[newIndex] })
    } catch (error) {
      console.error('Failed to update duration:', error)
    }
  }

  const handleTaskComplete = async (taskId: string) => {
    try {
      await completeTask(taskId)
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  const handleTaskUncomplete = async (taskId: string) => {
    try {
      await uncompleteTask(taskId)
    } catch (error) {
      console.error('Failed to restore task:', error)
    }
  }


  const handleTaskEnergyChange = async (taskId: string, level: 'high' | 'medium' | 'low') => {
    try {
      await updateTask(taskId, { energy_level: level })
    } catch (error) {
      console.error('Failed to update energy:', error)
    }
  }




  const handleDragEnd = async (result: DropResult) => {
    const operation = await processDragEnd(result, tasks, lists)
    
    switch (operation.type) {
      case 'reorder':
        // Reordering removed in new schema
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
        
        
      case 'move':
        if (operation.data?.taskId && operation.data?.listId) {
          await moveTask(operation.data.taskId, operation.data.listId)
        }
        break
        
      case 'none':
      default:
        // No action needed
        break
    }
  }

  // Schedule handlers moved to useScheduleHandlers.ts

  // === LIST HANDLERS ===

  const handleListCreate = async (name: string) => {
    try {
      await createList(name)
      setShowNewListInput(false)
    } catch (error) {
      console.error('Failed to create list:', error)
    }
  }

  const handleListEdit = async (listId: string, newName: string) => {
    try {
      await updateList(listId, newName)
      setEditingListId(null)
    } catch (error) {
      console.error('Failed to rename list:', error)
    }
  }


  const handleClearListClick = (listId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    
    // Count tasks in this list
    const taskCount = tasks.filter(t => t.list_id === listId).length
    
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
    
    try {
      await clearTasksInList(clearListConfirm.listId)
      setClearListConfirm(null)
    } catch (error) {
      console.error('Failed to clear list:', error)
    }
  }

  const handleClearListCancel = () => {
    setClearListConfirm(null)
  }

  const handleDeleteListClick = async (listId: string) => {
    const list = lists.find(l => l.id === listId)
    
    if (!list) return
    
    // Block system lists (Parked Items, Completed)
    if (list.list_type === 'parked' || list.list_type === 'completed') return

    // Block today and future date lists
    if (list.list_type === 'date') {
      const listDate = new Date(list.list_date!)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      listDate.setHours(0, 0, 0, 0)

      if (listDate >= today) return
    }



    // Check if list has tasks
    const taskCount = tasks.filter(t => t.list_id === listId && !t.completed_at).length

    if (taskCount > 0) {
      // List is not empty - don't delete
      // The UI should prevent this, but this is a safety check
      console.warn('Cannot delete non-empty list. Clear it first.')
      return
    }
    
    // List is empty, safe to delete
    try {
      await deleteList(listId)
    } catch (error) {
      console.error('Failed to delete list:', error)
    }
  }

  const handleUndoDelete = async () => {
    if (!pendingDelete) return
    
    clearTimeout(pendingDelete.timeoutId)
    
    try {
      // Move tasks back
      for (const task of pendingDelete.originalTasks) {
        await moveTask(task.id, task.originalListId)
      }
      setPendingDelete(null)
    } catch (error) {
      console.error('Failed to undo delete:', error)
    }
  }

  // === FOCUS MODE HANDLERS ===

  const handleStartFocus = (taskId: string) => {
    setFocusTaskId(taskId)
  }

  const handleExitFocus = () => {
    setFocusTaskId(null)
  }

  const handleFocusComplete = async (taskId: string) => {
    try {
      await completeTask(taskId)
      setFocusTaskId(null)
    } catch (error) {
      console.error('Failed to complete focused task:', error)
    }
  }

  // === PARK HANDLER ===

  const handleParkThought = async (title: string) => {
    try {
      await createParkedThought(title)
    } catch (error) {
      console.error('Failed to park thought:', error)
    }
  }


  // === ROLL OVER HANDLER ===

  const handleRollOverTasks = async (fromListId: string) => {
    // Find the list to get its date
    const fromList = lists.find(l => l.id === fromListId)
    
    if (!fromList?.list_date) {
      return
    }
    
    const toDate = getLocalTomorrowISO()
    
    try {
      // Ensure tomorrow's date list exists
      const tomorrowList = await ensureDateList(toDate)
      
      // Move all incomplete tasks from this list to tomorrow's list
      const tasksToMove = tasks.filter(t => 
        t.list_id === fromListId && 
        !t.completed_at
      )
      
      for (const task of tasksToMove) {
        await moveTask(task.id, tomorrowList.id)
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
    handleTaskEnergyChange,
    handleDragEnd,
    
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