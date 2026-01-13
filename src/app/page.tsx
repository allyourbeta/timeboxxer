'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

const DEV_USER_ID = '11111111-1111-1111-1111-111111111111'

interface List {
  id: string
  name: string
  position: number
}

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
}

export default function Home() {
  const [lists, setLists] = useState<List[]>([])
  const [tasks, setTasks] = useState<Record<string, Task[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = getSupabase()
      
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', DEV_USER_ID)
        .order('position')
      
      if (listsError) {
        setError(listsError.message)
        setLoading(false)
        return
      }
      
      setLists(listsData || [])
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', DEV_USER_ID)
        .order('position')
      
      if (tasksError) {
        setError(tasksError.message)
        setLoading(false)
        return
      }
      
      const tasksByList: Record<string, Task[]> = {}
      for (const task of tasksData || []) {
        if (!tasksByList[task.list_id]) {
          tasksByList[task.list_id] = []
        }
        tasksByList[task.list_id].push(task)
      }
      setTasks(tasksByList)
      setLoading(false)
    }
    
    loadData()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Timeboxxer</h1>
      <div className="flex gap-6">
        {lists.map(list => (
          <div key={list.id} className="w-64 bg-gray-100 rounded-lg p-4">
            <h2 className="font-semibold mb-3">{list.name}</h2>
            <div className="space-y-2">
              {(tasks[list.id] || []).map(task => (
                <div key={task.id} className="bg-white p-3 rounded shadow-sm">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-gray-500">{task.duration_minutes} min</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
