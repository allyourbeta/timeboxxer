'use client'

import { useEffect } from 'react'
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
import { useAppHandlers } from '@/hooks'
import { Header, CompletedView } from '@/components/Layout'
import { ListPanel } from '@/components/Lists'
import { FullCalendarView } from '@/components/Calendar'
import { Toast } from '@/components/ui'
import { FocusMode } from '@/components/Focus'
import { LIMBO_LIST_ID } from '@/lib/constants'

const PALETTE_ID = 'rainbow-bright'

export default function Home() {
  // Stores (data only)
  const { tasks, loading: tasksLoading, loadTasks, spawnDailyTasksForToday } = useTaskStore()
  const { lists, loading: listsLoading, loadLists } = useListStore()
  const { scheduled, loading: scheduleLoading, loadSchedule } = useScheduleStore()
  const {
    currentView, setCurrentView,
    panelMode, setPanelMode,
    editingListId, setEditingListId,
    duplicatingListId, setDuplicatingListId,
    showNewListInput, setShowNewListInput,
    expandedListByColumn, toggleListExpanded,
  } = useUIStore()

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
    handleTaskDailyToggle,
    handleTaskEnergyChange,
    handleTaskHighlightToggle,
    handleReorderTasks,
    handleExternalDrop,
    handleEventMove,
    handleUnschedule,
    handleCreateCalendarTask,
    handleListCreate,
    handleListEdit,
    handleListDuplicate,
    handleDeleteListClick,
    handleUndoDelete,
    handleStartFocus,
    handleExitFocus,
    handleFocusComplete,
    handleParkThought,
  } = useAppHandlers()

  // Load data on mount
  useEffect(() => {
    loadLists()
    loadTasks()
    loadSchedule()
  }, [loadLists, loadTasks, loadSchedule])

  // Spawn daily tasks after data loads
  useEffect(() => {
    if (!tasksLoading && !listsLoading && tasks.length > 0) {
      // Find today's date list
      const todayListName = new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
      const todayList = lists.find(l => l.system_type === 'date' && l.name === todayListName)
      if (todayList) {
        spawnDailyTasksForToday(todayList.id)
      }
    }
  }, [tasksLoading, listsLoading, tasks.length, lists, spawnDailyTasksForToday])

  // Computed values
  const loading = tasksLoading || listsLoading || scheduleLoading
  const scheduledTaskIds = scheduled.map(s => s.task_id)
  const visibleLists = lists.filter(l => l.id !== pendingDelete?.listId)
  
  const completedToday = tasks.filter(t => {
    if (!t.is_completed || !t.completed_at) return false
    const completedDate = new Date(t.completed_at).toDateString()
    const today = new Date().toDateString()
    return completedDate === today
  }).length

  const getWeekData = (): number[] => {
    const result: number[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toDateString()
      const count = tasks.filter(t => {
        if (!t.is_completed || !t.completed_at) return false
        return new Date(t.completed_at).toDateString() === dateStr
      }).length
      result.push(count)
    }
    return result
  }

  const scheduledTasks = tasks.filter(t => 
    scheduled.some(s => s.task_id === t.id) && !t.is_completed
  )
  
  const focusTask = focusTaskId ? tasks.find(t => t.id === focusTaskId) : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (currentView === 'completed') {
    return (
      <div className="min-h-screen bg-background">
        <Header
          currentView={currentView}
          panelMode={panelMode}
          onViewChange={setCurrentView}
          onPanelModeChange={setPanelMode}
          onParkThought={handleParkThought}
          onJustStart={() => {
            if (scheduledTasks.length > 0) {
              const randomIndex = Math.floor(Math.random() * scheduledTasks.length)
              handleStartFocus(scheduledTasks[randomIndex].id)
            }
          }}
          completedToday={completedToday}
          weekData={getWeekData()}
        />
        <CompletedView
          tasks={tasks.filter(t => t.is_completed)}
          lists={lists}
          paletteId={PALETTE_ID}
          onRestore={handleTaskUncomplete}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        currentView={currentView}
        panelMode={panelMode}
        onViewChange={setCurrentView}
        onPanelModeChange={setPanelMode}
        onParkThought={handleParkThought}
        onJustStart={() => {
          if (scheduledTasks.length > 0) {
            const randomIndex = Math.floor(Math.random() * scheduledTasks.length)
            handleStartFocus(scheduledTasks[randomIndex].id)
          }
        }}
        completedToday={completedToday}
        weekData={getWeekData()}
      />

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Lists Panel */}
        {(panelMode === 'both' || panelMode === 'lists-only') && (
          <div className={`${panelMode === 'both' ? 'w-1/2' : 'w-full'} overflow-auto p-4`}>
            <ListPanel
              lists={visibleLists}
              tasks={tasks}
              paletteId={PALETTE_ID}
              editingListId={editingListId}
              duplicatingListId={duplicatingListId}
              showNewListInput={showNewListInput}
              expandedListByColumn={expandedListByColumn}
              scheduledTaskIds={scheduledTaskIds}
              onShowNewListInput={() => setShowNewListInput(true)}
              onCreateList={handleListCreate}
              onEditList={handleListEdit}
              onDeleteList={handleDeleteListClick}
              onDuplicateList={handleListDuplicate}
              onSetEditingListId={setEditingListId}
              onSetDuplicatingListId={setDuplicatingListId}
              onToggleListExpanded={toggleListExpanded}
              onTaskDurationChange={(taskId, newDuration) => 
                handleTaskDurationClick(taskId, newDuration, false)
              }
              onTaskDelete={handleTaskDelete}
              onTaskCreate={handleTaskAdd}
              onTaskDailyToggle={handleTaskDailyToggle}
              onTaskEnergyChange={handleTaskEnergyChange}
              onTaskHighlightToggle={handleTaskHighlightToggle}
              onReorderTasks={handleReorderTasks}
            />
          </div>
        )}

        {/* Calendar Panel */}
        {(panelMode === 'both' || panelMode === 'calendar-only') && (
          <div className={`${panelMode === 'both' ? 'w-1/2' : 'w-full'} border-l border-border flex flex-col`}>
            <FullCalendarView
              tasks={tasks}
              scheduled={scheduled}
              paletteId={PALETTE_ID}
              onExternalDrop={handleExternalDrop}
              onEventMove={handleEventMove}
              onUnschedule={handleUnschedule}
              onComplete={handleTaskComplete}
              onDurationChange={(taskId, newDuration) => 
                handleTaskDurationClick(taskId, newDuration, false)
              }
              onCreateTask={handleCreateCalendarTask}
            />
          </div>
        )}
      </div>

      {/* Focus Mode */}
      {focusTask && (
        <FocusMode
          task={focusTask}
          paletteId={PALETTE_ID}
          onExit={handleExitFocus}
          onComplete={handleFocusComplete}
        />
      )}


      {/* Undo Toast */}
      {pendingDelete && (
        <Toast
          message={`"${pendingDelete.listName}" deleted`}
          action={{
            label: 'Undo',
            onClick: handleUndoDelete,
          }}
          duration={5000}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}