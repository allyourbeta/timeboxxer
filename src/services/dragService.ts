/**
 * Drag and drop business logic service
 * Pure functions for handling drag operations
 */

import { parseSlotId, slotIdToTimestamp } from '@/lib/calendarUtils'
import { getLocalTodayISO } from '@/lib/dateUtils'
import type { Task, List } from '@/types/app'
import type { DropResult } from '@hello-pangea/dnd'

export interface DragOperationResult {
  type: 'none' | 'reorder' | 'schedule' | 'commit' | 'move' | 'reschedule'
  data?: {
    taskIds?: string[]
    taskId?: string
    scheduledAt?: string
    date?: string
    homeListId?: string
  }
}

export async function processDragEnd(
  result: DropResult,
  tasks: Task[],
  lists: List[]
): Promise<DragOperationResult> {
  console.log('========== DRAG END ==========')
  console.log('Full result:', JSON.stringify(result, null, 2))
  console.log('Source droppableId:', result.source?.droppableId)
  console.log('Destination droppableId:', result.destination?.droppableId)
  console.log('Draggable ID:', result.draggableId)
  console.log('Available lists:', lists.map(l => ({ id: l.id, name: l.name, system_type: l.system_type })))

  // Dropped outside any droppable area
  if (!result.destination) {
    console.log('❌ NO DESTINATION - dropped outside any droppable')
    return { type: 'none' }
  }

  console.log('✅ Has destination, proceeding...')

  const sourceId = result.source.droppableId
  const destinationId = result.destination.droppableId
  const taskId = result.draggableId

  console.log('📦 Drag details:', { sourceId, destinationId, taskId })

  // Same list, same position - no change
  if (sourceId === destinationId && result.source.index === result.destination.index) {
    console.log('📍 No position change')
    return { type: 'none' }
  }

  // Same list - reorder within list
  if (sourceId === destinationId) {
    console.log('🔄 Reordering within same list')
    const sourceList = lists.find(l => l.id === sourceId)
    if (!sourceList) return { type: 'none' }

    // Get tasks for this list using the same logic as the UI
    let listTasks: Task[] = []
    if (sourceList.system_type === 'date' && sourceList.list_date) {
      listTasks = tasks
        .filter(t => t.committed_date === sourceList.list_date && !t.is_completed)
        .sort((a, b) => a.position - b.position)
    } else {
      listTasks = tasks
        .filter(t => t.home_list_id === sourceId && !t.is_completed)
        .sort((a, b) => a.position - b.position)
    }

    // Reorder the array
    const reordered = Array.from(listTasks)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    // Get new order of IDs
    const newTaskIds = reordered.map(t => t.id)
    console.log('📝 New order:', newTaskIds)

    return {
      type: 'reorder',
      data: { taskIds: newTaskIds }
    }
  }

  // Check if dropped on a calendar slot
  if (destinationId.startsWith('calendar-slot-')) {
    console.log('📅 Task dropped on calendar slot:', destinationId)

    // Parse the slot ID to get the time
    const slotInfo = parseSlotId(destinationId)
    if (!slotInfo) {
      console.log('❌ Invalid slot ID:', destinationId)
      return { type: 'none' }
    }

    const { hours, minutes } = slotInfo
    console.log('🎯 Parsed slot time:', `${hours}:${minutes.toString().padStart(2, '0')}`)

    // Check if this is a calendar-to-calendar move (reordering within calendar)
    if (sourceId.startsWith('calendar-slot-') || sourceId === 'calendar') {
      console.log('🔄 Calendar-to-calendar move detected')

      // Get the timestamp for this slot
      const today = getLocalTodayISO()
      const scheduledAt = slotIdToTimestamp(destinationId, today)
      if (!scheduledAt) {
        console.log('❌ Failed to create timestamp')
        return { type: 'none' }
      }

      console.log('📅 Rescheduling task to:', scheduledAt)
      return {
        type: 'reschedule',
        data: { taskId, scheduledAt }
      }
    }

    // For external drops (from lists), schedule at the dropped slot time
    const today = getLocalTodayISO()
    const scheduledAt = slotIdToTimestamp(destinationId, today)
    if (!scheduledAt) {
      console.log('❌ Failed to create timestamp')
      return { type: 'none' }
    }

    console.log('🕐 Scheduling at slot time:', scheduledAt)
    return {
      type: 'schedule',
      data: { taskId, scheduledAt }
    }
  }

  // Different lists - check if destination is a date list
  const destinationList = lists.find(l => l.id === destinationId)
  if (!destinationList) {
    console.log('❌ Destination list not found')
    return { type: 'none' }
  }

  console.log('📋 Destination list found:', {
    id: destinationList.id,
    name: destinationList.name,
    system_type: destinationList.system_type,
    list_date: destinationList.list_date
  })

  if (destinationList.system_type === 'date' && destinationList.list_date) {
    console.log('📅 Committing task to date list:', destinationList.list_date)
    return {
      type: 'commit',
      data: { taskId, date: destinationList.list_date }
    }
  }

  console.log('📝 Regular list drop - updating home_list_id')
  return {
    type: 'move',
    data: { taskId, homeListId: destinationId }
  }
}