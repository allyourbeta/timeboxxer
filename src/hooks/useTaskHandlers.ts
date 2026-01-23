'use client'

import { useState } from 'react'
import { useTaskStore } from '@/state'
import { DURATION_OPTIONS } from '@/lib/constants'

interface DiscardConfirm {
  taskId: string
  taskTitle: string
}

export function useTaskHandlers() {
  const {
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
  } = useTaskStore()

  const [discardConfirm, setDiscardConfirm] = useState<DiscardConfirm | null>(null)

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

  return {
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDurationClick,
    handleTaskComplete,
    handleTaskUncomplete,
    handleTaskEnergyChange,
    discardConfirm,
    handleTaskDiscardClick,
    handleTaskDiscardConfirm,
    handleTaskDiscardCancel,
  }
}