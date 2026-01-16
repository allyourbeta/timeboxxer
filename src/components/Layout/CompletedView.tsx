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
        <h2 className="text-lg font-semibold text-foreground">Completed Tasks</h2>
        <p className="text-sm text-muted-foreground">Tasks you've finished</p>
      </div>
      
      <div className="space-y-2">
        {completedTasks.map(task => (
          <div
            key={task.id}
            className="p-3 rounded-lg bg-card border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: getColor(paletteId, task.color_index) }}
              />
              <div>
                <div className="font-medium text-card-foreground">{task.title}</div>
                <div className="text-xs text-muted-foreground">
                  From: {getListName(task.list_id)} • {task.duration_minutes} min • 
                  Completed {new Date(task.completed_at!).toLocaleString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => onRestore(task.id)}
              className="px-2 py-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded"
            >
              Restore
            </button>
          </div>
        ))}
        
        {completedTasks.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>No completed tasks yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}