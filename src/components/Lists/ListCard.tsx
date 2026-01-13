'use client'

import { useState } from 'react'
import { ChevronDown, Copy, Trash2 } from 'lucide-react'
import { TaskCard, AddTaskInput } from '@/components/Tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
}

interface ListCardProps {
  id: string
  name: string
  isInbox: boolean
  tasks: Task[]
  paletteId: string
  colorPickerTaskId: string | null
  isEditing: boolean
  isDuplicating: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onStartEdit: () => void
  onFinishEdit: (newName: string) => void
  onCancelEdit: () => void
  onStartDuplicate: () => void
  onFinishDuplicate: (newName: string) => void
  onCancelDuplicate: () => void
  onDelete: () => void
  onTaskDurationClick: (taskId: string, currentDuration: number) => void
  onTaskColorClick: (taskId: string) => void
  onTaskColorSelect: (taskId: string, colorIndex: number) => void
  onTaskDelete: (taskId: string) => void
  onTaskAdd: (title: string) => void
}

export function ListCard({
  id,
  name,
  isInbox,
  tasks,
  paletteId,
  colorPickerTaskId,
  isEditing,
  isDuplicating,
  isExpanded,
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
}: ListCardProps) {
  const [editName, setEditName] = useState(name)
  const [duplicateName, setDuplicateName] = useState(`${name} Copy`)
  
  // Get the first task's color for accent bar
  const getFirstTaskColor = () => {
    if (tasks.length === 0) return 'hsl(var(--primary))' // Default primary color
    const firstTask = tasks[0]
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    return colors[firstTask.color_index] || 'hsl(var(--primary))'
  }
  
  return (
    <div className={`
      rounded-xl overflow-hidden transition-all duration-200
      ${isExpanded 
        ? 'bg-card shadow-lg ring-1 ring-gray-200 dark:ring-gray-800' 
        : 'bg-card/50 hover:bg-card hover:shadow-md'
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
          className="w-full p-4 flex items-center justify-between group hover:bg-accent/50 transition-colors"
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
                  onStartEdit()
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
            <Button
              variant="outline"
              size="icon"
              onClick={onStartDuplicate}
              className="h-8 w-8"
              title="Duplicate list"
            >
              <Copy className="h-3 w-3" />
            </Button>
            {!isInbox && (
              <Button
                variant="outline"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                title="Delete list"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
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
              paletteId={paletteId}
              isColorPickerOpen={colorPickerTaskId === task.id}
              onDurationClick={() => onTaskDurationClick(task.id, task.duration_minutes)}
              onColorClick={() => onTaskColorClick(task.id)}
              onColorSelect={(colorIndex) => onTaskColorSelect(task.id, colorIndex)}
              onDelete={() => onTaskDelete(task.id)}
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