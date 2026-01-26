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
  list_type: "user" | "date" | "completed" | "inbox"; // Changed 'parked' to 'inbox'
  list_date?: string; // Only for date lists (ISO date string)
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  list_id: string; // The project/bucket list this task BELONGS to

  title: string;
  notes: string | null;
  duration_minutes: number;
  color_index: number;
  energy_level: "high" | "medium" | "low";
  is_highlight: boolean;
  position: number | null; // Order within list (null = end)

  // Scheduling
  planned_list_date: string | null; // ISO date: '2026-01-25' - which DATE LIST to appear on
  calendar_slot_time: string | null; // ISO timestamp: '2026-01-25T14:00:00' - which TIME SLOT

  // Completion
  previous_list_id: string | null; // Where it was before completion (for uncomplete)
  completed_at: string | null; // When it was completed

  // Timestamps
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Constrained Types
// =============================================================================

/** Valid task durations in minutes (always multiples of 15) */
export type DurationMinutes = 15 | 30 | 45 | 60 | 75 | 90 | 105 | 120;

/** Valid color indices (0-11, indexes into palette.colors) */
export type ColorIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Duration options for UI */
export const DURATION_OPTIONS: DurationMinutes[] = [
  15, 30, 45, 60, 75, 90, 105, 120,
];

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
  calendarSlotTime: Date; // Parsed from task.calendar_slot_time
}

/** List with its tasks (for list panel) */
export interface ListWithTasks extends List {
  tasks: Task[];
}

// =============================================================================
// Action Types (for drag-drop, mutations)
// =============================================================================

/** How a task is being added to calendar */
export type ScheduleMode = "copy" | "move";

/** Drag-drop payload when dragging a task */
export interface DragPayload {
  taskId: string;
  sourceListId: string | null;
  mode: ScheduleMode;
}

/** Drop target info */
export interface DropTarget {
  type: "calendar";
  date: string; // ISO date
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
  plannedListDate: string;
  startTime: string;
  mode: ScheduleMode;
}
