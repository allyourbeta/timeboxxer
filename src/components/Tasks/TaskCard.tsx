'use client'

import { Trash2, CheckCircle } from 'lucide-react'
import { getColor } from '@/lib/palettes'

interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  isScheduled: boolean
  isDaily: boolean
  isInPurgatory: boolean
  isHighlight: boolean
  canHighlight: boolean
  energyLevel: 'high' | 'medium' | 'low'
  paletteId: string
  onDurationClick: (reverse: boolean) => void
  onEnergyChange: (level: 'high' | 'medium' | 'low') => void
  onDailyToggle: () => void
  onHighlightToggle: () => void
  onComplete: () => void
  onDelete: () => void
}

// Energy cycle: medium -> high -> low -> medium
const ENERGY_CYCLE: Record<string, 'high' | 'medium' | 'low'> = {
  medium: 'high',
  high: 'low',
  low: 'medium',
}

const ENERGY_ICONS: Record<string, string> = {
  high: '🔥',
  medium: '⚡',
  low: '🌙',
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
  isHighlight,
  canHighlight,
  energyLevel,
  paletteId,
  onDurationClick,
  onEnergyChange,
  onDailyToggle,
  onHighlightToggle,
  onComplete,
  onDelete,
}: TaskCardProps) {
  const bgColor = getColor(paletteId, colorIndex)
  
  const handleEnergyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEnergyChange(ENERGY_CYCLE[energyLevel])
  }
  
  // Format duration compactly
  const durationLabel = durationMinutes >= 60 
    ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? durationMinutes % 60 : ''}`
    : `${durationMinutes}m`
  
  return (
    <div
      className={`fc-event px-3 py-2 rounded-lg group relative ${
        isHighlight ? 'ring-2 ring-yellow-400' : ''
      } ${
        isCompleted ? 'opacity-50' : 
        isScheduled && !isInPurgatory ? 'opacity-60' : ''
      }`}
      style={{ backgroundColor: bgColor }}
      title={title}
      data-task-id={id}
      data-title={title}
      data-duration={durationMinutes}
      data-color-index={colorIndex}
      data-color={bgColor}
    >
      {/* Single horizontal line layout */}
      <div className="flex items-center gap-2">
        {/* Color dot - click to open color picker could be added later */}
        <div
          className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0"
          style={{ backgroundColor: bgColor }}
        />
        
        {/* Title - takes remaining space */}
        <span className={`flex-1 text-white font-medium truncate ${
          isCompleted ? 'line-through' : ''
        }`}>
          {title}
        </span>
        
        {/* Duration - tap to cycle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDurationClick(e.shiftKey)
          }}
          className="text-white/80 hover:text-white text-sm font-medium min-w-[32px] text-right"
          title="Click to change duration (Shift+click to decrease)"
        >
          {durationLabel}
        </button>
        
        {/* Energy - tap to cycle */}
        <button
          onClick={handleEnergyClick}
          className="text-sm hover:scale-110 transition-transform"
          title={`Energy: ${energyLevel} (click to change)`}
        >
          {ENERGY_ICONS[energyLevel]}
        </button>
        
        {/* Daily checkbox */}
        <label 
          className="flex items-center cursor-pointer"
          title="Repeat daily"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isDaily}
            onChange={onDailyToggle}
            className="w-3.5 h-3.5 rounded border-white/50 accent-white"
          />
        </label>
        
        {/* Highlight star - only for date lists */}
        {canHighlight && (
          <button
            onClick={(e) => { e.stopPropagation(); onHighlightToggle(); }}
            className={`text-sm transition-opacity ${
              isHighlight ? 'opacity-100' : 'opacity-40 hover:opacity-100'
            }`}
            title={isHighlight ? 'Remove highlight' : 'Set as highlight'}
          >
            {isHighlight ? '⭐' : '☆'}
          </button>
        )}
        
        {/* Complete - visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onComplete()
          }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-white/80 hover:text-white transition-opacity"
          title="Mark as complete"
        >
          <CheckCircle className="h-4 w-4 text-white/60 hover:text-green-400" />
        </button>

        {/* Delete - visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-white/80 hover:text-white transition-opacity"
          title="Delete task"
        >
          <Trash2 className="h-4 w-4 text-white/60 hover:text-white" />
        </button>
      </div>
    </div>
  )
}