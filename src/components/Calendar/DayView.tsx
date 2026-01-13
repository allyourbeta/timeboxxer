'use client'

import { TimeSlot } from './TimeSlot'

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
}

interface ScheduledTask {
  id: string
  task_id: string
  start_time: string
}

interface DayViewProps {
  tasks: Task[]
  scheduled: ScheduledTask[]
  paletteId: string
  onDrop: (time: string) => void
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
}

function generateTimeSlots() {
  const slots = []
  for (let hour = 6; hour < 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function DayView({
  tasks,
  scheduled,
  paletteId,
  onDrop,
  onUnschedule,
  onComplete,
}: DayViewProps) {
  const getScheduledTaskAtTime = (time: string) => {
    const schedule = scheduled.find(s => s.start_time.startsWith(time))
    if (!schedule) return null
    const task = tasks.find(t => t.id === schedule.task_id)
    if (!task) return null
    return {
      taskId: task.id,
      title: task.title,
      durationMinutes: task.duration_minutes,
      colorIndex: task.color_index,
    }
  }
  
  const getTaskHeight = (duration: number) => {
    const slots = duration / 15
    return slots * 48 - 4
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex gap-2 mb-4">
        <h2 className="text-lg font-semibold">Today</h2>
      </div>
      
      <div className="relative">
        {TIME_SLOTS.map((time) => {
          const scheduledTask = getScheduledTaskAtTime(time)
          
          return (
            <TimeSlot
              key={time}
              time={time}
              isHour={time.endsWith(':00')}
              scheduledTask={scheduledTask}
              taskHeight={scheduledTask ? getTaskHeight(scheduledTask.durationMinutes) : 0}
              paletteId={paletteId}
              onDrop={() => onDrop(time)}
              onUnschedule={() => scheduledTask && onUnschedule(scheduledTask.taskId)}
              onComplete={() => scheduledTask && onComplete(scheduledTask.taskId)}
            />
          )
        })}
      </div>
    </div>
  )
}