import { create } from 'zustand'
import { getLists, createList as apiCreateList, updateList as apiUpdateList, deleteList as apiDeleteList, duplicateList as apiDuplicateList } from '@/api'

interface List {
  id: string
  name: string
  position: number
  is_inbox: boolean
}

interface ListStore {
  lists: List[]
  loading: boolean
  
  loadLists: () => Promise<void>
  createList: (name: string) => Promise<void>
  updateList: (listId: string, name: string) => Promise<void>
  deleteList: (listId: string) => Promise<void>
  duplicateList: (listId: string, newName: string) => Promise<void>
}

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  loading: true,
  
  loadLists: async () => {
    const data = await getLists()
    set({ lists: data || [], loading: false })
  },
  
  createList: async (name) => {
    const newList = await apiCreateList(name)
    set({ lists: [...get().lists, newList] })
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