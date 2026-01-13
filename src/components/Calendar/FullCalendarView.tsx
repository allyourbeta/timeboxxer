'use client'

import { useCallback, useEffect, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventInput, EventApi, DateSelectArg, EventDropArg } from '@fullcalendar/core'

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

interface FullCalendarViewProps {
  tasks: Task[]
  scheduled: ScheduledTask[]
  paletteId: string
  onExternalDrop: (taskId: string, time: string) => void  // CHANGED
  onEventMove: (taskId: string, time: string) => void     // NEW - for moving existing events
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
  onDurationChange: (taskId: string, newDuration: number) => void
}

// Color palettes - same as original
const COLOR_PALETTES = {
  sunset: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'],
  forest: ['#27ae60', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c', '#34495e'],
  ocean: ['#3742fa', '#2f3542', '#ff3838', '#ff6348', '#ffdd59', '#c44569', '#f8b500', '#40739e'],
  pastel: ['#fd79a8', '#fdcb6e', '#6c5ce7', '#a29bfe', '#ffeaa7', '#fab1a0', '#00b894', '#0984e3']
} as const

export function FullCalendarView({
  tasks,
  scheduled,
  paletteId,
  onExternalDrop,
  onEventMove,
  onUnschedule,
  onComplete,
  onDurationChange,
}: FullCalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  
  // Convert scheduled tasks to FullCalendar events
  const events: EventInput[] = scheduled.map(scheduledTask => {
    const task = tasks.find(t => t.id === scheduledTask.task_id)
    if (!task) return null
    
    const startTime = scheduledTask.start_time
    const [hours, minutes] = startTime.split(':').map(Number)
    const start = new Date()
    start.setHours(hours, minutes, 0, 0)
    
    const end = new Date(start)
    end.setMinutes(start.getMinutes() + task.duration_minutes)
    
    const colors = COLOR_PALETTES[paletteId as keyof typeof COLOR_PALETTES] || COLOR_PALETTES.sunset
    const backgroundColor = colors[task.color_index] || colors[0]
    
    return {
      id: scheduledTask.id,
      title: task.title,
      start,
      end,
      backgroundColor,
      borderColor: backgroundColor,
      textColor: '#ffffff',
      extendedProps: {
        taskId: task.id,
        durationMinutes: task.duration_minutes,
        colorIndex: task.color_index
      }
    }
  }).filter(Boolean) as EventInput[]

  // Handle event drop (moving existing scheduled tasks)
  const handleEventDrop = useCallback((dropInfo: EventDropArg) => {
    const newStart = dropInfo.event.start
    if (!newStart) return
    
    const taskId = dropInfo.event.extendedProps.taskId
    const timeString = `${newStart.getHours().toString().padStart(2, '0')}:${newStart.getMinutes().toString().padStart(2, '0')}`
    
    onEventMove(taskId, timeString)
  }, [onEventMove])

  // Handle event resize (changing duration)
  const handleEventResize = useCallback((resizeInfo: any) => {
    const start = resizeInfo.event.start
    const end = resizeInfo.event.end
    if (!start || !end) return
    
    const newDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
    const taskId = resizeInfo.event.extendedProps.taskId
    
    // Snap to 15-minute intervals
    const snappedDuration = Math.round(newDuration / 15) * 15
    onDurationChange(taskId, Math.max(15, snappedDuration)) // Minimum 15 minutes
  }, [onDurationChange])

  // Handle external drop (dragging from task list)
  const handleEventReceive = useCallback((info: any) => {
    const taskId = info.event.extendedProps.taskId
    const start = info.event.start
    
    if (!taskId || !start) {
      info.revert()
      return
    }
    
    const timeString = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`
    
    // Remove the temporary event - we'll add the real one via state
    info.event.remove()
    
    // Trigger the actual scheduling
    onExternalDrop(taskId, timeString)
  }, [onExternalDrop])

  // Handle time slot selection (for dropping from task list)
  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    const timeString = `${selectInfo.start.getHours().toString().padStart(2, '0')}:${selectInfo.start.getMinutes().toString().padStart(2, '0')}`
    onDrop(timeString)
  }, [onDrop])

  // Handle event click (for context menu actions)
  const handleEventClick = useCallback((clickInfo: any) => {
    const taskId = clickInfo.event.extendedProps.taskId
    
    // Simple context menu simulation - in a real app you'd use a proper context menu
    const action = window.confirm(
      `Task: ${clickInfo.event.title}\n\nClick OK to complete, Cancel to unschedule`
    )
    
    if (action) {
      onComplete(taskId)
    } else {
      onUnschedule(taskId)
    }
  }, [onComplete, onUnschedule])

  // Auto-scroll to current time
  useEffect(() => {
    const scrollToCurrentTime = () => {
      if (!calendarRef.current) return
      
      const calendarApi = calendarRef.current.getApi()
      const now = new Date()
      
      // If before 8am, scroll to 8am
      const targetTime = now.getHours() < 8 
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0)
        : now
      
      calendarApi.scrollToTime(targetTime.toTimeString().substring(0, 8))
    }
    
    // Delay to ensure calendar is rendered
    const timer = setTimeout(scrollToCurrentTime, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-background">
      <div className="flex gap-2 p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Today</h2>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          headerToolbar={false}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          slotLabelInterval="01:00:00"
          allDaySlot={false}
          editable={true}
          droppable={true}
          dayMaxEvents={true}
          nowIndicator={true}
          height="100%"
          events={events}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventReceive={handleEventReceive}
          eventClick={handleEventClick}
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }}
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }}
        />
      </div>
    </div>
  )
}