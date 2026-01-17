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
  system_type: 'purgatory' | 'parked' | 'date' | null;
  list_date: string | null;  // ISO date string for date lists
}

export interface Task {
  id: string;
  list_id: string | null;
  title: string;
  duration_minutes: number;
  color_index: number;
  is_completed: boolean;
  completed_at: string | null;
  position: number;
  notes: string | null;
  // Limbo fields
  moved_to_purgatory_at: string | null;
  original_list_id: string | null;
  original_list_name: string | null;
  // Daily task fields
  is_daily: boolean;
  daily_source_id: string | null;
  // Energy and highlight (NEW)
  energy_level: 'high' | 'medium' | 'low';
  is_daily_highlight: boolean;
}

export interface ScheduledTask {
  id: string;
  userId: string;
  taskId: string;
  scheduledDate: string;  // ISO date string: '2026-01-12'
  startTime: string;      // Time string: '14:30:00'
  createdAt: Date;
  updatedAt: Date;
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

/** Task with its schedule info (if scheduled) */
export interface TaskWithSchedule extends Task {
  schedule: ScheduledTask | null;
}

/** Scheduled task with full task details (for calendar view) */
export interface CalendarEntry {
  schedule: ScheduledTask;
  task: Task;
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

