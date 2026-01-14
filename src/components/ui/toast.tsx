'use client'

import { useState, useEffect } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { Button } from './button'

interface ToastProps {
  message: string
  duration?: number // in ms, defaults to 5000
  onUndo?: () => void
  onDismiss: () => void
}

export function Toast({ 
  message, 
  duration = 5000, 
  onUndo, 
  onDismiss 
}: ToastProps) {
  const [progress, setProgress] = useState(100)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const decrement = (100 / duration) * 50 // Update every 50ms
        const newProgress = prev - decrement
        
        if (newProgress <= 0) {
          setIsVisible(false)
          setTimeout(onDismiss, 200) // Allow fade animation
          return 0
        }
        
        return newProgress
      })
    }, 50)

    return () => clearInterval(interval)
  }, [duration, onDismiss])

  const handleUndo = () => {
    onUndo?.()
    onDismiss()
  }

  return (
    <div
      className={`
        fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50
        bg-card border border-border shadow-lg rounded-lg
        min-w-[320px] max-w-[480px]
        transition-all duration-200
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-t-lg overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-50 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex items-center justify-between p-4">
        <span className="text-sm text-foreground flex-1 mr-3">
          {message}
        </span>
        
        <div className="flex items-center gap-2">
          {onUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              className="h-8 text-xs gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Undo
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8 w-8 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}