'use client'

import { useEffect, useRef, useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { CheckCircle, CalendarX } from 'lucide-react'
import { getColor } from '@/lib/palettes'
import { Task } from '@/types/app'
import { 
  SLOT_HEIGHT, 
  SLOTS_PER_HOUR,
  getHourLabels, 
  timestampToTime, 
  timeToPixels,
  getCurrentTimePixels,
  getInitialScrollPosition,
  formatSlotId,
  generateAllSlotIds,
  calculateTaskWidths,
  parseSlotId
} from '@/lib/calendarUtils'

// SlotInput component for inline task creation
function SlotInput({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (title: string) => void
  onCancel: () => void 
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (value.trim()) {
        onSubmit(value.trim())
      } else {
        onCancel()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }
  
  const handleBlur = () => {
    // Small delay to allow click events to process first
    setTimeout(() => {
      onCancel()
    }, 100)
  }
  
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder="New task..."
      className="absolute inset-x-0 top-0 h-8 px-2 text-sm bg-white border-2 border-blue-500 rounded shadow-lg focus:outline-none z-50"
      onClick={(e) => e.stopPropagation()}
    />
  )
}

interface CalendarViewProps {
  tasks: Task[]
  paletteId: string
  onExternalDrop: (taskId: string, time: string) => void
  onEventMove: (taskId: string, time: string) => void
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
  onCreateTask: (title: string, time: string) => void
  onDurationChange: (taskId: string, newDuration: number) => void
  onDragStart?: (cancelCallback: () => void) => void
}

export function CalendarView({
  tasks,
  paletteId,
  onExternalDrop,
  onEventMove,
  onUnschedule,
  onComplete,
  onCreateTask,
  onDurationChange,
  onDragStart,
}: CalendarViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hourLabels = getHourLabels()
  
  // State for inline task creation
  const [editingSlot, setEditingSlot] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Register cancel callback with parent for drag start handling
  useEffect(() => {
    if (onDragStart) {
      onDragStart(() => setEditingSlot(null))
    }
  }, [onDragStart])

  // Scroll to "now minus 1.5 hours" on mount
  useEffect(() => {
    if (containerRef.current) {
      const scrollPosition = getInitialScrollPosition()
      containerRef.current.scrollTop = Math.max(0, scrollPosition)
    }
  }, [])

  // Filter scheduled tasks for today
  const scheduledTasks = tasks.filter(task => task.scheduled_at && !task.completed_at)

  // Calculate task layouts for overlap handling
  const taskLayouts = calculateTaskWidths(scheduledTasks.map(task => ({
    id: task.id,
    scheduled_at: task.scheduled_at!,
    duration_minutes: task.duration_minutes
  })))

  // Generate all slot IDs for the 24-hour period (96 slots with 15-min intervals)
  const slotIds = generateAllSlotIds()
  
  // Click handler for creating tasks inline
  const handleSlotClick = (e: React.MouseEvent, slotId: string) => {
    // Only trigger if clicking the slot background, not a task
    if (e.target !== e.currentTarget) return
    
    // Parse slot ID to get time
    const parsed = parseSlotId(slotId)
    if (!parsed) return
    
    const slotTime = `${parsed.hours.toString().padStart(2, '0')}:${parsed.minutes.toString().padStart(2, '0')}`
    
    // Check max 2 rule - count tasks at this exact time
    const tasksInSlot = scheduledTasks.filter(task => {
      if (!task.scheduled_at) return false
      const taskTime = timestampToTime(task.scheduled_at)
      return taskTime === slotTime
    })
    
    if (tasksInSlot.length >= 2) return
    
    setEditingSlot(slotTime)
  }

  // Helper to get slot height in pixels
  const slotHeightPx = SLOT_HEIGHT / SLOTS_PER_HOUR // 45px per 15-min slot

  return (
    <div className="flex flex-col h-full bg-background" onClick={() => setSelectedTaskId(null)}>
      {/* Calendar header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          Today's Schedule
        </h2>
      </div>

      {/* Calendar grid */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        data-testid="calendar-container"
      >
        {/* Container for all calendar content */}
        <div 
          className="relative"
          style={{ height: `${24 * SLOT_HEIGHT}px` }}
        >
          {/* Hour labels */}
          <div className="absolute left-0 top-0 w-16 h-full">
            {hourLabels.map((hour, index) => (
              <div
                key={hour}
                className="absolute w-full border-b border-border/30"
                style={{ 
                  top: `${index * SLOT_HEIGHT}px`,
                  height: `${SLOT_HEIGHT}px`
                }}
              >
                <div className="absolute left-2 top-1 text-xs text-muted-foreground font-mono">
                  {hour}
                </div>
              </div>
            ))}
          </div>

          {/* Time slot grid - 96 individual droppable slots */}
          <div className="absolute left-16 right-0 top-0 h-full">
            {slotIds.map((slotId, index) => {
              const hour = Math.floor(index / 4)
              const quarter = index % 4
              const isHourBoundary = quarter === 0
              
              return (
                <Droppable key={slotId} droppableId={slotId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        absolute w-full border-b cursor-pointer
                        ${isHourBoundary ? 'border-border/50' : 'border-border/20'}
                        ${snapshot.isDraggingOver ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 ring-inset' : ''}
                        transition-colors duration-150
                      `}
                      style={{
                        top: `${index * slotHeightPx}px`,
                        height: `${slotHeightPx}px`
                      }}
                      data-droppable-id={slotId}
                      onClick={(e) => handleSlotClick(e, slotId)}
                    >
                      {provided.placeholder}
                      {editingSlot && editingSlot === `${hour.toString().padStart(2, '0')}:${(quarter * 15).toString().padStart(2, '0')}` && (
                        <SlotInput
                          onSubmit={(title) => {
                            onCreateTask(title, editingSlot)
                            setEditingSlot(null)
                          }}
                          onCancel={() => setEditingSlot(null)}
                        />
                      )}
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>

          {/* Current time line */}
          <div
            className="absolute w-full h-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ 
              top: `${getCurrentTimePixels()}px`,
              left: '64px' // offset for hour labels
            }}
          >
            <div className="absolute left-0 -top-2 w-4 h-4 bg-red-500 rounded-full -ml-2" />
          </div>

          {/* Scheduled tasks layer */}
          <div className="absolute left-16 right-0 top-0 h-full pointer-events-none">
            {scheduledTasks.map((task, index) => {
              const startTime = timestampToTime(task.scheduled_at!)
              const startPixels = timeToPixels(startTime)
              const height = (task.duration_minutes / 60) * SLOT_HEIGHT
              const backgroundColor = getColor(paletteId, task.color_index)

              // Get layout for overlap handling
              const layout = taskLayouts.get(task.id) || { width: 100, column: 0 }
              const leftPercent = layout.column * 50  // 0% or 50%

              return (
                <div
                  key={task.id}
                  className="absolute mx-1 rounded-lg bg-theme-secondary border border-theme overflow-hidden cursor-pointer hover:shadow-md transition-shadow pointer-events-auto"
                  style={{
                    top: `${startPixels}px`,
                    height: `${Math.max(height, 28)}px`, // Minimum height for readability
                    width: `${layout.width}%`,
                    left: `${leftPercent}%`,
                    borderLeftWidth: '4px',
                    borderLeftColor: backgroundColor,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTaskId(selectedTaskId === task.id ? null : task.id)
                  }}
                  data-testid={`scheduled-task-${task.id}`}
                  data-scheduled-time={startTime}
                >
                  <div className="flex items-center h-full px-2">
                    <span className="truncate text-sm font-medium text-theme-primary flex-1">
                      {task.title}
                    </span>
                    {selectedTaskId === task.id && (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onComplete(task.id)
                            setSelectedTaskId(null)
                          }}
                          className="p-1 bg-accent-success hover:bg-accent-success-hover rounded text-white"
                          title="Complete"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onUnschedule(task.id)
                            setSelectedTaskId(null)
                          }}
                          className="p-1 bg-theme-tertiary hover:bg-interactive-hover rounded text-theme-primary"
                          title="Remove from calendar"
                        >
                          <CalendarX className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}