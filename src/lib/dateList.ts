/**
 * Get today's LOCAL date in ISO format (YYYY-MM-DD)
 * Uses local timezone, not UTC
 */
export function getLocalTodayISO(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get tomorrow's LOCAL date in ISO format (YYYY-MM-DD)
 * Uses local timezone, not UTC
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
 * Format a date ISO string as a display name
 * e.g., "2026-01-17" -> "Jan 17, 2026"
 */
export function formatDateForDisplay(dateISO: string): string {
  // Parse as local date (not UTC) by using date parts
  const [year, month, day] = dateISO.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric', 
    year: 'numeric'
  })
}

// Keep old functions for backward compatibility but mark deprecated
/** @deprecated Use getLocalTodayISO instead */
export function getTodayISO(): string {
  return getLocalTodayISO()
}

/** @deprecated Use getLocalTomorrowISO instead */
export function getTomorrowISO(): string {
  return getLocalTomorrowISO()
}

/** @deprecated Use formatDateForDisplay instead */
export function getTodayListName(): string {
  return formatDateForDisplay(getLocalTodayISO())
}

/** @deprecated Use formatDateForDisplay instead */
export function getTomorrowListName(): string {
  return formatDateForDisplay(getLocalTomorrowISO())
}