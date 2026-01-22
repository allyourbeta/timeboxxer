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
  commitTaskToDate as apiCommitTaskToDate,
  uncommitTask as apiUncommitTask,
  scheduleTask as apiScheduleTask,
  unscheduleTask as apiUnscheduleTask,
  setTaskHighlight as apiSetTaskHighlight,
  spawnDailyTasks as apiSpawnDailyTasks,
  createParkedThought as apiCreateParkedThought,
  reorderTasks as apiReorderTasks,
  rollOverTasks as apiRollOverTasks,
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
  createTask: (homeListId: string, title: string) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  clearTasksInList: (listId: string) => Promise<number>
  completeTask: (taskId: string) => Promise<void>
  uncompleteTask: (taskId: string) => Promise<void>
  commitTaskToDate: (taskId: string, date: string) => Promise<void>
  uncommitTask: (taskId: string) => Promise<void>
  scheduleTask: (taskId: string, scheduledAt: string) => Promise<void>
  unscheduleTask: (taskId: string) => Promise<void>
  setTaskHighlight: (taskId: string, date: string | null) => Promise<void>
  spawnDailyTasksForDate: (date: string) => Promise<void>
  createParkedThought: (title: string) => Promise<void>
  reorderTasks: (taskIds: string[]) => Promise<void>
  rollOverTasks: (fromDate: string, toDate: string) => Promise<number>
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
  
  createTask: async (homeListId, title) => {
    const newTask = await apiCreateTask(homeListId, title)
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
      tasks: get().tasks.filter(t => t.home_list_id !== listId)
    })
    
    return count
  },
  
  completeTask: async (taskId) => {
    // Optimistic update - remove from tasks
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== taskId)
    }))
    
    try {
      await apiCompleteTask(taskId)
    } catch (error) {
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

  commitTaskToDate: async (taskId, date) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, committed_date: date } : t
      )
    }))
    
    try {
      await apiCommitTaskToDate(taskId, date)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },

  uncommitTask: async (taskId) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, committed_date: null } : t
      )
    }))
    
    try {
      await apiUncommitTask(taskId)
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

  setTaskHighlight: async (taskId, date) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, highlight_date: date } : t
      )
    }))
    
    try {
      await apiSetTaskHighlight(taskId, date)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },

  spawnDailyTasksForDate: async (date) => {
    const count = await apiSpawnDailyTasks(date)
    if (count > 0) {
      await get().loadTasks()
    }
  },
  
  createParkedThought: async (title) => {
    const newTask = await apiCreateParkedThought(title)
    set({ tasks: [...get().tasks, newTask] })
  },


  reorderTasks: async (taskIds: string[]) => {
    // Optimistic update
    const currentTasks = get().tasks
    const updatedTasks = currentTasks.map(task => {
      const newPosition = taskIds.indexOf(task.id)
      if (newPosition !== -1) {
        return { ...task, position: newPosition }
      }
      return task
    })
    
    updatedTasks.sort((a, b) => a.position - b.position)
    set({ tasks: updatedTasks })
    
    try {
      await apiReorderTasks(taskIds)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },

  rollOverTasks: async (fromDate, toDate) => {
    // Optimistic update
    set(state => ({
      tasks: state.tasks.map(t =>
        t.committed_date === fromDate && !t.is_completed
          ? { ...t, committed_date: toDate }
          : t
      )
    }))
    
    try {
      return await apiRollOverTasks(fromDate, toDate)
    } catch (error) {
      await get().loadTasks()
      set({ error: (error as Error).message })
      throw error
    }
  },
}))