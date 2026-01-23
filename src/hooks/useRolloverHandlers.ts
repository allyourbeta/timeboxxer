'use client'

import { useTaskStore, useListStore } from '@/state'
import { getLocalTomorrowISO } from '@/lib/dateUtils'

export function useRolloverHandlers() {
  const { tasks, moveTask, createParkedThought } = useTaskStore()
  const { lists, ensureDateList } = useListStore()

  const handleRollOverTasks = async (fromListId: string) => {
    const fromList = lists.find(l => l.id === fromListId)
    if (!fromList?.list_date) return
    
    const toDate = getLocalTomorrowISO()
    
    try {
      const tomorrowList = await ensureDateList(toDate)
      const tasksToMove = tasks.filter(t => 
        t.list_id === fromListId && !t.completed_at
      )
      
      for (const task of tasksToMove) {
        await moveTask(task.id, tomorrowList.id)
      }
    } catch (error) {
      console.error('Roll over failed:', error)
    }
  }

  const handleParkThought = async (title: string) => {
    try {
      await createParkedThought(title)
    } catch (error) {
      console.error('Failed to park thought:', error)
    }
  }

  return { handleRollOverTasks, handleParkThought }
}