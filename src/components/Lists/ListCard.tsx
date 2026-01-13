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
  
  return (
    <div className="bg-theme-secondary rounded-lg p-3">
      {/* Header */}
      <div className={`flex items-center justify-between group ${!isExpanded ? 'mb-0' : 'mb-2'}`}>
        <div className="flex items-center gap-2 flex-1">
          {isEditing ? (
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
              className="flex-1 bg-theme-tertiary text-theme-primary px-2 py-1 rounded text-sm"
            />
          ) : (
            <>
              <h2
                className="font-semibold text-theme-primary cursor-pointer hover:text-theme-primary"
                onDoubleClick={onStartEdit}
              >
                {name}
              </h2>
              <span className="text-theme-secondary text-sm">({tasks.length})</span>
              <button
                onClick={onToggleExpand}
                className="text-theme-secondary hover:text-theme-primary text-sm ml-auto"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? '▲' : '▼'}
              </button>
            </>
          )}
        </div>
        
        {!isEditing && isExpanded && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button
              onClick={onStartDuplicate}
              className="text-theme-secondary hover:text-theme-primary text-sm"
              title="Duplicate list"
            >
              📋
            </button>
            {!isInbox && (
              <button
                onClick={onDelete}
                className="text-theme-secondary hover:text-theme-primary text-sm"
                title="Delete list"
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Tasks - Only show when expanded */}
      {isExpanded && (
        <div className="space-y-2">
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
        <div className="mt-2">
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
            className="w-full p-2 text-sm bg-theme-tertiary text-theme-primary placeholder-theme-secondary rounded"
          />
        </div>
      )}
    </div>
  )
}