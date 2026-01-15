'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, MoreVertical, Trash2, Copy, Edit2 } from 'lucide-react'
import { TaskCard, AddTaskInput } from '@/components/Tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  // Purgatory fields
  moved_to_purgatory_at: string | null
  original_list_id: string | null
  original_list_name: string | null
  // Daily task fields
  is_daily: boolean
  daily_source_id: string | null
  // Energy and highlight
  energy_level: 'high' | 'medium' | 'low'
  is_daily_highlight: boolean
}

interface ListCardProps {
  id: string
  name: string
  isInbox: boolean
  isSystemList: boolean
  isDateList: boolean
  tasks: Task[]
  paletteId: string
  colorPickerTaskId: string | null
  isEditing: boolean
  isDuplicating: boolean
  isExpanded: boolean
  scheduledTaskIds: string[]
  onToggleExpand: () => void
  onStartEdit: () => void
  onFinishEdit: (newName: string) => void
  onCancelEdit: () => void
  onStartDuplicate: () => void
  onFinishDuplicate: (newName: string) => void
  onCancelDuplicate: () => void
  onDelete: () => void
  onTaskDurationClick: (taskId: string, currentDuration: number, reverse: boolean) => void
  onTaskColorClick: (taskId: string) => void
  onTaskColorSelect: (taskId: string, colorIndex: number) => void
  onTaskDelete: (taskId: string) => void
  onTaskAdd: (title: string) => void
  onTaskDailyToggle: (taskId: string) => void
  onTaskEnergyChange: (taskId: string, level: 'high' | 'medium' | 'low') => void
  onTaskHighlightToggle: (taskId: string) => void
}

export function ListCard({
  id,
  name,
  isInbox,
  isSystemList,
  isDateList,
  tasks,
  paletteId,
  colorPickerTaskId,
  isEditing,
  isDuplicating,
  isExpanded,
  scheduledTaskIds,
  onToggleExpand,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onStartDuplicate,
  onFinishDuplicate,
  onCancelDuplicate,
  onDelete,
  onTaskDurationClick,
  onTaskColorClick,
  onTaskColorSelect,
  onTaskDelete,
  onTaskAdd,
  onTaskDailyToggle,
  onTaskEnergyChange,
  onTaskHighlightToggle,
}: ListCardProps) {
  const [editName, setEditName] = useState(name)
  const [duplicateName, setDuplicateName] = useState(`${name} Copy`)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Handle menu toggle with position calculation
  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showMenu) {
      setShowMenu(false)
      setMenuPosition(null)
    } else {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        // Position menu below button, aligned to right edge
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right - 176, // 176px = w-44 = 11rem
        })
      }
      setShowMenu(true)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
        setMenuPosition(null)
      }
    }
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])
  
  // Get the first task's color for accent bar
  const getFirstTaskColor = () => {
    if (tasks.length === 0) return 'hsl(var(--primary))' // Default primary color
    const firstTask = tasks[0]
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    return colors[firstTask.color_index] || 'hsl(var(--primary))'
  }
  
  return (
    <div className={`
      rounded-xl overflow-hidden border-2 shadow-lg bg-white dark:bg-slate-800 transition-all duration-200
      ${isExpanded 
        ? 'border-slate-300 dark:border-slate-600 shadow-xl' 
        : 'border-slate-300 dark:border-slate-600 hover:shadow-xl'
      }
    `}>
      {/* Header - always visible */}
      {isEditing ? (
        <div className="p-4">
          <Input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') onFinishEdit(editName)
              if (e.key === 'Escape') onCancelEdit()
            }}
            onBlur={() => onFinishEdit(editName)}
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={onToggleExpand}
          className="w-full p-4 flex items-center justify-between group hover:bg-muted/30 transition-colors border-b border-border/30"
        >
          <div className="flex items-center gap-3">
            {/* Colored accent bar */}
            <div 
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: getFirstTaskColor() }}
            />
            <div className="text-left">
              <h3 
                className="font-semibold text-foreground"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (!isSystemList) {
                    onStartEdit()
                  }
                }}
              >
                {name}
              </h3>
              <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
            </div>
          </div>
          
          {/* Expand/collapse icon - animated */}
          <div className={`
            w-8 h-8 rounded-full bg-muted/50 
            flex items-center justify-center
            transition-transform duration-200
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>
      )}
      
      {/* Action buttons - only when expanded and not editing */}
      {!isEditing && isExpanded && (
        <div className="px-4 pb-2">
          <div className="flex justify-end gap-2">
            {/* Overflow menu */}
            <div ref={menuRef}>
              <Button
                ref={buttonRef}
                variant="ghost"
                size="icon"
                onClick={handleMenuToggle}
                className="h-8 w-8 text-muted-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {showMenu && menuPosition && (
                <div 
                  className="fixed w-44 bg-popover border border-border rounded-lg shadow-xl z-50 py-1"
                  style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                  }}
                >
                  {!isSystemList && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMenu(false)
                          setMenuPosition(null)
                          onStartDuplicate()
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMenu(false)
                          setMenuPosition(null)
                          onDelete()
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-destructive hover:text-destructive-foreground text-destructive flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete List
                      </button>
                    </>
                  )}
                  {isSystemList && (
                    <div className="px-3 py-2 text-sm text-muted-foreground italic">
                      System list (cannot delete)
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded content with animation */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-top-2">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              durationMinutes={task.duration_minutes}
              colorIndex={task.color_index}
              isCompleted={task.is_completed}
              isScheduled={scheduledTaskIds.includes(task.id)}
              isDaily={task.is_daily}
              isInPurgatory={isInbox}
              paletteId={paletteId}
              isColorPickerOpen={colorPickerTaskId === task.id}
              energyLevel={task.energy_level || 'medium'}
              isHighlight={task.is_daily_highlight || false}
              canHighlight={isDateList}
              purgatoryInfo={task.moved_to_purgatory_at ? {
                movedAt: task.moved_to_purgatory_at,
                originalListName: task.original_list_name || 'Unknown'
              } : undefined}
              onDurationClick={(reverse) => onTaskDurationClick(task.id, task.duration_minutes, reverse)}
              onColorClick={() => onTaskColorClick(task.id)}
              onColorSelect={(colorIndex) => onTaskColorSelect(task.id, colorIndex)}
              onDelete={() => onTaskDelete(task.id)}
              onDailyToggle={() => onTaskDailyToggle(task.id)}
              onEnergyChange={(level) => onTaskEnergyChange(task.id, level)}
              onHighlightToggle={() => onTaskHighlightToggle(task.id)}
            />
          ))}
          
          <AddTaskInput onAdd={onTaskAdd} />
        </div>
      )}
      
      {/* Duplicate input */}
      {isDuplicating && (
        <div className="px-4 pb-4">
          <Input
            type="text"
            placeholder="New list name..."
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') onFinishDuplicate(duplicateName)
              if (e.key === 'Escape') onCancelDuplicate()
            }}
            onBlur={() => {
              if (duplicateName.trim()) {
                onFinishDuplicate(duplicateName)
              } else {
                onCancelDuplicate()
              }
            }}
            autoFocus
          />
        </div>
      )}
    </div>
  )
}