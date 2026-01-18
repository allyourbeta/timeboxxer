import { create } from 'zustand'
import { 
  getTasks, 
  createTask as apiCreateTask, 
  updateTask as apiUpdateTask, 
  deleteTask as apiDeleteTask, 
  completeTask as apiCompleteTask, 
  uncompleteTask as apiUncompleteTask,
  commitTaskToDate as apiCommitTaskToDate,
  uncommitTask as apiUncommitTask,
  scheduleTask as apiScheduleTask,
  unscheduleTask as apiUnscheduleTask,
  spawnDailyTasks,
  createParkedThought as apiCreateParkedThought,
  reorderTasks as apiReorderTasks,
} from '@/api'

import { Task } from '@/types/app'

interface TaskStore {
  tasks: Task[]
  loading: boolean
  
  // Actions
  loadTasks: () => Promise<void>
  createTask: (homeListId: string, title: string) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  uncompleteTask: (taskId: string) => Promise<void>
  commitTaskToDate: (taskId: string, date: string) => Promise<void>
  uncommitTask: (taskId: string) => Promise<void>
  scheduleTask: (taskId: string, scheduledAt: string) => Promise<void>
  unscheduleTask: (taskId: string) => Promise<void>
  spawnDailyTasksForToday: (todayListId: string) => Promise<void>
  createParkedThought: (title: string) => Promise<void>
  reorderTasks: (taskIds: string[]) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: true,
  
  loadTasks: async () => {
    const data = await getTasks()
    set({ tasks: data || [], loading: false })
  },
  
  createTask: async (homeListId, title) => {
    const newTask = await apiCreateTask(homeListId, title)
    set({ tasks: [...get().tasks, newTask] })
  },
  
  updateTask: async (taskId, updates) => {
    await apiUpdateTask(taskId, updates)
    set({
      tasks: get().tasks.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      )
    })
  },
  
  deleteTask: async (taskId) => {
    await apiDeleteTask(taskId)
    set({ tasks: get().tasks.filter(t => t.id !== taskId) })
  },
  
  completeTask: async (taskId) => {
    await apiCompleteTask(taskId)
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId 
          ? { ...t, is_completed: true, completed_at: new Date().toISOString(), scheduled_at: null }
          : t
      )
    })
  },
  
  uncompleteTask: async (taskId) => {
    await apiUncompleteTask(taskId)
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId ? { ...t, is_completed: false, completed_at: null } : t
      )
    })
  },

  commitTaskToDate: async (taskId, date) => {
    await apiCommitTaskToDate(taskId, date)
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId ? { ...t, committed_date: date } : t
      )
    })
  },

  uncommitTask: async (taskId) => {
    await apiUncommitTask(taskId)
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId ? { ...t, committed_date: null } : t
      )
    })
  },

  scheduleTask: async (taskId, scheduledAt) => {
    await apiScheduleTask(taskId, scheduledAt)
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId ? { ...t, scheduled_at: scheduledAt } : t
      )
    })
  },

  unscheduleTask: async (taskId) => {
    await apiUnscheduleTask(taskId)
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId ? { ...t, scheduled_at: null } : t
      )
    })
  },

  spawnDailyTasksForToday: async (todayListId) => {
    const count = await spawnDailyTasks(todayListId)
    if (count > 0) {
      // Reload tasks to get the newly spawned ones
      await get().loadTasks()
    }
  },
  
  createParkedThought: async (title) => {
    const newTask = await apiCreateParkedThought(title)
    set({ tasks: [...get().tasks, newTask] })
  },


  reorderTasks: async (taskIds: string[]) => {
    // Update state optimistically
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
    
    // Persist to database using RPC
    await apiReorderTasks(taskIds)
  },
}))