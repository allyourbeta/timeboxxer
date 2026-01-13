'use client'

import { ScheduledTaskBlock } from './ScheduledTaskBlock'

interface ScheduledTaskInfo {
  taskId: string
  title: string
  durationMinutes: number
  colorIndex: number
  isStart: boolean
}

interface TimeSlotProps {
  time: string
  isHour: boolean
  isHalfHour: boolean
  scheduledTasks: ScheduledTaskInfo[]
  paletteId: string
  isDropTarget: boolean  // NEW: highlight when this is the drop target
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
  onDragStart: (taskId: string) => void
  onDurationChange: (taskId: string, newDuration: number) => void
}

export function TimeSlot({
  time,
  isHour,
  isHalfHour,
  scheduledTasks,
  paletteId,
  isDropTarget,
  onUnschedule,
  onComplete,
  onDragStart,
  onDurationChange,
}: TimeSlotProps) {
  
  // Format time: "7:00 AM", "7:15", "7:30", "7:45"
  const formatTime = (t: string) => {
    const [hour, minute] = t.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    
    if (isHour) {
      // Full format for hours: "7:00 AM"
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
    } else {
      // Short format for 15/30/45: just ":15", ":30", ":45"
      return `:${minute.toString().padStart(2, '0')}`
    }
  }
  
  const getTaskHeight = (duration: number) => {
    const slots = duration / 15
    return slots * 48 - 4
  }

  // Border style based on time
  const getBorderStyle = () => {
    if (isHour) {
      return 'border-t-2 border-[var(--border-color)]'
    } else if (isHalfHour) {
      return 'border-t border-[var(--border-color)]'
    } else {
      return 'border-t border-[var(--border-color)] border-dashed'
    }
  }
  return (
    <div
      className={`h-12 flex items-stretch ${getBorderStyle()} ${
        isDropTarget ? 'bg-blue-500/30 ring-2 ring-blue-500 ring-inset' : ''
      }`}
    >
      {/* Time label column - ALWAYS visible */}
      <div className="w-20 flex-shrink-0 flex items-start justify-end pr-3 pt-1">
        <span className={`
          ${isHour 
            ? 'text-sm font-bold text-[var(--text-primary)]' 
            : 'text-xs text-[var(--text-secondary)]'
          }
        `}>
          {formatTime(time)}
        </span>
      </div>
      
      {/* Slot area */}
      <div className="flex-1 relative">
        {scheduledTasks.length > 0 ? (
          <div className="flex gap-1 h-full">
            {scheduledTasks.map((task, index) => {
              // Only render full task blocks for tasks that start at this time
              if (!task.isStart) return null
              
              // Calculate width based on number of tasks
              const widthClass = scheduledTasks.filter(t => t.isStart).length === 1 
                ? 'w-full' 
                : scheduledTasks.filter(t => t.isStart).length === 2 
                ? 'w-1/2' 
                : 'w-1/3'
              
              return (
                <div key={task.taskId} className={`${widthClass} relative`}>
                  <ScheduledTaskBlock
                    title={task.title}
                    durationMinutes={task.durationMinutes}
                    colorIndex={task.colorIndex}
                    paletteId={paletteId}
                    height={getTaskHeight(task.durationMinutes)}
                    onUnschedule={() => onUnschedule(task.taskId)}
                    onComplete={() => onComplete(task.taskId)}
                    onDragStart={() => onDragStart(task.taskId)}
                    onDurationChange={(newDuration) => onDurationChange(task.taskId, newDuration)}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-full w-full hover:bg-[var(--bg-tertiary)]/30 transition-colors" />
        )}
      </div>
    </div>
  )
}