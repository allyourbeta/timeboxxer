"use client";

import { useTaskStore, useListStore } from "@/state";
import { processDragEnd } from "@/services";
import type { DropResult } from "@hello-pangea/dnd";

export function useDragHandlers() {
  const {
    tasks,
    scheduleTask,
    moveTask,
    scheduleForDate,
    unscheduleFromDate,
    updateTask,
    reorderTask,
  } = useTaskStore();
  const { lists } = useListStore();

  const handleDragEnd = async (result: DropResult) => {
    const operation = await processDragEnd(result, tasks, lists);

    switch (operation.type) {
      case "reorder":
        if (operation.data?.taskId && operation.data?.orderedTaskIds) {
          await reorderTask(
            operation.data.taskId,
            operation.data.orderedTaskIds
          );
        }
        break;

      case "schedule":
        // Drop to calendar - set both planned_list_date and calendar_slot_time
        if (operation.data?.taskId && operation.data?.calendarSlotTime) {
          await scheduleTask(operation.data.taskId, operation.data.calendarSlotTime);
          // Also set planned_list_date if provided
          if (operation.data.plannedListDate) {
            await scheduleForDate(
              operation.data.taskId,
              operation.data.plannedListDate,
            );
          }
        }
        break;

      case "reschedule":
        // Calendar-to-calendar move - just update time
        if (operation.data?.taskId && operation.data?.calendarSlotTime) {
          await scheduleTask(operation.data.taskId, operation.data.calendarSlotTime);
        }
        break;

      case "schedule-to-date":
        // Project list → Date list: set planned_list_date (soft-link)
        if (operation.data?.taskId && operation.data?.plannedListDate) {
          await scheduleForDate(
            operation.data.taskId,
            operation.data.plannedListDate,
          );
        }
        break;

      case "unschedule":
        // Date list → Project list: clear schedule AND move to new list
        if (operation.data?.taskId && operation.data?.listId) {
          await unscheduleFromDate(operation.data.taskId);
          await moveTask(operation.data.taskId, operation.data.listId);
        }
        break;

      case "reschedule-date":
        // Date list → Different date list: change planned_list_date, clear highlight
        if (operation.data?.taskId && operation.data?.plannedListDate) {
          await scheduleForDate(
            operation.data.taskId,
            operation.data.plannedListDate,
          );
          // Clear highlight when rescheduling to different date
          await updateTask(operation.data.taskId, { is_highlight: false });
        }
        break;

      case "move":
        // Project list → Project list: just move (existing behavior)
        if (operation.data?.taskId && operation.data?.listId) {
          await moveTask(operation.data.taskId, operation.data.listId);
        }
        break;

      case "none":
      default:
        break;
    }
  };

  return { handleDragEnd };
}
