'use client'

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
}: TimeSlotProps) {
  const getBorderStyle = () => {
    if (isHour) return 'border-gray-500 border-b-2' // Strong line for hours
    if (isHalfHour) return 'border-gray-700' // Medium line for half hours
    return 'border-gray-800 border-dashed border-opacity-50' // Faint dotted for quarters
  }

  const getTimeLabel = () => {
    if (isHour) return time
    if (isHalfHour) return time
    return '' // No label for quarter marks
  }

  const getTimeLabelStyle = () => {
    if (isHour) return 'text-sm text-white font-bold' // Bold white for hours
    if (isHalfHour) return 'text-xs text-gray-400' // Gray for half hours
    return ''
  }

  return (
    <div
      className={`h-12 flex items-stretch border-b ${getBorderStyle()}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Time label */}
      <div className={`w-16 pr-2 text-right pt-1 ${getTimeLabelStyle()}`}>
        {getTimeLabel()}
      </div>
      
      {/* Slot */}
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
          />
        ) : (
          <div className="h-full w-full hover:bg-gray-800/50 transition-colors" />
        )}
      </div>
    </div>
  )
}