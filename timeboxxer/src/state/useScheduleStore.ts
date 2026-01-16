import { create } from 'zustand'
import { getScheduledTasks, scheduleTask as apiScheduleTask, unscheduleTask as apiUnscheduleTask, updateScheduleTime as apiUpdateScheduleTime } from '@/api'

interface ScheduledTask {
  id: string
  task_id: string
  scheduled_date: string
  start_time: string
}

interface ScheduleStore {
  scheduled: ScheduledTask[]
  loading: boolean
  
  loadSchedule: () => Promise<void>
  scheduleTask: (taskId: string, date: string, time: string) => Promise<void>
  unscheduleTask: (taskId: string) => Promise<void>
  updateTime: (scheduleId: string, time: string) => Promise<void>
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  scheduled: [],
  loading: true,
  
  loadSchedule: async () => {
    const data = await getScheduledTasks()
    set({ scheduled: data || [], loading: false })
  },
  
  scheduleTask: async (taskId, date, time) => {
    const newSchedule = await apiScheduleTask(taskId, date, time)
    // Remove any existing schedule for this task, add new one
    set({
      scheduled: [
        ...get().scheduled.filter(s => s.task_id !== taskId),
        newSchedule
      ]
    })
  },
  
  unscheduleTask: async (taskId) => {
    await apiUnscheduleTask(taskId)
    set({ scheduled: get().scheduled.filter(s => s.task_id !== taskId) })
  },
  
  updateTime: async (scheduleId, time) => {
    await apiUpdateScheduleTime(scheduleId, time)
    set({
      scheduled: get().scheduled.map(s =>
        s.id === scheduleId ? { ...s, start_time: time } : s
      )
    })
  },
}))