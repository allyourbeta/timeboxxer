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

  // State for task action modal
  const [selectedTask, setSelectedTask] = useState<{
    taskId: string
    title: string
  } | null>(null)

  // Handle event click (show action modal)
  const handleEventClick = useCallback((clickInfo: any) => {
    const taskId = clickInfo.event.extendedProps.taskId
    const title = clickInfo.event.title
    
    setSelectedTask({ taskId, title })
  }, [])

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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setNewTaskSlot(null)
              setNewTaskTitle('')
            }}
          />
          
          {/* Modal - always light for readability */}
          <div className="relative bg-white border-2 border-slate-300 rounded-lg shadow-2xl p-4 max-w-sm w-full mx-4">
            <div className="text-sm text-slate-500 mb-2">
              New task at {newTaskSlot.time}
            </div>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              placeholder="Task name..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setNewTaskSlot(null)
                  setNewTaskTitle('')
                }}
                className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task action modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedTask(null)}
          />
          
          {/* Modal - always light for readability */}
          <div className="relative bg-white border-2 border-slate-300 rounded-lg shadow-2xl p-4 max-w-sm w-full mx-4">
            {/* Close X button */}
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <h3 className="font-semibold text-slate-900 mb-1 pr-8">{selectedTask.title}</h3>
            <p className="text-sm text-slate-500 mb-4">What do you want to do?</p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  onComplete(selectedTask.taskId)
                  setSelectedTask(null)
                }}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
              >
                ✓ Complete
              </button>
              <button
                onClick={() => {
                  onUnschedule(selectedTask.taskId)
                  setSelectedTask(null)
                }}
                className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium"
              >
                Return to list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}