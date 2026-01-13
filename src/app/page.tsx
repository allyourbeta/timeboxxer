'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { getColor } from '@/lib/palettes'
import { completeTask, scheduleTask, updateScheduleTime } from '@/api'

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
                    className={`p-3 rounded transition-transform hover:scale-[1.02] ${
                      task.is_completed 
                        ? 'opacity-50 cursor-default' 
                        : 'cursor-grab active:cursor-grabbing'
                    }`}
                    style={{ backgroundColor: getColor(PALETTE_ID, task.color_index) }}
                  >
                    <div className={`font-medium text-white ${
                      task.is_completed ? 'line-through' : ''
                    }`}>{task.title}</div>
                    <div className={`text-sm text-white/70 ${
                      task.is_completed ? 'line-through' : ''
                    }`}>{task.duration_minutes} min</div>
                  </div>
                ))}
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
                          <button
                            onClick={() => handleCompleteTask(scheduled.task.id)}
                            className="ml-1 w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Mark complete"
                          >
                            ✓
                          </button>
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
