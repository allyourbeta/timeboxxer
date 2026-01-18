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
    
    const taskList = lists.find(l => l.id === task.home_list_id)
    if (!taskList || taskList.system_type !== 'date') {
      console.warn('Highlights only available for date lists')
      return
    }
    
    if (task.highlight_date) {
      await updateTask(taskId, { highlight_date: null })
    } else {
      const highlightsInList = tasks.filter(t => 
        t.home_list_id === task.home_list_id && t.highlight_date !== null
      ).length
      
      if (highlightsInList >= 5) {
        alert('Maximum 5 highlights per day. Remove one first.')
        return
      }
      
      // Use the current date as the highlight date
      const today = new Date().toISOString().split('T')[0]
      await updateTask(taskId, { highlight_date: today })
    }
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