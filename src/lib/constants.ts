// =============================================================================
// Application Constants
// =============================================================================

// Task Defaults
export const DEFAULT_TASK_DURATION = 15  // minutes
export const DEFAULT_CALENDAR_TASK_DURATION = 30  // minutes

// Color System
export const COLOR_COUNT = 12
export const getRandomColorIndex = () => Math.floor(Math.random() * COLOR_COUNT)

// Time Periods
export const PURGATORY_EXPIRY_DAYS = 7
export const WEEK_DAYS = 7

// UI Timing
export const TOAST_DURATION_MS = 5000
export const UNDO_TIMEOUT_MS = 5000

// Limits
export const MAX_HIGHLIGHTS_PER_DAY = 5

// Duration Options (also exported from types/app.ts for type safety)
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const

// Default Palette
export const DEFAULT_PALETTE_ID = 'rainbow-bright'