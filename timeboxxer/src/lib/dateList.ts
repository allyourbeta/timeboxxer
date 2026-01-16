import { DEV_USER_ID } from './constants'

/**
 * Format today's date as a list name
 * e.g., "13 Jan 2026"
 */
export function getTodayListName(): string {
  const today = new Date()
  return today.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Format tomorrow's date as a list name
 * e.g., "14 Jan 2026"
 */
export function getTomorrowListName(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Get tomorrow's date in ISO format (YYYY-MM-DD)
 */
export function getTomorrowISO(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}