'use client'

import { useTaskStore, useListStore } from '@/state'
import { processDragEnd } from '@/services'
import type { DropResult } from '@hello-pangea/dnd'

export function useDragHandlers() {
  const { tasks, scheduleTask, moveTask } = useTaskStore()
  const { lists } = useListStore()

  const handleDragEnd = async (result: DropResult) => {
    const operation = await processDragEnd(result, tasks, lists)
    
    switch (operation.type) {
      case 'reorder':
        break
        
      case 'schedule':
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
        break
    }
  }

  return { handleDragEnd }
}