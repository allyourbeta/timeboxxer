/**
 * Drag and drop business logic service
 * Pure functions for handling drag operations
 */

import { parseSlotId, slotIdToTimestamp } from '@/lib/calendarUtils'
import { getLocalTodayISO } from '@/lib/dateUtils'
import type { Task, List } from '@/types/app'
import type { DropResult } from '@hello-pangea/dnd'

export interface DragOperationResult {
  type: 'none' | 'reorder' | 'schedule' | 'move' | 'reschedule'
  data?: {
    taskIds?: string[]
    taskId?: string
    scheduledAt?: string
    listId?: string
  }
}

export async function processDragEnd(
  result: DropResult,
  tasks: Task[],
  lists: List[]
): Promise<DragOperationResult> {
  // Dropped outside any droppable area
  if (!result.destination) {
    return { type: 'none' }
  }

  const sourceId = result.source.droppableId
  const destinationId = result.destination.droppableId
  const taskId = result.draggableId

  // Same list, same position - no change
  if (sourceId === destinationId && result.source.index === result.destination.index) {
    return { type: 'none' }
  }

  // Same list - reorder within list
  if (sourceId === destinationId) {
    const sourceList = lists.find(l => l.id === sourceId)
    if (!sourceList) return { type: 'none' }

    // Get tasks for this list - simple in new schema
    const listTasks = tasks
      .filter(t => t.list_id === sourceId && !t.completed_at)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // Reorder the array
    const reordered = Array.from(listTasks)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    // Get new order of IDs
    const newTaskIds = reordered.map(t => t.id)

    return {
      type: 'reorder',
      data: { taskIds: newTaskIds }
    }
  }

  // Check if dropped on a calendar slot
  if (destinationId.startsWith('calendar-slot-')) {
    // Parse the slot ID to get the time
    const slotInfo = parseSlotId(destinationId)
    if (!slotInfo) {
      return { type: 'none' }
    }

    const { hours, minutes } = slotInfo

    // Check if this is a calendar-to-calendar move (reordering within calendar)
    if (sourceId.startsWith('calendar-slot-') || sourceId === 'calendar') {
      // Get the timestamp for this slot
      const today = getLocalTodayISO()
      const scheduledAt = slotIdToTimestamp(destinationId, today)
      if (!scheduledAt) {
        return { type: 'none' }
      }
      return {
        type: 'reschedule',
        data: { taskId, scheduledAt }
      }
    }

    // For external drops (from lists), schedule at the dropped slot time
    const today = getLocalTodayISO()
    const scheduledAt = slotIdToTimestamp(destinationId, today)
    if (!scheduledAt) {
      return { type: 'none' }
    }
    return {
      type: 'schedule',
      data: { taskId, scheduledAt }
    }
  }

  // Different lists - check if destination is a date list
  const destinationList = lists.find(l => l.id === destinationId)
  if (!destinationList) {
    return { type: 'none' }
  }
  return {
    type: 'move',
    data: { taskId, listId: destinationId }
  }
}