# MANDATORY REFACTORING SPEC

> **CLAUDE CODE: THIS IS NOT OPTIONAL. DO NOT SKIP ANY STEP.**
> 
> The current `src/app/page.tsx` is 695 lines. This VIOLATES the 300-line limit.
> You MUST refactor it into components, stores, and services.
> Do NOT add features. ONLY refactor.
> 
> After refactoring, NO FILE may exceed 300 lines. Verify with `wc -l`.

---

## STEP 1: Create Zustand Stores

### 1.1 Install Zustand (if not installed)
```bash
npm install zustand
```

### 1.2 Create `src/state/useTaskStore.ts`
```typescript
import { create } from 'zustand'
import { getTasks, createTask as apiCreateTask, updateTask as apiUpdateTask, deleteTask as apiDeleteTask, completeTask as apiCompleteTask, uncompleteTask as apiUncompleteTask } from '@/api'

interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  completed_at: string | null
}

interface TaskStore {
  tasks: Task[]
  loading: boolean
  
  // Actions
  loadTasks: () => Promise<void>
  createTask: (listId: string, title: string) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  uncompleteTask: (taskId: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: true,
  
  loadTasks: async () => {
    const data = await getTasks()
    set({ tasks: data || [], loading: false })
  },
  
  createTask: async (listId, title) => {
    const newTask = await apiCreateTask(listId, title)
    set({ tasks: [...get().tasks, newTask] })
  },
  
  updateTask: async (taskId, updates) => {
    await apiUpdateTask(taskId, updates)
    set({
      tasks: get().tasks.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      )
    })
  },
  
  deleteTask: async (taskId) => {
    await apiDeleteTask(taskId)
    set({ tasks: get().tasks.filter(t => t.id !== taskId) })
  },
  
  completeTask: async (taskId) => {
    await apiCompleteTask(taskId)
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId 
          ? { ...t, is_completed: true, completed_at: new Date().toISOString() }
          : t
      )
    })
  },
  
  uncompleteTask: async (taskId) => {
    await apiUncompleteTask(taskId)
    set({
      tasks: get().tasks.map(t =>
        t.id === taskId ? { ...t, is_completed: false, completed_at: null } : t
      )
    })
  },
}))
```

### 1.3 Create `src/state/useListStore.ts`
```typescript
import { create } from 'zustand'
import { getLists, createList as apiCreateList, updateList as apiUpdateList, deleteList as apiDeleteList, duplicateList as apiDuplicateList } from '@/api'

interface List {
  id: string
  name: string
  position: number
  is_inbox: boolean
}

interface ListStore {
  lists: List[]
  loading: boolean
  
  loadLists: () => Promise<void>
  createList: (name: string) => Promise<void>
  updateList: (listId: string, name: string) => Promise<void>
  deleteList: (listId: string) => Promise<void>
  duplicateList: (listId: string, newName: string) => Promise<void>
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  loading: true,
  
  loadLists: async () => {
    const data = await getLists()
    set({ lists: data || [], loading: false })
  },
  
  createList: async (name) => {
    const newList = await apiCreateList(name)
    set({ lists: [...get().lists, newList] })
  },
  
  updateList: async (listId, name) => {
    await apiUpdateList(listId, name)
    set({
      lists: get().lists.map(l => 
        l.id === listId ? { ...l, name } : l
      )
    })
  },
  
  deleteList: async (listId) => {
    await apiDeleteList(listId)
    set({ lists: get().lists.filter(l => l.id !== listId) })
  },
  
  duplicateList: async (listId, newName) => {
    const newListId = await apiDuplicateList(listId, newName)
    // Reload lists to get the new one with tasks
    await get().loadLists()
  },
}))
```

### 1.4 Create `src/state/useScheduleStore.ts`
```typescript
import { create } from 'zustand'
import { getScheduledTasks, scheduleTask as apiScheduleTask, unscheduleTask as apiUnscheduleTask, updateScheduleTime as apiUpdateScheduleTime } from '@/api'

interface ScheduledTask {
  id: string
  task_id: string
  scheduled_date: string
  start_time: string
}

interface ScheduleStore {
  scheduled: ScheduledTask[]
  loading: boolean
  
  loadSchedule: () => Promise<void>
  scheduleTask: (taskId: string, date: string, time: string) => Promise<void>
  unscheduleTask: (taskId: string) => Promise<void>
  updateTime: (scheduleId: string, time: string) => Promise<void>
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  scheduled: [],
  loading: true,
  
  loadSchedule: async () => {
    const data = await getScheduledTasks()
    set({ scheduled: data || [], loading: false })
  },
  
  scheduleTask: async (taskId, date, time) => {
    const newSchedule = await apiScheduleTask(taskId, date, time)
    // Remove any existing schedule for this task, add new one
    set({
      scheduled: [
        ...get().scheduled.filter(s => s.task_id !== taskId),
        newSchedule
      ]
    })
  },
  
  unscheduleTask: async (taskId) => {
    await apiUnscheduleTask(taskId)
    set({ scheduled: get().scheduled.filter(s => s.task_id !== taskId) })
  },
  
  updateTime: async (scheduleId, time) => {
    await apiUpdateScheduleTime(scheduleId, time)
    set({
      scheduled: get().scheduled.map(s =>
        s.id === scheduleId ? { ...s, start_time: time } : s
      )
    })
  },
}))
```

### 1.5 Create `src/state/useUIStore.ts`
```typescript
import { create } from 'zustand'

interface UIStore {
  // View state
  currentView: 'main' | 'completed'
  setCurrentView: (view: 'main' | 'completed') => void
  
  // Drag state
  draggedTaskId: string | null
  setDraggedTaskId: (taskId: string | null) => void
  
  // Color picker
  colorPickerTaskId: string | null
  openColorPicker: (taskId: string) => void
  closeColorPicker: () => void
  
  // List editing
  editingListId: string | null
  setEditingListId: (listId: string | null) => void
  
  // New list input
  showNewListInput: boolean
  setShowNewListInput: (show: boolean) => void
  
  // Duplicate list
  duplicatingListId: string | null
  setDuplicatingListId: (listId: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: 'main',
  setCurrentView: (view) => set({ currentView: view }),
  
  draggedTaskId: null,
  setDraggedTaskId: (taskId) => set({ draggedTaskId: taskId }),
  
  colorPickerTaskId: null,
  openColorPicker: (taskId) => set({ colorPickerTaskId: taskId }),
  closeColorPicker: () => set({ colorPickerTaskId: null }),
  
  editingListId: null,
  setEditingListId: (listId) => set({ editingListId: listId }),
  
  showNewListInput: false,
  setShowNewListInput: (show) => set({ showNewListInput: show }),
  
  duplicatingListId: null,
  setDuplicatingListId: (listId) => set({ duplicatingListId: listId }),
}))
```

### 1.6 Create `src/state/index.ts`
```typescript
export { useTaskStore } from './useTaskStore'
export { useListStore } from './useListStore'
export { useScheduleStore } from './useScheduleStore'
export { useUIStore } from './useUIStore'
```

---

## STEP 2: Create Components

Each component MUST:
- Be under 150 lines (to leave room for growth)
- Accept data via props
- Emit events via callback props
- NOT import from `@/api` directly
- NOT contain business logic

### 2.1 Create `src/components/Tasks/TaskCard.tsx`
```typescript
'use client'

import { getColor } from '@/lib/palettes'

interface TaskCardProps {
  id: string
  title: string
  durationMinutes: number
  colorIndex: number
  isCompleted: boolean
  paletteId: string
  isColorPickerOpen: boolean
  onDragStart: () => void
  onDurationClick: () => void
  onColorClick: () => void
  onColorSelect: (colorIndex: number) => void
  onDelete: () => void
}

export function TaskCard({
  id,
  title,
  durationMinutes,
  colorIndex,
  isCompleted,
  paletteId,
  isColorPickerOpen,
  onDragStart,
  onDurationClick,
  onColorClick,
  onColorSelect,
  onDelete,
}: TaskCardProps) {
  const bgColor = getColor(paletteId, colorIndex)
  
  return (
    <div
      draggable={!isCompleted}
      onDragStart={onDragStart}
      className={`p-3 rounded cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] group relative ${
        isCompleted ? 'opacity-50' : ''
      }`}
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-start gap-2">
        {/* Color dot */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onColorClick()
          }}
          className="w-4 h-4 rounded-full border-2 border-white/30 hover:border-white/60 flex-shrink-0 mt-1"
          style={{ backgroundColor: bgColor }}
          title="Change color"
        />
        
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-white ${isCompleted ? 'line-through' : ''}`}>
            {title}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDurationClick()
            }}
            className="text-sm text-white/70 hover:text-white cursor-pointer"
          >
            {durationMinutes} min
          </button>
        </div>
        
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="opacity-0 group-hover:opacity-100 text-white/70 hover:text-white transition-opacity"
          title="Delete task"
        >
          🗑
        </button>
      </div>
      
      {/* Color picker popover */}
      {isColorPickerOpen && (
        <div
          className="absolute top-full left-0 mt-1 p-2 bg-gray-800 rounded-lg shadow-lg z-20 grid grid-cols-6 gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <button
              key={i}
              onClick={() => onColorSelect(i)}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform"
              style={{ backgroundColor: getColor(paletteId, i) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### 2.2 Create `src/components/Tasks/AddTaskInput.tsx`
```typescript
'use client'

import { useState } from 'react'

interface AddTaskInputProps {
  onAdd: (title: string) => void
}

export function AddTaskInput({ onAdd }: AddTaskInputProps) {
  const [value, setValue] = useState('')
  
  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim())
      setValue('')
    }
  }
  
  return (
    <input
      type="text"
      placeholder="Add task..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyPress={(e) => {
        if (e.key === 'Enter') handleSubmit()
      }}
      className="w-full p-2 text-sm bg-gray-700 text-white placeholder-gray-400 rounded border-none outline-none focus:ring-2 focus:ring-blue-500"
    />
  )
}
```

### 2.3 Create `src/components/Tasks/index.ts`
```typescript
export { TaskCard } from './TaskCard'
export { AddTaskInput } from './AddTaskInput'
```

### 2.4 Create `src/components/Lists/ListCard.tsx`
```typescript
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
    <div className="bg-gray-800 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 group">
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
            className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
          />
        ) : (
          <h2
            className="font-semibold text-gray-300 cursor-pointer hover:text-white"
            onDoubleClick={onStartEdit}
          >
            {name}
          </h2>
        )}
        
        {!isEditing && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onStartDuplicate}
              className="text-gray-400 hover:text-white text-sm"
              title="Duplicate list"
            >
              📋
            </button>
            {!isInbox && (
              <button
                onClick={onDelete}
                className="text-gray-400 hover:text-white text-sm"
                title="Delete list"
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Tasks */}
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
            className="w-full p-2 text-sm bg-gray-700 text-white placeholder-gray-400 rounded"
          />
        </div>
      )}
    </div>
  )
}
```

### 2.5 Create `src/components/Lists/ListPanel.tsx`
```typescript
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
  onShowNewListInput: (show: boolean) => void
  onCreateList: (name: string) => void
  onEditList: (listId: string, name: string) => void
  onDeleteList: (listId: string) => void
  onDuplicateList: (listId: string, newName: string) => void
  onSetEditingListId: (listId: string | null) => void
  onSetDuplicatingListId: (listId: string | null) => void
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
  onShowNewListInput,
  onCreateList,
  onEditList,
  onDeleteList,
  onDuplicateList,
  onSetEditingListId,
  onSetDuplicatingListId,
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
    <div className="w-80 border-r border-gray-700 overflow-y-auto p-4 space-y-4">
      {lists.map(list => (
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
      ))}
      
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
  )
}
```

### 2.6 Create `src/components/Lists/index.ts`
```typescript
export { ListCard } from './ListCard'
export { ListPanel } from './ListPanel'
```

### 2.7 Create `src/components/Calendar/ScheduledTaskBlock.tsx`
```typescript
'use client'

import { getColor } from '@/lib/palettes'

interface ScheduledTaskBlockProps {
  title: string
  durationMinutes: number
  colorIndex: number
  paletteId: string
  height: number
  onUnschedule: () => void
  onComplete: () => void
}

export function ScheduledTaskBlock({
  title,
  durationMinutes,
  colorIndex,
  paletteId,
  height,
  onUnschedule,
  onComplete,
}: ScheduledTaskBlockProps) {
  return (
    <div
      className="absolute left-0 right-2 rounded px-2 py-1 z-10 group"
      style={{
        backgroundColor: getColor(paletteId, colorIndex),
        height,
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm truncate">{title}</div>
          <div className="text-xs text-white/70">{durationMinutes} min</div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onUnschedule}
            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs"
            title="Unschedule"
          >
            ×
          </button>
          <button
            onClick={onComplete}
            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs"
            title="Mark complete"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 2.8 Create `src/components/Calendar/TimeSlot.tsx`
```typescript
'use client'

import { ScheduledTaskBlock } from './ScheduledTaskBlock'

interface ScheduledTask {
  taskId: string
  title: string
  durationMinutes: number
  colorIndex: number
}

interface TimeSlotProps {
  time: string
  isHour: boolean
  scheduledTask: ScheduledTask | null
  taskHeight: number
  paletteId: string
  onDrop: () => void
  onUnschedule: () => void
  onComplete: () => void
}

export function TimeSlot({
  time,
  isHour,
  scheduledTask,
  taskHeight,
  paletteId,
  onDrop,
  onUnschedule,
  onComplete,
}: TimeSlotProps) {
  return (
    <div
      className={`h-12 flex items-stretch border-b ${
        isHour ? 'border-gray-600' : 'border-gray-800'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Time label */}
      <div className="w-16 text-xs text-gray-500 pr-2 text-right pt-1">
        {isHour ? time : ''}
      </div>
      
      {/* Slot */}
      <div className="flex-1 relative">
        {scheduledTask ? (
          <ScheduledTaskBlock
            title={scheduledTask.title}
            durationMinutes={scheduledTask.durationMinutes}
            colorIndex={scheduledTask.colorIndex}
            paletteId={paletteId}
            height={taskHeight}
            onUnschedule={onUnschedule}
            onComplete={onComplete}
          />
        ) : (
          <div className="h-full w-full hover:bg-gray-800/50 transition-colors" />
        )}
      </div>
    </div>
  )
}
```

### 2.9 Create `src/components/Calendar/DayView.tsx`
```typescript
'use client'

import { TimeSlot } from './TimeSlot'

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
}

interface ScheduledTask {
  id: string
  task_id: string
  start_time: string
}

interface DayViewProps {
  tasks: Task[]
  scheduled: ScheduledTask[]
  paletteId: string
  onDrop: (time: string) => void
  onUnschedule: (taskId: string) => void
  onComplete: (taskId: string) => void
}

function generateTimeSlots() {
  const slots = []
  for (let hour = 6; hour < 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function DayView({
  tasks,
  scheduled,
  paletteId,
  onDrop,
  onUnschedule,
  onComplete,
}: DayViewProps) {
  const getScheduledTaskAtTime = (time: string) => {
    const schedule = scheduled.find(s => s.start_time.startsWith(time))
    if (!schedule) return null
    const task = tasks.find(t => t.id === schedule.task_id)
    if (!task) return null
    return {
      taskId: task.id,
      title: task.title,
      durationMinutes: task.duration_minutes,
      colorIndex: task.color_index,
    }
  }
  
  const getTaskHeight = (duration: number) => {
    const slots = duration / 15
    return slots * 48 - 4
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex gap-2 mb-4">
        <h2 className="text-lg font-semibold">Today</h2>
      </div>
      
      <div className="relative">
        {TIME_SLOTS.map((time) => {
          const scheduledTask = getScheduledTaskAtTime(time)
          
          return (
            <TimeSlot
              key={time}
              time={time}
              isHour={time.endsWith(':00')}
              scheduledTask={scheduledTask}
              taskHeight={scheduledTask ? getTaskHeight(scheduledTask.durationMinutes) : 0}
              paletteId={paletteId}
              onDrop={() => onDrop(time)}
              onUnschedule={() => scheduledTask && onUnschedule(scheduledTask.taskId)}
              onComplete={() => scheduledTask && onComplete(scheduledTask.taskId)}
            />
          )
        })}
      </div>
    </div>
  )
}
```

### 2.10 Create `src/components/Calendar/index.ts`
```typescript
export { DayView } from './DayView'
export { TimeSlot } from './TimeSlot'
export { ScheduledTaskBlock } from './ScheduledTaskBlock'
```

### 2.11 Create `src/components/Layout/Header.tsx`
```typescript
'use client'

interface HeaderProps {
  currentView: 'main' | 'completed'
  onViewChange: (view: 'main' | 'completed') => void
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  return (
    <header className="p-4 border-b border-gray-700 flex items-center justify-between">
      <h1 className="text-xl font-bold">Timeboxxer</h1>
      <div className="flex gap-2">
        <button
          onClick={() => onViewChange('main')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            currentView === 'main'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => onViewChange('completed')}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            currentView === 'completed'
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Completed
        </button>
      </div>
    </header>
  )
}
```

### 2.12 Create `src/components/Layout/CompletedView.tsx`
```typescript
'use client'

import { getColor } from '@/lib/palettes'

interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  completed_at: string | null
}

interface List {
  id: string
  name: string
}

interface CompletedViewProps {
  tasks: Task[]
  lists: List[]
  paletteId: string
  onRestore: (taskId: string) => void
}

export function CompletedView({ tasks, lists, paletteId, onRestore }: CompletedViewProps) {
  const completedTasks = tasks
    .filter(t => t.completed_at)
    .sort((a, b) => 
      new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime()
    )
  
  const getListName = (listId: string | null) => {
    if (!listId) return 'Unknown list'
    return lists.find(l => l.id === listId)?.name || 'Unknown list'
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Completed Tasks</h2>
        <p className="text-sm text-gray-400">Tasks you've finished</p>
      </div>
      
      <div className="space-y-2">
        {completedTasks.map(task => (
          <div
            key={task.id}
            className="p-3 rounded-lg bg-gray-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: getColor(paletteId, task.color_index) }}
              />
              <div>
                <div className="font-medium text-white">{task.title}</div>
                <div className="text-xs text-gray-400">
                  From: {getListName(task.list_id)} • {task.duration_minutes} min • 
                  Completed {new Date(task.completed_at!).toLocaleString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => onRestore(task.id)}
              className="px-2 py-1 text-xs bg-blue-500/80 hover:bg-blue-500 text-white rounded"
            >
              Restore
            </button>
          </div>
        ))}
        
        {completedTasks.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p>No completed tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2.13 Create `src/components/Layout/index.ts`
```typescript
export { Header } from './Header'
export { CompletedView } from './CompletedView'
```

---

## STEP 3: Rewrite page.tsx

Replace the entire `src/app/page.tsx` with this clean version that uses stores and components:
```typescript
'use client'

import { useEffect } from 'react'
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
import { Header, CompletedView } from '@/components/Layout'
import { ListPanel } from '@/components/Lists'
import { DayView } from '@/components/Calendar'

const PALETTE_ID = 'ocean-bold'

export default function Home() {
  // Stores
  const { tasks, loading: tasksLoading, loadTasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask } = useTaskStore()
  const { lists, loading: listsLoading, loadLists, createList, updateList, deleteList, duplicateList } = useListStore()
  const { scheduled, loading: scheduleLoading, loadSchedule, scheduleTask, unscheduleTask } = useScheduleStore()
  const { 
    currentView, setCurrentView,
    draggedTaskId, setDraggedTaskId,
    colorPickerTaskId, openColorPicker, closeColorPicker,
    editingListId, setEditingListId,
    duplicatingListId, setDuplicatingListId,
    showNewListInput, setShowNewListInput,
  } = useUIStore()
  
  // Load data on mount
  useEffect(() => {
    loadTasks()
    loadLists()
    loadSchedule()
  }, [loadTasks, loadLists, loadSchedule])
  
  // Close color picker on outside click
  useEffect(() => {
    if (colorPickerTaskId) {
      const handler = () => closeColorPicker()
      document.addEventListener('click', handler)
      return () => document.removeEventListener('click', handler)
    }
  }, [colorPickerTaskId, closeColorPicker])
  
  const loading = tasksLoading || listsLoading || scheduleLoading
  
  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>
  }
  
  const handleDrop = async (time: string) => {
    if (!draggedTaskId) return
    const today = new Date().toISOString().split('T')[0]
    await scheduleTask(draggedTaskId, today, time + ':00')
    setDraggedTaskId(null)
  }
  
  const handleDurationChange = async (taskId: string, newDuration: number) => {
    await updateTask(taskId, { duration_minutes: newDuration })
  }
  
  const handleColorSelect = async (taskId: string, colorIndex: number) => {
    await updateTask(taskId, { color_index: colorIndex })
    closeColorPicker()
  }
  
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'main' ? (
          <>
            <ListPanel
              lists={lists}
              tasks={tasks}
              paletteId={PALETTE_ID}
              colorPickerTaskId={colorPickerTaskId}
              editingListId={editingListId}
              duplicatingListId={duplicatingListId}
              showNewListInput={showNewListInput}
              onShowNewListInput={setShowNewListInput}
              onCreateList={createList}
              onEditList={updateList}
              onDeleteList={deleteList}
              onDuplicateList={duplicateList}
              onSetEditingListId={setEditingListId}
              onSetDuplicatingListId={setDuplicatingListId}
              onTaskDragStart={setDraggedTaskId}
              onTaskDurationChange={handleDurationChange}
              onTaskColorClick={openColorPicker}
              onTaskColorSelect={handleColorSelect}
              onTaskDelete={deleteTask}
              onTaskCreate={createTask}
            />
            
            <DayView
              tasks={tasks}
              scheduled={scheduled}
              paletteId={PALETTE_ID}
              onDrop={handleDrop}
              onUnschedule={unscheduleTask}
              onComplete={completeTask}
            />
          </>
        ) : (
          <CompletedView
            tasks={tasks}
            lists={lists}
            paletteId={PALETTE_ID}
            onRestore={uncompleteTask}
          />
        )}
      </div>
    </div>
  )
}
```

---

## STEP 4: Verify

After completing all steps, run:
```bash
# Check no file exceeds 300 lines
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 300 {print "FAIL: " $0}'

# Check build passes
npm run build

# Check Supabase imports are only in api/
grep -r "getSupabase" src/ --include="*.ts" --include="*.tsx" | grep -v "src/api/" | grep -v "src/lib/"
```

ALL checks must pass. If any fail, fix them before committing.

---

## COMMIT

After all checks pass:
```bash
git add -A && git commit -m "refactor: Extract components, stores, and services from monolithic page.tsx"
```

