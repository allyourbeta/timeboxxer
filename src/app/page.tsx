'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { getColor, getPalette } from '@/lib/palettes'
import { completeTask, createTask, deleteTask, scheduleTask, updateScheduleTime, updateTask, unscheduleTask } from '@/api'

const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'
const PALETTE_ID = 'ocean-bold'

interface List {
  id: string
  name: string
  position: number
}

interface Task {
  id: string
  list_id: string | null
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  completed_at: string | null
}

interface ScheduledTask {
  id: string
  task_id: string
  scheduled_date: string
  start_time: string
}

// Generate time slots from 6am to 10pm
function generateTimeSlots() {
  const slots = []
  for (let hour = 6; hour < 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(time)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export default function Home() {
  const [lists, setLists] = useState<List[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [scheduled, setScheduled] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({})
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase()
      
      const [listsRes, tasksRes, scheduledRes] = await Promise.all([
        supabase.from('lists').select('*').order('position'),
        supabase.from('tasks').select('*').order('position'),
        supabase.from('scheduled_tasks').select('*'),
      ])
      
      setLists(listsRes.data || [])
      setTasks(tasksRes.data || [])
      setScheduled(scheduledRes.data || [])
      setLoading(false)
    }
    loadData()
  }, [])

  // Close color picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colorPickerOpen) {
        setColorPickerOpen(null)
      }
    }
    
    if (colorPickerOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [colorPickerOpen])

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDrop = async (time: string) => {
    if (!draggedTask) return
    
    const today = new Date().toISOString().split('T')[0]
    
    // Check if already scheduled
    const existing = scheduled.find(s => s.task_id === draggedTask.id)
    
    if (existing) {
      // Update existing schedule
      await updateScheduleTime(existing.id, time + ':00')
      
      setScheduled(scheduled.map(s => 
        s.id === existing.id ? { ...s, start_time: time + ':00' } : s
      ))
    } else {
      // Create new schedule
      const data = await scheduleTask(draggedTask.id, today, time + ':00')
      
      if (data) {
        setScheduled([...scheduled, data])
      }
    }
    
    setDraggedTask(null)
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId)
      
      // Update local state: mark task as completed and remove from schedule
      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, is_completed: true, completed_at: new Date().toISOString() }
          : t
      ))
      setScheduled(scheduled.filter(s => s.task_id !== taskId))
    } catch (error) {
      console.error('Failed to complete task:', error)
    }
  }

  const handleUnscheduleTask = async (taskId: string) => {
    try {
      await unscheduleTask(taskId)
      
      // Update local state: remove from schedule
      setScheduled(scheduled.filter(s => s.task_id !== taskId))
    } catch (error) {
      console.error('Failed to unschedule task:', error)
    }
  }

  const handleCreateTask = async (listId: string, title: string) => {
    if (!title.trim()) return
    
    try {
      const newTask = await createTask(listId, title.trim())
      
      // Update local state: add new task
      setTasks([...tasks, newTask])
      
      // Clear input
      setNewTaskInputs({ ...newTaskInputs, [listId]: '' })
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      
      // Update local state: remove task and any schedule
      setTasks(tasks.filter(t => t.id !== taskId))
      setScheduled(scheduled.filter(s => s.task_id !== taskId))
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleChangeDuration = async (taskId: string, currentDuration: number) => {
    // Cycle: 15 → 30 → 45 → 60 → 15
    const durations = [15, 30, 45, 60]
    const currentIndex = durations.indexOf(currentDuration)
    const nextDuration = durations[(currentIndex + 1) % durations.length]
    
    try {
      await updateTask(taskId, { duration_minutes: nextDuration })
      
      // Update local state: change task duration
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, duration_minutes: nextDuration } : t
      ))
    } catch (error) {
      console.error('Failed to update task duration:', error)
    }
  }

  const handleChangeColor = async (taskId: string, colorIndex: number) => {
    try {
      await updateTask(taskId, { color_index: colorIndex })
      
      // Update local state: change task color
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, color_index: colorIndex } : t
      ))
      
      // Close color picker
      setColorPickerOpen(null)
    } catch (error) {
      console.error('Failed to update task color:', error)
    }
  }

  const getTasksForList = (listId: string) => 
    tasks.filter(t => t.list_id === listId)

  const getScheduledTaskAtTime = (time: string) => {
    const scheduleItem = scheduled.find(s => s.start_time.startsWith(time))
    if (!scheduleItem) return null
    const task = tasks.find(t => t.id === scheduleItem.task_id)
    // Don't show completed tasks on calendar
    return task && !task.is_completed ? { task, schedule: scheduleItem } : null
  }

  const getTaskHeight = (duration: number) => {
    const slots = duration / 15
    return slots * 48 - 4 // 48px per slot, minus gap
  }

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Timeboxxer</h1>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Lists */}
        <div className="w-80 border-r border-gray-700 overflow-y-auto p-4 space-y-4">
          {lists.map(list => (
            <div key={list.id} className="bg-gray-800 rounded-lg p-3">
              <h2 className="font-semibold text-gray-300 mb-2">{list.name}</h2>
              <div className="space-y-2">
                {getTasksForList(list.id).map(task => (
                  <div
                    key={task.id}
                    draggable={!task.is_completed}
                    onDragStart={() => !task.is_completed && handleDragStart(task)}
                    className={`p-3 rounded transition-transform hover:scale-[1.02] group relative ${
                      task.is_completed 
                        ? 'opacity-50 cursor-default' 
                        : 'cursor-grab active:cursor-grabbing'
                    }`}
                    style={{ backgroundColor: getColor(PALETTE_ID, task.color_index) }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setColorPickerOpen(colorPickerOpen === task.id ? null : task.id)
                          }}
                          className="w-4 h-4 rounded-full border border-white/30 hover:border-white/60 transition-colors cursor-pointer"
                          style={{ backgroundColor: getColor(PALETTE_ID, task.color_index) }}
                          title="Click to change color"
                          disabled={task.is_completed}
                        />
                        {colorPickerOpen === task.id && (
                          <div className="absolute top-6 left-0 z-20 bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl">
                            <div className="grid grid-cols-3 gap-2">
                              {getPalette(PALETTE_ID).colors.map((color, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleChangeColor(task.id, index)}
                                  className="w-6 h-6 rounded-full border border-gray-500 hover:border-white transition-colors"
                                  style={{ backgroundColor: color }}
                                  title={`Color ${index + 1}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={`font-medium text-white flex-1 ${
                        task.is_completed ? 'line-through' : ''
                      }`}>{task.title}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleChangeDuration(task.id, task.duration_minutes)
                      }}
                      className={`text-sm text-white/70 hover:text-white hover:bg-white/10 px-1 rounded transition-colors cursor-pointer ${
                        task.is_completed ? 'line-through cursor-default' : ''
                      }`}
                      disabled={task.is_completed}
                      title="Click to change duration"
                    >
                      {task.duration_minutes} min
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete task"
                    >
                      🗑
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  placeholder="Add task..."
                  value={newTaskInputs[list.id] || ''}
                  onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [list.id]: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTask(list.id, newTaskInputs[list.id] || '')
                    }
                  }}
                  className="w-full p-2 text-sm bg-gray-700 text-white placeholder-gray-400 rounded border-none outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Right: Calendar */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 mb-4">
            <h2 className="text-lg font-semibold">Today</h2>
          </div>
          
          <div className="relative">
            {TIME_SLOTS.map((time, index) => {
              const scheduled = getScheduledTaskAtTime(time)
              const isHour = time.endsWith(':00')
              
              return (
                <div
                  key={time}
                  className={`h-12 flex items-stretch border-b border-gray-700 ${
                    isHour ? 'border-gray-600' : 'border-gray-800'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(time)}
                >
                  {/* Time label */}
                  <div className="w-16 text-xs text-gray-500 pr-2 text-right pt-1">
                    {isHour ? time : ''}
                  </div>
                  
                  {/* Slot */}
                  <div className="flex-1 relative">
                    {scheduled && (
                      <div
                        className="absolute left-0 right-2 rounded px-2 py-1 z-10 group"
                        style={{
                          backgroundColor: getColor(PALETTE_ID, scheduled.task.color_index),
                          height: getTaskHeight(scheduled.task.duration_minutes),
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-sm truncate">{scheduled.task.title}</div>
                            <div className="text-xs text-white/70">{scheduled.task.duration_minutes} min</div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleUnscheduleTask(scheduled.task.id)}
                              className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs"
                              title="Unschedule"
                            >
                              ×
                            </button>
                            <button
                              onClick={() => handleCompleteTask(scheduled.task.id)}
                              className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs"
                              title="Mark complete"
                            >
                              ✓
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {!scheduled && (
                      <div className="h-full w-full hover:bg-gray-800/50 transition-colors" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
