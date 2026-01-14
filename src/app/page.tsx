'use client'

import {useEffect, useState} from 'react'
import {useTaskStore, useListStore, useScheduleStore, useUIStore} from '@/state'
import {Header, CompletedView} from '@/components/Layout'
import {ListPanel} from '@/components/Lists'
import {FullCalendarView} from '@/components/Calendar'
import {Toast, ConfirmDialog} from '@/components/ui'
import {FocusMode} from '@/components/Focus'
import { PURGATORY_LIST_ID } from '@/lib/constants'

const PALETTE_ID = 'ocean-bold'

export default function Home() {
    // Stores
    const {
        tasks,
        loading: tasksLoading,
        loadTasks,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        uncompleteTask,
        moveToPurgatory,
        moveFromPurgatory,
        spawnDailyTasksForToday,
        createParkedThought,
        createCalendarTask
    } = useTaskStore()
    const {lists, loading: listsLoading, loadLists, createList, updateList, deleteList, duplicateList} = useListStore()
    const {scheduled, loading: scheduleLoading, loadSchedule, scheduleTask, unscheduleTask} = useScheduleStore()
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

    // State for pending deletion
    const [pendingDelete, setPendingDelete] = useState<{
        listId: string
        listName: string
        originalTasks: Array<{ id: string; originalListId: string }>
        timeoutId: NodeJS.Timeout
    } | null>(null)

    // Focus mode state
    const [focusTask, setFocusTask] = useState<string | null>(null)

    // Delete confirmation state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        listId: string
        listName: string
        taskCount: number
    } | null>(null)

    // Load data on mount
    useEffect(() => {
        loadTasks()
        loadLists()
        loadSchedule()
    }, [loadTasks, loadLists, loadSchedule])

    // Separate effect for spawning daily tasks after lists are loaded
    useEffect(() => {
        if (!listsLoading && lists.length > 0) {
            const todayList = lists.find(l => l.system_type === 'date')
            if (todayList) {
                spawnDailyTasksForToday(todayList.id)
            }
        }
    }, [listsLoading, lists, spawnDailyTasksForToday])

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

    // Get list of scheduled task IDs
    const scheduledTaskIds = scheduled.map(s => s.task_id)

    // Filter out the pending-delete list from display
    const visibleLists = lists.filter(l => l.id !== pendingDelete?.listId)

    // Focus mode handlers
    const handleEnterFocus = (taskId: string) => {
        setFocusTask(taskId)
    }

    const handleExitFocus = () => {
        setFocusTask(null)
    }

    const handleFocusComplete = async (taskId: string) => {
        await completeTask(taskId)
        setFocusTask(null)
    }

    const handleJustStart = () => {
        // Get unscheduled tasks that aren't completed
        const unscheduledTasks = tasks.filter(task => 
            !task.is_completed &&
            !scheduledTaskIds.includes(task.id) &&
            task.list_id !== PURGATORY_LIST_ID
        )
        
        if (unscheduledTasks.length > 0) {
            // Randomly select a task
            const randomIndex = Math.floor(Math.random() * unscheduledTasks.length)
            const randomTask = unscheduledTasks[randomIndex]
            handleEnterFocus(randomTask.id)
        }
    }

    // Handle delete list click - shows confirmation first
    const handleDeleteListClick = (listId: string) => {
        const list = lists.find(l => l.id === listId)
        if (!list || list.is_system) return
        
        const taskCount = tasks.filter(t => t.list_id === listId).length
        
        setDeleteConfirm({
            listId,
            listName: list.name,
            taskCount,
        })
    }

    // Soft delete - hides list, moves tasks, shows toast with undo
    const handleDeleteListConfirm = async () => {
        if (!deleteConfirm) return
        
        const { listId, listName } = deleteConfirm
        
        // Find Inbox
        const inboxList = lists.find(l => l.name === 'Inbox' && !l.is_system)
        
        // Get tasks in this list
        const tasksInList = tasks.filter(t => t.list_id === listId)
        const originalTasks = tasksInList.map(t => ({ 
            id: t.id, 
            originalListId: listId 
        }))
        
        // Move tasks to Inbox immediately (but we can undo this)
        if (inboxList) {
            tasksInList.forEach(task => {
                updateTask(task.id, { list_id: inboxList.id })
            })
        }
        
        // Set timeout to actually delete the list
        const timeoutId = setTimeout(async () => {
            await deleteList(listId)
            setPendingDelete(null)
        }, 5000)
        
        setPendingDelete({
            listId,
            listName,
            originalTasks,
            timeoutId,
        })
        
        // Close confirmation dialog
        setDeleteConfirm(null)
    }

    // Undo delete - move tasks back, cancel deletion
    const handleUndoDelete = async () => {
        if (!pendingDelete) return
        
        // Cancel the pending deletion
        clearTimeout(pendingDelete.timeoutId)
        
        // Move tasks back to original list
        for (const task of pendingDelete.originalTasks) {
            await updateTask(task.id, { list_id: task.originalListId })
        }
        
        // Reload to refresh UI
        await loadTasks()
        
        setPendingDelete(null)
    }

    const handleExternalDrop = async (taskId: string, time: string) => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return
        
        const today = new Date().toISOString().split('T')[0]
        await scheduleTask(taskId, today, time + ':00')
        
        // Move task to Purgatory if not already there
        if (task.list_id !== PURGATORY_LIST_ID) {
            const originalList = lists.find(l => l.id === task.list_id)
            await moveToPurgatory(taskId, task.list_id || '', originalList?.name || 'Unknown')
        }
    }

    const handleEventMove = async (taskId: string, time: string) => {
        const today = new Date().toISOString().split('T')[0]
        // First unschedule, then reschedule at new time
        await unscheduleTask(taskId)
        await scheduleTask(taskId, today, time + ':00')
    }

    const handleDurationChange = async (taskId: string, newDuration: number) => {
        await updateTask(taskId, {duration_minutes: newDuration})
    }

    const handleColorSelect = async (taskId: string, colorIndex: number) => {
        await updateTask(taskId, {color_index: colorIndex})
        closeColorPicker()
    }

    const handleDailyToggle = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId)
        if (task) {
            await updateTask(taskId, { is_daily: !task.is_daily })
        }
    }

    const handleEnergyChange = async (taskId: string, level: 'high' | 'medium' | 'low') => {
        await updateTask(taskId, { energy_level: level })
    }

    const handleHighlightToggle = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId)
        if (!task) return
        
        if (task.is_daily_highlight) {
            // Just remove highlight
            await updateTask(taskId, { is_daily_highlight: false })
        } else {
            // Clear any existing highlight first
            const currentHighlight = tasks.find(t => t.is_daily_highlight)
            if (currentHighlight) {
                await updateTask(currentHighlight.id, { is_daily_highlight: false })
            }
            // Set new highlight
            await updateTask(taskId, { is_daily_highlight: true })
        }
    }

    const handleParkThought = async (title: string) => {
        await createParkedThought(title)
    }

    const handleUnschedule = async (taskId: string) => {
        // First unschedule from calendar
        await unscheduleTask(taskId)
        
        // Then move back to original list (or Inbox if original was deleted)
        const task = tasks.find(t => t.id === taskId)
        if (task && task.list_id === PURGATORY_LIST_ID) {
            // Check if original list still exists
            const originalListExists = task.original_list_id && lists.some(l => l.id === task.original_list_id)
            
            // Find Inbox as fallback
            const inboxList = lists.find(l => l.name === 'Inbox' && !l.is_system)
            const targetListId = originalListExists 
                ? task.original_list_id! 
                : inboxList?.id || lists.find(l => !l.is_system)?.id
            
            if (targetListId) {
                await moveFromPurgatory(taskId, targetListId)
            }
        }
    }

    const handleCreateCalendarTask = async (title: string, time: string) => {
        const today = new Date().toISOString().split('T')[0]
        await createCalendarTask(title, time, today)
        // Reload schedule to show the new event
        await loadSchedule()
    }

    // Calculate completed tasks today
    const completedToday = tasks.filter(t => {
        if (!t.is_completed || !t.completed_at) return false
        const completedDate = new Date(t.completed_at).toDateString()
        const today = new Date().toDateString()
        return completedDate === today
    }).length

    return (
        <div className="h-screen flex flex-col bg-background">
            <Header
                currentView={currentView}
                panelMode={panelMode}
                onViewChange={setCurrentView}
                onPanelModeChange={setPanelMode}
                onParkThought={handleParkThought}
                onJustStart={handleJustStart}
                completedToday={completedToday}
            />

            <div className="flex flex-1 overflow-hidden">
                {currentView === 'main' ? (
                    <>
                        {(panelMode === 'both' || panelMode === 'lists-only') && (
                            <div className={panelMode === 'lists-only' ? 'flex-1' : 'w-1/2'}>
                                <ListPanel
                                    lists={visibleLists}
                                    tasks={tasks}
                                    paletteId={PALETTE_ID}
                                    colorPickerTaskId={colorPickerTaskId}
                                    editingListId={editingListId}
                                    duplicatingListId={duplicatingListId}
                                    showNewListInput={showNewListInput}
                                    expandedListByColumn={expandedListByColumn}
                                    scheduledTaskIds={scheduledTaskIds}
                                    onShowNewListInput={setShowNewListInput}
                                    onCreateList={createList}
                                    onEditList={updateList}
                                    onDeleteList={handleDeleteListClick}
                                    onDuplicateList={duplicateList}
                                    onSetEditingListId={setEditingListId}
                                    onSetDuplicatingListId={setDuplicatingListId}
                                    onToggleListExpanded={toggleListExpanded}
                                    onTaskDurationChange={handleDurationChange}
                                    onTaskColorClick={openColorPicker}
                                    onTaskColorSelect={handleColorSelect}
                                    onTaskDelete={deleteTask}
                                    onTaskCreate={createTask}
                                    onTaskDailyToggle={handleDailyToggle}
                                    onTaskEnergyChange={handleEnergyChange}
                                    onTaskHighlightToggle={handleHighlightToggle}
                                />
                            </div>
                        )}

                        {(panelMode === 'both' || panelMode === 'calendar-only') && (
                            <div className="flex-1 flex flex-col"><FullCalendarView
                                tasks={tasks}
                                scheduled={scheduled}
                                paletteId={PALETTE_ID}
                                onExternalDrop={handleExternalDrop}
                                onEventMove={handleEventMove}
                                onUnschedule={handleUnschedule}
                                onComplete={completeTask}
                                onCreateTask={handleCreateCalendarTask}
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

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <ConfirmDialog
                    title="Delete List"
                    message={`Delete "${deleteConfirm.listName}"${deleteConfirm.taskCount > 0 ? ` and move ${deleteConfirm.taskCount} task${deleteConfirm.taskCount > 1 ? 's' : ''} to Inbox` : ''}?`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={handleDeleteListConfirm}
                    onCancel={() => setDeleteConfirm(null)}
                    isDestructive
                />
            )}

            {/* Focus Mode Overlay */}
            {focusTask && (() => {
                const task = tasks.find(t => t.id === focusTask)
                if (!task) return null
                
                return (
                    <FocusMode
                        task={task}
                        paletteId={PALETTE_ID}
                        onExit={handleExitFocus}
                        onComplete={handleFocusComplete}
                    />
                )
            })()}

            {/* Toast for undo actions */}
            {pendingDelete && (
                <Toast
                    message={`"${pendingDelete.listName}" deleted`}
                    action={{
                        label: 'Undo',
                        onClick: handleUndoDelete,
                    }}
                    duration={5000}
                    onClose={() => {
                        // Toast closed without undo - deletion already happened
                        setPendingDelete(null)
                    }}
                />
            )}
        </div>
    )
}