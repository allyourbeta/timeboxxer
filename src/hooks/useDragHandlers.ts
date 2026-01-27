"use client";

import { useTaskStore, useListStore } from "@/state";
import { processDragEnd } from "@/services";
import type { DropResult } from "@hello-pangea/dnd";

export function useDragHandlers() {
  const {
    tasks,
    scheduleTask,
    moveTask,
    moveTaskWithPosition,
    scheduleForDate,
    unscheduleFromDate,
    updateTask,
    reorderTask,
  } = useTaskStore();
  const { lists, reorderList } = useListStore();

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    if (!destination) return;

    // Check if this is a list drag (droppableId starts with "list-column-")
    if (source.droppableId.startsWith("list-column-")) {
      const sourceColumn = source.droppableId === "list-column-0" ? 0 : 1;
      const destColumn = destination.droppableId === "list-column-0" ? 0 : 1;
      
      // Filter out completed lists
      const visibleLists = lists.filter((l) => l.list_type !== "completed");
      
      // Get lists for the destination column
      const destColumnLists = visibleLists
        .filter((l) => (l.panel_column ?? 0) === destColumn)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      
      // If same column, remove from current position first
      const updatedDestLists = [...destColumnLists];
      if (sourceColumn === destColumn) {
        const sourceIndex = updatedDestLists.findIndex(l => l.id === draggableId);
        if (sourceIndex !== -1) {
          updatedDestLists.splice(sourceIndex, 1);
        }
      }
      
      // Insert at new position
      const movedList = visibleLists.find(l => l.id === draggableId);
      if (movedList) {
        updatedDestLists.splice(destination.index, 0, movedList);
      }
      
      // Get ordered IDs for the destination column
      const orderedListIds = updatedDestLists.map(l => l.id);
      
      // Call reorder
      await reorderList(draggableId, destColumn as 0 | 1, orderedListIds);
      return;
    }

    // Otherwise, it's a task drag - use existing logic
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
        // Date list → Project list: move to new list (clears scheduled date automatically)
        if (operation.data?.taskId && operation.data?.listId) {
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
        // Project list → Project list: move and set position
        if (operation.data?.taskId && operation.data?.listId) {
          if (operation.data.orderedTaskIds) {
            await moveTaskWithPosition(
              operation.data.taskId,
              operation.data.listId,
              operation.data.orderedTaskIds
            );
          } else {
            // Fallback to simple move (no position)
            await moveTask(operation.data.taskId, operation.data.listId);
          }
        }
        break;

      case "none":
      default:
        break;
    }
  };

  return { handleDragEnd };
}
