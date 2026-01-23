'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getColor } from '@/lib/palettes'

interface CompletedTask {
  id: string
  title: string
  color_index: number
  duration_minutes: number
  completed_at: string
  previous_list_id: string | null
}

interface CompletedViewProps {
  paletteId: string
  onRestore: (taskId: string) => void
}

export function CompletedView({ paletteId, onRestore }: CompletedViewProps) {
  const [tasks, setTasks] = useState<CompletedTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch completed tasks directly from Supabase
  const fetchCompletedTasks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('id, title, color_index, duration_minutes, completed_at, previous_list_id')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(50)

      if (fetchError) throw fetchError
      setTasks(data || [])
    } catch (err) {
      console.error('Failed to fetch completed tasks:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mount
  useEffect(() => {
    fetchCompletedTasks()
  }, [])

  // Handle restore (uncomplete)
  const handleRestore = async (taskId: string) => {
    try {
      await onRestore(taskId)
      // Remove from local state immediately
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) {
      console.error('Failed to restore task:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Completed Tasks</h2>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Completed Tasks</h2>
          <p className="text-sm text-red-500">Error: {error}</p>
          <button 
            onClick={fetchCompletedTasks}
            className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Completed Tasks</h2>
        <p className="text-sm text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} completed
        </p>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <div
            key={task.id}
            className="p-3 rounded-lg bg-card border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: getColor(paletteId, task.color_index) }}
              />
              <div>
                <div className="font-medium text-card-foreground">{task.title}</div>
                <div className="text-xs text-muted-foreground">
                  {task.duration_minutes} min • 
                  Completed {new Date(task.completed_at).toLocaleString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleRestore(task.id)}
              className="px-2 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded"
            >
              Restore
            </button>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>No completed tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
