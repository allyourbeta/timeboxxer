"use client";

import { useState } from "react";
import { useTaskStore } from "@/state";
import { DURATION_OPTIONS } from "@/lib/constants";

interface DiscardConfirm {
  taskId: string;
  taskTitle: string;
}

export function useTaskHandlers() {
  const {
    createTask,
    createTaskOnDate,
    updateTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    toggleHighlight,
    tasks,
  } = useTaskStore();

  const [discardConfirm, setDiscardConfirm] = useState<DiscardConfirm | null>(
    null,
  );

  const handleTaskAdd = async (
    listId: string,
    title: string,
    date?: string,
  ) => {
    try {
      if (date) {
        // Creating on a date list - use soft-link (task lives in Inbox, scheduled for date)
        await createTaskOnDate(title, date);
      } else {
        // Creating on a project list - normal creation
        await createTask(listId, title);
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleTaskDiscardClick = (taskId: string, taskTitle: string) => {
    setDiscardConfirm({ taskId, taskTitle });
  };

  const handleTaskDiscardConfirm = async () => {
    if (!discardConfirm) return;
    try {
      await deleteTask(discardConfirm.taskId);
      setDiscardConfirm(null);
    } catch (error) {
      console.error("Failed to discard task:", error);
    }
  };

  const handleTaskDiscardCancel = () => {
    setDiscardConfirm(null);
  };

  const handleTaskDurationClick = async (
    taskId: string,
    currentDuration: number,
    reverse: boolean,
  ) => {
    const durations = [...DURATION_OPTIONS] as number[];
    const currentIndex = durations.indexOf(currentDuration);
    let newIndex: number;

    if (reverse) {
      newIndex = currentIndex <= 0 ? durations.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= durations.length - 1 ? 0 : currentIndex + 1;
    }

    try {
      await updateTask(taskId, { duration_minutes: durations[newIndex] });
    } catch (error) {
      console.error("Failed to update duration:", error);
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      await completeTask(taskId);
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const handleTaskUncomplete = async (taskId: string) => {
    try {
      await uncompleteTask(taskId);
    } catch (error) {
      console.error("Failed to restore task:", error);
    }
  };

  const handleTaskEnergyChange = async (
    taskId: string,
    level: "high" | "medium" | "low",
  ) => {
    try {
      await updateTask(taskId, { energy_level: level });
    } catch (error) {
      console.error("Failed to update energy:", error);
    }
  };

  const handleHighlightToggle = async (
    taskId: string,
    plannedListDate: string | null,
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Only allow highlighting on date lists (tasks with planned_list_date)
    if (!plannedListDate) return;

    // Check 5-limit before toggling ON
    if (!task.is_highlight) {
      // Count highlights by planned_list_date (not list_id)
      const freshTasks = useTaskStore.getState().tasks;
      const highlightedCount = freshTasks.filter(
        (t) =>
          t.planned_list_date === plannedListDate &&
          t.is_highlight &&
          !t.completed_at,
      ).length;

      if (highlightedCount >= 5) {
        // Already at limit, do nothing
        return;
      }
    }

    try {
      await toggleHighlight(taskId);
    } catch (error) {
      console.error("Failed to toggle highlight:", error);
    }
  };

  return {
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDurationClick,
    handleTaskComplete,
    handleTaskUncomplete,
    handleTaskEnergyChange,
    handleHighlightToggle,
    discardConfirm,
    handleTaskDiscardClick,
    handleTaskDiscardConfirm,
    handleTaskDiscardCancel,
  };
}
