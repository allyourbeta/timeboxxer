'use client'

import { useEffect } from 'react'
import { useTaskStore, useListStore, useScheduleStore, useUIStore } from '@/state'
import { Header, CompletedView } from '@/components/Layout'
import { ListPanel } from '@/components/Lists'
import { FullCalendarView } from '@/components/Calendar'

const PALETTE_ID = 'ocean-bold'

export default function Home() {
  // Stores
  const { tasks, loading: tasksLoading, loadTasks, createTask, updateTask, deleteTask, completeTask, uncompleteTask } = useTaskStore()
  const { lists, loading: listsLoading, loadLists, createList, updateList, deleteList, duplicateList } = useListStore()
  const { scheduled, loading: scheduleLoading, loadSchedule, scheduleTask, unscheduleTask } = useScheduleStore()
  const { 
    currentView, setCurrentView,
    panelMode, setPanelMode,
    draggedTaskId, setDraggedTaskId,
    colorPickerTaskId, openColorPicker, closeColorPicker,
    editingListId, setEditingListId,
    duplicatingListId, setDuplicatingListId,
    showNewListInput, setShowNewListInput,
    expandedListByColumn, toggleListExpanded,
  } = useUIStore()
  
  // Load data on mount
  useEffect(() => {
    loadTasks()
    loadLists()
    loadSchedule()
  }, [loadTasks, loadLists, loadSchedule])

  // Close color picker on outside click
  useEffect(() => {
    if (colorPickerTaskId) {
      const handler = () => closeColorPicker()
      document.addEventListener('click', handler)
      return () => document.removeEventListener('click', handler)
    }
  }, [colorPickerTaskId, closeColorPicker])
  
  const loading = tasksLoading || listsLoading || scheduleLoading
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }
  
  const handleExternalDrop = async (taskId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0]
    await scheduleTask(taskId, today, time + ':00')
  }

  const handleEventMove = async (taskId: string, time: string) => {
    const today = new Date().toISOString().split('T')[0]
    // First unschedule, then reschedule at new time
    await unscheduleTask(taskId)
    await scheduleTask(taskId, today, time + ':00')
  }
  
  const handleDurationChange = async (taskId: string, newDuration: number) => {
    await updateTask(taskId, { duration_minutes: newDuration })
  }
  
  const handleColorSelect = async (taskId: string, colorIndex: number) => {
    await updateTask(taskId, { color_index: colorIndex })
    closeColorPicker()
  }
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header 
        currentView={currentView} 
        panelMode={panelMode}
        onViewChange={setCurrentView} 
        onPanelModeChange={setPanelMode}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {currentView === 'main' ? (
          <>
            {(panelMode === 'both' || panelMode === 'lists-only') && (
              <div className={panelMode === 'lists-only' ? 'flex-1' : 'w-1/2'}>
                <ListPanel
                  lists={lists}
                  tasks={tasks}
                  paletteId={PALETTE_ID}
                  colorPickerTaskId={colorPickerTaskId}
                  editingListId={editingListId}
                  duplicatingListId={duplicatingListId}
                  showNewListInput={showNewListInput}
                  expandedListByColumn={expandedListByColumn}
                  onShowNewListInput={setShowNewListInput}
                  onCreateList={createList}
                  onEditList={updateList}
                  onDeleteList={deleteList}
                  onDuplicateList={duplicateList}
                  onSetEditingListId={setEditingListId}
                  onSetDuplicatingListId={setDuplicatingListId}
                  onToggleListExpanded={toggleListExpanded}
                  onTaskDurationChange={handleDurationChange}
                  onTaskColorClick={openColorPicker}
                  onTaskColorSelect={handleColorSelect}
                  onTaskDelete={deleteTask}
                  onTaskCreate={createTask}
                />
              </div>
            )}
            
            {(panelMode === 'both' || panelMode === 'calendar-only') && (
              <div className={panelMode === 'calendar-only' ? 'flex-1' : 'flex-1'}>
                <FullCalendarView
                  tasks={tasks}
                  scheduled={scheduled}
                  paletteId={PALETTE_ID}
                  onExternalDrop={handleExternalDrop}
                  onEventMove={handleEventMove}
                  onUnschedule={unscheduleTask}
                  onComplete={completeTask}
                  onDurationChange={handleDurationChange}
                />
              </div>
            )}
          </>
        ) : (
          <CompletedView
            tasks={tasks}
            lists={lists}
            paletteId={PALETTE_ID}
            onRestore={uncompleteTask}
          />
        )}
      </div>
    </div>
  )
}