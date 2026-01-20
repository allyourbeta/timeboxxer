/**
 * Application Type Definitions for Timeboxxer
 * 
 * These types represent the app's domain model.
 * Database types are in database.ts (auto-generated from Supabase).
 */

// =============================================================================
// Core Domain Types
// =============================================================================

export interface Profile {
  id: string;
  email: string | null;
  displayName: string | null;
  currentPaletteId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  position: number;
  is_collapsed: boolean;
  // System list fields
  is_system: boolean;
  system_type: 'parked' | 'date' | null;
  list_date: string | null;  // ISO date string for date lists
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  duration_minutes: number;
  color_index: number;
  position: number;
  notes: string | null;
  
  // Home list - where this task "lives"
  home_list_id: string;
  
  // Commitment - if set, task appears in that day's date list
  committed_date: string | null;  // ISO date: '2026-01-18'
  
  // Scheduling - if set, task appears on calendar
  scheduled_at: string | null;  // ISO timestamp: '2026-01-18T14:00:00Z'
  
  // Completion
  is_completed: boolean;
  completed_at: string | null;
  
  // Daily tasks
  is_daily: boolean;
  daily_source_id: string | null;
  
  // Per-day highlight
  highlight_date: string | null;  // ISO date - task highlighted for this day only
  
  // Energy level
  energy_level: 'high' | 'medium' | 'low';
}

// =============================================================================
// Constrained Types
// =============================================================================

/** Valid task durations in minutes (always multiples of 15) */
export type DurationMinutes = 15 | 30 | 45 | 60 | 75 | 90 | 105 | 120;

/** Valid color indices (0-11, indexes into palette.colors) */
export type ColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Duration options for UI */
export const DURATION_OPTIONS: DurationMinutes[] = [15, 30, 45, 60, 75, 90, 105, 120];

/** Default duration for new tasks */
export const DEFAULT_DURATION: DurationMinutes = 15;

/** Default color index for new tasks */
export const DEFAULT_COLOR_INDEX: ColorIndex = 0;

// =============================================================================
// Composite Types (for UI)
// =============================================================================

/** Task displayed on calendar */
export interface CalendarEntry {
  task: Task;
  scheduledAt: Date;  // Parsed from task.scheduled_at
}

/** List with its tasks (for list panel) */
export interface ListWithTasks extends List {
  tasks: Task[];
}

// =============================================================================
// Action Types (for drag-drop, mutations)
// =============================================================================

/** How a task is being added to calendar */
export type ScheduleMode = 'copy' | 'move';

/** Drag-drop payload when dragging a task */
export interface DragPayload {
  taskId: string;
  sourceListId: string | null;
  mode: ScheduleMode;
}

/** Drop target info */
export interface DropTarget {
  type: 'calendar';
  date: string;      // ISO date
  startTime: string; // Time string
}

// =============================================================================
// Form Types
// =============================================================================

export interface CreateTaskInput {
  listId: string;
  title: string;
  durationMinutes?: DurationMinutes;
  colorIndex?: ColorIndex;
  notes?: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  durationMinutes?: DurationMinutes;
  colorIndex?: ColorIndex;
  notes?: string;
}

export interface CreateListInput {
  name: string;
}

export interface ScheduleTaskInput {
  taskId: string;
  scheduledDate: string;
  startTime: string;
  mode: ScheduleMode;
}

