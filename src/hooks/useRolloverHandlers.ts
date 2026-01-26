"use client";

import { useTaskStore, useListStore } from "@/state";
import { getLocalTodayISO, getLocalTomorrowISO } from "@/lib/dateUtils";

export function useRolloverHandlers() {
  const { tasks, moveTask, createInboxTask } = useTaskStore();
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
      const targetList = await ensureDateList(targetDate);
      const tasksToMove = tasks.filter(
        (t) => t.list_id === fromListId && !t.completed_at,
      );

      for (const task of tasksToMove) {
        await moveTask(task.id, targetList.id);
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
