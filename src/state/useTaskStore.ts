import { create } from 'zustand'
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
  scheduleTask as apiScheduleTask,
  unscheduleTask as apiUnscheduleTask,
  createParkedThought as apiCreateParkedThought,
  toggleHighlight as apiToggleHighlight,
} from '@/api'
import type { Task } from '@/types/app'

interface TaskStore {
  tasks: Task[]
  completedTasks: Task[]
  loading: boolean
  error: string | null
  
  // Actions
  loadTasks: () => Promise<void>
  loadCompletedTasks: (limit?: number, offset?: number) => Promise<void>
  createTask: (listId: string, title: string) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  clearTasksInList: (listId: string) => Promise<number>
  completeTask: (taskId: string) => Promise<void>
  uncompleteTask: (taskId: string) => Promise<void>
  moveTask: (taskId: string, newListId: string) => Promise<void>
  scheduleTask: (taskId: string, scheduledAt: string) => Promise<void>
  unscheduleTask: (taskId: string) => Promise<void>
  createParkedThought: (title: string) => Promise<void>
  toggleHighlight: (taskId: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  completedTasks: [],
  loading: true,
  error: null,
  
  loadTasks: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await getTasks()
      set({ tasks: tasks || [], loading: false })
    } catch (error) {
      console.error('Failed to load tasks:', error)
      set({ loading: false, error: (error as Error).message })
      throw error
    }
  },
  
  loadCompletedTasks: async (limit = 50, offset = 0) => {
    try {
      const completedTasks = await getCompletedTasks(limit, offset)
      set({ completedTasks })
    } catch (error) {
      console.error('Failed to load completed tasks:', error)
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  createTask: async (listId, title) => {
    const newTask = await apiCreateTask(listId, title)
    set({ tasks: [...get().tasks, newTask] })
  },
  
  updateTask: async (taskId, updates) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      )
    }))
    
    try {
      await apiUpdateTask(taskId, updates)
    } catch (error) {
      // Reload on error to get correct state
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  deleteTask: async (taskId) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== taskId)
    }))
    
    try {
      await apiDeleteTask(taskId)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },

  clearTasksInList: async (listId) => {
    const count = await apiClearTasksInList(listId)
    
    // Remove these tasks from local state
    set({
      tasks: get().tasks.filter(t => t.list_id !== listId)
    })
    
    return count
  },
  
  completeTask: async (taskId) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return

    // Optimistic update - update fields, DON'T remove the task
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              previous_list_id: t.list_id,
              completed_at: new Date().toISOString(),
            }
          : t
      )
    }))

    try {
      await apiCompleteTask(taskId)
      // Reload to get correct list_id from server
      await get().loadTasks()
    } catch (error) {
      // Reload to revert on error
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
  
  uncompleteTask: async (taskId) => {
    try {
      await apiUncompleteTask(taskId)
      // Reload to get the task back in the incomplete list
      await get().loadTasks()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  moveTask: async (taskId, newListId) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, list_id: newListId } : t
      )
    }))
    
    try {
      await apiMoveTask(taskId, newListId)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },

  scheduleTask: async (taskId, scheduledAt) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, scheduled_at: scheduledAt } : t
      )
    }))
    
    try {
      await apiScheduleTask(taskId, scheduledAt)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },

  unscheduleTask: async (taskId) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, scheduled_at: null } : t
      )
    }))
    
    try {
      await apiUnscheduleTask(taskId)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },

  
  createParkedThought: async (title) => {
    const newTask = await apiCreateParkedThought(title)
    set({ tasks: [...get().tasks, newTask] })
  },

  toggleHighlight: async (taskId) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return

    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, is_highlight: !t.is_highlight } : t
      )
    }))

    try {
      await apiToggleHighlight(taskId)
    } catch (error) {
      await get().loadTasks()
      throw error
    }
  },
}))