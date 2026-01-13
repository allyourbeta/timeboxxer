'use client'

import { useState } from 'react'
import { ListCard } from './ListCard'

interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
}

interface List {
  id: string
  name: string
  position: number
  is_inbox: boolean
}

interface ListPanelProps {
  lists: List[]
  tasks: Task[]
  paletteId: string
  colorPickerTaskId: string | null
  editingListId: string | null
  duplicatingListId: string | null
  showNewListInput: boolean
  expandedListByColumn: Record<number, string | null>
  onShowNewListInput: (show: boolean) => void
  onCreateList: (name: string) => void
  onEditList: (listId: string, name: string) => void
  onDeleteList: (listId: string) => void
  onDuplicateList: (listId: string, newName: string) => void
  onSetEditingListId: (listId: string | null) => void
  onSetDuplicatingListId: (listId: string | null) => void
  onToggleListExpanded: (listId: string, column: number) => void
  onTaskDragStart: (taskId: string) => void
  onTaskDurationChange: (taskId: string, duration: number) => void
  onTaskColorClick: (taskId: string) => void
  onTaskColorSelect: (taskId: string, colorIndex: number) => void
  onTaskDelete: (taskId: string) => void
  onTaskCreate: (listId: string, title: string) => void
}

export function ListPanel({
  lists,
  tasks,
  paletteId,
  colorPickerTaskId,
  editingListId,
  duplicatingListId,
  showNewListInput,
  expandedListByColumn,
  onShowNewListInput,
  onCreateList,
  onEditList,
  onDeleteList,
  onDuplicateList,
  onSetEditingListId,
  onSetDuplicatingListId,
  onToggleListExpanded,
  onTaskDragStart,
  onTaskDurationChange,
  onTaskColorClick,
  onTaskColorSelect,
  onTaskDelete,
  onTaskCreate,
}: ListPanelProps) {
  const [newListName, setNewListName] = useState('')
  
  const getTasksForList = (listId: string) =>
    tasks.filter(t => t.list_id === listId && !t.is_completed)
  
  const cycleDuration = (current: number) => {
    const durations = [15, 30, 45, 60]
    const idx = durations.indexOf(current)
    return durations[(idx + 1) % durations.length]
  }
  
  return (
    <div className="border-r border-gray-700 overflow-y-auto">
      <div className="grid grid-cols-3 gap-4 p-4">
        {lists.map((list, index) => {
          const column = index % 3
          const isExpanded = expandedListByColumn[column] === list.id
          return (
            <ListCard
              key={list.id}
              id={list.id}
              name={list.name}
              isInbox={list.is_inbox}
              tasks={getTasksForList(list.id)}
              paletteId={paletteId}
              colorPickerTaskId={colorPickerTaskId}
              isEditing={editingListId === list.id}
              isDuplicating={duplicatingListId === list.id}
              isExpanded={isExpanded}
              onToggleExpand={() => onToggleListExpanded(list.id, column)}
              onStartEdit={() => onSetEditingListId(list.id)}
              onFinishEdit={(name) => {
                onEditList(list.id, name)
                onSetEditingListId(null)
              }}
              onCancelEdit={() => onSetEditingListId(null)}
              onStartDuplicate={() => onSetDuplicatingListId(list.id)}
              onFinishDuplicate={(name) => {
                onDuplicateList(list.id, name)
                onSetDuplicatingListId(null)
              }}
              onCancelDuplicate={() => onSetDuplicatingListId(null)}
              onDelete={() => onDeleteList(list.id)}
              onTaskDragStart={onTaskDragStart}
              onTaskDurationClick={(taskId, duration) => 
                onTaskDurationChange(taskId, cycleDuration(duration))
              }
              onTaskColorClick={onTaskColorClick}
              onTaskColorSelect={onTaskColorSelect}
              onTaskDelete={onTaskDelete}
              onTaskAdd={(title) => onTaskCreate(list.id, title)}
            />
          )
        })}
        
        {/* Add new list */}
        {showNewListInput ? (
          <div className="bg-gray-800 rounded-lg p-3">
            <input
              type="text"
              placeholder="List name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newListName.trim()) {
                  onCreateList(newListName.trim())
                  setNewListName('')
                  onShowNewListInput(false)
                }
                if (e.key === 'Escape') {
                  setNewListName('')
                  onShowNewListInput(false)
                }
              }}
              onBlur={() => {
                if (!newListName.trim()) {
                  onShowNewListInput(false)
                }
              }}
              autoFocus
              className="w-full p-2 text-sm bg-gray-700 text-white placeholder-gray-400 rounded"
            />
          </div>
        ) : (
          <button
            onClick={() => onShowNewListInput(true)}
            className="w-full p-3 text-left text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors border border-dashed border-gray-600"
          >
            + Add List
          </button>
        )}
      </div>
    </div>
  )
}