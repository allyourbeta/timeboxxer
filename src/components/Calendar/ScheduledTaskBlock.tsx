'use client'

import { getColor } from '@/lib/palettes'

interface ScheduledTaskBlockProps {
  title: string
  durationMinutes: number
  colorIndex: number
  paletteId: string
  height: number
  onUnschedule: () => void
  onComplete: () => void
}

export function ScheduledTaskBlock({
  title,
  durationMinutes,
  colorIndex,
  paletteId,
  height,
  onUnschedule,
  onComplete,
}: ScheduledTaskBlockProps) {
  return (
    <div
      className="absolute left-0 right-2 rounded px-2 py-1 z-10 group"
      style={{
        backgroundColor: getColor(paletteId, colorIndex),
        height,
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm truncate">{title}</div>
          <div className="text-xs text-white/70">{durationMinutes} min</div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onUnschedule}
            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs"
            title="Unschedule"
          >
            ×
          </button>
          <button
            onClick={onComplete}
            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs"
            title="Mark complete"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  )
}