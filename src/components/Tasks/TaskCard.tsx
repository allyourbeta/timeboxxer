'use client'

import { getColor } from '@/lib/palettes'

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
      className={`p-3 rounded cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] group relative ${
        isCompleted ? 'opacity-50' : ''
      }`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-start gap-2">
        {/* Color dot */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onColorClick()
          }}
          className="w-4 h-4 rounded-full border-2 border-[var(--text-primary)]/30 hover:border-[var(--text-primary)]/60 flex-shrink-0 mt-1"
          style={{ backgroundColor: bgColor }}
          title="Change color"
        />
        
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-[var(--text-primary)] ${isCompleted ? 'line-through' : ''}`}>
            {title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDurationClick()
            }}
            className="text-sm text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] cursor-pointer"
          >
            {durationMinutes} min
          </button>
        </div>
        
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="opacity-0 group-hover:opacity-100 text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] transition-opacity"
          title="Delete task"
        >
          🗑
        </button>
      </div>
      
      {/* Color picker popover */}
      {isColorPickerOpen && (
        <div
          className="absolute top-full left-0 mt-1 p-2 bg-[var(--bg-secondary)] rounded-lg shadow-lg z-20 grid grid-cols-6 gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <button
              key={i}
              onClick={() => onColorSelect(i)}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
              style={{ backgroundColor: getColor(paletteId, i) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}