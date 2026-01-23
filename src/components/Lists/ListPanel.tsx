'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { ListCard } from './ListCard'
import { formatDateForDisplay, getLocalTodayISO } from '@/lib/dateList'
import { List, Task } from '@/types/app'
import { DURATION_OPTIONS } from '@/lib/constants'


interface ListPanelProps {
  lists: List[]
  tasks: Task[]
  paletteId: string
  editingListId: string | null
  showNewListInput: boolean
  expandedListIds: Set<string>
  scheduledTaskIds: string[]
  onShowNewListInput: (show: boolean) => void
  onCreateList: (name: string) => void
  onEditList: (listId: string, name: string) => void
  onDeleteList: (listId: string) => void
  onClearList: (listId: string) => void
  onSetEditingListId: (listId: string | null) => void
  onToggleListExpanded: (listId: string) => void
  onTaskDurationChange: (taskId: string, duration: number) => void
  onTaskDelete: (taskId: string) => void
  onTaskCreate: (listId: string, title: string) => void
  onTaskEnergyChange: (taskId: string, level: 'high' | 'medium' | 'low') => void
  onTaskComplete: (taskId: string) => void
  onRollOverTasks: (fromListId: string, destination: 'today' | 'tomorrow') => void
  columnCount: 1 | 2
}

export function ListPanel({
  lists,
  tasks,
  paletteId,
  editingListId,
  showNewListInput,
  expandedListIds,
  scheduledTaskIds,
  onShowNewListInput,
  onCreateList,
  onEditList,
  onDeleteList,
  onClearList,
  onSetEditingListId,
  onToggleListExpanded,
  onTaskDurationChange,
  onTaskDelete,
  onTaskCreate,
  onTaskEnergyChange,
  onTaskComplete,
  onRollOverTasks,
  columnCount,
}: ListPanelProps) {
  const [newListName, setNewListName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const hasInitializedExpansion = useRef(false)


  // Initialize expansion state - expand first list with tasks
  useEffect(() => {
    // Only run once when lists are first loaded
    if (hasInitializedExpansion.current || lists.length === 0) return
    hasInitializedExpansion.current = true
    
    // Find first list with tasks and expand it
    const firstWithTasks = lists.find(list => {
      const taskCount = tasks.filter(t => t.list_id === list.id && !t.completed_at).length
      return taskCount > 0
    })
    
    if (firstWithTasks && expandedListIds.size === 0) {
      onToggleListExpanded(firstWithTasks.id)
    }
  }, [lists, tasks, expandedListIds, onToggleListExpanded])
  
  const getTasksForList = (listId: string) => {
    // Simple: return all tasks in this list that aren't completed
    return tasks.filter(t => t.list_id === listId && !t.completed_at)
  }
  
  const cycleDuration = (current: number, reverse: boolean) => {
    const durations = [...DURATION_OPTIONS] as number[]
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
          {lists.filter(l => l.list_type !== 'completed').map((list) => {
          const isExpanded = expandedListIds.has(list.id)
          const displayName = list.list_type === 'date' && list.list_date
            ? formatDateForDisplay(list.list_date)
            : list.name
          return (
            <ListCard
              key={list.id}
              id={list.id}
              name={displayName}
              isInbox={false}
              isSystemList={list.list_type === 'parked' || list.list_type === 'completed'}
              isDateList={list.list_type === 'date'}
              tasks={getTasksForList(list.id)}
              paletteId={paletteId}
              isEditing={editingListId === list.id}
              isExpanded={isExpanded}
              scheduledTaskIds={scheduledTaskIds}
              onToggleExpand={() => onToggleListExpanded(list.id)}
              onStartEdit={() => onSetEditingListId(list.id)}
              onFinishEdit={(name) => {
                onEditList(list.id, name)
                onSetEditingListId(null)
              }}
              onCancelEdit={() => onSetEditingListId(null)}
              onClearList={() => onClearList(list.id)}
              onDelete={() => onDeleteList(list.id)}
              onTaskDurationClick={(taskId, duration, reverse) => 
                onTaskDurationChange(taskId, cycleDuration(duration, reverse))
              }
              onTaskDelete={onTaskDelete}
              onTaskAdd={(title) => onTaskCreate(list.id, title)}
              onTaskEnergyChange={onTaskEnergyChange}
              onTaskComplete={onTaskComplete}
              onRollOver={
                list.list_type === 'date' 
                  ? (destination) => onRollOverTasks(list.id, destination)
                  : undefined
              }
              isToday={list.list_type === 'date' && list.list_date === getLocalTodayISO()}
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