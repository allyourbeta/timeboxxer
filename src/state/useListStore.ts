import { create } from 'zustand'
import { getLists, createList as apiCreateList, updateList as apiUpdateList, deleteList as apiDeleteList, duplicateList as apiDuplicateList, ensureTodayList } from '@/api'
import { sortListsForDisplay } from '@/lib/listSort'

interface List {
  id: string
  name: string
  position: number
  is_collapsed: boolean
  is_system: boolean
  system_type: 'purgatory' | 'parked' | 'date' | null
}

interface ListStore {
  lists: List[]
  loading: boolean
  
  loadLists: () => Promise<void>
  createList: (name: string) => Promise<List>
  updateList: (listId: string, name: string) => Promise<void>
  deleteList: (listId: string) => Promise<void>
  duplicateList: (listId: string, newName: string) => Promise<void>
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  loading: true,
  
  loadLists: async () => {
    // Ensure today's date list exists
    await ensureTodayList()
    
    const data = await getLists()
    const sortedLists = sortListsForDisplay(data || [])
    set({ lists: sortedLists, loading: false })
  },
  
  createList: async (name) => {
    const newList = await apiCreateList(name)
    set({ lists: [...get().lists, newList] })
    return newList
  },
  
  updateList: async (listId, name) => {
    await apiUpdateList(listId, name)
    set({
      lists: get().lists.map(l => 
        l.id === listId ? { ...l, name } : l
      )
    })
  },
  
  deleteList: async (listId) => {
    await apiDeleteList(listId)
    set({ lists: get().lists.filter(l => l.id !== listId) })
  },
  
  duplicateList: async (listId, newName) => {
    const newListId = await apiDuplicateList(listId, newName)
    // Reload lists to get the new one with tasks
    await get().loadLists()
  },
}))