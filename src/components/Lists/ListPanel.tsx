"use client";

import { useState, useEffect, useRef } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { ListCard } from "./ListCard";
import { formatDateForDisplay, getLocalTodayISO } from "@/lib/dateList";
import { List, Task } from "@/types/app";
import { DURATION_OPTIONS } from "@/lib/constants";
import { useTasksByList } from "@/hooks";

interface ListPanelProps {
  lists: List[];
  tasks: Task[];
  paletteId: string;
  editingListId: string | null;
  showNewListInput: boolean;
  expandedListIds: Set<string>;
  scheduledTaskIds: string[];
  onShowNewListInput: (show: boolean) => void;
  onCreateList: (name: string) => void;
  onEditList: (listId: string, name: string) => void;
  onDeleteList: (listId: string) => void;
  onClearList: (listId: string) => void;
  onSetEditingListId: (listId: string | null) => void;
  onToggleListExpanded: (listId: string) => void;
  onTaskDurationChange: (taskId: string, duration: number) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskCreate: (listId: string, title: string, date?: string) => void;
  onTaskEnergyChange: (
    taskId: string,
    level: "high" | "medium",
  ) => void;
  onTaskComplete: (taskId: string) => void;
  onRollOverTasks: (
    fromListId: string,
    destination: "today" | "tomorrow",
  ) => void;
  onHighlightToggle: (taskId: string, plannedListDate: string | null) => void;
  columnCount: 1 | 2;
}

export function ListPanel({
  lists,
  tasks,
  paletteId,
  editingListId,
  showNewListInput,
  expandedListIds,
  scheduledTaskIds,
  onShowNewListInput,
  onCreateList,
  onEditList,
  onDeleteList,
  onClearList,
  onSetEditingListId,
  onToggleListExpanded,
  onTaskDurationChange,
  onTaskDelete,
  onTaskCreate,
  onTaskEnergyChange,
  onTaskComplete,
  onRollOverTasks,
  onHighlightToggle,
  columnCount,
}: ListPanelProps) {
  const [newListName, setNewListName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitializedExpansion = useRef(false);

  // Filter out completed lists
  const visibleLists = lists.filter((l) => l.list_type !== "completed");

  // Split lists into columns
  const leftColumnLists = visibleLists
    .filter((l) => (l.panel_column ?? 0) === 0)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  
  const rightColumnLists = visibleLists
    .filter((l) => (l.panel_column ?? 0) === 1)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // Optimized task-to-list mapping - O(1) lookups instead of O(n) filters
  const { getTasksForList, tasksByListId } = useTasksByList(tasks, lists);

  // Initialize expansion state - expand first list with tasks
  useEffect(() => {
    if (hasInitializedExpansion.current || lists.length === 0) return;
    hasInitializedExpansion.current = true;

    // Use optimized lookup - O(1) per list instead of O(n) filter
    const firstWithTasks = visibleLists.find((list) => {
      return getTasksForList(list).length > 0;
    });

    if (firstWithTasks && expandedListIds.size === 0) {
      onToggleListExpanded(firstWithTasks.id);
    }
  }, [lists, tasks, expandedListIds, onToggleListExpanded, tasksByListId]);

  const cycleDuration = (current: number, reverse: boolean) => {
    const durations = [...DURATION_OPTIONS] as number[];
    const idx = durations.indexOf(current);
    if (idx === -1) return 30;

    if (reverse) {
      return durations[(idx - 1 + durations.length) % durations.length];
    }
    return durations[(idx + 1) % durations.length];
  };

  const renderListCard = (list: List, index: number) => {
    const isExpanded = expandedListIds.has(list.id);
    const displayName =
      list.list_type === "date" && list.list_date
        ? formatDateForDisplay(list.list_date)
        : list.name;

    return (
      <Draggable key={list.id} draggableId={list.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              marginBottom: "0.875rem",
            }}
          >
            <ListCard
              id={list.id}
              name={displayName}
              isInbox={false}
              isSystemList={
                list.list_type === "inbox" || list.list_type === "completed"
              }
              isDateList={list.list_type === "date"}
              tasks={getTasksForList(list)}
              paletteId={paletteId}
              isEditing={editingListId === list.id}
              isExpanded={isExpanded}
              scheduledTaskIds={scheduledTaskIds}
              onToggleExpand={() => onToggleListExpanded(list.id)}
              onStartEdit={() => onSetEditingListId(list.id)}
              onFinishEdit={(name) => {
                onEditList(list.id, name);
                onSetEditingListId(null);
              }}
              onCancelEdit={() => onSetEditingListId(null)}
              onClearList={() => onClearList(list.id)}
              onDelete={() => onDeleteList(list.id)}
              onTaskDurationClick={(taskId, duration, reverse) =>
                onTaskDurationChange(taskId, cycleDuration(duration, reverse))
              }
              onTaskDelete={onTaskDelete}
              onTaskAdd={(title) =>
                onTaskCreate(
                  list.id,
                  title,
                  list.list_type === "date" ? list.list_date : undefined,
                )
              }
              onTaskEnergyChange={onTaskEnergyChange}
              onTaskComplete={onTaskComplete}
              onRollOver={
                list.list_type === "date"
                  ? (destination) => onRollOverTasks(list.id, destination)
                  : undefined
              }
              isToday={
                list.list_type === "date" &&
                list.list_date === getLocalTodayISO()
              }
              onHighlightToggle={(taskId) =>
                onHighlightToggle(
                  taskId,
                  list.list_type === "date" ? list.list_date || null : null,
                )
              }
            />
          </div>
        )}
      </Draggable>
    );
  };

  // Single column mode
  if (columnCount === 1) {
    return (
      <div ref={containerRef} className="border-r border-theme overflow-y-auto">
        <div className="p-4">
          <Droppable droppableId="list-column-0">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {visibleLists
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  .map((list, index) => renderListCard(list, index))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add new list */}
          {showNewListInput ? (
            <div className="bg-theme-secondary rounded-lg p-3 mb-4">
              <input
                type="text"
                placeholder="List name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && newListName.trim()) {
                    onCreateList(newListName.trim());
                    setNewListName("");
                    onShowNewListInput(false);
                  }
                  if (e.key === "Escape") {
                    setNewListName("");
                    onShowNewListInput(false);
                  }
                }}
                onBlur={() => {
                  if (!newListName.trim()) {
                    onShowNewListInput(false);
                  }
                }}
                autoFocus
                className="w-full p-2 text-sm bg-theme-tertiary text-theme-primary placeholder-theme-secondary rounded"
              />
            </div>
          ) : (
            <button
              onClick={() => onShowNewListInput(true)}
              className="w-full p-3 text-left text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary rounded-lg transition-colors border border-dashed border-theme"
            >
              + Add List
            </button>
          )}
        </div>
      </div>
    );
  }

  // Two column mode
  return (
    <div ref={containerRef} className="border-r border-theme overflow-y-auto">
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column */}
          <Droppable droppableId="list-column-0">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[100px] rounded-lg transition-colors ${
                  snapshot.isDraggingOver ? "bg-theme-tertiary/50" : ""
                }`}
              >
                {leftColumnLists.map((list, index) => renderListCard(list, index))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Right Column */}
          <Droppable droppableId="list-column-1">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[100px] rounded-lg transition-colors ${
                  snapshot.isDraggingOver ? "bg-theme-tertiary/50" : ""
                }`}
              >
                {rightColumnLists.map((list, index) => renderListCard(list, index))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Add new list */}
        {showNewListInput ? (
          <div className="bg-theme-secondary rounded-lg p-3 mt-4">
            <input
              type="text"
              placeholder="List name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && newListName.trim()) {
                  onCreateList(newListName.trim());
                  setNewListName("");
                  onShowNewListInput(false);
                }
                if (e.key === "Escape") {
                  setNewListName("");
                  onShowNewListInput(false);
                }
              }}
              onBlur={() => {
                if (!newListName.trim()) {
                  onShowNewListInput(false);
                }
              }}
              autoFocus
              className="w-full p-2 text-sm bg-theme-tertiary text-theme-primary placeholder-theme-secondary rounded"
            />
          </div>
        ) : (
          <button
            onClick={() => onShowNewListInput(true)}
            className="w-full p-3 mt-4 text-left text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary rounded-lg transition-colors border border-dashed border-theme"
          >
            + Add List
          </button>
        )}
      </div>
    </div>
  );
}
