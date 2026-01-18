import { create } from 'zustand'
import { 
  getTasks, 
  createTask as apiCreateTask, 
  updateTask as apiUpdateTask, 
  deleteTask as apiDeleteTask, 
  completeTask as apiCompleteTask, 
  uncompleteTask as apiUncompleteTask,
  moveToPurgatory as apiMoveToPurgatory,
  moveFromPurgatory as apiMoveFromPurgatory,
  createCalendarTask as apiCreateCalendarTask,
  spawnDailyTasks,
  createParkedThought as apiCreateParkedThought,
  reorderTasks as apiReorderTasks,
} from '@/api'

interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  position: number
  is_completed: boolean
  completed_at: string | null
  // Limbo fields
  moved_to_purgatory_at: string | null
  original_list_id: string | null
  original_list_name: string | null
  // Daily task fields
  is_daily: boolean
  daily_source_id: string | null
  // Energy and highlight (NEW)
  energy_level: 'high' | 'medium' | 'low'
  is_daily_highlight: boolean
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
  moveToPurgatory: (taskId: string, originalListId: string, originalListName: string) => Promise<void>
  moveFromPurgatory: (taskId: string, newListId: string) => Promise<void>
  spawnDailyTasksForToday: (todayListId: string) => Promise<void>
  createParkedThought: (title: string) => Promise<void>
  createCalendarTask: (title: string, time: string, date: string) => Promise<void>
  reorderTasks: (taskIds: string[]) => Promise<void>
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

  moveToPurgatory: async (taskId, originalListId, originalListName) => {
    const updatedTask = await apiMoveToPurgatory(taskId, originalListId, originalListName)
    set({
      tasks: get().tasks.map(t => t.id === taskId ? updatedTask : t)
    })
  },

  moveFromPurgatory: async (taskId, newListId) => {
    const updatedTask = await apiMoveFromPurgatory(taskId, newListId)
    set({
      tasks: get().tasks.map(t => t.id === taskId ? updatedTask : t)
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

  createCalendarTask: async (title, time, date) => {
    await apiCreateCalendarTask(title, time, date)
    // Reload tasks to get the newly created task
    await get().loadTasks()
  },

  reorderTasks: async (taskIds: string[]) => {
    // Get current tasks
    const currentTasks = get().tasks
    
    // Create new array with updated positions
    const updatedTasks = currentTasks.map(task => {
      const newPosition = taskIds.indexOf(task.id)
      if (newPosition !== -1) {
        return { ...task, position: newPosition }
      }
      return task
    })
    
    // Sort by position
    updatedTasks.sort((a, b) => a.position - b.position)
    
    // Update state immediately (optimistic)
    set({ tasks: updatedTasks })
    
    // Persist to database
    await apiReorderTasks(taskIds)
  },
}))