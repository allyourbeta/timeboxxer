'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

interface ScheduledTaskInfo {
  taskId: string
  title: string
  durationMinutes: number
  colorIndex: number
  isStart: boolean
}

interface DayViewProps {
  tasks: Task[]
  scheduled: ScheduledTask[]
  paletteId: string
  onDrop: (time: string) => void
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
  onDragStart: (taskId: string) => void
  onDurationChange: (taskId: string, newDuration: number) => void
}

// Time slot constants
const SLOT_HEIGHT = 48 // h-12 = 3rem = 48px
const START_HOUR = 6
const END_HOUR = 22
const MINUTES_PER_SLOT = 15

function generateTimeSlots() {
  const slots = []
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += MINUTES_PER_SLOT) {
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
  onDurationChange,
}: DayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const slotsContainerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null)

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

  const getScheduledTasksAtTime = (time: string): ScheduledTaskInfo[] => {
    const matches = scheduled.filter(s => {
      const taskStartTime = s.start_time.substring(0, 5) // "HH:MM"
      const task = tasks.find(t => t.id === s.task_id)
      if (!task) return false
      
      // Check if this time slot falls within the task's duration
      const [taskHour, taskMin] = taskStartTime.split(':').map(Number)
      const [slotHour, slotMin] = time.split(':').map(Number)
      
      const taskStartMinutes = taskHour * 60 + taskMin
      const taskEndMinutes = taskStartMinutes + task.duration_minutes
      const slotMinutes = slotHour * 60 + slotMin
      
      return slotMinutes >= taskStartMinutes && slotMinutes < taskEndMinutes
    })
    
    return matches.slice(0, 3).map(schedule => {
      const task = tasks.find(t => t.id === schedule.task_id)!
      const isStart = schedule.start_time.startsWith(time)
      return {
        taskId: task.id,
        title: task.title,
        durationMinutes: task.duration_minutes,
        colorIndex: task.color_index,
        isStart, // Only render full block if this is the start time
      }
    })
  }
  
  const getTaskHeight = (duration: number) => {
    const slots = duration / 15
    return slots * 48 - 4
  }

  // Calculate which time slot based on Y position
  const getTimeSlotFromY = useCallback((clientY: number): string | null => {
    if (!slotsContainerRef.current) return null
    
    const rect = slotsContainerRef.current.getBoundingClientRect()
    const relativeY = clientY - rect.top + slotsContainerRef.current.scrollTop
    
    // Calculate slot index
    // Round to nearest slot (not floor) for better snapping
    const slotIndex = Math.round(relativeY / SLOT_HEIGHT)
    
    // Clamp to valid range
    if (slotIndex < 0 || slotIndex >= TIME_SLOTS.length) return null
    
    return TIME_SLOTS[slotIndex]
  }, [])

  // Handle drop on the entire calendar area
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    if (!slotsContainerRef.current) return
    
    const rect = slotsContainerRef.current.getBoundingClientRect()
    const scrollTop = slotsContainerRef.current.scrollTop
    
    // Get the dragged element's bounding rect
    // The drop event gives us the mouse position, but we need to calculate
    // where the TOP of the task should snap to
    
    // Method: Use the mouse Y, but snap to the nearest slot boundary
    const mouseY = e.clientY - rect.top + scrollTop
    
    // Calculate which slot index this corresponds to
    // Round to nearest slot (not floor) for better snapping
    const slotIndex = Math.round(mouseY / SLOT_HEIGHT)
    
    // Clamp to valid range
    const clampedIndex = Math.max(0, Math.min(TIME_SLOTS.length - 1, slotIndex))
    
    const targetTime = TIME_SLOTS[clampedIndex]
    if (targetTime) {
      onDrop(targetTime)
    }
    
    setDragOverSlot(null)
  }, [onDrop])

  // Update drag over to show which slot will receive the drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    
    if (!slotsContainerRef.current) return
    
    const rect = slotsContainerRef.current.getBoundingClientRect()
    const scrollTop = slotsContainerRef.current.scrollTop
    const mouseY = e.clientY - rect.top + scrollTop
    
    // Same calculation as drop - round to nearest slot
    const slotIndex = Math.round(mouseY / SLOT_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(TIME_SLOTS.length - 1, slotIndex))
    
    setDragOverSlot(TIME_SLOTS[clampedIndex])
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null)
  }, [])
  
  const currentTimePosition = getCurrentTimePosition()
  
  return (
    <div className="flex-1 overflow-hidden flex flex-col" ref={containerRef}>
      <div className="flex gap-2 p-4 border-b border-[var(--border-color)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Today</h2>
      </div>
      
      {/* Scrollable slots container with unified drag handling */}
      <div 
        ref={slotsContainerRef}
        className="flex-1 overflow-y-auto"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        <div className="relative">
          {TIME_SLOTS.map((time) => {
            const scheduledTasks = getScheduledTasksAtTime(time)
            const isDropTarget = dragOverSlot === time
            
            return (
              <TimeSlot
                key={time}
                time={time}
                isHour={time.endsWith(':00')}
                isHalfHour={time.endsWith(':30')}
                scheduledTasks={scheduledTasks}
                paletteId={paletteId}
                isDropTarget={isDropTarget}
                onUnschedule={(taskId) => onUnschedule(taskId)}
                onComplete={(taskId) => onComplete(taskId)}
                onDragStart={(taskId) => onDragStart(taskId)}
                onDurationChange={(taskId, newDuration) => onDurationChange(taskId, newDuration)}
              />
            )
          })}
          
          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div 
              className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="w-24 flex justify-end pr-2">
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  NOW
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}