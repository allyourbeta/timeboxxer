'use client'

import { Trash2 } from 'lucide-react'
import { getColor } from '@/lib/palettes'
import { Button } from '@/components/ui/button'

interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  paletteId: string
  isColorPickerOpen: boolean
  onDragStart: () => void
  onDurationClick: () => void
  onColorClick: () => void
  onColorSelect: (colorIndex: number) => void
  onDelete: () => void
}

export function TaskCard({
  id,
  title,
  durationMinutes,
  colorIndex,
  isCompleted,
  paletteId,
  isColorPickerOpen,
  onDragStart,
  onDurationClick,
  onColorClick,
  onColorSelect,
  onDelete,
}: TaskCardProps) {
  const bgColor = getColor(paletteId, colorIndex)
  
  return (
    <div
      draggable={!isCompleted}
      onDragStart={onDragStart}
      className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] group relative ${
        isCompleted ? 'opacity-50' : ''
      }`}
      style={{ backgroundColor: bgColor }}
      data-task-id={id}
    >
      <div className="flex items-start gap-2">
        {/* Color dot */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onColorClick()
          }}
          className="w-4 h-4 rounded-full border-2 border-white/30 hover:border-white/60 flex-shrink-0 mt-1 transition-colors"
          style={{ backgroundColor: bgColor }}
          title="Change color"
        />
        
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-white ${isCompleted ? 'line-through' : ''}`}>
            {title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDurationClick()
            }}
            className="text-sm text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            {durationMinutes} min
          </button>
        </div>
        
        {/* Delete button */}
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 h-6 w-6 text-white/70 hover:text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Color picker popover */}
      {isColorPickerOpen && (
        <div
          className="absolute top-full left-0 mt-1 p-2 bg-popover rounded-lg shadow-lg z-20 grid grid-cols-6 gap-1 border"
          onClick={(e) => e.stopPropagation()}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <button
              key={i}
              onClick={() => onColorSelect(i)}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: getColor(paletteId, i) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}