import { createClient } from "@/utils/supabase/client";
import { getCurrentUserId } from "@/utils/supabase/auth";
import { DEFAULT_TASK_DURATION } from "@/lib/constants";
import { getCompletedList, getInboxList } from "./lists";
import type { Task } from "@/types/app";

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Fetch all tasks for the current user
 */
export async function getTasks(): Promise<Task[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch completed tasks with pagination
 */
export async function getCompletedTasks(
  limit = 50,
  offset = 0,
): Promise<Task[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new task in a list
 */
export async function createTask(
  listId: string,
  title: string,
  options?: {
    duration?: number;
    colorIndex?: number;
    calendarSlotTime?: string | null;
  },
): Promise<Task> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      list_id: listId,
      title,
      duration_minutes: options?.duration ?? DEFAULT_TASK_DURATION,
      color_index: options?.colorIndex ?? 0,
      calendar_slot_time: options?.calendarSlotTime ?? null,
      energy_level: "medium",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Update task fields
 */
export async function updateTask(
  taskId: string,
  updates: Partial<
    Pick<
      Task,
      | "title"
      | "notes"
      | "duration_minutes"
      | "color_index"
      | "energy_level"
      | "list_id"
    >
  >,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) throw error;
}

/**
 * Schedule a task on the calendar
 * @param calendarSlotTime - Timestamp WITHOUT timezone (e.g., '2026-01-19T14:30:00')
 */
export async function scheduleTask(
  taskId: string,
  calendarSlotTime: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ calendar_slot_time: calendarSlotTime, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) throw error;
}

/**
 * Remove task from calendar
 */
export async function unscheduleTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ calendar_slot_time: null, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) throw error;
}

/**
 * Move task to a different list
 */
export async function moveTask(
  taskId: string,
  newListId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      list_id: newListId,
      calendar_slot_time: null, // Clear schedule when moving
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) throw error;
}

/**
 * Move a task to a new list and set its position
 */
export async function moveTaskWithPosition(
  taskId: string,
  newListId: string,
  orderedTaskIds: string[],
): Promise<void> {
  const supabase = createClient();
  const POSITION_GAP = 1000;

  // First, move the task to the new list
  const { error: moveError } = await supabase
    .from("tasks")
    .update({
      list_id: newListId,
      calendar_slot_time: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (moveError) throw moveError;

  // Then update positions for all tasks in the destination list
  const updates = orderedTaskIds.map((id, index) =>
    supabase
      .from("tasks")
      .update({ position: (index + 1) * POSITION_GAP, updated_at: new Date().toISOString() })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error("moveTaskWithPosition position update errors:", errors);
    throw errors[0].error;
  }
}

/**
 * Complete a task - move to Completed list
 */
export async function completeTask(taskId: string): Promise<void> {
  const supabase = createClient();

  // Step 1: Get the task's current list_id
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("list_id")
    .eq("id", taskId)
    .single();

  if (taskError) throw taskError;
  if (!task) throw new Error("Task not found");

  // Step 2: Get Completed list (creates if missing)
  const completedList = await getCompletedList();

  // Step 3: Update the task
  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      previous_list_id: task.list_id,
      list_id: completedList.id,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (updateError) throw updateError;
}

/**
 * Uncomplete a task - move back to previous list
 */
export async function uncompleteTask(taskId: string): Promise<void> {
  const supabase = createClient();

  // Step 1: Get the task
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("list_id, previous_list_id")
    .eq("id", taskId)
    .single();

  if (taskError) throw taskError;
  if (!task) throw new Error("Task not found");

  // Step 2: Determine target list
  let targetListId = task.previous_list_id;

  // Step 3: Check if previous list still exists
  if (targetListId) {
    const { data: previousList } = await supabase
      .from("lists")
      .select("id")
      .eq("id", targetListId)
      .single();

    if (!previousList) {
      targetListId = null;
    }
  }

  // Step 4: Fall back to Inbox if no valid previous list
  if (!targetListId) {
    const inboxList = await getInboxList();
    targetListId = inboxList.id;
  }

  // Step 5: Update the task
  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      list_id: targetListId,
      previous_list_id: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (updateError) throw updateError;
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete a task permanently
 */
export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) throw error;
}

/**
 * Delete all tasks in a list
 * @param listId - The list to clear
 * @returns Number of tasks deleted
 */
export async function clearTasksInList(listId: string): Promise<number> {
  const supabase = createClient();

  // First count how many will be deleted (for return value)
  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("list_id", listId);

  // Delete all tasks in this list
  const { error } = await supabase.from("tasks").delete().eq("list_id", listId);

  if (error) throw error;
  return count || 0;
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

// =============================================================================
// SPECIAL OPERATIONS
// =============================================================================

/**
 * Create a task in the Inbox list
 */
export async function createInboxTask(title: string): Promise<Task> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  // Find the Inbox list
  const { data: inboxList } = await supabase
    .from("lists")
    .select("id")
    .eq("user_id", userId)
    .eq("list_type", "inbox")
    .single();

  if (!inboxList) throw new Error("Inbox list not found");

  return createTask(inboxList.id, title);
}

/**
 * Schedule a task for a specific date (soft-link to date list)
 */
export async function scheduleTaskForDate(
  taskId: string,
  date: string, // ISO date string '2026-01-25'
): Promise<Task> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({
      planned_list_date: date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

/**
 * Unschedule a task from date list (clear planned_list_date and calendar_slot_time)
 */
export async function unscheduleTaskFromDate(taskId: string): Promise<Task> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tasks")
    .update({
      planned_list_date: null,
      calendar_slot_time: null, // Also clear time slot
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

/**
 * Create a task on a date list (lives in Inbox, scheduled for date)
 */
export async function createTaskOnDate(
  title: string,
  date: string, // ISO date string
): Promise<Task> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  // Get or create Inbox list
  const inbox = await getInboxList();

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      list_id: inbox.id, // Lives in Inbox
      title,
      planned_list_date: date, // But scheduled for this date
      duration_minutes: 15,
      color_index: 0,
      energy_level: "medium",
      is_highlight: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function toggleHighlight(taskId: string): Promise<Task> {
  const supabase = createClient();

  // Get current value
  const { data: current, error: fetchError } = await supabase
    .from("tasks")
    .select("is_highlight")
    .eq("id", taskId)
    .single();

  if (fetchError) throw fetchError;

  // Toggle it
  const { data, error } = await supabase
    .from("tasks")
    .update({ is_highlight: !current.is_highlight })
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Reorder a task within a list
 * Updates all tasks in the list with new sequential positions
 * 
 * @param taskId - The task being moved
 * @param orderedTaskIds - All task IDs in the list in their new order
 */
export async function reorderTask(
  taskId: string,
  orderedTaskIds: string[]
): Promise<void> {
  const supabase = createClient();
  const POSITION_GAP = 1000;

  // Update each task's position based on its index
  const updates = orderedTaskIds.map((id, index) =>
    supabase
      .from("tasks")
      .update({ position: (index + 1) * POSITION_GAP, updated_at: new Date().toISOString() })
      .eq("id", id)
  );

  const results = await Promise.all(updates);

  // Check for errors
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error("reorderTask errors:", errors);
    throw errors[0].error;
  }
}
