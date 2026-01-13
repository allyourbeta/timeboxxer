import { create } from 'zustand'
import { Theme, themes } from '@/lib/backgroundThemes'

// Helper to validate stored theme
const getValidTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('theme')
  if (stored && stored in themes) {
    return stored as Theme
  }
  return 'dark'
}

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
  
  // Duplicate list
  duplicatingListId: string | null
  setDuplicatingListId: (listId: string | null) => void
  
  // Collapsible lists (multi-column layout)
  expandedListByColumn: Record<number, string | null>
  toggleListExpanded: (listId: string, column: number) => void
  
  // Panel focus modes
  panelMode: 'both' | 'lists-only' | 'calendar-only'
  setPanelMode: (mode: 'both' | 'lists-only' | 'calendar-only') => void
  
  // Theme (just light/dark now)
  theme: Theme
  setTheme: (theme: Theme) => void
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
  
  duplicatingListId: null,
  setDuplicatingListId: (listId) => set({ duplicatingListId: listId }),
  
  expandedListByColumn: { 0: null, 1: null, 2: null },
  toggleListExpanded: (listId, column) => set((state) => ({
    expandedListByColumn: {
      ...state.expandedListByColumn,
      [column]: state.expandedListByColumn[column] === listId ? null : listId
    }
  })),
  
  panelMode: 'both',
  setPanelMode: (mode) => set({ panelMode: mode }),
  
  theme: getValidTheme(),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
    }
    set({ theme })
  },
}))