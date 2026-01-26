import { create } from "zustand";
import {
  getTasks,
  getCompletedTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  clearTasksInList as apiClearTasksInList,
  completeTask as apiCompleteTask,
  uncompleteTask as apiUncompleteTask,
  moveTask as apiMoveTask,
  moveTaskWithPosition as apiMoveTaskWithPosition,
  scheduleTask as apiScheduleTask,
  unscheduleTask as apiUnscheduleTask,
  createInboxTask as apiCreateInboxTask,
  toggleHighlight as apiToggleHighlight,
  scheduleTaskForDate as apiScheduleTaskForDate,
  unscheduleTaskFromDate as apiUnscheduleTaskFromDate,
  createTaskOnDate as apiCreateTaskOnDate,
  reorderTask as apiReorderTask,
} from "@/api";
import type { Task } from "@/types/app";

interface TaskStore {
  tasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  error: string | null;

  // Actions
  loadTasks: () => Promise<void>;
  loadCompletedTasks: (limit?: number, offset?: number) => Promise<void>;
  createTask: (listId: string, title: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  clearTasksInList: (listId: string, listDate?: string) => Promise<number>;
  completeTask: (taskId: string) => Promise<void>;
  uncompleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newListId: string) => Promise<void>;
  moveTaskWithPosition: (taskId: string, newListId: string, orderedTaskIds: string[]) => Promise<void>;
  scheduleTask: (taskId: string, calendarSlotTime: string) => Promise<void>;
  unscheduleTask: (taskId: string) => Promise<void>;
  createInboxTask: (title: string) => Promise<void>;
  toggleHighlight: (taskId: string) => Promise<void>;
  scheduleForDate: (taskId: string, date: string) => Promise<void>;
  unscheduleFromDate: (taskId: string) => Promise<void>;
  createTaskOnDate: (title: string, date: string) => Promise<void>;
  reorderTask: (taskId: string, orderedTaskIds: string[]) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  completedTasks: [],
  loading: true,
  error: null,

  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await getTasks();
      set({ tasks: tasks || [], loading: false });
    } catch (error) {
      console.error("Failed to load tasks:", error);
      set({ loading: false, error: (error as Error).message });
      throw error;
    }
  },

  loadCompletedTasks: async (limit = 50, offset = 0) => {
    try {
      const completedTasks = await getCompletedTasks(limit, offset);
      set({ completedTasks });
    } catch (error) {
      console.error("Failed to load completed tasks:", error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  createTask: async (listId, title) => {
    const newTask = await apiCreateTask(listId, title);
    set({ tasks: [...get().tasks, newTask] });
  },

  updateTask: async (taskId, updates) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t,
      ),
    }));

    try {
      await apiUpdateTask(taskId, updates);
    } catch (error) {
      // Reload on error to get correct state
      await get().loadTasks();
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteTask: async (taskId) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));

    try {
      await apiDeleteTask(taskId);
    } catch (error) {
      await get().loadTasks();
      set({ error: (error as Error).message });
      throw error;
    }
  },

  clearTasksInList: async (listId, listDate) => {
    const count = await apiClearTasksInList(listId, listDate);

    // Remove these tasks from local state
    set({
      tasks: get().tasks.filter((t) => {
        if (listDate) {
          // Date list: filter by planned_list_date
          return t.planned_list_date !== listDate;
        }
        // Regular list: filter by list_id
        return t.list_id !== listId;
      }),
    });

    return count;
  },

  completeTask: async (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update - update fields, DON'T remove the task
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              previous_list_id: t.list_id,
              completed_at: new Date().toISOString(),
            }
          : t,
      ),
    }));

    try {
      await apiCompleteTask(taskId);
      // Reload to get correct list_id from server
      await get().loadTasks();
    } catch (error) {
      // Reload to revert on error
      await get().loadTasks();
      set({ error: (error as Error).message });
      throw error;
    }
  },

  uncompleteTask: async (taskId) => {
    try {
      await apiUncompleteTask(taskId);
      // Reload to get the task back in the incomplete list
      await get().loadTasks();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  moveTask: async (taskId, newListId) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, list_id: newListId, planned_list_date: null, calendar_slot_time: null } : t,
      ),
    }));

    try {
      await apiMoveTask(taskId, newListId);
    } catch (error) {
      await get().loadTasks();
      set({ error: (error as Error).message });
      throw error;
    }
  },

  moveTaskWithPosition: async (taskId, newListId, orderedTaskIds) => {
    const POSITION_GAP = 1000;
    
    // Optimistic update - move task and update positions
    set((state) => ({
      tasks: state.tasks.map((t) => {
        // Update the moved task's list_id and clear soft-link
        if (t.id === taskId) {
          const newIndex = orderedTaskIds.indexOf(taskId);
          return { 
            ...t, 
            list_id: newListId,
            planned_list_date: null, // Clear soft-link when moving
            calendar_slot_time: null, // Clear schedule when moving
            position: (newIndex + 1) * POSITION_GAP 
          };
        }
        // Update positions for other tasks in destination list
        const index = orderedTaskIds.indexOf(t.id);
        if (index !== -1) {
          return { ...t, position: (index + 1) * POSITION_GAP };
        }
        return t;
      }),
    }));

    try {
      await apiMoveTaskWithPosition(taskId, newListId, orderedTaskIds);
    } catch (error) {
      await get().loadTasks();
      set({ error: (error as Error).message });
      throw error;
    }
  },

  scheduleTask: async (taskId, calendarSlotTime) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, calendar_slot_time: calendarSlotTime } : t,
      ),
    }));

    try {
      await apiScheduleTask(taskId, calendarSlotTime);
    } catch (error) {
      await get().loadTasks();
      set({ error: (error as Error).message });
      throw error;
    }
  },

  unscheduleTask: async (taskId) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, calendar_slot_time: null } : t,
      ),
    }));

    try {
      await apiUnscheduleTask(taskId);
    } catch (error) {
      await get().loadTasks();
      set({ error: (error as Error).message });
      throw error;
    }
  },

  createInboxTask: async (title) => {
    const newTask = await apiCreateInboxTask(title);
    set({ tasks: [...get().tasks, newTask] });
  },

  scheduleForDate: async (taskId, date) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, planned_list_date: date } : t,
      ),
    }));

    try {
      await apiScheduleTaskForDate(taskId, date);
    } catch (error) {
      await get().loadTasks();
      throw error;
    }
  },

  unscheduleFromDate: async (taskId) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, planned_list_date: null, calendar_slot_time: null }
          : t,
      ),
    }));

    try {
      await apiUnscheduleTaskFromDate(taskId);
    } catch (error) {
      await get().loadTasks();
      throw error;
    }
  },

  createTaskOnDate: async (title, date) => {
    const newTask = await apiCreateTaskOnDate(title, date);
    set({ tasks: [...get().tasks, newTask] });
  },

  toggleHighlight: async (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, is_highlight: !t.is_highlight } : t,
      ),
    }));

    try {
      await apiToggleHighlight(taskId);
    } catch (error) {
      await get().loadTasks();
      throw error;
    }
  },

  reorderTask: async (taskId, orderedTaskIds) => {
    const POSITION_GAP = 1000;
    
    // Optimistic update - assign positions based on order
    set((state) => ({
      tasks: state.tasks.map((t) => {
        const index = orderedTaskIds.indexOf(t.id);
        if (index !== -1) {
          return { ...t, position: (index + 1) * POSITION_GAP };
        }
        return t;
      }),
    }));

    try {
      await apiReorderTask(taskId, orderedTaskIds);
    } catch (error) {
      console.error("reorderTask failed:", error);
      await get().loadTasks();
      throw error;
    }
  },
}));
