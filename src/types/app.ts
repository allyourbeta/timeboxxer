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
  userId: string;
  name: string;
  isInbox: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  listId: string | null;  // null = moved to calendar, no list home
  title: string;
  notes: string | null;
  durationMinutes: DurationMinutes;
  colorIndex: ColorIndex;
  position: number | null;  // null if not in a list
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

// =============================================================================
// Time Utilities Types
// =============================================================================

/** Represents a time slot on the calendar */
export interface TimeSlot {
  startTime: string;  // '09:00'
  endTime: string;    // '09:15'
  hour: number;       // 9
  minute: number;     // 0
}

/** Calendar day boundaries */
export interface DayBounds {
  startHour: number;  // 0 (midnight)
  endHour: number;    // 24 (midnight next day)
  slotMinutes: number; // 15
}

export const DEFAULT_DAY_BOUNDS: DayBounds = {
  startHour: 0,
  endHour: 24,
  slotMinutes: 15,
};

/** Where the calendar should scroll to on load */
export const DEFAULT_SCROLL_HOUR = 9; // 9am
