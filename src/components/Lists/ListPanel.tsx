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
  position: number
  is_completed: boolean
  // Limbo fields
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

interface List {
  id: string
  name: string
  position: number
  is_collapsed: boolean
  is_system: boolean
  system_type: 'purgatory' | 'parked' | 'date' | null
}

interface ListPanelProps {
  lists: List[]
  tasks: Task[]
  paletteId: string
  editingListId: string | null
  duplicatingListId: string | null
  showNewListInput: boolean
  expandedListIds: Set<string>
  scheduledTaskIds: string[]
  onShowNewListInput: (show: boolean) => void
  onCreateList: (name: string) => void
  onEditList: (listId: string, name: string) => void
  onDeleteList: (listId: string) => void
  onDuplicateList: (listId: string, newName: string) => void
  onSetEditingListId: (listId: string | null) => void
  onSetDuplicatingListId: (listId: string | null) => void
  onToggleListExpanded: (listId: string) => void
  onTaskDurationChange: (taskId: string, duration: number) => void
  onTaskDelete: (taskId: string) => void
  onTaskCreate: (listId: string, title: string) => void
  onTaskDailyToggle: (taskId: string) => void
  onTaskEnergyChange: (taskId: string, level: 'high' | 'medium' | 'low') => void
  onTaskHighlightToggle: (taskId: string) => void
  onTaskComplete: (taskId: string) => void
  onReorderTasks: (taskIds: string[]) => void
  columnCount: 1 | 2
}

export function ListPanel({
  lists,
  tasks,
  paletteId,
  editingListId,
  duplicatingListId,
  showNewListInput,
  expandedListIds,
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
  onTaskDelete,
  onTaskCreate,
  onTaskDailyToggle,
  onTaskEnergyChange,
  onTaskHighlightToggle,
  onTaskComplete,
  onReorderTasks,
  columnCount,
}: ListPanelProps) {
  const [newListName, setNewListName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const hasInitializedExpansion = useRef(false)

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

  // Initialize expansion state - expand first list with tasks
  useEffect(() => {
    // Only run once when lists are first loaded
    if (hasInitializedExpansion.current || lists.length === 0) return
    hasInitializedExpansion.current = true
    
    // Find first list with tasks and expand it
    const firstWithTasks = lists.find(list => {
      const taskCount = tasks.filter(t => t.list_id === list.id && !t.is_completed).length
      return taskCount > 0
    })
    
    if (firstWithTasks && expandedListIds.size === 0) {
      onToggleListExpanded(firstWithTasks.id)
    }
  }, [lists, tasks, expandedListIds, onToggleListExpanded])
  
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
      <div className="p-4" style={{ columnCount: columnCount, columnGap: '1rem' }}>
        {lists.map((list) => {
          const isExpanded = expandedListIds.has(list.id)
          return (
            <ListCard
              key={list.id}
              id={list.id}
              name={list.name}
              isInbox={list.system_type === 'purgatory'}
              isSystemList={list.is_system}
              isDateList={list.system_type === 'date'}
              tasks={getTasksForList(list.id)}
              paletteId={paletteId}
              isEditing={editingListId === list.id}
              isDuplicating={duplicatingListId === list.id}
              isExpanded={isExpanded}
              scheduledTaskIds={scheduledTaskIds}
              onToggleExpand={() => onToggleListExpanded(list.id)}
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
              onTaskDelete={onTaskDelete}
              onTaskAdd={(title) => onTaskCreate(list.id, title)}
              onTaskDailyToggle={onTaskDailyToggle}
              onTaskEnergyChange={onTaskEnergyChange}
              onTaskHighlightToggle={onTaskHighlightToggle}
              onTaskComplete={onTaskComplete}
              onReorderTasks={onReorderTasks}
            />
          )
        })}
        
        {/* Add new list */}
        {showNewListInput ? (
          <div className="bg-theme-secondary rounded-lg p-3" style={{ breakInside: 'avoid', marginBottom: '1rem' }}>
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
            style={{ breakInside: 'avoid', marginBottom: '1rem' }}
          >
            + Add List
          </button>
        )}
      </div>
    </div>
  )
}