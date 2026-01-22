'use client'

import { useState } from 'react'
import { useTaskStore, useListStore, useUIStore } from '@/state'
import { rollOverTasks } from '@/api'
import { getTomorrowListName, getLocalTomorrowISO } from '@/lib/dateList'

interface PendingDelete {
  listId: string
  listName: string
  originalTasks: Array<{ id: string; originalListId: string }>
  timeoutId: NodeJS.Timeout
}

export function useListHandlers() {
  const { updateTask } = useTaskStore()
  const { lists, createList, deleteList, duplicateList, updateList } = useListStore()
  const { setEditingListId, setShowNewListInput } = useUIStore()
  
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  const handleListCreate = async (name: string) => {
    await createList(name)
    setShowNewListInput(false)
  }

  const handleListEdit = async (listId: string, newName: string) => {
    await updateList(listId, newName)
    setEditingListId(null)
  }


  const handleDeleteListClick = async (listId: string) => {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    
    if (list.system_type === 'parked') return
    
    if (list.system_type === 'date') {
      const listDate = new Date(list.name)
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
    
    for (const task of pendingDelete.originalTasks) {
      await updateTask(task.id, { home_list_id: task.originalListId })
    }
    
    setPendingDelete(null)
  }

  const handleRollOverTasks = async (fromListId: string) => {
    const tomorrowList = lists.find(l => 
      l.list_date === getLocalTomorrowISO()
    )
    
    if (!tomorrowList) {
      console.error('Tomorrow list not found')
      return
    }
    
    const count = await rollOverTasks(fromListId, tomorrowList.id)
    
    if (count > 0) {
      const { loadTasks } = useTaskStore.getState()
      await loadTasks()
    }
  }

  return {
    pendingDelete,
    setPendingDelete,
    handleListCreate,
    handleListEdit,
    handleDeleteListClick,
    handleUndoDelete,
    handleRollOverTasks,
  }
}