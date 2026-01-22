import { create } from 'zustand'

interface UIStore {
  // View state
  currentView: 'main' | 'completed'
  setCurrentView: (view: 'main' | 'completed') => void
  
  // Drag state
  draggedTaskId: string | null
  setDraggedTaskId: (taskId: string | null) => void
  
  // Color picker
  colorPickerTaskId: string | null
  openColorPicker: (taskId: string) => void
  closeColorPicker: () => void
  
  // List editing
  editingListId: string | null
  setEditingListId: (listId: string | null) => void
  
  // New list input
  showNewListInput: boolean
  setShowNewListInput: (show: boolean) => void
  
  
  // Collapsible lists
  expandedListIds: Set<string>
  toggleListExpanded: (listId: string) => void
  collapseAllLists: () => void
  
  // Panel focus modes
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  setPanelMode: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  
  // List column layout
  listColumnCount: 1 | 2
  setListColumnCount: (count: 1 | 2) => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: 'main',
  setCurrentView: (view) => set({ currentView: view }),
  
  draggedTaskId: null,
  setDraggedTaskId: (taskId) => set({ draggedTaskId: taskId }),
  
  colorPickerTaskId: null,
  openColorPicker: (taskId) => set({ colorPickerTaskId: taskId }),
  closeColorPicker: () => set({ colorPickerTaskId: null }),
  
  editingListId: null,
  setEditingListId: (listId) => set({ editingListId: listId }),
  
  showNewListInput: false,
  setShowNewListInput: (show) => set({ showNewListInput: show }),
  
  
  expandedListIds: new Set<string>(),
  toggleListExpanded: (listId) => set((state) => {
    const newSet = new Set(state.expandedListIds)
    if (newSet.has(listId)) {
      newSet.delete(listId)
    } else {
      newSet.add(listId)
    }
    return { expandedListIds: newSet }
  }),
  
  collapseAllLists: () => set({
    expandedListIds: new Set<string>()
  }),
  
  panelMode: 'both',
  setPanelMode: (mode) => set({ panelMode: mode }),
  
  listColumnCount: 2,
  setListColumnCount: (count) => set({ listColumnCount: count }),
}))