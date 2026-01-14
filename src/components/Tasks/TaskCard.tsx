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
  isScheduled: boolean
  isDaily: boolean
  isInPurgatory: boolean
  paletteId: string
  isColorPickerOpen: boolean
  energyLevel: 'high' | 'medium' | 'low'
  isHighlight: boolean
  // Purgatory info (optional)
  purgatoryInfo?: {
    movedAt: string
    originalListName: string
  }
  onDurationClick: (reverse: boolean) => void
  onColorClick: () => void
  onColorSelect: (colorIndex: number) => void
  onDelete: () => void
  onDailyToggle: () => void
  onEnergyChange: (level: 'high' | 'medium' | 'low') => void
  onHighlightToggle: () => void
}

export function TaskCard({
  id,
  title,
  durationMinutes,
  colorIndex,
  isCompleted,
  isScheduled,
  isDaily,
  isInPurgatory,
  paletteId,
  isColorPickerOpen,
  energyLevel,
  isHighlight,
  purgatoryInfo,
  onDurationClick,
  onColorClick,
  onColorSelect,
  onDelete,
  onDailyToggle,
  onEnergyChange,
  onHighlightToggle,
}: TaskCardProps) {
  const bgColor = getColor(paletteId, colorIndex)
  
  return (
    <div
      className={`fc-event p-3 rounded-lg transition-transform group relative ${
        isHighlight ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent' : ''
      } ${
        isCompleted ? 'opacity-50 pointer-events-none' : 
        isScheduled && !isInPurgatory ? 'opacity-60 cursor-default' : 
        'cursor-grab active:cursor-grabbing hover:scale-[1.02]'
      }`}
      style={{ backgroundColor: bgColor }}
      data-task-id={id}
      data-title={title}
      data-duration={durationMinutes}
      data-color-index={colorIndex}
      data-color={bgColor}
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
          <div className="flex items-center gap-2">
            <span className={`font-medium text-white ${isCompleted ? 'line-through' : ''}`}>
              {title}
            </span>
            {isScheduled && !isInPurgatory && (
              <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded text-white/80">
                scheduled
              </span>
            )}
          </div>
          {purgatoryInfo && (
            <div className="text-xs text-white/60 mt-1">
              From: {purgatoryInfo.originalListName} • {new Date(purgatoryInfo.movedAt).toLocaleDateString()}
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDurationClick(e.shiftKey)
            }}
            className="text-sm text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            {durationMinutes} min
          </button>
          {/* Energy level picker */}
          <div className="flex gap-1 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEnergyChange('high'); }}
              className={`text-xs px-1 rounded transition-opacity ${energyLevel === 'high' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
              title="High energy"
            >
              🔥
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEnergyChange('medium'); }}
              className={`text-xs px-1 rounded transition-opacity ${energyLevel === 'medium' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
              title="Medium energy"
            >
              ⚡
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEnergyChange('low'); }}
              className={`text-xs px-1 rounded transition-opacity ${energyLevel === 'low' ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
              title="Low energy"
            >
              🌙
            </button>
          </div>
          <label className="flex items-center gap-1 text-sm text-white/70 hover:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={isDaily}
              onChange={(e) => {
                e.stopPropagation()
                onDailyToggle()
              }}
              className="w-3 h-3 rounded"
            />
            <span className="text-xs">Daily</span>
          </label>
        </div>
        
        {/* Highlight toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onHighlightToggle(); }}
          className={`h-6 w-6 flex items-center justify-center rounded transition-opacity ${
            isHighlight ? 'opacity-100' : 'opacity-0 group-hover:opacity-50 hover:!opacity-100'
          }`}
          title={isHighlight ? 'Remove highlight' : 'Set as daily highlight'}
        >
          {isHighlight ? '⭐' : '☆'}
        </button>
        
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