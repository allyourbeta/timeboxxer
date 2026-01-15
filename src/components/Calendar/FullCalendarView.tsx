'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventInput, EventApi, EventDropArg } from '@fullcalendar/core'
import { getColor } from '@/lib/palettes'

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
  onCreateTask: (title: string, time: string) => void
  onDurationChange: (taskId: string, newDuration: number) => void
}


export function FullCalendarView({
  tasks,
  scheduled,
  paletteId,
  onExternalDrop,
  onEventMove,
  onUnschedule,
  onComplete,
  onCreateTask,
  onDurationChange,
}: FullCalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null)
  
  // State for inline task creation
  const [newTaskSlot, setNewTaskSlot] = useState<{
    time: string
    date: Date
  } | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  
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
    
    const backgroundColor = getColor(paletteId, task.color_index)
    
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

  // Handle date click for inline task creation
  const handleDateClick = useCallback((info: any) => {
    const clickedDate = info.date
    const hours = clickedDate.getHours().toString().padStart(2, '0')
    const minutes = clickedDate.getMinutes().toString().padStart(2, '0')
    const time = `${hours}:${minutes}`
    
    setNewTaskSlot({
      time,
      date: clickedDate,
    })
    setNewTaskTitle('')
  }, [])

  const handleCreateSubmit = () => {
    if (newTaskTitle.trim() && newTaskSlot) {
      onCreateTask(newTaskTitle.trim(), newTaskSlot.time)
      setNewTaskSlot(null)
      setNewTaskTitle('')
    }
  }

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateSubmit()
    } else if (e.key === 'Escape') {
      setNewTaskSlot(null)
      setNewTaskTitle('')
    }
  }

  // Auto-scroll to current time on mount
  useEffect(() => {
    const scrollToCurrentTime = () => {
      if (!calendarRef.current) return
      
      const calendarApi = calendarRef.current.getApi()
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // Calculate scroll time with ~2 hour padding above current time
      // so current time isn't at the very top
      const paddingHours = 2
      const scrollHour = Math.max(0, currentHour - paddingHours)
      const scrollTime = `${scrollHour.toString().padStart(2, '0')}:00:00`
      
      calendarApi.scrollToTime(scrollTime)
    }
    
    // Delay to ensure calendar is rendered
    const timer = setTimeout(scrollToCurrentTime, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-background">
      <div className="flex gap-2 p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Today</h2>
      </div>
      
      <div className="flex-1 w-full overflow-auto p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          headerToolbar={false}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:15:00"
          snapDuration="00:15:00"
          slotLabelInterval="01:00:00"
          allDaySlot={false}
          editable={true}
          droppable={true}
          dayMaxEvents={true}
          nowIndicator={true}
          height="100%"
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // All days
            startTime: '09:00',
            endTime: '17:00'
          }}
          events={events}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventReceive={handleEventReceive}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          selectable={false}
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

      {/* Inline task creation UI */}
      {newTaskSlot && (
        <div 
          className="fixed z-50 bg-popover border rounded-lg shadow-xl p-3"
          style={{
            // Position near the click - we'll refine this
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="text-sm text-muted-foreground mb-2">
            New task at {newTaskSlot.time}
          </div>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            placeholder="Task name..."
            className="w-64 px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setNewTaskSlot(null)}
              className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSubmit}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  )
}