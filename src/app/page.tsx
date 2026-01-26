"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { useTaskStore, useListStore, useUIStore } from "@/state";
import { useAppHandlers, useAuth, useScheduleHandlers } from "@/hooks";
import { Header, CompletedView } from "@/components/Layout";
import { ListPanel } from "@/components/Lists";
import { CalendarView } from "@/components/Calendar";
import { Toast, ConfirmDialog } from "@/components/ui";
import { FocusMode } from "@/components/Focus";
import { TOAST_DURATION_MS, DEFAULT_PALETTE_ID } from "@/lib/constants";
import { getTodayListName, getLocalTodayISO } from "@/lib/dateList";

export default function Home() {
  const { user, loading: authLoading } = useAuth();

  // Stores (data only)
  const { tasks, loading: tasksLoading, loadTasks } = useTaskStore();
  const { lists, loading: listsLoading, loadLists } = useListStore();
  const {
    currentView,
    setCurrentView,
    panelMode,
    setPanelMode,
    editingListId,
    setEditingListId,
    showNewListInput,
    setShowNewListInput,
    expandedListIds,
    toggleListExpanded,
    collapseAllLists,
    listColumnCount,
    setListColumnCount,
  } = useUIStore();

  // All handlers from custom hook
  const {
    pendingDelete,
    setPendingDelete,
    focusTaskId,
    handleTaskAdd,
    handleTaskDelete,
    handleTaskDurationClick,
    handleTaskComplete,
    handleTaskUncomplete,
    handleTaskEnergyChange,
    handleHighlightToggle,
    handleDragEnd,
    handleListCreate,
    handleListEdit,
    handleDeleteListClick,
    handleUndoDelete,
    clearListConfirm,
    handleClearListClick,
    handleClearListConfirm,
    handleClearListCancel,
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
    handleQuickSave,
    handleRollOverTasks,
    discardConfirm,
    handleTaskDiscardClick,
    handleTaskDiscardConfirm,
    handleTaskDiscardCancel,
  } = useAppHandlers();

  // Schedule handlers with proper overlap validation
  const {
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
  } = useScheduleHandlers();

  // Ref to track calendar editing cancellation
  const cancelEditingRef = useRef<(() => void) | null>(null);

  // Track whether a Hello-Pangea DnD gesture is active.
  // Calendar uses this to temporarily disable pointer interactions on scheduled blocks
  // so slot droppables remain reliable while dragging from lists.
  const [isDndDragging, setIsDndDragging] = useState(false);

  const handleDndStart = useCallback(() => {
    setIsDndDragging(true);
    // Cancel any ongoing slot editing when drag starts
    if (cancelEditingRef.current) {
      cancelEditingRef.current();
    }
  }, []);

  const handleDndEnd = useCallback(
    (result: any) => {
      setIsDndDragging(false);
      handleDragEnd(result);
    },
    [handleDragEnd],
  );

  // Load data on mount (only when authenticated)
  useEffect(() => {
    if (!user) {
      return;
    }

    const init = async () => {
      try {
        await Promise.all([loadLists(), loadTasks()]);
      } catch (err) {
        console.error("Data loading failed:", err);
      }
    };

    init();
  }, [user, loadLists, loadTasks]);

  // Spawn daily tasks after data loads
  useEffect(() => {
    if (!user) return; // Don't run if not logged in
    if (!tasksLoading && !listsLoading && tasks.length > 0) {
      // Find today's date list
      const todayList = lists.find((l) => l.list_date === getLocalTodayISO());
      if (todayList) {
        // Daily tasks removed in new schema
      }
    }
  }, [user, tasksLoading, listsLoading, tasks.length, lists]);

  // NOW we can have conditional returns (after all hooks)

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <p className="text-theme-secondary">Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  // Computed values
  const loading = tasksLoading || listsLoading;
  const scheduledTasks = tasks.filter((t) => t.calendar_slot_time && !t.completed_at);
  const visibleLists = lists.filter((l) => l.id !== pendingDelete?.listId);

  const completedToday = tasks.filter((t) => {
    if (!t.completed_at) return false;
    const completedDate = new Date(t.completed_at).toDateString();
    const today = new Date().toDateString();
    return completedDate === today;
  }).length;

  const focusTask = focusTaskId
    ? tasks.find((t) => t.id === focusTaskId)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <p className="text-theme-secondary">Loading...</p>
      </div>
    );
  }

  if (currentView === "completed") {
    return (
      <div className="min-h-screen bg-theme-primary">
        <Header
          currentView={currentView}
          panelMode={panelMode}
          onViewChange={setCurrentView}
          onPanelModeChange={setPanelMode}
          onQuickSave={handleQuickSave}
          onCollapseAll={collapseAllLists}
          onJustStart={() => {
            if (scheduledTasks.length > 0) {
              const randomIndex = Math.floor(
                Math.random() * scheduledTasks.length,
              );
              handleStartFocus(scheduledTasks[randomIndex].id);
            }
          }}
          listColumnCount={listColumnCount}
          onListColumnCountChange={setListColumnCount}
          completedToday={completedToday}
        />
        <CompletedView
          paletteId={DEFAULT_PALETTE_ID}
          onRestore={handleTaskUncomplete}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <Header
        currentView={currentView}
        panelMode={panelMode}
        onViewChange={setCurrentView}
        onPanelModeChange={setPanelMode}
        onQuickSave={handleQuickSave}
        onCollapseAll={collapseAllLists}
        onJustStart={() => {
          if (scheduledTasks.length > 0) {
            const randomIndex = Math.floor(
              Math.random() * scheduledTasks.length,
            );
            handleStartFocus(scheduledTasks[randomIndex].id);
          }
        }}
        listColumnCount={listColumnCount}
        onListColumnCountChange={setListColumnCount}
        completedToday={completedToday}
      />

      <DragDropContext onDragEnd={handleDndEnd} onDragStart={handleDndStart}>
        {/* Main content area */}
        <div className="flex-1 flex gap-4 p-4 bg-theme-primary min-h-0 h-[calc(100vh-3.5rem)]">
          {/* List Panel Container */}
          {(panelMode === "both" || panelMode === "lists-only") && (
            <div
              className={`${panelMode === "both" ? "flex-1 min-w-0" : "w-full"} bg-theme-secondary rounded-xl border border-theme flex flex-col`}
              style={{ boxShadow: "var(--shadow-panel)" }}
            >
              {/* Panel Header */}
              <div className="flex-shrink-0 p-4 border-b border-theme bg-theme-tertiary rounded-t-xl">
                <h2 className="text-lg font-semibold text-foreground">
                  Task Lists
                </h2>
              </div>
              <div className="p-6 flex-1 overflow-auto overflow-x-hidden">
                <ListPanel
                  lists={visibleLists}
                  tasks={tasks}
                  paletteId={DEFAULT_PALETTE_ID}
                  editingListId={editingListId}
                  showNewListInput={showNewListInput}
                  expandedListIds={expandedListIds}
                  scheduledTaskIds={scheduledTasks.map((t) => t.id)}
                  onShowNewListInput={() => setShowNewListInput(true)}
                  onCreateList={handleListCreate}
                  onEditList={handleListEdit}
                  onDeleteList={handleDeleteListClick}
                  onClearList={handleClearListClick}
                  onSetEditingListId={setEditingListId}
                  onToggleListExpanded={toggleListExpanded}
                  onTaskDurationChange={async (taskId, newDuration) => {
                    const { updateTask } = useTaskStore.getState();
                    await updateTask(taskId, { duration_minutes: newDuration });
                  }}
                  onTaskDelete={handleTaskDelete}
                  onTaskCreate={handleTaskAdd}
                  onTaskEnergyChange={handleTaskEnergyChange}
                  onTaskComplete={handleTaskComplete}
                  onRollOverTasks={handleRollOverTasks}
                  onHighlightToggle={handleHighlightToggle}
                  columnCount={listColumnCount}
                />
              </div>
            </div>
          )}

          {/* Calendar Panel Container */}
          {(panelMode === "both" || panelMode === "calendar-only") && (
            <div
              className={`${panelMode === "both" ? "flex-1 min-w-0" : "w-full"} bg-theme-secondary rounded-xl border border-theme flex flex-col`}
              style={{ boxShadow: "var(--shadow-panel)" }}
            >
              <CalendarView
                tasks={tasks}
                paletteId={DEFAULT_PALETTE_ID}
                isExternalDndDragging={isDndDragging}
                onExternalDrop={handleExternalDrop}
                onEventMove={handleEventMove}
                onUnschedule={handleUnschedule}
                onComplete={handleTaskComplete}
                onDelete={handleTaskDelete}
                onDurationChange={async (taskId, newDuration) => {
                  const { updateTask } = useTaskStore.getState();
                  await updateTask(taskId, { duration_minutes: newDuration });
                }}
                onCreateTask={handleCreateCalendarTask}
                onDragStart={(cancelCallback) => {
                  cancelEditingRef.current = cancelCallback;
                }}
                isDndDragging={isDndDragging}
              />
            </div>
          )}
        </div>
      </DragDropContext>

      {/* Focus Mode */}
      {focusTask && (
        <FocusMode
          task={focusTask}
          paletteId={DEFAULT_PALETTE_ID}
          onExit={handleExitFocus}
          onComplete={handleFocusComplete}
        />
      )}

      {/* Undo Toast */}
      {pendingDelete && (
        <Toast
          message={`"${pendingDelete.listName}" deleted`}
          action={{
            label: "Undo",
            onClick: handleUndoDelete,
          }}
          duration={TOAST_DURATION_MS}
          onClose={() => setPendingDelete(null)}
        />
      )}

      {/* Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!discardConfirm}
        title="Discard this task?"
        message={`"${discardConfirm?.taskTitle}" will be permanently deleted.`}
        confirmLabel="Discard"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleTaskDiscardConfirm}
        onCancel={handleTaskDiscardCancel}
      />

      {/* Clear List Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!clearListConfirm}
        title="Clear this list?"
        message={`Delete all ${clearListConfirm?.taskCount} task${clearListConfirm?.taskCount === 1 ? "" : "s"} in "${clearListConfirm?.listName}"? This cannot be undone.`}
        confirmLabel="Clear List"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={handleClearListConfirm}
        onCancel={handleClearListCancel}
      />
    </div>
  );
}
