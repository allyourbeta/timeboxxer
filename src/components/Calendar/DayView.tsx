'use client'

import { useEffect, useRef, useState } from 'react'
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
  onDragStart: (taskId: string) => void
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
  onDragStart,
}: DayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every 60 seconds

    return () => clearInterval(timer)
  }, [])

  // Auto-scroll to current time on mount
  useEffect(() => {
    const scrollToTime = () => {
      if (!containerRef.current) return

      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // If before 8am, scroll to 8am. Otherwise scroll to current time
      const targetHour = currentHour < 8 ? 8 : currentHour
      const targetMinute = currentHour < 8 ? 0 : Math.floor(currentMinute / 15) * 15

      // Find the index of the target time slot
      const targetTime = `${targetHour.toString().padStart(2, '0')}:${targetMinute.toString().padStart(2, '0')}`
      const targetIndex = TIME_SLOTS.findIndex(slot => slot === targetTime)
      
      if (targetIndex >= 0) {
        // Each slot is 48px (h-12 = 3rem = 48px), scroll to position
        const scrollPosition = targetIndex * 48
        containerRef.current.scrollTop = Math.max(0, scrollPosition - 100) // Offset for some padding
      }
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(scrollToTime, 100)
    return () => clearTimeout(timer)
  }, [])

  const getCurrentTimePosition = () => {
    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    // Only show if within calendar hours (6am - 10pm)
    if (currentHour < 6 || currentHour >= 22) return null

    const totalMinutes = (currentHour - 6) * 60 + currentMinute
    const position = (totalMinutes / 15) * 48 // Each 15-min slot is 48px
    
    return position
  }

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
  
  const currentTimePosition = getCurrentTimePosition()
  
  return (
    <div className="flex-1 overflow-y-auto p-4" ref={containerRef}>
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
              isHalfHour={time.endsWith(':30')}
              scheduledTask={scheduledTask}
              taskHeight={scheduledTask ? getTaskHeight(scheduledTask.durationMinutes) : 0}
              paletteId={paletteId}
              onDrop={() => onDrop(time)}
              onUnschedule={() => scheduledTask && onUnschedule(scheduledTask.taskId)}
              onComplete={() => scheduledTask && onComplete(scheduledTask.taskId)}
              onDragStart={() => scheduledTask && onDragStart(scheduledTask.taskId)}
            />
          )
        })}
        
        {/* Current time indicator */}
        {currentTimePosition !== null && (
          <div 
            className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
            style={{ top: `${currentTimePosition}px` }}
          >
            <div className="w-16 flex justify-end pr-2">
              <span className="bg-red-500 text-white text-xs px-1 rounded">
                NOW
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-red-500" />
          </div>
        )}
      </div>
    </div>
  )
}