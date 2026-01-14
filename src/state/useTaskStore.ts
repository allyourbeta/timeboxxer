import { create } from 'zustand'
import { getTasks, createTask as apiCreateTask, updateTask as apiUpdateTask, deleteTask as apiDeleteTask, completeTask as apiCompleteTask, uncompleteTask as apiUncompleteTask } from '@/api'

interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  completed_at: string | null
  // Purgatory fields
  moved_to_purgatory_at: string | null
  original_list_id: string | null
  original_list_name: string | null
  // Daily task fields
  is_daily: boolean
  daily_source_id: string | null
}

interface TaskStore {
  tasks: Task[]
  loading: boolean
  
  // Actions
  loadTasks: () => Promise<void>
  createTask: (listId: string, title: string) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  uncompleteTask: (taskId: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: true,
  
  loadTasks: async () => {
    const data = await getTasks()
    set({ tasks: data || [], loading: false })
  },
  
  createTask: async (listId, title) => {
    const newTask = await apiCreateTask(listId, title)
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
          ? { ...t, is_completed: true, completed_at: new Date().toISOString() }
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
}))