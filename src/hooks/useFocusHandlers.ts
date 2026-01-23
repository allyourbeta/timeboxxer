'use client'

import { useState } from 'react'
import { useTaskStore } from '@/state'

export function useFocusHandlers() {
  const { completeTask } = useTaskStore()
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)

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

  return {
    focusTaskId,
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
  }
}