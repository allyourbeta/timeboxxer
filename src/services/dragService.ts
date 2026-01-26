/**
 * Drag and drop business logic service
 * Pure functions for handling drag operations
 *
 * Soft-Link Scheduling Model:
 * - Tasks "live" in project/bucket lists (their permanent home via list_id)
 * - Tasks "visit" date lists (scheduled for a specific day via planned_list_date)
 * - Drag from project → date list = schedule (set planned_list_date)
 * - Drag from date list → project = unschedule (clear planned_list_date, change list_id)
 * - Drag from date list → different date = reschedule-date (change planned_list_date)
 */

import { parseSlotId, slotIdToTimestamp } from "@/lib/calendarUtils";
import { getLocalTodayISO } from "@/lib/dateUtils";
import type { Task, List } from "@/types/app";
import type { DropResult } from "@hello-pangea/dnd";

export interface DragOperationResult {
  type:
    | "none"
    | "reorder"
    | "schedule"
    | "move"
    | "reschedule"
    | "schedule-to-date"
    | "unschedule"
    | "reschedule-date";
  data?: {
    taskIds?: string[];
    taskId?: string;
    calendarSlotTime?: string;
    plannedListDate?: string;
    listId?: string;
    orderedTaskIds?: string[];
  };
}

export async function processDragEnd(
  result: DropResult,
  tasks: Task[],
  lists: List[],
): Promise<DragOperationResult> {
  // Dropped outside any droppable area
  if (!result.destination) {
    return { type: "none" };
  }

  const sourceId = result.source.droppableId;
  const destinationId = result.destination.droppableId;
  const taskId = result.draggableId;

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return { type: "none" };

  // Same list, same position - no change
  if (
    sourceId === destinationId &&
    result.source.index === result.destination.index
  ) {
    return { type: "none" };
  }

  // Determine source and destination list types
  const sourceList = lists.find((l) => l.id === sourceId);
  const destList = lists.find((l) => l.id === destinationId);
  const isSourceDateList = sourceList?.list_type === "date";
  const isDestDateList = destList?.list_type === "date";
  const isDestCalendar = destinationId.startsWith("calendar-slot-");

  // Same list - reorder within list
  if (sourceId === destinationId) {
    if (!sourceList) return { type: "none" };

    // Get tasks for this list based on list type
    let listTasks: Task[];
    if (isSourceDateList && sourceList.list_date) {
      // Date lists show tasks by planned_list_date
      listTasks = tasks
        .filter(
          (t) => t.planned_list_date === sourceList.list_date && !t.completed_at,
        )
        .sort((a, b) => {
          const posA = a.position ?? Infinity;
          const posB = b.position ?? Infinity;
          if (posA !== posB) return posA - posB;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    } else {
      // Project lists show tasks by list_id
      listTasks = tasks
        .filter((t) => t.list_id === sourceId && !t.completed_at)
        .sort((a, b) => {
          const posA = a.position ?? Infinity;
          const posB = b.position ?? Infinity;
          if (posA !== posB) return posA - posB;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    }

    const destIndex = result.destination.index;
    const movedTask = listTasks[result.source.index];
    
    // Reorder the array
    const reordered = Array.from(listTasks);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(destIndex, 0, removed);
    
    // Return the full ordered list of IDs
    const orderedTaskIds = reordered.map((t) => t.id);

    return {
      type: "reorder",
      data: { 
        taskId: movedTask.id,
        orderedTaskIds,
      },
    };
  }

  // === CALENDAR DROPS ===
  if (isDestCalendar) {
    // Parse the slot ID to get the time
    const slotInfo = parseSlotId(destinationId);
    if (!slotInfo) {
      return { type: "none" };
    }

    const today = getLocalTodayISO();
    const calendarSlotTime = slotIdToTimestamp(destinationId, today);
    if (!calendarSlotTime) {
      return { type: "none" };
    }

    // Check if this is a calendar-to-calendar move
    if (sourceId.startsWith("calendar-slot-") || sourceId === "calendar") {
      return {
        type: "reschedule",
        data: { taskId, calendarSlotTime },
      };
    }

    // External drop to calendar - schedule with both date and time
    return {
      type: "schedule",
      data: { taskId, calendarSlotTime, plannedListDate: today },
    };
  }

  // === PROJECT LIST → DATE LIST (Schedule for that date) ===
  if (!isSourceDateList && isDestDateList && destList?.list_date) {
    return {
      type: "schedule-to-date",
      data: { taskId, plannedListDate: destList.list_date },
    };
  }

  // === DATE LIST → PROJECT LIST (Unschedule) ===
  if (isSourceDateList && !isDestDateList && destList) {
    return {
      type: "unschedule",
      data: { taskId, listId: destinationId },
    };
  }

  // === DATE LIST → DIFFERENT DATE LIST (Reschedule date) ===
  if (isSourceDateList && isDestDateList && destList?.list_date) {
    // Only if it's actually a different date
    if (sourceList?.list_date !== destList.list_date) {
      return {
        type: "reschedule-date",
        data: { taskId, plannedListDate: destList.list_date },
      };
    }
    // Same date list - treat as reorder (already handled above)
    return { type: "none" };
  }

  // === PROJECT LIST → PROJECT LIST (Move) ===
  if (!isSourceDateList && !isDestDateList && destList) {
    return {
      type: "move",
      data: { taskId, listId: destinationId },
    };
  }

  return { type: "none" };
}
