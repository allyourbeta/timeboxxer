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
  scheduledTask: ScheduledTask | null
  taskHeight: number
  paletteId: string
  onDrop: () => void
  onUnschedule: () => void
  onComplete: () => void
}

export function TimeSlot({
  time,
  isHour,
  scheduledTask,
  taskHeight,
  paletteId,
  onDrop,
  onUnschedule,
  onComplete,
}: TimeSlotProps) {
  return (
    <div
      className={`h-12 flex items-stretch border-b ${
        isHour ? 'border-gray-600' : 'border-gray-800'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Time label */}
      <div className="w-16 text-xs text-gray-500 pr-2 text-right pt-1">
        {isHour ? time : ''}
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
          />
        ) : (
          <div className="h-full w-full hover:bg-gray-800/50 transition-colors" />
        )}
      </div>
    </div>
  )
}