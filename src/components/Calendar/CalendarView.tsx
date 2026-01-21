'use client'

import { useEffect, useRef } from 'react'
import { Droppable } from '@hello-pangea/dnd'
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
  generateAllSlotIds
} from '@/lib/calendarUtils'

interface CalendarViewProps {
  tasks: Task[]
  paletteId: string
  onExternalDrop: (taskId: string, time: string) => void
  onEventMove: (taskId: string, time: string) => void
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
  onCreateTask: (title: string, time: string) => void
  onDurationChange: (taskId: string, newDuration: number) => void
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
}: CalendarViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hourLabels = getHourLabels()

  // Scroll to "now minus 1.5 hours" on mount
  useEffect(() => {
    if (containerRef.current) {
      const scrollPosition = getInitialScrollPosition()
      containerRef.current.scrollTop = Math.max(0, scrollPosition)
    }
  }, [])

  // Filter scheduled tasks for today
  const scheduledTasks = tasks.filter(task => task.scheduled_at && !task.is_completed)

  // Generate all slot IDs for the 24-hour period (96 slots with 15-min intervals)
  const slotIds = generateAllSlotIds()
  

  // Helper to get slot height in pixels
  const slotHeightPx = SLOT_HEIGHT / SLOTS_PER_HOUR // 45px per 15-min slot

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Calendar header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          Today's Schedule
        </h2>
      </div>

      {/* Calendar grid */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative"
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
                        absolute w-full border-b 
                        ${isHourBoundary ? 'border-border/50' : 'border-border/20'}
                        ${snapshot.isDraggingOver ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 ring-inset' : ''}
                        transition-colors duration-150
                      `}
                      style={{
                        top: `${index * slotHeightPx}px`,
                        height: `${slotHeightPx}px`
                      }}
                      data-droppable-id={slotId}
                    >
                      {provided.placeholder}
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

              return (
                <div
                  key={task.id}
                  className="absolute left-0 right-0 mx-1 rounded-md shadow-sm border border-white/20 overflow-hidden cursor-pointer hover:shadow-md transition-shadow pointer-events-auto"
                  style={{
                    top: `${startPixels}px`,
                    height: `${Math.max(height, 28)}px`, // Minimum height for readability
                    backgroundColor,
                  }}
                  onClick={() => {
                    // TODO: Show task actions popover
                    console.log('Task clicked:', task.id)
                  }}
                  data-testid={`scheduled-task-${task.id}`}
                  data-scheduled-time={startTime}
                >
                      <div className="p-1.5 h-full flex flex-col">
                        <div className="text-sm font-semibold truncate text-white drop-shadow-sm">
                          {task.title}
                        </div>
                        {height > 35 && (
                          <div className="text-xs text-white/90 mt-0.5">
                            {task.duration_minutes}m
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