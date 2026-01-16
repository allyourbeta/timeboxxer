'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

interface ToastProps {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
  onClose: () => void
}

export function Toast({ message, action, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100)
  
  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      
      if (remaining === 0) {
        clearInterval(interval)
        onClose()
      }
    }, 50)
    
    return () => clearInterval(interval)
  }, [duration, onClose])
  
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
      <div className="bg-yellow-500 text-black rounded-lg shadow-2xl overflow-hidden min-w-[350px] border-2 border-yellow-400">
        <div className="p-4 flex items-center gap-4">
          <span className="flex-1 font-medium text-base">{message}</span>
          {action && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                action.onClick()
                onClose()
              }}
              className="font-bold bg-black text-yellow-500 hover:bg-gray-900 px-4"
            >
              {action.label}
            </Button>
          )}
          <button
            onClick={onClose}
            className="text-black/60 hover:text-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-yellow-600">
          <div 
            className="h-full bg-black transition-all duration-50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}