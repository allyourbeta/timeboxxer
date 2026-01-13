'use client'

import { useState, useEffect } from 'react'
import { getColor } from '@/lib/palettes'
import { ResizeHandle } from './ResizeHandle'

interface ScheduledTaskBlockProps {
  title: string
  durationMinutes: number
  colorIndex: number
  paletteId: string
  height: number
  onUnschedule: () => void
  onComplete: () => void
  onDragStart: () => void
  onDurationChange: (newDuration: number) => void
}

export function ScheduledTaskBlock({
  title,
  durationMinutes,
  colorIndex,
  paletteId,
  height,
  onUnschedule,
  onComplete,
  onDragStart,
  onDurationChange,
}: ScheduledTaskBlockProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startDuration, setStartDuration] = useState(0)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    onDragStart()
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setStartY(e.clientY)
    setStartDuration(durationMinutes)
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY
      // Each 15-minute slot is 48px (h-12 = 3rem = 48px)
      const deltaSlots = Math.round(deltaY / 48)
      const newDuration = Math.max(15, Math.min(120, startDuration + (deltaSlots * 15)))
      
      // Only call onDurationChange if duration actually changed
      if (newDuration !== durationMinutes) {
        onDurationChange(newDuration)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, startY, startDuration, durationMinutes, onDurationChange])

  return (
    <div
      draggable={!isResizing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`absolute left-0 right-2 rounded px-2 py-1 z-10 group ${
        isResizing ? 'cursor-ns-resize' : 'cursor-move'
      } ${isDragging ? 'opacity-50' : ''}`}
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
      
      <ResizeHandle onResizeStart={handleResizeStart} />
    </div>
  )
}