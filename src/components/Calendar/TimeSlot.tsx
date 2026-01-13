'use client'

import { useState } from 'react'
import { ScheduledTaskBlock } from './ScheduledTaskBlock'

interface ScheduledTask {
  taskId: string
  title: string
  durationMinutes: number
  colorIndex: number
}

interface TimeSlotProps {
  time: string
  isHour: boolean
  isHalfHour: boolean
  scheduledTask: ScheduledTask | null
  taskHeight: number
  paletteId: string
  onDrop: () => void
  onUnschedule: () => void
  onComplete: () => void
  onDragStart: () => void
  onDurationChange: (newDuration: number) => void
}

export function TimeSlot({
  time,
  isHour,
  isHalfHour,
  scheduledTask,
  taskHeight,
  paletteId,
  onDrop,
  onUnschedule,
  onComplete,
  onDragStart,
  onDurationChange,
}: TimeSlotProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Format time for display: "9:00 AM" format
  const formatTime = (t: string) => {
    const [hour, minute] = t.split(':').map(Number)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
  }
  return (
    <div
      className={`h-12 flex items-stretch ${
        isHour ? 'border-t-2 border-theme' : isHalfHour ? 'border-t border-theme/50' : 'border-t border-theme/20'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Time label column */}
      <div className="w-20 flex items-start justify-end pr-3 pt-1 relative">
        {isHour && (
          <span className="text-sm font-semibold text-theme-primary">
            {formatTime(time)}
          </span>
        )}
        {isHalfHour && !isHour && (
          <span className="text-xs text-theme-secondary">
            {formatTime(time)}
          </span>
        )}
        
        {/* Hover tooltip showing exact time */}
        {isHovered && !isHour && !isHalfHour && (
          <span className="absolute right-3 top-1 text-xs bg-blue-500 text-white px-2 py-0.5 rounded shadow-lg z-20">
            {formatTime(time)}
          </span>
        )}
      </div>
      
      {/* Slot area */}
      <div className="flex-1 relative">
        {scheduledTask ? (
          <ScheduledTaskBlock
            title={scheduledTask.title}
            durationMinutes={scheduledTask.durationMinutes}
            colorIndex={scheduledTask.colorIndex}
            paletteId={paletteId}
            height={taskHeight}
            onUnschedule={onUnschedule}
            onComplete={onComplete}
            onDragStart={onDragStart}
            onDurationChange={onDurationChange}
          />
        ) : (
          <div 
            className={`h-full w-full transition-colors ${
              isHovered ? 'bg-blue-500/20' : 'hover:bg-theme-tertiary/30'
            }`}
          />
        )}
      </div>
    </div>
  )
}