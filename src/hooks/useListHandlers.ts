"use client";

import { useState } from "react";
import { useTaskStore, useListStore, useUIStore } from "@/state";

interface PendingDelete {
  listId: string;
  listName: string;
  originalTasks: Array<{ id: string; originalListId: string }>;
  timeoutId: NodeJS.Timeout;
}

interface ClearListConfirm {
  listId: string;
  listName: string;
  taskCount: number;
  listDate?: string; // For date lists
}

export function useListHandlers() {
  const { tasks, moveTask, clearTasksInList } = useTaskStore();
  const { lists, createList, deleteList, updateList } = useListStore();
  const { setEditingListId, setShowNewListInput } = useUIStore();

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [clearListConfirm, setClearListConfirm] =
    useState<ClearListConfirm | null>(null);

  const handleListCreate = async (name: string) => {
    try {
      await createList(name);
      setShowNewListInput(false);
    } catch (error) {
      console.error("Failed to create list:", error);
    }
  };

  const handleListEdit = async (listId: string, newName: string) => {
    try {
      await updateList(listId, newName);
      setEditingListId(null);
    } catch (error) {
      console.error("Failed to rename list:", error);
    }
  };

  const handleClearListClick = (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;

    let taskCount: number;
    let listDate: string | undefined;

    if (list.list_type === "date" && list.list_date) {
      // Date list: count by planned_list_date
      taskCount = tasks.filter(
        (t) => t.planned_list_date === list.list_date && !t.completed_at
      ).length;
      listDate = list.list_date;
    } else {
      // Regular list: count by list_id
      taskCount = tasks.filter(
        (t) => t.list_id === listId && !t.completed_at
      ).length;
    }

    if (taskCount === 0) return;

    setClearListConfirm({ listId, listName: list.name, taskCount, listDate });
  };

  const handleClearListConfirm = async () => {
    if (!clearListConfirm) return;
    try {
      await clearTasksInList(clearListConfirm.listId, clearListConfirm.listDate);
      setClearListConfirm(null);
    } catch (error) {
      console.error("Failed to clear list:", error);
    }
  };

  const handleClearListCancel = () => {
    setClearListConfirm(null);
  };

  const handleDeleteListClick = async (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;

    if (list.list_type === "inbox" || list.list_type === "completed") return;

    if (list.list_type === "date") {
      const listDate = new Date(list.list_date!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      listDate.setHours(0, 0, 0, 0);
      if (listDate >= today) return;
    }

    const taskCount = tasks.filter(
      (t) => t.list_id === listId && !t.completed_at,
    ).length;
    if (taskCount > 0) {
      console.warn("Cannot delete non-empty list. Clear it first.");
      return;
    }

    try {
      await deleteList(listId);
    } catch (error) {
      console.error("Failed to delete list:", error);
    }
  };

  const handleUndoDelete = async () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);

    try {
      for (const task of pendingDelete.originalTasks) {
        await moveTask(task.id, task.originalListId);
      }
      setPendingDelete(null);
    } catch (error) {
      console.error("Failed to undo delete:", error);
    }
  };

  return {
    pendingDelete,
    setPendingDelete,
    handleListCreate,
    handleListEdit,
    handleDeleteListClick,
    handleUndoDelete,
    clearListConfirm,
    handleClearListClick,
    handleClearListConfirm,
    handleClearListCancel,
  };
}
