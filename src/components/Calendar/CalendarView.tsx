'use client'

import { useCallback, useMemo, useRef } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import {
  timeToPixels,
  pixelsToTime,
  timestampToTime,
  canScheduleTask,
} from '@/lib/calendarUtils'
import { createLocalTimestamp } from '@/lib/dateUtils'

const SLOT_HEIGHT = 180
const SLOT_PX_15_MIN = SLOT_HEIGHT / 4

type GestureType = 'none' | 'drag' | 'resize'
type MaybePromise<T = void> = T | Promise<T>

interface GestureState {
  type: GestureType
  taskId: string | null
  startContentY: number
  startValue: number
  currentValue: number
  hasMoved: boolean
  taskElement: HTMLElement | null
}

export interface CalendarViewProps {
  tasks: any[]
  date?: string // OPTIONAL (caller may omit)

  onEventMove: (taskId: string, newTime: string) => MaybePromise
  onDurationChange: (taskId: string, newDuration: number) => MaybePromise

  paletteId?: string
  onExternalDrop?: (taskId: string, time: string) => MaybePromise
  onUnschedule?: (taskId: string) => MaybePromise
  onComplete?: (taskId: string) => MaybePromise
  onDragStart?: (cancelCallback: any) => void

  [key: string]: any
}

export function CalendarView({
  tasks,
  date,
  onEventMove,
  onDurationChange,
}: CalendarViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const gestureRef = useRef<GestureState>({
    type: 'none',
    taskId: null,
    startContentY: 0,
    startValue: 0,
    currentValue: 0,
    hasMoved: false,
    taskElement: null,
  })

  const scheduledTasks = useMemo(
    () => tasks.filter(t => t.scheduled_at),
    [tasks]
  )

  const getContentY = (clientY: number) => {
    const el = containerRef.current!
    const rect = el.getBoundingClientRect()
    return clientY - rect.top + el.scrollTop
  }

  const clearVisuals = () => {
    const g = gestureRef.current
    if (!g.taskElement) return
    g.taskElement.style.transform = ''
    g.taskElement.style.zIndex = ''
    if (g.type === 'resize') g.taskElement.style.height = ''
  }

  const resetGesture = () => {
    gestureRef.current = {
      type: 'none',
      taskId: null,
      startContentY: 0,
      startValue: 0,
      currentValue: 0,
      hasMoved: false,
      taskElement: null,
    }
  }

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const g = gestureRef.current
      if (g.type === 'none' || !g.taskId) return

      const contentY = getContentY(e.clientY)
      const deltaY = contentY - g.startContentY

      if (g.type === 'drag') {
        if (!g.hasMoved && Math.abs(deltaY) < 5) return
        g.hasMoved = true

        const task = scheduledTasks.find(t => t.id === g.taskId)
        if (!task) return

        const taskHeightPx = (task.duration_minutes / 60) * SLOT_HEIGHT
        const rawTop = g.startValue + deltaY
        const snapped = Math.round(rawTop / SLOT_PX_15_MIN) * SLOT_PX_15_MIN
        const maxTop = 24 * SLOT_HEIGHT - taskHeightPx

        g.currentValue = Math.max(0, Math.min(snapped, maxTop))

        const visualDelta = g.currentValue - g.startValue
        g.taskElement!.style.transform = `translateY(${visualDelta}px)`
        g.taskElement!.style.zIndex = '50'
      }

      if (g.type === 'resize') {
        const task = scheduledTasks.find(t => t.id === g.taskId)
        if (!task) return

        const deltaMinutes = (deltaY / SLOT_HEIGHT) * 60
        const raw = g.startValue + deltaMinutes
        const snapped = Math.round(raw / 15) * 15

        const startTime = timestampToTime(task.scheduled_at)
        const [h, m] = startTime.split(':').map(Number)
        const startMinutes = h * 60 + m
        const maxByDay = 24 * 60 - startMinutes
        const maxDuration = Math.min(240, maxByDay)

        g.currentValue = Math.max(15, Math.min(snapped, maxDuration))
        g.taskElement!.style.height = `${(g.currentValue / 60) * SLOT_HEIGHT}px`
      }
    },
    [scheduledTasks]
  )

  const cancelGesture = useCallback(() => {
    document.removeEventListener('pointermove', onPointerMove, true)
    document.removeEventListener('pointerup', endGesture, true)
    document.removeEventListener('pointercancel', cancelGesture, true)
    clearVisuals()
    resetGesture()
  }, [onPointerMove])

  const endGesture = useCallback(() => {
    document.removeEventListener('pointermove', onPointerMove, true)
    document.removeEventListener('pointerup', endGesture, true)
    document.removeEventListener('pointercancel', cancelGesture, true)

    const g = gestureRef.current
    if (g.type === 'none' || !g.taskId) {
      resetGesture()
      return
    }

    clearVisuals()

    const task = scheduledTasks.find(t => t.id === g.taskId)
    if (!task) {
      resetGesture()
      return
    }

    if (g.type === 'drag' && g.hasMoved) {
      const newTime = pixelsToTime(g.currentValue)
      const taskDate = (date ?? String(task.scheduled_at).split('T')[0]) as string
      const ts = createLocalTimestamp(taskDate, newTime)

      if (canScheduleTask(tasks, task.id, ts, task.duration_minutes).allowed) {
        void Promise.resolve(onEventMove(task.id, newTime))
      }
    }

    if (g.type === 'resize' && g.currentValue !== g.startValue) {
      if (
        canScheduleTask(tasks, task.id, task.scheduled_at, g.currentValue).allowed
      ) {
        void Promise.resolve(onDurationChange(task.id, g.currentValue))
      }
    }

    resetGesture()
  }, [onPointerMove, scheduledTasks, tasks, date, onEventMove, onDurationChange, cancelGesture])

  const startDrag = (e: React.PointerEvent, task: any) => {
    if (task.completed_at) return
    if ((e.target as HTMLElement).closest('[data-resize-handle]')) return

    const contentY = getContentY(e.clientY)
    const startPixels = timeToPixels(timestampToTime(task.scheduled_at))

    gestureRef.current = {
      type: 'drag',
      taskId: task.id,
      startContentY: contentY,
      startValue: startPixels,
      currentValue: startPixels,
      hasMoved: false,
      taskElement: e.currentTarget as HTMLElement,
    }

    document.addEventListener('pointermove', onPointerMove, { capture: true })
    document.addEventListener('pointerup', endGesture, { capture: true })
    document.addEventListener('pointercancel', cancelGesture, { capture: true })
  }

  const startResize = (e: React.PointerEvent, task: any) => {
    if (task.completed_at) return
    e.stopPropagation()
    e.preventDefault()

    const contentY = getContentY(e.clientY)
    const el = (e.currentTarget as HTMLElement).closest('[data-task-id]') as
      | HTMLElement
      | null
    if (!el) return

    gestureRef.current = {
      type: 'resize',
      taskId: task.id,
      startContentY: contentY,
      startValue: task.duration_minutes,
      currentValue: task.duration_minutes,
      hasMoved: true,
      taskElement: el,
    }

    document.addEventListener('pointermove', onPointerMove, { capture: true })
    document.addEventListener('pointerup', endGesture, { capture: true })
    document.addEventListener('pointercancel', cancelGesture, { capture: true })
  }

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto">
      <Droppable droppableId="calendar" type="TASK">
        {provided => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="relative"
            style={{ height: 24 * SLOT_HEIGHT }}
          >
            {scheduledTasks.map(task => {
              const top = timeToPixels(timestampToTime(task.scheduled_at))
              const height =
                (task.duration_minutes / 60) * SLOT_HEIGHT || SLOT_PX_15_MIN

              return (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  className="absolute left-2 right-2 rounded bg-blue-600 text-white text-xs"
                  style={{
                    top,
                    height,
                    userSelect: 'none',
                    touchAction: 'manipulation',
                  }}
                  onPointerDown={e => startDrag(e, task)}
                >
                  <div className="p-2">{task.title}</div>

                  {!task.completed_at && (
                    <div
                      data-resize-handle
                      className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize"
                      style={{ touchAction: 'none' }}
                      onPointerDown={e => startResize(e, task)}
                    />
                  )}
                </div>
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export default CalendarView
