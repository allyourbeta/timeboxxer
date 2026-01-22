'use client'

import { useState } from 'react'
import { useTaskStore, useListStore } from '@/state'
import { DURATION_OPTIONS } from '@/lib/constants'

export function useTaskHandlers() {
  const { tasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask } = useTaskStore()
  const { lists } = useListStore()
  
  const [discardConfirm, setDiscardConfirm] = useState<{
    taskId: string
    taskTitle: string
  } | null>(null)

  const handleTaskAdd = async (listId: string, title: string) => {
    await createTask(listId, title)
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
    // Daily tasks removed in new schema
    console.log('Daily tasks not supported in new schema')
  }

  const handleTaskEnergyChange = async (taskId: string, level: 'high' | 'medium' | 'low') => {
    await updateTask(taskId, { energy_level: level })
  }

  const handleTaskHighlightToggle = async (taskId: string) => {
    // Highlights removed in new schema
    console.log('Highlights not supported in new schema')
  }

  return {
    discardConfirm,
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDurationClick,
    handleTaskComplete,
    handleTaskUncomplete,
    handleTaskDailyToggle,
    handleTaskEnergyChange,
    handleTaskHighlightToggle,
    handleTaskDiscardClick,
    handleTaskDiscardConfirm,
    handleTaskDiscardCancel,
  }
}