'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TaskCard, AddTaskInput } from '@/components/Tasks'
import { ListCardMenu } from './ListCardMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Task } from '@/types/app'

interface ListCardProps {
  id: string
  name: string
  isInbox: boolean
  isSystemList: boolean
  isDateList: boolean
  tasks: Task[]
  paletteId: string
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
  onTaskDelete: (taskId: string) => void
  onTaskAdd: (title: string) => void
  onTaskDailyToggle: (taskId: string) => void
  onTaskEnergyChange: (taskId: string, level: 'high' | 'medium' | 'low') => void
  onTaskHighlightToggle: (taskId: string) => void
  onTaskComplete: (taskId: string) => void
  onReorderTasks: (taskIds: string[]) => void
  onRollOver?: () => void
}

export function ListCard({
  id,
  name,
  isInbox,
  isSystemList,
  isDateList,
  tasks,
  paletteId,
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
  onTaskDelete,
  onTaskAdd,
  onTaskDailyToggle,
  onTaskEnergyChange,
  onTaskHighlightToggle,
  onTaskComplete,
  onReorderTasks,
  onRollOver,
}: ListCardProps) {
  const [editName, setEditName] = useState(name)
  const [duplicateName, setDuplicateName] = useState(`${name} Copy`)

  const canDeleteList = (): boolean => {
    // System lists (Limbo, Parked Items) - never deletable
    if (isSystemList && !isDateList) return false
    
    // Date lists - only deletable if date is before today
    if (isDateList) {
      // Parse "Jan 13, 2026" format
      const listDate = new Date(name)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      listDate.setHours(0, 0, 0, 0)
      console.log('canDeleteList:', { name, listDate, today, canDelete: listDate < today })
      return listDate < today
    }
    
    // User-created lists - always deletable
    return true
  }

  const handleDragEnd = (result: DropResult) => {
    console.log('Drag ended:', result)
    
    // Dropped outside the list
    if (!result.destination) {
      return
    }
    
    // Didn't move
    if (result.destination.index === result.source.index) {
      return
    }
    
    // Get tasks for this list (not completed)
    const listTasks = tasks
      .filter(t => !t.is_completed)
      .sort((a, b) => a.position - b.position)
    
    // Reorder the array
    const reordered = Array.from(listTasks)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)
    
    // Get new order of IDs
    const newTaskIds = reordered.map(t => t.id)
    console.log('New order:', newTaskIds)
    
    // Call the handler
    onReorderTasks(newTaskIds)
  }

  
  // Get the first task's color for accent bar
  const getFirstTaskColor = () => {
    if (tasks.length === 0) return 'hsl(var(--primary))' // Default primary color
    const firstTask = tasks[0]
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    return colors[firstTask.color_index] || 'hsl(var(--primary))'
  }
  
  return (
    <div 
      className={`
        rounded-xl overflow-hidden border-2 border-border shadow-lg bg-card transition-all duration-200
        ${isExpanded 
          ? 'shadow-xl' 
          : 'hover:shadow-xl'
        }
      `}
      style={{ breakInside: 'avoid', marginBottom: '1rem' }}
    >
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
        <div className="p-4 flex items-center justify-between border-b border-border">
          {/* Left side - clickable to toggle expand */}
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
          >
            {/* Colored accent bar */}
            <div 
              className="w-1 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: getFirstTaskColor() }}
            />
            <div>
              <h3 
                className="font-semibold text-card-foreground"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (!isSystemList) {
                    onStartEdit()
                  }
                }}
              >
                {name}
              </h3>
              <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
            </div>
          </button>
          
          {/* Right side - menu and chevron */}
          <div className="flex items-center gap-2">
            {/* Three dots menu - only when expanded */}
            {isExpanded && !isEditing && (
              <ListCardMenu
                isSystemList={isSystemList}
                canDelete={canDeleteList()}
                onEdit={onStartEdit}
                onDuplicate={onStartDuplicate}
                onDelete={onDelete}
              />
            )}
            
            {/* Expand/collapse icon */}
            <button
              onClick={onToggleExpand}
              className={`w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
      
      {/* Expanded content with animation */}
      {isExpanded && (
        <div className="px-4 pb-4">
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2 max-h-[60vh] overflow-y-auto pr-1"
                >
                  {tasks
                    .filter(t => !t.is_completed)
                    .sort((a, b) => a.position - b.position)
                    .map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            <TaskCard
                              id={task.id}
                              title={task.title}
                              durationMinutes={task.duration_minutes}
                              colorIndex={task.color_index}
                              isCompleted={task.is_completed}
                              isScheduled={scheduledTaskIds.includes(task.id)}
                              isDaily={task.is_daily}
                              isInPurgatory={isInbox}
                              isHighlight={task.highlight_date !== null}
                              canHighlight={isDateList}
                              energyLevel={task.energy_level || 'medium'}
                              paletteId={paletteId}
                              onDurationClick={(reverse) => onTaskDurationClick(task.id, task.duration_minutes, reverse)}
                              onEnergyChange={(level) => onTaskEnergyChange(task.id, level)}
                              onDailyToggle={() => onTaskDailyToggle(task.id)}
                              onHighlightToggle={() => onTaskHighlightToggle(task.id)}
                              onComplete={() => onTaskComplete(task.id)}
                              onDelete={() => onTaskDelete(task.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          {/* Roll Over button - only for date lists with incomplete tasks */}
          {isDateList && !isInbox && tasks.filter(t => !t.is_completed).length > 0 && onRollOver && (
            <button
              onClick={onRollOver}
              className="w-full mt-2 mb-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md border border-dashed border-slate-300 dark:border-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              <span>→</span>
              <span>Roll over to tomorrow</span>
            </button>
          )}

          {/* Add task input */}
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