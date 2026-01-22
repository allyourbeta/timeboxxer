/**
 * Calendar utility functions for time/position calculations
 */

// Constants
export const SLOT_HEIGHT = 180 // pixels per hour (45px per 15-min slot for excellent targeting)
export const MINUTES_PER_SLOT = 15
export const SLOTS_PER_HOUR = 60 / MINUTES_PER_SLOT

/**
 * Convert a time string (HH:mm) to pixels from top of calendar
 */
export function timeToPixels(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes
  return (totalMinutes / 60) * SLOT_HEIGHT
}

/**
 * Convert pixels from top of calendar to time string (HH:mm)
 */
export function pixelsToTime(pixels: number): string {
  const totalMinutes = Math.round((pixels / SLOT_HEIGHT) * 60 / MINUTES_PER_SLOT) * MINUTES_PER_SLOT
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Get the current time as HH:mm string
 */
export function getCurrentTime(): string {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

/**
 * Get the pixel position for the current time line
 */
export function getCurrentTimePixels(): number {
  return timeToPixels(getCurrentTime())
}

/**
 * Generate hour labels for the calendar (0-23)
 */
export function getHourLabels(): string[] {
  return Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
  )
}

/**
 * Convert scheduled_at timestamp to time string
 */
export function timestampToTime(timestamp: string): string {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

/**
 * Get scroll position to show "now minus 1.5 hours"
 */
export function getInitialScrollPosition(): number {
  const now = new Date()
  const scrollToTime = new Date(now.getTime() - 1.5 * 60 * 60 * 1000) // 1.5 hours ago
  const timeString = `${scrollToTime.getHours().toString().padStart(2, '0')}:${scrollToTime.getMinutes().toString().padStart(2, '0')}`
  return timeToPixels(timeString)
}

/**
 * Calculate time slot from drop coordinates relative to calendar container
 * @param clientY - The Y coordinate of the drop relative to the viewport
 * @param calendarRect - The bounding rect of the calendar container
 * @param scrollTop - The current scroll position of the calendar
 * @returns Time string (HH:mm) snapped to 15-minute intervals
 */
export function calculateDropTime(clientY: number, calendarRect: DOMRect, scrollTop: number): string {
  // Calculate the Y position relative to the top of the calendar content (accounting for scroll)
  const relativeY = clientY - calendarRect.top + scrollTop
  
  // Convert to time and snap to 15-minute intervals
  return pixelsToTime(relativeY)
}

/**
 * Calculate time from drag distance within calendar
 * @param startPixels - Original pixel position
 * @param dragDistance - Pixels moved during drag
 * @returns New time string (HH:mm) snapped to 15-minute intervals
 */
export function calculateTimeFromDrag(startPixels: number, dragDistance: number): string {
  const newPixels = startPixels + dragDistance
  return pixelsToTime(Math.max(0, newPixels))
}

/**
 * Calculate which 15-minute slot a pointer position maps to
 * @param clientY - Y coordinate relative to viewport
 * @param calendarRect - Bounding rect of calendar container
 * @param scrollTop - Current scroll position
 * @returns Slot index (0 = 00:00-00:15, 1 = 00:15-00:30, etc.)
 */
export function calculateSlotIndex(clientY: number, calendarRect: DOMRect, scrollTop: number): number {
  const relativeY = clientY - calendarRect.top + scrollTop
  const slotHeightPx = SLOT_HEIGHT / SLOTS_PER_HOUR // 45px per 15-min slot
  const slotIndex = Math.floor(Math.max(0, relativeY) / slotHeightPx)
  
  console.log('📐 calculateSlotIndex Debug:')
  console.log('  relativeY:', relativeY)
  console.log('  SLOT_HEIGHT:', SLOT_HEIGHT)
  console.log('  SLOTS_PER_HOUR:', SLOTS_PER_HOUR)
  console.log('  slotHeightPx:', slotHeightPx)
  console.log('  final slotIndex:', slotIndex)
  
  return slotIndex
}

/**
 * Convert slot index to time string
 * @param slotIndex - 0-based slot index (0 = 00:00-00:15)
 * @returns Time string (HH:mm)
 */
export function slotIndexToTime(slotIndex: number): string {
  const totalMinutes = slotIndex * MINUTES_PER_SLOT
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Get pixel position for a slot index
 * @param slotIndex - 0-based slot index
 * @returns Y position in pixels
 */
export function slotIndexToPixels(slotIndex: number): number {
  const slotHeightPx = SLOT_HEIGHT / SLOTS_PER_HOUR // 45px per 15-min slot
  return slotIndex * slotHeightPx
}

/**
 * Format time slot as droppable ID for 15-minute slots
 * @param hour - 0-23
 * @param minutes - 0, 15, 30, or 45
 * @returns droppableId like "calendar-slot-1430"
 */
export function formatSlotId(hour: number, minutes: number): string {
  const timeStr = `${hour.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`
  return `calendar-slot-${timeStr}`
}

/**
 * Parse a calendar slot droppable ID back to time components
 * @param droppableId - like "calendar-slot-1430"
 * @returns {hours, minutes} or null if invalid
 */
export function parseSlotId(droppableId: string): { hours: number; minutes: number } | null {
  if (!droppableId.startsWith('calendar-slot-')) {
    return null
  }
  
  const timeStr = droppableId.replace('calendar-slot-', '')
  if (timeStr.length !== 4) {
    return null
  }
  
  const hours = parseInt(timeStr.substring(0, 2), 10)
  const minutes = parseInt(timeStr.substring(2, 4), 10)
  
  // Validate ranges
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || minutes % 15 !== 0) {
    return null
  }
  
  return { hours, minutes }
}

/**
 * Convert slot ID to timestamp string for scheduling
 * @param slotId - like "calendar-slot-1430"
 * @param date - ISO date string like "2026-01-21"
 * @returns timestamp like "2026-01-21T14:30:00"
 */
export function slotIdToTimestamp(slotId: string, date: string): string | null {
  const parsed = parseSlotId(slotId)
  if (!parsed) return null
  
  const { hours, minutes } = parsed
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  return `${date}T${timeStr}:00`
}

/**
 * Generate all 96 slot IDs for a 24-hour period (15-minute intervals)
 * @returns Array of slot IDs from "calendar-slot-0000" to "calendar-slot-2345"
 */
export function generateAllSlotIds(): string[] {
  const slots: string[] = []
  
  // Generate 96 slots with 15-minute intervals for precise time-boxing
  for (let hour = 0; hour < 24; hour++) {
    for (let quarterHour = 0; quarterHour < 4; quarterHour++) {
      const minutes = quarterHour * 15
      slots.push(formatSlotId(hour, minutes))
    }
  }
  
  return slots
}

/**
 * Convert scheduled_at timestamp to slot index for overlap detection
 * @param scheduledAt - Timestamp like "2026-01-22T09:30:00"
 * @returns Slot index (0-95)
 */
export function timeToSlotIndex(scheduledAt: string): number {
  const time = scheduledAt.split('T')[1]  // "09:30:00"
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 4 + Math.floor(minutes / 15)  // 9:30 -> 38
}

interface TaskLayout {
  width: number
  column: number
}

interface ScheduledTask {
  id: string
  scheduled_at: string
  duration_minutes: number
}

/**
 * Calculate widths and columns for overlapping tasks
 * Tasks that overlap should display side-by-side at 50% width each
 * @param tasks - Array of scheduled tasks
 * @returns Map of task ID to layout info (width %, column 0/1)
 */
export function calculateTaskWidths(tasks: ScheduledTask[]): Map<string, TaskLayout> {
  const result = new Map<string, TaskLayout>()
  
  // Step 1: Build a map of which tasks occupy which 15-min slots
  const slotOccupancy: Map<number, string[]> = new Map()  // slot index -> task IDs
  
  for (const task of tasks) {
    const startSlot = timeToSlotIndex(task.scheduled_at)  // e.g., 9:00 -> 36
    const endSlot = startSlot + Math.ceil(task.duration_minutes / 15)
    
    for (let slot = startSlot; slot < endSlot; slot++) {
      if (!slotOccupancy.has(slot)) {
        slotOccupancy.set(slot, [])
      }
      slotOccupancy.get(slot)!.push(task.id)
    }
  }
  
  // Step 2: Assign columns to overlapping tasks
  const columnAssignments = new Map<string, number>()

  for (const [slot, taskIds] of slotOccupancy.entries()) {
    if (taskIds.length === 2) {
      const [task1, task2] = taskIds
        .map(id => tasks.find(t => t.id === id)!)
        .sort((a, b) => {
          const timeCompare = a.scheduled_at!.localeCompare(b.scheduled_at!)
          return timeCompare !== 0 ? timeCompare : a.id.localeCompare(b.id)
        })
      
      // Only set if not already assigned
      if (!columnAssignments.has(task1.id)) columnAssignments.set(task1.id, 0)
      if (!columnAssignments.has(task2.id)) columnAssignments.set(task2.id, 1)
    }
  }

  console.log('Column assignments:', Object.fromEntries(columnAssignments))

  // Step 3: Build result map with widths and column assignments
  for (const task of tasks) {
    const column = columnAssignments.get(task.id)
    if (column !== undefined) {
      // Task has overlap, use 50% width with assigned column
      result.set(task.id, { width: 50, column })
    } else {
      // No overlap, use 100% width at column 0
      result.set(task.id, { width: 100, column: 0 })
    }
  }
  
  return result
}

/**
 * Check if a task can be scheduled at a given time without violating overlap rules
 * Maximum of 2 tasks can occupy any 15-minute slot
 * @param tasks - Current scheduled tasks
 * @param newTaskId - ID of task being scheduled (to exclude it from checks)
 * @param scheduledAt - Proposed schedule time
 * @param durationMinutes - Duration of the task
 * @returns Object with allowed flag and optional message
 */
export function canScheduleTask(
  tasks: { id: string; scheduled_at: string | null; duration_minutes: number }[],
  newTaskId: string,
  scheduledAt: string,
  durationMinutes: number
): { allowed: boolean; message?: string } {
  
  const startSlot = timeToSlotIndex(scheduledAt)
  const endSlot = startSlot + Math.ceil(durationMinutes / 15)
  
  // Count tasks in each slot (excluding the task being moved)
  for (let slot = startSlot; slot < endSlot; slot++) {
    const tasksInSlot = tasks.filter(t => {
      if (t.id === newTaskId) return false  // Don't count itself
      if (!t.scheduled_at) return false
      
      const tStart = timeToSlotIndex(t.scheduled_at)
      const tEnd = tStart + Math.ceil(t.duration_minutes / 15)
      
      return slot >= tStart && slot < tEnd
    })
    
    if (tasksInSlot.length >= 2) {
      return { 
        allowed: false, 
        message: 'Maximum 2 tasks can overlap. Move or complete a task first.' 
      }
    }
  }
  
  return { allowed: true }
}