'use client'

import { useState } from 'react'
import { useTaskStore } from '@/state'

export function useFocusHandlers() {
  const { completeTask, createParkedThought } = useTaskStore()
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)

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

  const handleParkThought = async (title: string) => {
    await createParkedThought(title)
  }

  return {
    focusTaskId,
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
    handleParkThought,
  }
}