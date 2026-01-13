'use client'

import { useState } from 'react'
import { TaskCard, AddTaskInput } from '@/components/Tasks'

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
  onTaskDragStart: (taskId: string) => void
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
  onTaskDragStart,
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
    if (tasks.length === 0) return '#6366f1' // Default indigo
    const firstTask = tasks[0]
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    return colors[firstTask.color_index] || '#6366f1'
  }
  
  return (
    <div className={`
      rounded-xl overflow-hidden transition-all duration-200
      ${isExpanded 
        ? 'bg-theme-secondary shadow-lg ring-1 ring-white/10' 
        : 'bg-theme-secondary/50 hover:bg-theme-secondary hover:shadow-md'
      }
    `}>
      {/* Header - always visible */}
      {isEditing ? (
        <div className="p-4">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') onFinishEdit(editName)
              if (e.key === 'Escape') onCancelEdit()
            }}
            onBlur={() => onFinishEdit(editName)}
            autoFocus
            className="w-full bg-theme-tertiary text-theme-primary px-3 py-2 rounded-lg text-sm"
          />
        </div>
      ) : (
        <button
          onClick={onToggleExpand}
          className="w-full p-4 flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            {/* Colored accent bar */}
            <div 
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: getFirstTaskColor() }}
            />
            <div className="text-left">
              <h3 
                className="font-semibold text-theme-primary"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  onStartEdit()
                }}
              >
                {name}
              </h3>
              <p className="text-sm text-theme-secondary">{tasks.length} tasks</p>
            </div>
          </div>
          
          {/* Expand/collapse icon - animated */}
          <div className={`
            w-8 h-8 rounded-full bg-theme-tertiary/50 
            flex items-center justify-center
            transition-transform duration-200
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            <svg className="w-4 h-4 text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      )}
      
      {/* Action buttons - only when expanded and not editing */}
      {!isEditing && isExpanded && (
        <div className="px-4 pb-2">
          <div className="flex justify-end gap-2">
            <button
              onClick={onStartDuplicate}
              className="p-2 rounded-lg bg-theme-tertiary/50 hover:bg-theme-tertiary text-theme-secondary hover:text-theme-primary transition-colors"
              title="Duplicate list"
            >
              📋
            </button>
            {!isInbox && (
              <button
                onClick={onDelete}
                className="p-2 rounded-lg bg-theme-tertiary/50 hover:bg-theme-tertiary text-theme-secondary hover:text-theme-primary transition-colors"
                title="Delete list"
              >
                🗑
              </button>
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
              onDragStart={() => onTaskDragStart(task.id)}
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
          <input
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
            className="w-full p-3 text-sm bg-theme-tertiary text-theme-primary placeholder-theme-secondary rounded-lg"
          />
        </div>
      )}
    </div>
  )
}