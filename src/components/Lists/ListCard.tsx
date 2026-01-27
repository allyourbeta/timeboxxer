"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TaskCard, AddTaskInput } from "@/components/Tasks";
import { ListCardMenu } from "./ListCardMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Task } from "@/types/app";
import { getColor } from "@/lib/palettes";

interface ListCardProps {
  id: string;
  name: string;
  isInbox: boolean;
  isSystemList: boolean;
  isDateList: boolean;
  tasks: Task[];
  paletteId: string;
  isEditing: boolean;
  isExpanded: boolean;
  scheduledTaskIds: Set<string>;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onFinishEdit: (newName: string) => void;
  onCancelEdit: () => void;
  onClearList: () => void;
  onDelete: () => void;
  onTaskDurationClick: (
    taskId: string,
    currentDuration: number,
    reverse: boolean,
  ) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskAdd: (title: string) => void;
  onTaskEnergyChange: (
    taskId: string,
    level: "high" | "medium",
  ) => void;
  onTaskComplete: (taskId: string) => void;
  onRollOver?: (destination: "today" | "tomorrow") => void;
  isToday?: boolean;
  onHighlightToggle: (taskId: string) => void;
}

export function ListCard({
  id,
  name,
  isInbox,
  isSystemList,
  isDateList,
  tasks,
  paletteId,
  isEditing,
  isExpanded,
  scheduledTaskIds,
  onToggleExpand,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onClearList,
  onDelete,
  onTaskDurationClick,
  onTaskDelete,
  onTaskAdd,
  onTaskEnergyChange,
  onTaskComplete,
  onRollOver,
  isToday,
  onHighlightToggle,
}: ListCardProps) {
  const [editName, setEditName] = useState(name);

  // Memoize task filtering and sorting to avoid recalculation on every render
  const sortedTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.completed_at)
      .sort((a, b) => {
        // Sort by position first (nulls go to end)
        const posA = a.position ?? Infinity;
        const posB = b.position ?? Infinity;
        if (posA !== posB) return posA - posB;
        // Fall back to created_at
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [tasks]);

  // Memoize date labels for Roll Over buttons to avoid Date object creation on every render
  const { todayLabel, tomorrowLabel } = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      todayLabel: today.toLocaleDateString("en-US", { weekday: "short" }),
      tomorrowLabel: tomorrow.toLocaleDateString("en-US", { weekday: "short" }),
    };
  }, []); // Empty deps - only compute once per mount (day won't change mid-session)

  const canDeleteList = (): boolean => {
    // System lists (Inbox) - never deletable
    if (isSystemList && !isDateList) return false;

    // Date lists - only deletable if date is before today
    if (isDateList) {
      // Parse "Jan 13, 2026" format
      const listDate = new Date(name);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      listDate.setHours(0, 0, 0, 0);
      return listDate < today;
    }

    // User-created lists - always deletable
    return true;
  };

  const isProtectedList = (): boolean => {
    // Inbox - always protected
    if (isSystemList && !isDateList) return true;

    // Date lists - protected if today or future
    if (isDateList) {
      const listDate = new Date(name);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      listDate.setHours(0, 0, 0, 0);
      return listDate >= today; // Protected if NOT in the past
    }

    // User-created lists - not protected
    return false;
  };

  // Get the first task's color for accent bar
  const getFirstTaskColor = () => {
    if (tasks.length === 0) return "var(--accent-primary)"; // Default primary color
    const firstTask = tasks[0];
    return getColor(paletteId, firstTask.color_index);
  };

  const incompleteTasks = tasks.filter((t) => !t.completed_at);
  const isEmpty = incompleteTasks.length === 0;

  return (
    <div
      className={`
        rounded-lg overflow-hidden border border-theme-subtle bg-theme-secondary transition-all duration-200
        ${
          isExpanded
            ? "shadow-theme-md border-theme-emphasis"
            : "shadow-theme-sm hover:shadow-theme-md hover:border-theme-emphasis"
        }
        ${isEmpty && !isExpanded ? "opacity-50" : ""}
      `}
      style={{
        breakInside: "avoid",
        marginBottom: "0.875rem",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header - always visible */}
      {isEditing ? (
        <div className="p-4">
          <Input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") onFinishEdit(editName);
              if (e.key === "Escape") onCancelEdit();
            }}
            onBlur={() => onFinishEdit(editName)}
            className="border-theme bg-theme-secondary text-theme-primary"
            autoFocus
          />
        </div>
      ) : (
        <div className={`p-4 flex items-center justify-between ${isExpanded ? "border-b border-theme-subtle" : ""}`}>
          {/* Left side - clickable to toggle expand */}
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-3 flex-1 text-left transition-all hover-theme rounded-md p-1 -m-1"
          >
            {/* Colored accent bar */}
            <div
              className="w-1 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: getFirstTaskColor() }}
            />
            <div>
              <h3
                className="font-medium text-theme-primary"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!isSystemList) {
                    onStartEdit();
                  }
                }}
              >
                {name}
              </h3>
              <p className="text-xs text-theme-secondary">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </p>
            </div>
          </button>

          {/* Right side - menu and chevron */}
          <div className="flex items-center gap-2">
            {/* Three dots menu - only when expanded */}
            {isExpanded && !isEditing && (
              <ListCardMenu
                isProtectedList={isProtectedList()}
                canDelete={canDeleteList()}
                taskCount={tasks.length}
                onEdit={onStartEdit}
                onClearList={onClearList}
                onDelete={onDelete}
              />
            )}

            {/* Expand/collapse icon */}
            <button
              onClick={onToggleExpand}
              className={`w-7 h-7 rounded-md bg-theme-tertiary hover:bg-interactive-hover flex items-center justify-center transition-all duration-200 ${isExpanded ? "rotate-180" : ""}`}
            >
              <ChevronDown className="w-4 h-4 text-theme-secondary" />
            </button>
          </div>
        </div>
      )}

      {/* Drop zone - ALWAYS rendered for drag-drop, but minimal when collapsed */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              transition-colors duration-150
              ${snapshot.isDraggingOver ? "bg-[var(--drag-highlight)] ring-2 ring-[var(--drag-ring)] ring-inset min-h-[24px] mx-4 mb-2 rounded-md" : ""}
              ${isExpanded ? "px-4 pb-4" : "h-0 overflow-hidden"}
            `}
          >
            {isExpanded && (
              <>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                  {sortedTasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            <TaskCard
                              id={task.id}
                              title={task.title}
                              durationMinutes={task.duration_minutes}
                              colorIndex={task.color_index}
                              isCompleted={!!task.completed_at}
                              isScheduled={scheduledTaskIds.has(task.id)}
                              isDaily={false}
                              isInPurgatory={isInbox}
                              isHighlight={task.is_highlight || false}
                              canHighlight={isDateList}
                              energyLevel={task.energy_level || "medium"}
                              paletteId={paletteId}
                              onDurationClick={(reverse) =>
                                onTaskDurationClick(
                                  task.id,
                                  task.duration_minutes,
                                  reverse,
                                )
                              }
                              onEnergyChange={(level) =>
                                onTaskEnergyChange(task.id, level)
                              }
                              onDailyToggle={() => {}}
                              onHighlightToggle={() =>
                                onHighlightToggle(task.id)
                              }
                              onComplete={() => onTaskComplete(task.id)}
                              onDelete={() => onTaskDelete(task.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                </div>

                {/* Roll Over pills - only for date lists with incomplete tasks */}
                {isDateList &&
                  !isInbox &&
                  tasks.filter((t) => !t.completed_at).length > 0 &&
                  onRollOver && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-theme">
                      <span className="text-xs text-theme-secondary">
                        Roll Over:
                      </span>

                      {/* Today pill - hide if viewing today's list */}
                      {!isToday && (
                        <button
                          onClick={() => onRollOver("today")}
                          className="px-2 py-1 text-xs rounded-full bg-theme-tertiary hover:bg-accent-primary hover:text-[var(--text-inverse)] transition-colors"
                        >
                          {todayLabel}
                        </button>
                      )}

                      {/* Tomorrow pill */}
                      <button
                        onClick={() => onRollOver("tomorrow")}
                        className="px-2 py-1 text-xs rounded-full bg-theme-tertiary hover:bg-accent-primary hover:text-[var(--text-inverse)] transition-colors"
                      >
                        {tomorrowLabel}
                      </button>
                    </div>
                  )}

                {/* Add task input */}
                <AddTaskInput onAdd={onTaskAdd} />
              </>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
