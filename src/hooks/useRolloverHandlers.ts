"use client";

import { useTaskStore, useListStore } from "@/state";
import { getLocalTodayISO, getLocalTomorrowISO } from "@/lib/dateUtils";

export function useRolloverHandlers() {
  const { tasks, scheduleForDate, createInboxTask } = useTaskStore();
  const { lists, ensureDateList } = useListStore();

  const handleRollOverTasks = async (
    fromListId: string,
    destination: "today" | "tomorrow" = "tomorrow",
  ) => {
    const fromList = lists.find((l) => l.id === fromListId);
    if (!fromList?.list_date) return;

    const targetDate =
      destination === "today" ? getLocalTodayISO() : getLocalTomorrowISO();

    try {
      // Ensure target date list exists (but we don't need its ID)
      await ensureDateList(targetDate);
      
      // Find tasks by planned_list_date (not list_id) since they're "visiting" this date
      const tasksToMove = tasks.filter(
        (t) => t.planned_list_date === fromList.list_date && !t.completed_at,
      );

      for (const task of tasksToMove) {
        await scheduleForDate(task.id, targetDate);
      }
    } catch (error) {
      console.error("Roll over failed:", error);
    }
  };

  const handleQuickSave = async (title: string) => {
    try {
      await createInboxTask(title);
    } catch (error) {
      console.error("Failed to save to inbox:", error);
    }
  };

  return { handleRollOverTasks, handleQuickSave };
}
