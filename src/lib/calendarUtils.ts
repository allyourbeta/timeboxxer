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