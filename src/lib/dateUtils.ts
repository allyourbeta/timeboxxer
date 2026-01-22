/**
 * Timezone-safe date utilities for Timeboxxer
 * All functions use LOCAL time, not UTC
 * 
 * IMPORTANT: scheduled_at is stored as TIMESTAMP (no timezone) in the database.
 * This means "2:30 PM" is stored as "2:30 PM" - wall clock time, not an absolute instant.
 */

/**
 * Get today's date as ISO string (YYYY-MM-DD) in LOCAL timezone
 */
export function getLocalTodayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get tomorrow's date as ISO string (YYYY-MM-DD) in LOCAL timezone
 */
export function getLocalTomorrowISO(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a Date object as ISO date string (YYYY-MM-DD) in LOCAL timezone
 */
export function formatLocalDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date for display (e.g., "Jan 19, 2026")
 */
export function formatDateForDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Create a timestamp for scheduling
 * Format: 'YYYY-MM-DDTHH:mm:00' (no Z, no offset)
 * 
 * This is WALL-CLOCK time, not an absolute instant.
 * "2:30 PM" means 2:30 PM on the user's calendar.
 * 
 * @param date - ISO date string (YYYY-MM-DD)
 * @param time - Time string (HH:mm)
 * @returns Timestamp string for DB
 */
export function createLocalTimestamp(date: string, time: string): string {
  return `${date}T${time}:00`
}

/**
 * Parse a TIMESTAMP from DB into date and time parts
 * No timezone conversion - it's wall-clock time
 * 
 * @param timestamp - Timestamp from database (e.g., '2026-01-19T14:30:00')
 * @returns Object with date (YYYY-MM-DD) and time (HH:mm)
 */
export function parseTimestamp(timestamp: string): { date: string; time: string } {
  const [datePart, timePart] = timestamp.split('T')
  const time = timePart ? timePart.substring(0, 5) : '00:00'
  return { date: datePart, time }
}


/**
 * Check if a scheduled timestamp is overdue (before today)
 */
export function isOverdue(timestamp: string): boolean {
  const taskDate = timestamp.split('T')[0]
  return taskDate < getLocalTodayISO()
}

/**
 * Check if a date is today
 */
export function isToday(isoDate: string): boolean {
  return isoDate === getLocalTodayISO()
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(isoDate: string): boolean {
  return isoDate === getLocalTomorrowISO()
}