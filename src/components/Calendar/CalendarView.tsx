"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Droppable } from "@hello-pangea/dnd";
import { CheckCircle, Trash2 } from "lucide-react";

import { Task } from "@/types/app";
import { getColor } from "@/lib/palettes";
import {
  SLOT_HEIGHT,
  SLOTS_PER_HOUR,
  getHourLabels,
  getCurrentTimePixels,
  getInitialScrollPosition,
  timestampToTime,
  timeToPixels,
  pixelsToTime,
  generateAllSlotIds,
  parseSlotId,
  calculateTaskWidths,
  canScheduleTask,
} from "@/lib/calendarUtils";
import { createLocalTimestamp } from "@/lib/dateUtils";

/* --------------------------- Inline SlotInput --------------------------- */

function SlotInput({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) onSubmit(value.trim());
      else onCancel();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    setTimeout(() => onCancel(), 100);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder="New task..."
      className="absolute inset-x-0 top-0 h-8 px-2 text-sm bg-[var(--bg-secondary)] border-2 border-[var(--accent-primary)] rounded shadow-lg focus:outline-none z-50"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/* ------------------------------ Constants ------------------------------ */

const DRAG_THRESHOLD_PX = 5;
const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 240;
const DAY_MINUTES = 24 * 60;

const SLOT_PX_15_MIN = SLOT_HEIGHT / SLOTS_PER_HOUR; // 45px

const getContentY = (container: HTMLElement, clientY: number) => {
  const rect = container.getBoundingClientRect();
  return clientY - rect.top + container.scrollTop;
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

type GestureType = "none" | "drag" | "resize";

type GestureState = {
  type: GestureType;
  taskId: string | null;
  startContentY: number;
  startTopPx: number;
  startDurationMin: number;
  currentTopPx: number;
  currentDurationMin: number;
  hasMoved: boolean;
  taskEl: HTMLElement | null;
};

/* ------------------------------- Props -------------------------------- */

export interface CalendarViewProps {
  tasks: Task[];
  paletteId: string;

  // ✅ Option B: accept either name (legacy + new)
  isDndDragging?: boolean;
  isExternalDndDragging?: boolean;

  onExternalDrop: (taskId: string, time: string) => void | Promise<void>;
  onEventMove: (taskId: string, time: string) => void | Promise<void>;
  onUnschedule: (taskId: string) => void | Promise<void>;
  onComplete: (taskId: string) => void | Promise<void>;
  onDelete: (taskId: string) => void | Promise<void>;
  onCreateTask: (title: string, time: string) => void | Promise<void>;
  onDurationChange: (
    taskId: string,
    newDuration: number,
  ) => void | Promise<void>;
  onDragStart?: (cancelCallback: () => void) => void;
}

/* ------------------------------ Component ------------------------------ */

export function CalendarView({
  tasks,
  paletteId,
  isDndDragging,
  isExternalDndDragging: isExternalDndDraggingProp,
  onExternalDrop, // kept for API compatibility; parent typically handles drop via DnD context
  onEventMove,
  onUnschedule,
  onComplete,
  onDelete,
  onCreateTask,
  onDurationChange,
  onDragStart,
}: CalendarViewProps) {
  const isExternalDndDragging =
    isExternalDndDraggingProp ?? isDndDragging ?? false;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<GestureState>({
    type: "none",
    taskId: null,
    startContentY: 0,
    startTopPx: 0,
    startDurationMin: 0,
    currentTopPx: 0,
    currentDurationMin: 0,
    hasMoved: false,
    taskEl: null,
  });

  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Live label during resize (so the “60m” updates while dragging)
  const [resizePreview, setResizePreview] = useState<{
    taskId: string;
    duration: number;
  } | null>(null);

  const hourLabels = useMemo(() => getHourLabels(), []);
  const slotIds = useMemo(() => generateAllSlotIds(), []);
  const slotHeightPx = SLOT_HEIGHT / SLOTS_PER_HOUR; // 45px

  const scheduledTasks = useMemo(
    () => tasks.filter((t) => t.scheduled_at),
    [tasks],
  );

  // Avoid stale closures for document listeners (fixes “intermittent”)
  const tasksRef = useRef<Task[]>(tasks);
  const scheduledTasksRef = useRef<Task[]>(scheduledTasks);
  useEffect(() => {
    tasksRef.current = tasks;
    scheduledTasksRef.current = scheduledTasks;
  }, [tasks, scheduledTasks]);

  const taskLayouts = useMemo(() => {
    return calculateTaskWidths(
      scheduledTasks.map((task) => ({
        id: task.id,
        scheduled_at: task.scheduled_at!,
        duration_minutes: task.duration_minutes,
      })),
    );
  }, [scheduledTasks]);

  const clearVisuals = useCallback(() => {
    const g = gestureRef.current;
    if (!g.taskEl) return;
    g.taskEl.style.transform = "";
    g.taskEl.style.zIndex = "";
    g.taskEl.style.pointerEvents = "";
    if (g.type === "resize") g.taskEl.style.height = "";
  }, []);

  const resetGesture = useCallback(() => {
    gestureRef.current = {
      type: "none",
      taskId: null,
      startContentY: 0,
      startTopPx: 0,
      startDurationMin: 0,
      currentTopPx: 0,
      currentDurationMin: 0,
      hasMoved: false,
      taskEl: null,
    };
    setResizePreview(null);
  }, []);

  const onDocPointerMove = useCallback((e: PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const g = gestureRef.current;
    if (g.type === "none" || !g.taskId || !g.taskEl) return;

    const contentY = getContentY(container, e.clientY);
    const deltaY = contentY - g.startContentY;

    if (g.type === "drag") {
      if (!g.hasMoved && Math.abs(deltaY) < DRAG_THRESHOLD_PX) return;
      g.hasMoved = true;

      const task = scheduledTasksRef.current.find((t) => t.id === g.taskId);
      if (!task) return;

      const rawTop = g.startTopPx + deltaY;
      const snappedTop = Math.round(rawTop / SLOT_PX_15_MIN) * SLOT_PX_15_MIN;

      const taskHeightPx = (task.duration_minutes / 60) * SLOT_HEIGHT;
      const maxTop = 24 * SLOT_HEIGHT - taskHeightPx;

      g.currentTopPx = Math.max(0, Math.min(snappedTop, maxTop));

      const visualDelta = g.currentTopPx - g.startTopPx;
      g.taskEl.style.transform = `translateY(${visualDelta}px)`;
      g.taskEl.style.zIndex = "100";
      // Let underlying droppables “see” pointer during drag
      g.taskEl.style.pointerEvents = "none";
      return;
    }

    if (g.type === "resize") {
      const task = scheduledTasksRef.current.find((t) => t.id === g.taskId);
      if (!task) return;

      const deltaMinutes = (deltaY / SLOT_HEIGHT) * 60;
      const raw = g.startDurationMin + deltaMinutes;
      const snapped = Math.round(raw / 15) * 15;

      const startTime = timestampToTime(task.scheduled_at!);
      const startMin = timeToMinutes(startTime);
      const maxByDay = DAY_MINUTES - startMin;
      const maxDur = Math.min(MAX_DURATION_MINUTES, maxByDay);

      g.currentDurationMin = Math.max(
        MIN_DURATION_MINUTES,
        Math.min(snapped, maxDur),
      );

      g.taskEl.style.height = `${(g.currentDurationMin / 60) * SLOT_HEIGHT}px`;
    }
  }, []);

  const onDocPointerUp = useCallback(() => {
    const g = gestureRef.current;
    if (g.type === "none" || !g.taskId) {
      clearVisuals();
      resetGesture();
      return;
    }

    const task = scheduledTasksRef.current.find((t) => t.id === g.taskId);
    clearVisuals();

    if (!task) {
      resetGesture();
      return;
    }

    if (g.type === "drag") {
      if (!g.hasMoved) {
        setSelectedTaskId((prev) => (prev === g.taskId ? null : g.taskId));
      } else {
        const newTime = pixelsToTime(g.currentTopPx);
        const date = task.scheduled_at!.split("T")[0];
        const newTs = createLocalTimestamp(date, newTime);

        const ok = canScheduleTask(
          tasksRef.current,
          task.id,
          newTs,
          task.duration_minutes,
        ).allowed;
        if (ok) void Promise.resolve(onEventMove(task.id, newTime));
      }

      resetGesture();
      return;
    }

    if (g.type === "resize") {
      if (g.currentDurationMin !== g.startDurationMin) {
        const ok = canScheduleTask(
          tasksRef.current,
          task.id,
          task.scheduled_at!,
          g.currentDurationMin,
        ).allowed;
        if (ok)
          void Promise.resolve(onDurationChange(task.id, g.currentDurationMin));
      }

      resetGesture();
      return;
    }

    resetGesture();
  }, [clearVisuals, resetGesture, onEventMove, onDurationChange]);

  const onDocPointerCancel = useCallback(() => {
    clearVisuals();
    resetGesture();
  }, [clearVisuals, resetGesture]);

  const attachDocListeners = useCallback(() => {
    document.addEventListener("pointermove", onDocPointerMove, {
      capture: true,
    });
    document.addEventListener("pointerup", onDocPointerUp, { capture: true });
    document.addEventListener("pointercancel", onDocPointerCancel, {
      capture: true,
    });
  }, [onDocPointerMove, onDocPointerUp, onDocPointerCancel]);

  const detachDocListeners = useCallback(() => {
    document.removeEventListener("pointermove", onDocPointerMove, true);
    document.removeEventListener("pointerup", onDocPointerUp, true);
    document.removeEventListener("pointercancel", onDocPointerCancel, true);
  }, [onDocPointerMove, onDocPointerUp, onDocPointerCancel]);

  // Detach listeners on unmount (hard safety)
  useEffect(() => {
    return () => {
      detachDocListeners();
    };
  }, [detachDocListeners]);

  const startDrag = useCallback(
    (e: React.PointerEvent, task: Task) => {
      if (isExternalDndDragging) return;
      if (task.completed_at) return;
      if (!task.scheduled_at) return;
      if ((e.target as HTMLElement).closest("[data-resize-handle]")) return;
      if ((e.target as HTMLElement).closest("button")) return;

      const container = containerRef.current;
      if (!container) return;

      e.preventDefault();
      e.stopPropagation();

      const contentY = getContentY(container, e.clientY);
      const startTime = timestampToTime(task.scheduled_at);
      const startTopPx = timeToPixels(startTime);

      gestureRef.current = {
        type: "drag",
        taskId: task.id,
        startContentY: contentY,
        startTopPx,
        startDurationMin: task.duration_minutes,
        currentTopPx: startTopPx,
        currentDurationMin: task.duration_minutes,
        hasMoved: false,
        taskEl: e.currentTarget as HTMLElement,
      };

      attachDocListeners();
    },
    [attachDocListeners, isExternalDndDragging],
  );

  const startResize = useCallback(
    (e: React.PointerEvent, task: Task) => {
      if (isExternalDndDragging) return;
      if (task.completed_at) return;
      if (!task.scheduled_at) return;

      const container = containerRef.current;
      if (!container) return;

      e.preventDefault();
      e.stopPropagation();

      const contentY = getContentY(container, e.clientY);

      const taskEl = (e.currentTarget as HTMLElement).closest(
        `[data-testid="scheduled-task-${task.id}"]`,
      ) as HTMLElement | null;
      if (!taskEl) return;

      const startTime = timestampToTime(task.scheduled_at);
      const startTopPx = timeToPixels(startTime);

      gestureRef.current = {
        type: "resize",
        taskId: task.id,
        startContentY: contentY,
        startTopPx,
        startDurationMin: task.duration_minutes,
        currentTopPx: startTopPx,
        currentDurationMin: task.duration_minutes,
        hasMoved: true,
        taskEl,
      };

      setResizePreview({ taskId: task.id, duration: task.duration_minutes });

      attachDocListeners();
    },
    [attachDocListeners, isExternalDndDragging],
  );

  // Keep duration label in sync during resize (RAF throttled)
  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const g = gestureRef.current;
      const taskId = g.taskId;
      const duration = g.currentDurationMin;
      if (g.type === "resize" && taskId) {
        setResizePreview((prev) => {
          if (prev?.taskId === taskId && prev.duration === duration)
            return prev;
          return { taskId, duration };
        });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Parent hook (used in your app to cancel inline editing on drag start)
  useEffect(() => {
    if (onDragStart) onDragStart(() => setEditingSlot(null));
  }, [onDragStart]);

  // initial scroll
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = Math.max(0, getInitialScrollPosition());
  }, []);

  const handleSlotClick = (e: React.MouseEvent, slotId: string) => {
    if (e.target !== e.currentTarget) return;

    const parsed = parseSlotId(slotId);
    if (!parsed) return;

    const slotTime = `${parsed.hours.toString().padStart(2, "0")}:${parsed.minutes
      .toString()
      .padStart(2, "0")}`;

    const tasksInSlot = scheduledTasks.filter((task) => {
      if (!task.scheduled_at) return false;
      return timestampToTime(task.scheduled_at) === slotTime;
    });

    if (tasksInSlot.length >= 2) return;
    setEditingSlot(slotTime);
  };

  return (
    <div
      className="flex flex-col h-full bg-background"
      onClick={() => setSelectedTaskId(null)}
    >
      <div className="flex-shrink-0 p-4 border-b border-theme">
        <h2 className="text-lg font-semibold text-foreground">
          Today's Schedule
        </h2>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        data-testid="calendar-container"
      >
        <div className="relative" style={{ height: `${24 * SLOT_HEIGHT}px` }}>
          {/* Hour labels */}
          <div className="absolute left-0 top-0 w-16 h-full">
            {hourLabels.map((hour, index) => (
              <div
                key={hour}
                className="absolute w-full border-b border-theme/30"
                style={{
                  top: `${index * SLOT_HEIGHT}px`,
                  height: `${SLOT_HEIGHT}px`,
                }}
              >
                <div className="absolute left-2 top-1 text-xs text-muted-foreground font-mono">
                  {hour}
                </div>
              </div>
            ))}
          </div>

          {/* Droppable slots */}
          <div className="absolute left-16 right-0 top-0 h-full">
            {slotIds.map((slotId, index) => {
              const hour = Math.floor(index / 4);
              const quarter = index % 4;
              const isHourBoundary = quarter === 0;

              const slotTime = `${hour.toString().padStart(2, "0")}:${(
                quarter * 15
              )
                .toString()
                .padStart(2, "0")}`;

              return (
                <Droppable key={slotId} droppableId={slotId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        absolute w-full border-b cursor-pointer
                        ${isHourBoundary ? "border-theme" : "border-theme-subtle"}
                        ${
                          snapshot.isDraggingOver
                            ? "bg-[var(--drag-highlight)] ring-2 ring-[var(--drag-ring)] ring-inset"
                            : ""
                        }
                        transition-colors duration-150
                      `}
                      style={{
                        top: `${index * slotHeightPx}px`,
                        height: `${slotHeightPx}px`,
                      }}
                      data-droppable-id={slotId}
                      onClick={(e) => handleSlotClick(e, slotId)}
                    >
                      {provided.placeholder}

                      {editingSlot === slotTime && (
                        <SlotInput
                          onSubmit={(title) => {
                            void Promise.resolve(
                              onCreateTask(title, editingSlot),
                            );
                            setEditingSlot(null);
                          }}
                          onCancel={() => setEditingSlot(null)}
                        />
                      )}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>

          {/* Current time line */}
          <div
            className="absolute w-full h-0.5 bg-[var(--time-indicator)] z-20 pointer-events-none"
            style={{ top: `${getCurrentTimePixels()}px`, left: "64px" }}
          >
            <div className="absolute left-0 -top-2 w-4 h-4 bg-[var(--time-indicator)] rounded-full -ml-2" />
          </div>

          {/* Scheduled tasks */}
          <div className="absolute left-16 right-0 top-0 h-full pointer-events-none">
            {scheduledTasks.map((task) => {
              const startTime = timestampToTime(task.scheduled_at!);
              const top = timeToPixels(startTime);
              const height = (task.duration_minutes / 60) * SLOT_HEIGHT;

              const layout = taskLayouts.get(task.id) || {
                width: 100,
                column: 0,
              };
              const leftPercent = layout.column * 50;

              const colorIndex =
                typeof (task as any).color_index === "number"
                  ? (task as any).color_index
                  : 0;
              const accent =
                getColor(paletteId, colorIndex) || "var(--accent-primary)";

              const previewDuration =
                resizePreview?.taskId === task.id
                  ? resizePreview.duration
                  : task.duration_minutes;

              const isSelected = selectedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  data-testid={`scheduled-task-${task.id}`}
                  className={`
                    absolute mx-1 rounded-lg border border-theme shadow-sm overflow-hidden
                    cursor-pointer hover:shadow-md transition-shadow select-none touch-none
                    ${isExternalDndDragging ? "pointer-events-none" : "pointer-events-auto"}
                    ${task.completed_at ? "opacity-50" : ""}
                    bg-[var(--task-bg)]
                  `}
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 28)}px`,
                    width: `${layout.width}%`,
                    left: `${leftPercent}%`,
                    borderLeftWidth: "4px",
                    borderLeftColor: accent,
                    userSelect: "none",
                    touchAction: "none",
                  }}
                  onPointerDown={(e) => startDrag(e, task)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTaskId((prev) =>
                      prev === task.id ? null : task.id,
                    );
                  }}
                >

                  <div className="p-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">
                        {task.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {startTime} · {previewDuration}m
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!task.completed_at && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void Promise.resolve(onComplete(task.id));
                            setSelectedTaskId(null);
                          }}
                          className="opacity-50 hover:opacity-100 transition-all hover:scale-105"
                          aria-label="Mark as complete"
                          type="button"
                        >
                          <CheckCircle className="h-4 w-4 text-theme-secondary hover:text-accent-success" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void Promise.resolve(onDelete(task.id));
                          setSelectedTaskId(null);
                        }}
                        className="opacity-50 hover:opacity-100 transition-all hover:scale-105"
                        aria-label="Delete task"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-theme-tertiary hover:text-accent-danger" />
                      </button>
                    </div>
                  </div>

                  {!task.completed_at && (
                    <div
                      data-resize-handle
                      className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize"
                      style={{ touchAction: "none" }}
                      onPointerDown={(e) => startResize(e, task)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
