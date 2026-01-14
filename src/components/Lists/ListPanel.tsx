'use client'

import { useState, useEffect, useRef } from 'react'
import { Draggable } from '@fullcalendar/interaction'
import { Plus } from 'lucide-react'
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
  is_collapsed: boolean
  is_system: boolean
  system_type: 'purgatory' | 'date' | null
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
  scheduledTaskIds: string[]
  onShowNewListInput: (show: boolean) => void
  onCreateList: (name: string) => void
  onEditList: (listId: string, name: string) => void
  onDeleteList: (listId: string) => void
  onDuplicateList: (listId: string, newName: string) => void
  onSetEditingListId: (listId: string | null) => void
  onSetDuplicatingListId: (listId: string | null) => void
  onToggleListExpanded: (listId: string, column: number) => void
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
  scheduledTaskIds,
  onShowNewListInput,
  onCreateList,
  onEditList,
  onDeleteList,
  onDuplicateList,
  onSetEditingListId,
  onSetDuplicatingListId,
  onToggleListExpanded,
  onTaskDurationChange,
  onTaskColorClick,
  onTaskColorSelect,
  onTaskDelete,
  onTaskCreate,
}: ListPanelProps) {
  const [newListName, setNewListName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize FullCalendar Draggable for external drag
  useEffect(() => {
    if (!containerRef.current) return
    
    const draggable = new Draggable(containerRef.current, {
      itemSelector: '[data-task-id]',
      eventData: (eventEl) => {
        const taskId = eventEl.getAttribute('data-task-id')
        const title = eventEl.getAttribute('data-title')
        const duration = parseInt(eventEl.getAttribute('data-duration') || '30', 10)
        const color = eventEl.getAttribute('data-color')
        
        return {
          id: `temp-${taskId}`,
          title: title || 'Task',
          duration: { minutes: duration },
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            taskId,
            isExternal: true
          }
        }
      }
    })
    
    return () => draggable.destroy()
  }, [])
  
  const getTasksForList = (listId: string) =>
    tasks.filter(t => t.list_id === listId && !t.is_completed)
  
  const cycleDuration = (current: number, reverse: boolean) => {
    const durations = [15, 30, 45, 60]
    const idx = durations.indexOf(current)
    if (idx === -1) return 30 // Default if current not in list
    
    if (reverse) {
      return durations[(idx - 1 + durations.length) % durations.length]
    }
    return durations[(idx + 1) % durations.length]
  }
  
  return (
    <div ref={containerRef} className="border-r border-theme overflow-y-auto">
      <div className="grid grid-cols-3 gap-4 p-4">
        {lists.map((list, index) => {
          const column = index % 3
          const isExpanded = expandedListByColumn[column] === list.id
          return (
            <ListCard
              key={list.id}
              id={list.id}
              name={list.name}
              isInbox={list.system_type === 'purgatory'}
              tasks={getTasksForList(list.id)}
              paletteId={paletteId}
              colorPickerTaskId={colorPickerTaskId}
              isEditing={editingListId === list.id}
              isDuplicating={duplicatingListId === list.id}
              isExpanded={isExpanded}
              scheduledTaskIds={scheduledTaskIds}
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
              onTaskDurationClick={(taskId, duration, reverse) => 
                onTaskDurationChange(taskId, cycleDuration(duration, reverse))
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
          <div className="bg-theme-secondary rounded-lg p-3">
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
              className="w-full p-2 text-sm bg-theme-tertiary text-theme-primary placeholder-theme-secondary rounded"
            />
          </div>
        ) : (
          <button
            onClick={() => onShowNewListInput(true)}
            className="w-full p-3 text-left text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary rounded-lg transition-colors border border-dashed border-theme"
          >
            + Add List
          </button>
        )}
      </div>
    </div>
  )
}