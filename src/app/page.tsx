'use client'

import { useEffect } from 'react'
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
import { useAppHandlers, useAuth } from '@/hooks'
import { Header, CompletedView } from '@/components/Layout'
import { ListPanel } from '@/components/Lists'
import { FullCalendarView } from '@/components/Calendar'
import { Toast, ConfirmDialog } from '@/components/ui'
import { FocusMode } from '@/components/Focus'
// LIMBO_LIST_ID will be fetched dynamically as purgatory list
import { cleanupExpiredScheduledTasks } from '@/api'
import { TOAST_DURATION_MS } from '@/lib/constants'
import { getTodayListName, getTodayISO } from '@/lib/dateList'

const PALETTE_ID = 'rainbow-bright'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  
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
    expandedListIds, toggleListExpanded,
    collapseAllLists,
    listColumnCount, setListColumnCount,
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
    handleRollOverTasks,
    discardConfirm,
    handleTaskDiscardClick,
    handleTaskDiscardConfirm,
    handleTaskDiscardCancel,
  } = useAppHandlers()

  // Load data on mount (only when authenticated)
  useEffect(() => {
    console.log('🔄 [page.tsx] Data loading useEffect triggered', { 
      hasUser: !!user, 
      userId: user?.id 
    })
    
    if (!user) {
      console.log('⏭️ [page.tsx] Skipping data load - no user')
      return
    }
    
    console.log('📊 [page.tsx] Starting data initialization...')
    
    const init = async () => {
      try {
        console.log('🧹 [page.tsx] Cleaning up expired tasks...')
        await cleanupExpiredScheduledTasks()
        
        console.log('📚 [page.tsx] Loading fresh data...')
        await Promise.all([
          loadLists(),
          loadTasks(),
          loadSchedule()
        ])
        console.log('✅ [page.tsx] All data loaded successfully')
      } catch (err) {
        console.error('💥 [page.tsx] Data loading failed:', err)
      }
    }
    
    init()
  }, [user, loadLists, loadTasks, loadSchedule])

  // Spawn daily tasks after data loads
  useEffect(() => {
    if (!user) return  // Don't run if not logged in
    if (!tasksLoading && !listsLoading && tasks.length > 0) {
      // Find today's date list
      const todayList = lists.find(l => l.list_date === getTodayISO())
      if (todayList) {
        spawnDailyTasksForToday(todayList.id)
      }
    }
  }, [user, tasksLoading, listsLoading, tasks.length, lists, spawnDailyTasksForToday])

  // NOW we can have conditional returns (after all hooks)
  
  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

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
          onCollapseAll={collapseAllLists}
          onJustStart={() => {
            if (scheduledTasks.length > 0) {
              const randomIndex = Math.floor(Math.random() * scheduledTasks.length)
              handleStartFocus(scheduledTasks[randomIndex].id)
            }
          }}
          listColumnCount={listColumnCount}
          onListColumnCountChange={setListColumnCount}
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
        onCollapseAll={collapseAllLists}
        onJustStart={() => {
          if (scheduledTasks.length > 0) {
            const randomIndex = Math.floor(Math.random() * scheduledTasks.length)
            handleStartFocus(scheduledTasks[randomIndex].id)
          }
        }}
        listColumnCount={listColumnCount}
        onListColumnCountChange={setListColumnCount}
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
              expandedListIds={expandedListIds}
              scheduledTaskIds={scheduledTaskIds}
              onShowNewListInput={() => setShowNewListInput(true)}
              onCreateList={handleListCreate}
              onEditList={handleListEdit}
              onDeleteList={handleDeleteListClick}
              onDuplicateList={handleListDuplicate}
              onSetEditingListId={setEditingListId}
              onSetDuplicatingListId={setDuplicatingListId}
              onToggleListExpanded={toggleListExpanded}
              onTaskDurationChange={async (taskId, newDuration) => {
                const { updateTask } = useTaskStore.getState()
                await updateTask(taskId, { duration_minutes: newDuration })
              }}
              onTaskDelete={handleTaskDelete}
              onTaskCreate={handleTaskAdd}
              onTaskDailyToggle={handleTaskDailyToggle}
              onTaskEnergyChange={handleTaskEnergyChange}
              onTaskHighlightToggle={handleTaskHighlightToggle}
              onTaskComplete={handleTaskComplete}
              onReorderTasks={handleReorderTasks}
              onRollOverTasks={handleRollOverTasks}
              columnCount={listColumnCount}
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
              onDurationChange={async (taskId, newDuration) => {
                const { updateTask } = useTaskStore.getState()
                await updateTask(taskId, { duration_minutes: newDuration })
              }}
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
    </div>
  )
}