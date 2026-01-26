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
    .order("created_at");

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
 * Reorder a task within a list using sparse integers
 * Only updates 1 task in the normal case, or all tasks if rebalancing is needed
 * 
 * @param taskId - The task being moved
 * @param beforePosition - Position of the task above (null if moving to top)
 * @param afterPosition - Position of the task below (null if moving to bottom)
 */
export async function reorderTask(
  taskId: string,
  beforePosition: number | null,
  afterPosition: number | null
): Promise<void> {
  const supabase = createClient();
  const POSITION_GAP = 1000;
  const MIN_GAP = 1;

  let newPosition: number;

  if (beforePosition === null && afterPosition === null) {
    // Only item, or moving to empty space
    newPosition = POSITION_GAP;
  } else if (beforePosition === null) {
    // Moving to top
    newPosition = Math.floor(afterPosition! / 2);
    if (newPosition < MIN_GAP) {
      // Need to rebalance - afterPosition is too close to 0
      newPosition = 0; // Will trigger rebalance below
    }
  } else if (afterPosition === null) {
    // Moving to bottom
    newPosition = beforePosition + POSITION_GAP;
  } else {
    // Moving between two items
    const gap = afterPosition - beforePosition;
    if (gap <= MIN_GAP) {
      // Need to rebalance - no room between these positions
      newPosition = -1; // Signal to rebalance
    } else {
      newPosition = beforePosition + Math.floor(gap / 2);
    }
  }

  // Check if we need to rebalance (newPosition collision or too small)
  if (newPosition < MIN_GAP) {
    // Fetch all tasks in this list and rebalance
    const { data: task } = await supabase
      .from("tasks")
      .select("list_id, planned_list_date")
      .eq("id", taskId)
      .single();

    if (task) {
      // Get all tasks in this context (list_id or planned_list_date)
      let query = supabase.from("tasks").select("id, position");
      
      if (task.planned_list_date) {
        query = query.eq("planned_list_date", task.planned_list_date);
      } else {
        query = query.eq("list_id", task.list_id);
      }
      
      const { data: allTasks } = await query.order("position", { ascending: true, nullsFirst: false });
      
      if (allTasks && allTasks.length > 0) {
        // Rebalance all positions with POSITION_GAP spacing
        const updates = allTasks.map((t, index) =>
          supabase
            .from("tasks")
            .update({ position: (index + 1) * POSITION_GAP })
            .eq("id", t.id)
        );
        await Promise.all(updates);
        
        // Now calculate the correct position for the moved task
        // (This is a simplified approach - in production you'd be smarter about this)
        return;
      }
    }
  }

  // Normal case: just update the one task
  const { error } = await supabase
    .from("tasks")
    .update({ position: newPosition, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) throw error;
}
