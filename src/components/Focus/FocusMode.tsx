'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Task {
  id: string
  title: string
  duration_minutes: number
  color_index: number
  is_completed: boolean
  energy_level: 'high' | 'medium' | 'low'
  is_daily_highlight: boolean
}

interface FocusModeProps {
  task: Task
  paletteId: string
  onExit: () => void
  onComplete: (taskId: string) => void
}

export function FocusMode({ 
  task, 
  paletteId, 
  onExit, 
  onComplete 
}: FocusModeProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(task.duration_minutes * 60) // Convert to seconds

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          if (time <= 1) {
            setIsRunning(false)
            return 0
          }
          return time - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft])

  // Get task color
  const getTaskColor = () => {
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    return colors[task.color_index] || colors[0]
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const handleComplete = () => {
    onComplete(task.id)
    onExit()
  }

  const progress = ((task.duration_minutes * 60 - timeLeft) / (task.duration_minutes * 60)) * 100

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      {/* Background overlay with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-background to-muted/20" />
      
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onExit}
        className="absolute top-4 right-4 h-10 w-10"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Main content */}
      <div className="relative max-w-lg w-full mx-4 text-center space-y-8">
        {/* Task title with color accent */}
        <div className="space-y-2">
          <div 
            className="w-16 h-2 rounded-full mx-auto"
            style={{ backgroundColor: getTaskColor() }}
          />
          <h1 className="text-3xl font-semibold text-foreground leading-tight">
            {task.title}
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="capitalize">{task.energy_level} energy</span>
            {task.is_daily_highlight && (
              <>
                <span>•</span>
                <span className="text-yellow-600 dark:text-yellow-400">Daily highlight</span>
              </>
            )}
          </div>
        </div>

        {/* Timer display */}
        <div className="space-y-6">
          <div className="text-8xl font-mono font-light text-foreground tracking-wider">
            {formatTime(timeLeft)}
          </div>
          
          {/* Progress ring */}
          <div className="relative w-32 h-32 mx-auto">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                className="transition-all duration-500 ease-out"
                style={{ stroke: getTaskColor() }}
              />
            </svg>
            
            {/* Central play/pause button */}
            <Button
              size="lg"
              onClick={toggleTimer}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                         w-16 h-16 rounded-full text-white"
              style={{ backgroundColor: getTaskColor() }}
            >
              {isRunning ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8 ml-1" />
              )}
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={onExit}
            className="px-6"
          >
            Exit Focus
          </Button>
          <Button
            onClick={handleComplete}
            className="px-6"
            style={{ backgroundColor: getTaskColor(), color: 'white' }}
          >
            Mark Complete
          </Button>
        </div>

        {/* Time's up message */}
        {timeLeft === 0 && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 
                         bg-card border border-border rounded-lg px-4 py-2 shadow-lg
                         animate-in slide-in-from-top-4">
            <p className="text-sm text-foreground font-medium">Time's up! 🎉</p>
          </div>
        )}
      </div>
    </div>
  )
}